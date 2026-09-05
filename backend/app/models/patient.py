"""Patient SQLAlchemy model with structured clinical intake attributes."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Date, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from app.db.base import Base


class Patient(Base):
    """Patient entity representing clinical demographic and intake records."""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Unique clinical identifier (e.g. MRN, PAT-2026-0001)
    patient_identifier = Column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
        default=lambda: f"PAT-{uuid.uuid4().hex[:8].upper()}",
    )
    
    # Demographics
    full_name = Column(String(255), nullable=False, index=True, default="Unknown Patient")
    date_of_birth = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    sex = Column(String(50), nullable=True)  # MALE, FEMALE, OTHER, UNKNOWN
    
    # Structured clinical intake items (stored as typed JSON lists)
    symptoms = Column(JSON, nullable=False, default=list)
    existing_conditions = Column(JSON, nullable=False, default=list)
    allergies = Column(JSON, nullable=False, default=list)
    medications = Column(JSON, nullable=False, default=list)
    
    # Additional unstructured notes / context
    other_information = Column(Text, nullable=True)
    
    # Provenance semantics (distinguishes USER_PROVIDED from future REPORT_EXTRACTED)
    provenance_tag = Column(String(50), nullable=False, default="USER_PROVIDED")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Medical reports relationship (Phase 3)
    reports = relationship("MedicalReport", back_populates="patient", cascade="all, delete-orphan")

    # Patient AI summaries relationship (Phase 5)
    summaries = relationship("PatientSummary", back_populates="patient", cascade="all, delete-orphan", order_by="desc(PatientSummary.generated_at)")

    # Compatibility aliases for Phase 1 code
    @property
    def name(self) -> str:
        return self.full_name

    @name.setter
    def name(self, value: str):
        self.full_name = value

    @property
    def gender(self) -> str:
        return self.sex

    @gender.setter
    def gender(self, value: str):
        self.sex = value
