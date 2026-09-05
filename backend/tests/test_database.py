"""Tests for database connectivity and ORM operations."""
from sqlalchemy import text
from app.db.database import engine, SessionLocal, check_db_connection
from app.models.patient import Patient


def test_database_connection_check():
    """Verify check_db_connection function works."""
    assert check_db_connection() is True


def test_session_scope_and_query():
    """Verify basic SQLAlchemy session and query execution."""
    db = SessionLocal()
    try:
        result = db.execute(text("SELECT 1")).scalar()
        assert result == 1
    finally:
        db.close()


def test_patient_model_crud():
    """Verify basic CRUD on the Patient model foundation."""
    db = SessionLocal()
    try:
        # Create
        patient = Patient(name="Test Patient", age=45, gender="Female")
        db.add(patient)
        db.commit()
        db.refresh(patient)
        assert patient.id is not None
        assert patient.name == "Test Patient"
        assert patient.created_at is not None

        # Read
        retrieved = db.query(Patient).filter(Patient.id == patient.id).first()
        assert retrieved is not None
        assert retrieved.name == "Test Patient"

        # Delete (cleanup)
        db.delete(retrieved)
        db.commit()
    finally:
        db.close()
