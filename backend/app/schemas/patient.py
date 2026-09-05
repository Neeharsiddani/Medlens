"""Patient schema foundations for validation."""
from datetime import datetime
from typing import Optional
from pydantic import Field
from app.schemas.common import BaseSchema


class PatientBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255, description="Patient full name")
    age: Optional[int] = Field(None, ge=0, le=150, description="Patient age in years")
    gender: Optional[str] = Field(None, max_length=50, description="Biological sex / gender")


class PatientCreate(PatientBase):
    pass


class PatientRead(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime
