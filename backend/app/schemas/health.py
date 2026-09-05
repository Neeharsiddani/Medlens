"""Schemas for application health check."""
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Structured response model for GET /health."""
    status: str = Field(..., description="Overall health status (e.g. 'ok')")
    service: str = Field(..., description="Name of the backend service")
    version: str = Field(..., description="Application version")
    database: str = Field(..., description="Database connectivity status ('connected' | 'disconnected')")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Current server UTC timestamp",
    )
