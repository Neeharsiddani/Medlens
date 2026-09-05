"""SQLAlchemy models for Phase 3 Medical Report Processing & Structured Extraction."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Date, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class MedicalReport(Base):
    """Medical report document metadata and processing status entity."""
    __tablename__ = "medical_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    
    # Document storage attributes
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    storage_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)  # in bytes
    document_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    
    # Clinical report categorization & metadata
    # Types: LABORATORY_REPORT, PRESCRIPTION, DISCHARGE_SUMMARY, CONSULTATION_NOTE, MEDICAL_HISTORY, OTHER
    report_type = Column(String(50), nullable=False, default="OTHER")
    report_date = Column(Date, nullable=True)
    facility_name = Column(String(255), nullable=True)
    physician_name = Column(String(255), nullable=True)
    
    # Processing lifecycle statuses
    # processing_status: UPLOADED, PROCESSING, EXTRACTED, REVIEW_REQUIRED, FAILED
    processing_status = Column(String(50), nullable=False, default="UPLOADED")
    # extraction_status: PENDING, COMPLETED, FAILED
    extraction_status = Column(String(50), nullable=False, default="PENDING")
    extraction_error = Column(Text, nullable=True)
    
    # Provenance tracking
    provenance_tag = Column(String(50), nullable=False, default="REPORT_EXTRACTED")
    
    # Timestamps
    uploaded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    patient = relationship("Patient", back_populates="reports")
    lab_results = relationship("LabResult", back_populates="report", cascade="all, delete-orphan")
    observations = relationship("ReportObservation", back_populates="report", cascade="all, delete-orphan")
    medications = relationship("ReportMedication", back_populates="report", cascade="all, delete-orphan")


class LabResult(Base):
    """Structured laboratory result extracted strictly from medical reports."""
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(
        Integer,
        ForeignKey("medical_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Test identity and values
    test_name = Column(String(255), nullable=False, index=True)
    value_raw = Column(String(255), nullable=False)  # Exact string from source document
    value_numeric = Column(Float, nullable=True)     # Clean parsed float if numeric
    unit = Column(String(100), nullable=True)

    # Reference range - strictly preserved as written in report
    reference_range_raw = Column(String(255), nullable=True)  # E.g. "12.0 - 16.0", "> 40", "Negative"
    reference_low = Column(Float, nullable=True)
    reference_high = Column(Float, nullable=True)
    reference_unit = Column(String(100), nullable=True)

    observation = Column(Text, nullable=True)
    report_date = Column(Date, nullable=True)

    # Provenance & Source Traceability
    source_page = Column(Integer, nullable=True)     # Page number in original document if known
    source_text = Column(Text, nullable=True)        # Exact line or excerpt from source
    provenance_tag = Column(String(50), nullable=False, default="REPORT_EXTRACTED")
    
    # Human Review & Verification (starts UNVERIFIED)
    verification_status = Column(String(50), nullable=False, default="UNVERIFIED")  # UNVERIFIED, VERIFIED, REJECTED
    verified_value = Column(String(255), nullable=True)  # If human edits, store here; value_raw is immutable
    verified_by = Column(String(255), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    verification_notes = Column(Text, nullable=True)

    # Deterministic Reference-Range Awareness (Phase 4)
    # Statuses: LOW, NORMAL, HIGH, NO_RANGE_AVAILABLE, UNDETERMINED
    reference_range_status = Column(String(50), nullable=False, default="UNDETERMINED", index=True)
    verified_classification = Column(String(50), nullable=True)
    classification_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationship
    report = relationship("MedicalReport", back_populates="lab_results")


class ReportObservation(Base):
    """Clinical observations and explicitly stated conditions extracted from report."""
    __tablename__ = "report_observations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(
        Integer,
        ForeignKey("medical_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Category: DIAGNOSIS_AS_STATED, CLINICAL_OBSERVATION, FINDING, OTHER
    category = Column(String(100), nullable=False, default="CLINICAL_OBSERVATION")
    description = Column(Text, nullable=False)
    
    source_page = Column(Integer, nullable=True)
    source_text = Column(Text, nullable=True)
    provenance_tag = Column(String(50), nullable=False, default="REPORT_EXTRACTED")
    verification_status = Column(String(50), nullable=False, default="UNVERIFIED")  # UNVERIFIED, VERIFIED, REJECTED

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship
    report = relationship("MedicalReport", back_populates="observations")


class ReportMedication(Base):
    """Medications explicitly mentioned in report (e.g. discharge prescription)."""
    __tablename__ = "report_medications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(
        Integer,
        ForeignKey("medical_reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    medication_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=True)
    frequency = Column(String(100), nullable=True)
    route = Column(String(100), nullable=True)
    instructions = Column(Text, nullable=True)

    source_page = Column(Integer, nullable=True)
    source_text = Column(Text, nullable=True)
    provenance_tag = Column(String(50), nullable=False, default="REPORT_EXTRACTED")
    verification_status = Column(String(50), nullable=False, default="UNVERIFIED")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship
    report = relationship("MedicalReport", back_populates="medications")
