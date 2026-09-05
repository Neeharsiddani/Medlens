"""Pytest configuration for MedLens test isolation.

Ensures that automated tests execute against an isolated temporary SQLite database
and isolated temporary upload directory, guaranteeing zero side-effects or writes
to production backend/medlens.db and backend/uploads/.
"""
import os
import tempfile
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. Create a dedicated temporary directory for test DB and file uploads
_test_dir = tempfile.TemporaryDirectory()
_test_db_path = os.path.join(_test_dir.name, "test_medlens.db")
_test_upload_dir = os.path.join(_test_dir.name, "uploads")
os.makedirs(_test_upload_dir, exist_ok=True)

# 2. Configure environment overrides
os.environ["DATABASE_URL"] = f"sqlite:///{_test_db_path}"
os.environ["UPLOAD_DIR"] = _test_upload_dir

from app.core.config import settings
settings.DATABASE_URL = f"sqlite:///{_test_db_path}"
settings.UPLOAD_DIR = _test_upload_dir

# 3. Create test database engine and tables
import app.db.database as db_module
from app.db.base import Base

# Import all models to ensure full schema registration
import app.models.patient
import app.models.report
import app.models.summary

test_engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)
Base.metadata.create_all(bind=test_engine)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# 4. Patch database module references so direct imports use the test database
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal

# 5. Override FastAPI dependency
from app.main import app
from app.db.database import get_db

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session", autouse=True)
def isolated_test_environment():
    """Ensure test environment is active and cleanup temporary directory at test exit."""
    yield
    try:
        _test_dir.cleanup()
    except Exception:
        pass
