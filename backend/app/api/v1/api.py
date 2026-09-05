"""API v1 router registry."""
from fastapi import APIRouter
from app.api.v1.endpoints import health, patients

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
