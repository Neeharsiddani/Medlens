"""Patient AI Summary API endpoints for Phase 5."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.summary import PatientSummaryResponse
from app.services.summary_service import PatientSummaryService

router = APIRouter(prefix="/patients", tags=["Patient Summaries"])


@router.post(
    "/{patient_id}/summary",
    response_model=PatientSummaryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate or regenerate patient-friendly AI summary",
    description="Generates an AI summary grounded strictly in the patient's structured health record with Pydantic validation.",
)
async def generate_patient_summary(
    patient_id: int,
    db: Session = Depends(get_db),
) -> PatientSummaryResponse:
    return await PatientSummaryService.generate_summary(db=db, patient_id=patient_id)


@router.get(
    "/{patient_id}/summary",
    response_model=PatientSummaryResponse,
    summary="Get latest patient-friendly AI summary",
    description="Retrieves the most recently generated patient summary from the database.",
)
def get_patient_summary(
    patient_id: int,
    db: Session = Depends(get_db),
) -> PatientSummaryResponse:
    return PatientSummaryService.get_summary_response(db=db, patient_id=patient_id)
