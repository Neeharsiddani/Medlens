"""Pydantic v2 schemas for Phase 5 AI-Powered Patient-Friendly Summary."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.common import BaseSchema


class ControlledSummaryInput(BaseModel):
    """Structured, controlled payload constructed from database records for summary generation."""
    model_config = ConfigDict(str_strip_whitespace=True)

    patient_identifier: str
    age: Optional[int] = None
    sex: Optional[str] = None
    symptoms: List[Dict[str, Any]] = Field(default_factory=list)
    existing_conditions: List[Dict[str, Any]] = Field(default_factory=list)
    allergies: List[Dict[str, Any]] = Field(default_factory=list)
    medications: List[Dict[str, Any]] = Field(default_factory=list)
    other_information: Optional[str] = None
    laboratory_results: List[Dict[str, Any]] = Field(default_factory=list)
    observations: List[Dict[str, Any]] = Field(default_factory=list)
    report_medications: List[Dict[str, Any]] = Field(default_factory=list)


class PatientSummaryOutput(BaseModel):
    """Strict Pydantic validation gate for Gemini structured summary response."""
    model_config = ConfigDict(str_strip_whitespace=True)

    summary_text: str = Field(
        ...,
        description="Concise, plain-language patient summary grounded strictly in the structured record without diagnosis or treatment advice.",
    )
    key_observations: List[str] = Field(
        default_factory=list,
        description="Key factual observations directly grounded in the record.",
    )
    data_limitations: List[str] = Field(
        default_factory=list,
        description="Explicit statements of missing information, unverified results, or unstated reference ranges.",
    )


class PatientSummaryResponse(BaseSchema):
    """API response model for persisted patient summaries."""
    id: int
    patient_id: int
    summary_text: str
    key_observations: List[str] = []
    data_limitations: List[str] = []
    provenance_tag: str = "AI_GENERATED"
    model_name: str
    source_fingerprint: Optional[str] = None
    is_stale: bool = False
    generated_at: datetime
    created_at: datetime
