"""Medical report lifecycle orchestration service."""
from datetime import datetime, timezone, date
import logging
from typing import List, Optional
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.models.patient import Patient
from app.models.report import MedicalReport, LabResult, ReportObservation, ReportMedication
from app.schemas.report import (
    ReportExtraction,
    MedicalReportUpdate,
    LabResultVerificationUpdate,
)
from app.services.document_service import DocumentService
from app.services.gemini_service import GeminiExtractionService

logger = logging.getLogger(__name__)


class ReportService:
    @staticmethod
    async def upload_and_create_report(
        db: Session,
        patient_id: int,
        file: UploadFile,
    ) -> MedicalReport:
        """Validate patient, store uploaded document, generate hash, and create MedicalReport record."""
        # 1. Verify patient exists
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {patient_id} not found.",
            )

        # 2. Save file, compute SHA-256 hash, validate MIME type & size
        file_info = await DocumentService.save_uploaded_file(file)

        # 3. Create report entity
        report = MedicalReport(
            patient_id=patient.id,
            original_filename=file_info["original_filename"],
            stored_filename=file_info["stored_filename"],
            storage_path=file_info["storage_path"],
            mime_type=file_info["mime_type"],
            file_size=file_info["file_size"],
            document_hash=file_info["document_hash"],
            report_type="OTHER",
            processing_status="UPLOADED",
            extraction_status="PENDING",
            provenance_tag="REPORT_EXTRACTED",
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        return report

    @staticmethod
    async def process_report(db: Session, report_id: int) -> MedicalReport:
        """
        Execute report processing pipeline:
        Extract text/image -> controlled Gemini call -> Pydantic validation -> DB persistence -> REVIEW_REQUIRED.
        """
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medical report with ID {report_id} not found.",
            )

        # Update status to PROCESSING
        report.processing_status = "PROCESSING"
        db.commit()

        try:
            extraction: ReportExtraction
            if report.mime_type == "application/pdf":
                # PDF extraction attempt
                try:
                    full_text, pages_data, is_scanned = DocumentService.extract_text_from_pdf(report.storage_path)
                except Exception as e:
                    logger.warning(f"Deterministic PDF text extraction error: {e}. Falling back to multimodal.")
                    full_text, is_scanned = "", True

                if is_scanned or not full_text.strip():
                    # Scanned or image-based PDF -> use Gemini multimodal document capabilities
                    file_bytes = DocumentService.get_file_bytes(report.storage_path)
                    extraction = await GeminiExtractionService.extract_structured_data(
                        file_bytes=file_bytes, mime_type="application/pdf"
                    )
                else:
                    # Clean text PDF -> provide structured text with page markers
                    extraction = await GeminiExtractionService.extract_structured_data(
                        text_content=full_text
                    )
            else:
                # Image formats (PNG, JPG, JPEG) -> multimodal Gemini
                file_bytes = DocumentService.get_file_bytes(report.storage_path)
                extraction = await GeminiExtractionService.extract_structured_data(
                    file_bytes=file_bytes, mime_type=report.mime_type
                )

            # Persist extracted results in atomic transaction
            ReportService._persist_extraction_results(db, report, extraction)

            # Mark REVIEW_REQUIRED (never automatically VERIFIED)
            report.processing_status = "REVIEW_REQUIRED"
            report.extraction_status = "COMPLETED"
            report.extraction_error = None
            db.commit()
            db.refresh(report)

            return report

        except Exception as e:
            db.rollback()
            logger.error(f"Error processing report {report_id}: {str(e)}")
            report.processing_status = "FAILED"
            report.extraction_status = "FAILED"
            report.extraction_error = str(e)
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Report processing failed: {str(e)}",
            )

    @staticmethod
    def _persist_extraction_results(
        db: Session, report: MedicalReport, extraction: ReportExtraction
    ) -> None:
        """Persist structured extraction records into database with REPORT_EXTRACTED provenance."""
        # 1. Update report metadata
        if extraction.report_type:
            report.report_type = extraction.report_type
        if extraction.facility_name:
            report.facility_name = extraction.facility_name
        if extraction.physician_name:
            report.physician_name = extraction.physician_name
        if extraction.report_date:
            try:
                # Try parsing date string
                report.report_date = date.fromisoformat(extraction.report_date)
            except (ValueError, TypeError):
                pass

        # 2. Clear any previous extraction items for this report (idempotency on reprocess)
        db.query(LabResult).filter(LabResult.report_id == report.id).delete()
        db.query(ReportObservation).filter(ReportObservation.report_id == report.id).delete()
        db.query(ReportMedication).filter(ReportMedication.report_id == report.id).delete()

        # 3. Insert Laboratory Results
        for lab in extraction.laboratory_results:
            db_lab = LabResult(
                report_id=report.id,
                patient_id=report.patient_id,
                test_name=lab.test_name,
                value_raw=lab.value_raw,
                value_numeric=lab.value_numeric,
                unit=lab.unit,
                reference_range_raw=lab.reference_range_raw,
                reference_low=lab.reference_low,
                reference_high=lab.reference_high,
                reference_unit=lab.reference_unit,
                observation=lab.observation,
                report_date=report.report_date,
                source_page=lab.source_page,
                source_text=lab.source_text,
                provenance_tag="REPORT_EXTRACTED",
                verification_status="UNVERIFIED",
            )
            db.add(db_lab)

        # 4. Insert Observations & Explicit Diagnoses
        for obs in extraction.observations:
            db_obs = ReportObservation(
                report_id=report.id,
                patient_id=report.patient_id,
                category=obs.category,
                description=obs.description,
                source_page=obs.source_page,
                source_text=obs.source_text,
                provenance_tag="REPORT_EXTRACTED",
                verification_status="UNVERIFIED",
            )
            db.add(db_obs)

        # Diagnoses as stated in the report
        for diag in extraction.diagnoses_or_conditions_as_stated:
            db_diag = ReportObservation(
                report_id=report.id,
                patient_id=report.patient_id,
                category="DIAGNOSIS_AS_STATED",
                description=diag,
                source_page=None,
                source_text=diag,
                provenance_tag="REPORT_EXTRACTED",
                verification_status="UNVERIFIED",
            )
            db.add(db_diag)

        # 5. Insert Medications
        for med in extraction.medications:
            db_med = ReportMedication(
                report_id=report.id,
                patient_id=report.patient_id,
                medication_name=med.medication_name,
                dosage=med.dosage,
                frequency=med.frequency,
                route=med.route,
                instructions=med.instructions,
                source_page=med.source_page,
                source_text=med.source_text,
                provenance_tag="REPORT_EXTRACTED",
                verification_status="UNVERIFIED",
            )
            db.add(db_med)

    @staticmethod
    def get_patient_reports(db: Session, patient_id: int) -> List[MedicalReport]:
        """Fetch all reports for a specific patient."""
        return (
            db.query(MedicalReport)
            .filter(MedicalReport.patient_id == patient_id)
            .order_by(MedicalReport.created_at.desc())
            .all()
        )

    @staticmethod
    def get_report_by_id(db: Session, report_id: int) -> MedicalReport:
        """Fetch report by primary key or raise 404."""
        report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Medical report with ID {report_id} not found.",
            )
        return report

    @staticmethod
    def update_report_metadata(
        db: Session, report_id: int, update_data: MedicalReportUpdate
    ) -> MedicalReport:
        """Safely update editable metadata on medical report."""
        report = ReportService.get_report_by_id(db, report_id)
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(report, key, value)
        report.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(report)
        return report

    @staticmethod
    def verify_lab_result(
        db: Session, report_id: int, result_id: int, update_data: LabResultVerificationUpdate
    ) -> LabResult:
        """
        Record clinician verification, edit, or rejection.
        Preserves original raw values and provenance.
        """
        result = (
            db.query(LabResult)
            .filter(LabResult.id == result_id, LabResult.report_id == report_id)
            .first()
        )
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Lab result with ID {result_id} not found on report {report_id}.",
            )

        status_val = update_data.verification_status.upper()
        if status_val not in {"VERIFIED", "REJECTED", "UNVERIFIED"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification status '{status_val}'. Must be VERIFIED, REJECTED, or UNVERIFIED.",
            )

        result.verification_status = status_val
        if update_data.verified_value is not None:
            result.verified_value = update_data.verified_value
        result.verified_by = update_data.verified_by
        result.verification_notes = update_data.verification_notes
        result.verified_at = datetime.now(timezone.utc)
        result.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(result)
        return result
