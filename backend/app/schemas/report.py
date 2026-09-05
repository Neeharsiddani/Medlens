"""Pydantic v2 schemas for Phase 3 Medical Report Processing & Structured Extraction."""
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.common import BaseSchema


# ==============================================================================
# Strict Extraction Schemas (Target for Gemini Structured Output & Validation)
# ==============================================================================

class ExtractedLabResult(BaseModel):
    """Schema for individual laboratory results extracted from report."""
    model_config = ConfigDict(str_strip_whitespace=True)

    test_name: str = Field(..., description="Name of the test, exactly as written")
    value_raw: str = Field(..., description="Exact raw value as written in the report")
    value_numeric: Optional[float] = Field(None, description="Numeric value if parsed, or null")
    unit: Optional[str] = Field(None, description="Unit of measurement or null")
    reference_range_raw: Optional[str] = Field(
        None, 
        description="Exact reference range string from source document (e.g. '12.0 - 16.0', '> 40'). Null if missing."
    )
    reference_low: Optional[float] = Field(None, description="Lower bound if numeric and explicitly present")
    reference_high: Optional[float] = Field(None, description="Upper bound if numeric and explicitly present")
    reference_unit: Optional[str] = Field(None, description="Unit for reference range if present")
    observation: Optional[str] = Field(None, description="Observation or note explicitly attached in document")
    source_page: Optional[int] = Field(None, description="1-indexed page number where found, or null")
    source_text: Optional[str] = Field(None, description="Exact line or text snippet where test appears")
    provenance_tag: str = Field("REPORT_EXTRACTED", description="Always REPORT_EXTRACTED")
    verification_status: str = Field("UNVERIFIED", description="Always UNVERIFIED initially")


class ExtractedObservation(BaseModel):
    """Clinical observation or finding explicitly noted in the report."""
    model_config = ConfigDict(str_strip_whitespace=True)

    category: str = Field(
        "CLINICAL_OBSERVATION", 
        description="CLINICAL_OBSERVATION, DIAGNOSIS_AS_STATED, FINDING, or OTHER"
    )
    description: str = Field(..., description="Text description of the finding or note")
    source_page: Optional[int] = Field(None, description="1-indexed page number if known")
    source_text: Optional[str] = Field(None, description="Exact text excerpt from report")
    provenance_tag: str = Field("REPORT_EXTRACTED")
    verification_status: str = Field("UNVERIFIED")


class ExtractedMedication(BaseModel):
    """Medication explicitly mentioned in the report."""
    model_config = ConfigDict(str_strip_whitespace=True)

    medication_name: str = Field(..., description="Name of the medication")
    dosage: Optional[str] = Field(None, description="Dosage or strength")
    frequency: Optional[str] = Field(None, description="Frequency (e.g. BID, once daily)")
    route: Optional[str] = Field(None, description="Route (e.g. Oral, IV)")
    instructions: Optional[str] = Field(None, description="Special instructions")
    source_page: Optional[int] = Field(None, description="1-indexed page number if known")
    source_text: Optional[str] = Field(None, description="Exact text excerpt from report")
    provenance_tag: str = Field("REPORT_EXTRACTED")
    verification_status: str = Field("UNVERIFIED")


class ReportExtraction(BaseModel):
    """Strict structured schema returned by Gemini and validated before persistence."""
    model_config = ConfigDict(str_strip_whitespace=True)

    report_type: str = Field(
        "OTHER",
        description="One of: LABORATORY_REPORT, PRESCRIPTION, DISCHARGE_SUMMARY, CONSULTATION_NOTE, MEDICAL_HISTORY, OTHER"
    )
    report_date: Optional[str] = Field(None, description="YYYY-MM-DD or string date if present in document")
    facility_name: Optional[str] = Field(None, description="Facility / clinic / hospital name if explicitly present")
    physician_name: Optional[str] = Field(None, description="Physician / clinician name if explicitly present")
    observations: List[ExtractedObservation] = Field(default_factory=list)
    laboratory_results: List[ExtractedLabResult] = Field(default_factory=list)
    medications: List[ExtractedMedication] = Field(default_factory=list)
    diagnoses_or_conditions_as_stated: List[str] = Field(
        default_factory=list,
        description="ONLY conditions or diagnoses explicitly stated in text. Never inferred."
    )
    other_clinical_information: Optional[str] = Field(None, description="Any other clinical information")


# ==============================================================================
# Database / API Models (ORM-Compatible)
# ==============================================================================

class LabResultResponse(BaseSchema):
    id: int
    report_id: int
    patient_id: int
    test_name: str
    value_raw: str
    value_numeric: Optional[float] = None
    unit: Optional[str] = None
    reference_range_raw: Optional[str] = None
    reference_low: Optional[float] = None
    reference_high: Optional[float] = None
    reference_unit: Optional[str] = None
    observation: Optional[str] = None
    report_date: Optional[date] = None
    source_page: Optional[int] = None
    source_text: Optional[str] = None
    provenance_tag: str
    verification_status: str
    verified_value: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ReportObservationResponse(BaseSchema):
    id: int
    report_id: int
    patient_id: int
    category: str
    description: str
    source_page: Optional[int] = None
    source_text: Optional[str] = None
    provenance_tag: str
    verification_status: str
    created_at: datetime


class ReportMedicationResponse(BaseSchema):
    id: int
    report_id: int
    patient_id: int
    medication_name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    route: Optional[str] = None
    instructions: Optional[str] = None
    source_page: Optional[int] = None
    source_text: Optional[str] = None
    provenance_tag: str
    verification_status: str
    created_at: datetime


class MedicalReportResponse(BaseSchema):
    id: int
    patient_id: int
    original_filename: str
    stored_filename: str
    mime_type: str
    file_size: int
    document_hash: str
    report_type: str
    report_date: Optional[date] = None
    facility_name: Optional[str] = None
    physician_name: Optional[str] = None
    processing_status: str
    extraction_status: str
    extraction_error: Optional[str] = None
    provenance_tag: str
    uploaded_at: datetime
    created_at: datetime
    updated_at: datetime


class MedicalReportDetailResponse(MedicalReportResponse):
    """Full medical report with nested extraction records."""
    lab_results: List[LabResultResponse] = []
    observations: List[ReportObservationResponse] = []
    medications: List[ReportMedicationResponse] = []


class MedicalReportListResponse(BaseSchema):
    total: int
    reports: List[MedicalReportResponse]


class MedicalReportUpdate(BaseModel):
    report_type: Optional[str] = None
    report_date: Optional[date] = None
    facility_name: Optional[str] = None
    physician_name: Optional[str] = None
    processing_status: Optional[str] = None


class LabResultVerificationUpdate(BaseModel):
    """Payload for human verification, edit, or rejection of a lab result."""
    verification_status: str = Field(..., description="VERIFIED, REJECTED, or UNVERIFIED")
    verified_value: Optional[str] = Field(None, description="Human-edited or confirmed value. Preserves value_raw.")
    verified_by: Optional[str] = Field("Clinician Reviewer", description="Name/role of reviewer")
    verification_notes: Optional[str] = Field(None, description="Optional clinician review notes")
