"""Patient Pydantic v2 schemas with structured clinical intake validations."""
from datetime import date, datetime
from enum import Enum
from typing import List, Optional, Union
from pydantic import Field, field_validator, model_validator
from app.schemas.common import BaseSchema


class SexEnum(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


# Structured Clinical Intake Item Models (Tagged as USER_PROVIDED)
class SymptomItem(BaseSchema):
    symptom: str = Field(..., min_length=1, max_length=255, description="Presenting complaint or symptom")
    duration: Optional[str] = Field(None, max_length=100, description="e.g. '3 days', '2 weeks'")
    severity: Optional[str] = Field(None, max_length=50, description="e.g. Mild, Moderate, Severe")
    source: str = Field(default="USER_PROVIDED", description="Data provenance tag")


class ConditionItem(BaseSchema):
    condition: str = Field(..., min_length=1, max_length=255, description="Diagnosed medical condition")
    diagnosed_year: Optional[str] = Field(None, max_length=50, description="Year or onset timeframe")
    notes: Optional[str] = Field(None, max_length=500, description="Clinical context or notes")
    source: str = Field(default="USER_PROVIDED", description="Data provenance tag")


class AllergyItem(BaseSchema):
    allergen: str = Field(..., min_length=1, max_length=255, description="Substance or drug allergen")
    reaction: Optional[str] = Field(None, max_length=255, description="e.g. Rash, Anaphylaxis, Swelling")
    severity: Optional[str] = Field(None, max_length=50, description="e.g. Mild, Moderate, Severe")
    source: str = Field(default="USER_PROVIDED", description="Data provenance tag")


class MedicationItem(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255, description="Medication name")
    dosage: Optional[str] = Field(None, max_length=100, description="e.g. 500mg, 10ml")
    frequency: Optional[str] = Field(None, max_length=100, description="e.g. Once daily, PRN")
    source: str = Field(default="USER_PROVIDED", description="Data provenance tag")


def _normalize_symptoms(items: Optional[List[Union[str, SymptomItem, dict]]]) -> List[SymptomItem]:
    if not items:
        return []
    normalized: List[SymptomItem] = []
    for item in items:
        if isinstance(item, str):
            trimmed = item.strip()
            if trimmed:
                normalized.append(SymptomItem(symptom=trimmed))
        elif isinstance(item, dict):
            if item.get("symptom", "").strip():
                normalized.append(SymptomItem(**item))
        elif isinstance(item, SymptomItem):
            if item.symptom.strip():
                normalized.append(item)
    return normalized


def _normalize_conditions(items: Optional[List[Union[str, ConditionItem, dict]]]) -> List[ConditionItem]:
    if not items:
        return []
    normalized: List[ConditionItem] = []
    for item in items:
        if isinstance(item, str):
            trimmed = item.strip()
            if trimmed:
                normalized.append(ConditionItem(condition=trimmed))
        elif isinstance(item, dict):
            if item.get("condition", "").strip():
                normalized.append(ConditionItem(**item))
        elif isinstance(item, ConditionItem):
            if item.condition.strip():
                normalized.append(item)
    return normalized


def _normalize_allergies(items: Optional[List[Union[str, AllergyItem, dict]]]) -> List[AllergyItem]:
    if not items:
        return []
    normalized: List[AllergyItem] = []
    for item in items:
        if isinstance(item, str):
            trimmed = item.strip()
            if trimmed:
                normalized.append(AllergyItem(allergen=trimmed))
        elif isinstance(item, dict):
            if item.get("allergen", "").strip():
                normalized.append(AllergyItem(**item))
        elif isinstance(item, AllergyItem):
            if item.allergen.strip():
                normalized.append(item)
    return normalized


def _normalize_medications(items: Optional[List[Union[str, MedicationItem, dict]]]) -> List[MedicationItem]:
    if not items:
        return []
    normalized: List[MedicationItem] = []
    for item in items:
        if isinstance(item, str):
            trimmed = item.strip()
            if trimmed:
                normalized.append(MedicationItem(name=trimmed))
        elif isinstance(item, dict):
            if item.get("name", "").strip():
                normalized.append(MedicationItem(**item))
        elif isinstance(item, MedicationItem):
            if item.name.strip():
                normalized.append(item)
    return normalized


class PatientBase(BaseSchema):
    """Base schema with common clinical fields and validations."""
    full_name: str = Field(..., min_length=1, max_length=255, description="Patient's full legal name")
    patient_identifier: Optional[str] = Field(None, min_length=1, max_length=64, description="Clinical identifier / MRN")
    date_of_birth: Optional[date] = Field(None, description="Date of birth (YYYY-MM-DD)")
    age: Optional[int] = Field(None, ge=0, le=150, description="Age in completed years")
    sex: Optional[SexEnum] = Field(None, description="Biological sex (MALE, FEMALE, OTHER, UNKNOWN)")
    
    symptoms: List[SymptomItem] = Field(default_factory=list, description="Presenting complaints / symptoms")
    existing_conditions: List[ConditionItem] = Field(default_factory=list, description="Past medical history / conditions")
    allergies: List[AllergyItem] = Field(default_factory=list, description="Known drug and environmental allergies")
    medications: List[MedicationItem] = Field(default_factory=list, description="Active medications")
    
    other_information: Optional[str] = Field(None, max_length=5000, description="Additional notes / user-provided context")

    @field_validator("sex", mode="before")
    @classmethod
    def parse_sex(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            upper_v = v.strip().upper()
            if upper_v in SexEnum.__members__:
                return SexEnum[upper_v]
            raise ValueError(f"Sex must be one of: {', '.join(SexEnum.__members__.keys())}")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob_not_future(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v

    @field_validator("symptoms", mode="before")
    @classmethod
    def validate_symptoms(cls, v):
        return _normalize_symptoms(v)

    @field_validator("existing_conditions", mode="before")
    @classmethod
    def validate_conditions(cls, v):
        return _normalize_conditions(v)

    @field_validator("allergies", mode="before")
    @classmethod
    def validate_allergies(cls, v):
        return _normalize_allergies(v)

    @field_validator("medications", mode="before")
    @classmethod
    def validate_medications(cls, v):
        return _normalize_medications(v)


class PatientCreate(PatientBase):
    """Schema for patient intake creation."""
    @model_validator(mode="after")
    def validate_age_or_dob(self) -> "PatientCreate":
        if self.date_of_birth is None and self.age is None:
            raise ValueError("Either Date of Birth or Age must be provided for patient intake")
        
        # Calculate age if DOB provided and age missing
        if self.date_of_birth is not None and self.age is None:
            today = date.today()
            calculated_age = today.year - self.date_of_birth.year - (
                (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
            )
            self.age = max(0, calculated_age)
        return self


class PatientUpdate(BaseSchema):
    """Schema for updating an existing patient record."""
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    patient_identifier: Optional[str] = Field(None, min_length=1, max_length=64)
    date_of_birth: Optional[date] = None
    age: Optional[int] = Field(None, ge=0, le=150)
    sex: Optional[SexEnum] = None
    
    symptoms: Optional[List[Union[str, SymptomItem, dict]]] = None
    existing_conditions: Optional[List[Union[str, ConditionItem, dict]]] = None
    allergies: Optional[List[Union[str, AllergyItem, dict]]] = None
    medications: Optional[List[Union[str, MedicationItem, dict]]] = None
    
    other_information: Optional[str] = Field(None, max_length=5000)

    @field_validator("sex", mode="before")
    @classmethod
    def parse_sex(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            upper_v = v.strip().upper()
            if upper_v in SexEnum.__members__:
                return SexEnum[upper_v]
            raise ValueError(f"Sex must be one of: {', '.join(SexEnum.__members__.keys())}")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob_not_future(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v

    @field_validator("symptoms", mode="before")
    @classmethod
    def validate_symptoms(cls, v):
        return _normalize_symptoms(v) if v is not None else None

    @field_validator("existing_conditions", mode="before")
    @classmethod
    def validate_conditions(cls, v):
        return _normalize_conditions(v) if v is not None else None

    @field_validator("allergies", mode="before")
    @classmethod
    def validate_allergies(cls, v):
        return _normalize_allergies(v) if v is not None else None

    @field_validator("medications", mode="before")
    @classmethod
    def validate_medications(cls, v):
        return _normalize_medications(v) if v is not None else None


class PatientResponse(PatientBase):
    """Schema for returning full patient details."""
    id: int
    patient_identifier: str
    provenance_tag: str = Field(default="USER_PROVIDED")
    created_at: datetime
    updated_at: datetime


class PatientListResponse(BaseSchema):
    """Paginated response containing a list of patients."""
    total: int
    skip: int
    limit: int
    items: List[PatientResponse]
