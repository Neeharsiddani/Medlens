"""Service layer handling patient intake business logic and database operations."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import or_, func
from sqlalchemy.orm import Session
from app.models.patient import Patient
from app.schemas.patient import PatientCreate, PatientUpdate


class PatientIdentifierConflictError(Exception):
    """Raised when a patient with the requested identifier already exists."""
    pass


def _generate_patient_identifier() -> str:
    """Generate a clean, professional clinical MRN / Patient ID."""
    today_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    unique_suffix = uuid.uuid4().hex[:5].upper()
    return f"PAT-{today_str}-{unique_suffix}"


def get_patient_by_id(db: Session, patient_id: int) -> Optional[Patient]:
    """Retrieve a patient by database primary key ID."""
    return db.query(Patient).filter(Patient.id == patient_id).first()


def get_patient_by_identifier(db: Session, identifier: str) -> Optional[Patient]:
    """Retrieve a patient by their unique clinical identifier (MRN)."""
    return db.query(Patient).filter(Patient.patient_identifier == identifier.strip()).first()


def create_patient(db: Session, patient_in: PatientCreate) -> Patient:
    """Create and persist a new patient record with USER_PROVIDED intake data."""
    # Determine identifier
    identifier = patient_in.patient_identifier.strip() if patient_in.patient_identifier else _generate_patient_identifier()
    
    # Check uniqueness
    existing = get_patient_by_identifier(db, identifier)
    if existing:
        raise PatientIdentifierConflictError(f"Patient with identifier '{identifier}' already exists.")

    # Convert Pydantic item models to plain dicts for JSON storage
    symptoms_data = [item.model_dump() for item in patient_in.symptoms]
    conditions_data = [item.model_dump() for item in patient_in.existing_conditions]
    allergies_data = [item.model_dump() for item in patient_in.allergies]
    medications_data = [item.model_dump() for item in patient_in.medications]

    patient = Patient(
        patient_identifier=identifier,
        full_name=patient_in.full_name.strip(),
        date_of_birth=patient_in.date_of_birth,
        age=patient_in.age,
        sex=patient_in.sex.value if patient_in.sex else None,
        symptoms=symptoms_data,
        existing_conditions=conditions_data,
        allergies=allergies_data,
        medications=medications_data,
        other_information=patient_in.other_information.strip() if patient_in.other_information else None,
        provenance_tag="USER_PROVIDED",
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def list_patients(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
) -> Tuple[List[Patient], int]:
    """List patients with optional search across name and identifier, and total count."""
    query = db.query(Patient)

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Patient.full_name.ilike(term),
                Patient.patient_identifier.ilike(term),
            )
        )

    total = query.count()
    patients = query.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()
    return patients, total


def update_patient(db: Session, patient: Patient, patient_in: PatientUpdate) -> Patient:
    """Safely update an existing patient record."""
    # Check identifier conflict if changed
    if patient_in.patient_identifier:
        new_id = patient_in.patient_identifier.strip()
        if new_id != patient.patient_identifier:
            existing = get_patient_by_identifier(db, new_id)
            if existing and existing.id != patient.id:
                raise PatientIdentifierConflictError(f"Patient with identifier '{new_id}' already exists.")
            patient.patient_identifier = new_id

    if patient_in.full_name is not None:
        patient.full_name = patient_in.full_name.strip()
    if patient_in.date_of_birth is not None:
        patient.date_of_birth = patient_in.date_of_birth
    if patient_in.age is not None:
        patient.age = patient_in.age
    if patient_in.sex is not None:
        patient.sex = patient_in.sex.value if patient_in.sex else None

    if patient_in.symptoms is not None:
        patient.symptoms = [item.model_dump() for item in patient_in.symptoms]
    if patient_in.existing_conditions is not None:
        patient.existing_conditions = [item.model_dump() for item in patient_in.existing_conditions]
    if patient_in.allergies is not None:
        patient.allergies = [item.model_dump() for item in patient_in.allergies]
    if patient_in.medications is not None:
        patient.medications = [item.model_dump() for item in patient_in.medications]

    if patient_in.other_information is not None:
        patient.other_information = patient_in.other_information.strip() if patient_in.other_information else None

    patient.updated_at = datetime.now(timezone.utc)

    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def delete_patient(db: Session, patient: Patient) -> None:
    """Safely delete a patient record."""
    db.delete(patient)
    db.commit()
