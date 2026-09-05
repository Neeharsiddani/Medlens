"""Patient AI Summary SQLAlchemy model for Phase 5."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class PatientSummary(Base):
    """Patient-friendly AI-generated summary entity grounded strictly in structured records."""
    __tablename__ = "patient_summaries"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(
        Integer,
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Core structured explanation content
    summary_text = Column(Text, nullable=False)
    key_observations = Column(JSON, nullable=False, default=list)
    data_limitations = Column(JSON, nullable=False, default=list)

    # Strict provenance semantics (Backend assigned, never trusted from Gemini)
    provenance_tag = Column(String(50), nullable=False, default="AI_GENERATED")
    model_name = Column(String(100), nullable=False)

    # Source data fingerprint for reliable staleness detection
    source_fingerprint = Column(String(64), nullable=True, index=True)

    # Lifecycle timestamps
    generated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationship
    patient = relationship("Patient", back_populates="summaries")
