"""Isolated end-to-end release candidate smoke test for MedLens.

Executes the complete core clinical workflow:
Patient Intake -> Report Upload & SHA-256 -> Extraction -> Range Engine ->
Clinician Verification -> Summary Staleness & Provenance -> Aggregated Metrics.
Runs in an isolated temporary environment to guarantee ZERO contamination of production medlens.db.
"""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import tempfile
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

# Isolated database and upload directory
temp_dir = tempfile.TemporaryDirectory()
temp_db_path = os.path.join(temp_dir.name, "smoke_medlens.db")
temp_upload_dir = os.path.join(temp_dir.name, "smoke_uploads")
os.makedirs(temp_upload_dir, exist_ok=True)

os.environ["DATABASE_URL"] = f"sqlite:///{temp_db_path}"
os.environ["UPLOAD_DIR"] = temp_upload_dir

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
settings.DATABASE_URL = f"sqlite:///{temp_db_path}"
settings.UPLOAD_DIR = temp_upload_dir

from app.db.base import Base
import app.db.database as db_module
import app.models.patient
import app.models.report
import app.models.summary

smoke_engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
Base.metadata.create_all(bind=smoke_engine)
SmokeSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=smoke_engine)

db_module.engine = smoke_engine
db_module.SessionLocal = SmokeSessionLocal

from app.main import app
from app.db.database import get_db

def override_get_db():
    db = SmokeSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

from app.models.patient import Patient
from app.models.report import MedicalReport, LabResult
from app.models.summary import PatientSummary
from app.services.summary_service import PatientSummaryService


def test_core_release_workflow():
    print("\n--- STEP 1: Patient Intake ---")
    intake_payload = {
        "full_name": "Eleanor Vance",
        "date_of_birth": "1988-04-12",
        "age": 38,
        "sex": "FEMALE",
        "symptoms": [{"symptom": "Fatigue and dizziness", "severity": "MODERATE"}],
        "existing_conditions": [{"condition": "Mild Asthma", "notes": "Intermittent"}],
        "allergies": [{"allergen": "Penicillin", "reaction": "Hives"}],
        "medications": [{"name": "Albuterol Inhaler", "dosage": "90 mcg"}],
    }
    res = client.post("/api/v1/patients", json=intake_payload)
    assert res.status_code == 201, res.text
    patient = res.json()
    patient_id = patient["id"]
    assert patient["provenance_tag"] == "USER_PROVIDED"
    assert patient["full_name"] == "Eleanor Vance"

    print("--- STEP 2: Medical Report Upload & Deterministic Processing ---")
    pdf_content = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length 380 >> stream
BT
/F1 12 Tf
72 712 Td
(METRO COMPREHENSIVE CLINICAL PANEL) Tj
0 -20 Td
(Hemoglobin 9.2 g/dL 12.0 - 16.0) Tj
0 -20 Td
(Glucose 95 mg/dL 70-99) Tj
0 -20 Td
(Vitamin D 28 ng/mL) Tj
ET
endstream endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000227 00000 n 
0000000306 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
640
%%EOF"""
    upload_res = client.post(
        f"/api/v1/patients/{patient_id}/reports?auto_process=true",
        files={"file": ("CBC_Metabolic_Panel.pdf", pdf_content, "application/pdf")},
    )
    assert upload_res.status_code == 201, upload_res.text
    report = upload_res.json()
    report_id = report["id"]
    assert report["extraction_method"] == "LOCAL_DETERMINISTIC"
    assert report["processing_status"] == "REVIEW_REQUIRED"
    assert report["document_hash"] is not None and len(report["document_hash"]) == 64

    print("--- STEP 3: Inspect Structured Extraction & Reference Ranges ---")
    ext_res = client.get(f"/api/v1/reports/{report_id}/extraction")
    assert ext_res.status_code == 200
    extraction = ext_res.json()
    labs = extraction["lab_results"]
    assert len(labs) >= 3

    hgb = next(l for l in labs if "Hemoglobin" in l["test_name"])
    assert hgb["value_raw"] == "9.2"
    assert hgb["reference_range_raw"] == "12.0 - 16.0"
    assert hgb["reference_range_status"] == "LOW"
    assert hgb["provenance_tag"] == "REPORT_EXTRACTED"
    assert hgb["verification_status"] == "UNVERIFIED"

    vit_d = next(l for l in labs if "Vitamin D" in l["test_name"])
    assert vit_d["value_raw"] == "28"
    assert vit_d["reference_range_raw"] is None
    assert vit_d["reference_range_status"] == "NO_RANGE_AVAILABLE"

    print("--- STEP 4: Clinician Verification Preserves Original Extraction ---")
    verify_payload = {
        "verification_status": "VERIFIED",
        "verified_value": "9.4",
        "verified_by": None,
        "verification_notes": "Rechecked capillary tube, adjusted to 9.4 g/dL",
    }
    verify_res = client.patch(f"/api/v1/reports/{report_id}/lab-results/{hgb['id']}/verify", json=verify_payload)
    assert verify_res.status_code == 200
    verified_hgb = verify_res.json()
    assert verified_hgb["value_raw"] == "9.2", "Original value_raw MUST remain immutable"
    assert verified_hgb["verified_value"] == "9.4"
    assert verified_hgb["original_provenance"] == "REPORT_EXTRACTED"
    assert verified_hgb["provenance_tag"] == "USER_VERIFIED"
    assert verified_hgb["verified_classification"] == "LOW"

    print("--- STEP 5: Summary Generation & Staleness Detection ---")
    # Live Gemini without key returns honest 503
    unauth_sum = client.post(f"/api/v1/patients/{patient_id}/summary")
    assert unauth_sum.status_code == 503
    assert "unavailable" in unauth_sum.json()["detail"].lower()

    # Generate validated summary with test generator
    db = SmokeSessionLocal()
    pat_entity = db.query(Patient).filter(Patient.id == patient_id).first()
    ctrl_input = PatientSummaryService.build_controlled_input(db, pat_entity)
    fp = PatientSummaryService.compute_source_fingerprint(ctrl_input)
    output = PatientSummaryService.generate_deterministic_test_summary(ctrl_input)

    now = datetime.now(timezone.utc)
    sum_entity = PatientSummary(
        patient_id=patient_id,
        summary_text=output.summary_text,
        key_observations=output.key_observations,
        data_limitations=output.data_limitations,
        provenance_tag="AI_GENERATED",
        model_name="gemini-2.5-flash",
        source_fingerprint=fp,
        generated_at=now,
        created_at=now,
    )
    db.add(sum_entity)
    db.commit()
    db.close()

    get_sum = client.get(f"/api/v1/patients/{patient_id}/summary")
    assert get_sum.status_code == 200
    assert get_sum.json()["is_stale"] is False
    assert get_sum.json()["provenance_tag"] == "AI_GENERATED"

    # Modify clinical symptoms -> summary immediately becomes stale
    up_res = client.put(f"/api/v1/patients/{patient_id}", json={"full_name": "Eleanor Vance", "symptoms": [{"symptom": "Acute Dyspnea", "severity": "SEVERE"}]})
    assert up_res.status_code == 200

    stale_check = client.get(f"/api/v1/patients/{patient_id}/summary")
    assert stale_check.status_code == 200
    assert stale_check.json()["is_stale"] is True, "Summary MUST report is_stale=True after clinical symptom update"

    print("--- STEP 6: Aggregated Workspace Endpoints ---")
    stats_res = client.get("/api/v1/reports/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_patients"] >= 1
    assert stats["total_reports"] >= 1
    assert stats["total_labs"] >= 3
    assert stats["verified_labs"] >= 1

    rep_list = client.get("/api/v1/reports")
    assert rep_list.status_code == 200
    assert rep_list.json()["total"] >= 1
    assert rep_list.json()["reports"][0]["patient_name"] == "Eleanor Vance"

    lab_list = client.get("/api/v1/reports/lab-results?status=LOW")
    assert lab_list.status_code == 200
    assert lab_list.json()["total"] >= 1

    print("\n ALL CORE WORKFLOW & OPTIMIZATION VERIFICATIONS PASSED CLEANLY! ")


if __name__ == "__main__":
    try:
        test_core_release_workflow()
    finally:
        smoke_engine.dispose()
        try:
            temp_dir.cleanup()
        except Exception:
            pass

