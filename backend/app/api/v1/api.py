"""API v1 router registry."""
from fastapi import APIRouter
from app.api.v1.endpoints import health, patients, reports

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(patients.router, prefix="/patients", tags=["Patients"])
api_router.include_router(reports.patient_reports_router)
api_router.include_router(reports.reports_router)
