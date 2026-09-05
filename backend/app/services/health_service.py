"""Service logic for health check verification."""
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.config import settings
from app.schemas.health import HealthResponse


def check_system_health(db: Session) -> HealthResponse:
    """Evaluate backend status and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        database=db_status,
    )
