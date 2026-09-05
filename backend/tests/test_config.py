"""Tests for centralized application configuration."""
from app.core.config import settings


def test_settings_loaded():
    """Verify application configuration has correct defaults."""
    assert settings.PROJECT_NAME == "MedLens API"
    assert settings.VERSION == "0.1.0"
    assert settings.DATABASE_URL.startswith("sqlite")
    assert isinstance(settings.CORS_ORIGINS, list)
    assert len(settings.CORS_ORIGINS) > 0
