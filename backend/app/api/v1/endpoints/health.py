"""Health check endpoint implementation."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.health import HealthResponse
from app.services.health_service import check_system_health

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Returns backend service health and database connectivity status.",
)
def get_health(db: Session = Depends(get_db)) -> HealthResponse:
    """Check health of application and database."""
    return check_system_health(db)

