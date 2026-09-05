"""Patient intake API endpoints."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.patient import (
    PatientCreate,
    PatientUpdate,
    PatientResponse,
    PatientListResponse,
)
from app.services import patient_service
from app.services.patient_service import PatientIdentifierConflictError

router = APIRouter()


@router.post(
    "",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create patient intake record",
    description="Registers a new patient with structured clinical intake data tagged as USER_PROVIDED.",
)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
) -> PatientResponse:
    try:
        patient = patient_service.create_patient(db=db, patient_in=patient_in)
        return patient
    except PatientIdentifierConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.get(
    "",
    response_model=PatientListResponse,
    status_code=status.HTTP_200_OK,
    summary="List patient records",
    description="Returns a paginated list of patients with optional search by name or MRN.",
)
def list_patients(
    skip: int = Query(0, ge=0, description="Offset for pagination"),
    limit: int = Query(50, ge=1, le=100, description="Page limit"),
    search: Optional[str] = Query(None, description="Search term for name or identifier"),
    db: Session = Depends(get_db),
) -> PatientListResponse:
    patients, total = patient_service.list_patients(
        db=db, skip=skip, limit=limit, search=search
    )
    return PatientListResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=patients,
    )


@router.get(
    "/{patient_id}",
    response_model=PatientResponse,
    status_code=status.HTTP_200_OK,
    summary="Get patient details",
    description="Retrieves a patient intake record by its unique database ID.",
)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
) -> PatientResponse:
    patient = patient_service.get_patient_by_id(db=db, patient_id=patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found.",
        )
    return patient


@router.put(
    "/{patient_id}",
    response_model=PatientResponse,
    status_code=status.HTTP_200_OK,
    summary="Update patient record",
    description="Updates existing patient demographics, symptoms, conditions, allergies, or medications.",
)
def update_patient(
    patient_id: int,
    patient_in: PatientUpdate,
    db: Session = Depends(get_db),
) -> PatientResponse:
    patient = patient_service.get_patient_by_id(db=db, patient_id=patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found.",
        )
    try:
        updated = patient_service.update_patient(
            db=db, patient=patient, patient_in=patient_in
        )
        return updated
    except PatientIdentifierConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete patient record",
    description="Removes a patient record from the database.",
)
def delete_patient(
    patient_id: int,
    db: Session = Depends(get_db),
):
    patient = patient_service.get_patient_by_id(db=db, patient_id=patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found.",
        )
    patient_service.delete_patient(db=db, patient=patient)
    return None
