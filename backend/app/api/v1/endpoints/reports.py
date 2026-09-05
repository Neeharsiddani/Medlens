"""Medical report API endpoints for Phase 3."""
from typing import Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.report import (
    MedicalReportResponse,
    MedicalReportDetailResponse,
    MedicalReportListResponse,
    MedicalReportUpdate,
    LabResultResponse,
    LabResultVerificationUpdate,
)
from app.services.report_service import ReportService

# Router for report-centric endpoints: /api/v1/reports/...
reports_router = APIRouter(prefix="/reports", tags=["Medical Reports"])

# Router for patient-scoped report endpoints: /api/v1/patients/{patient_id}/reports
patient_reports_router = APIRouter(prefix="/patients", tags=["Medical Reports"])


# ==============================================================================
# Patient-Scoped Report Routes: /api/v1/patients/{patient_id}/reports
# ==============================================================================

@patient_reports_router.post(
    "/{patient_id}/reports",
    response_model=MedicalReportDetailResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload medical report document",
    description="Uploads a PDF, PNG, JPG, or JPEG medical report for a patient, verifies integrity, and kicks off structured extraction.",
)
async def upload_medical_report(
    patient_id: int,
    file: UploadFile = File(..., description="PDF or Image medical report file"),
    auto_process: bool = Query(True, description="Whether to automatically run structured extraction after upload"),
    db: Session = Depends(get_db),
):
    # 1. Store and hash report
    report = await ReportService.upload_and_create_report(
        db=db, patient_id=patient_id, file=file
    )

    # 2. Process extraction if auto_process is True
    if auto_process:
        report = await ReportService.process_report(db=db, report_id=report.id)

    return report


@patient_reports_router.get(
    "/{patient_id}/reports",
    response_model=MedicalReportListResponse,
    summary="List patient medical reports",
    description="Retrieves all medical reports associated with a patient.",
)
def list_patient_reports(
    patient_id: int,
    db: Session = Depends(get_db),
):
    reports = ReportService.get_patient_reports(db=db, patient_id=patient_id)
    return {"total": len(reports), "reports": reports}


# ==============================================================================
# Report Direct Routes: /api/v1/reports/...
# ==============================================================================

@reports_router.get(
    "/{report_id}",
    response_model=MedicalReportResponse,
    summary="Get report metadata and processing status",
    description="Fetches document metadata, file size, SHA-256 hash, and extraction status without full nested records.",
)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
):
    return ReportService.get_report_by_id(db=db, report_id=report_id)


@reports_router.get(
    "/{report_id}/extraction",
    response_model=MedicalReportDetailResponse,
    summary="Get structured extracted information",
    description="Fetches full structured medical data including laboratory results, observations, and medications.",
)
def get_report_extraction(
    report_id: int,
    db: Session = Depends(get_db),
):
    return ReportService.get_report_by_id(db=db, report_id=report_id)


@reports_router.post(
    "/{report_id}/process",
    response_model=MedicalReportDetailResponse,
    summary="Process or reprocess medical report",
    description="Triggers the extraction pipeline on an uploaded report.",
)
async def process_report(
    report_id: int,
    db: Session = Depends(get_db),
):
    return await ReportService.process_report(db=db, report_id=report_id)


@reports_router.patch(
    "/{report_id}",
    response_model=MedicalReportResponse,
    summary="Update report metadata",
    description="Allows updating report type, facility, physician, or date.",
)
def update_report(
    report_id: int,
    update_data: MedicalReportUpdate,
    db: Session = Depends(get_db),
):
    return ReportService.update_report_metadata(db=db, report_id=report_id, update_data=update_data)


@reports_router.patch(
    "/{report_id}/lab-results/{result_id}/verify",
    response_model=LabResultResponse,
    summary="Verify, edit, or reject a laboratory result",
    description="Allows clinicians to verify or correct an extracted lab result without modifying original value_raw.",
)
def verify_lab_result(
    report_id: int,
    result_id: int,
    verification_data: LabResultVerificationUpdate,
    db: Session = Depends(get_db),
):
    return ReportService.verify_lab_result(
        db=db,
        report_id=report_id,
        result_id=result_id,
        update_data=verification_data,
    )
