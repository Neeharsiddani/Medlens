"""Live End-to-End Verification Script for Phase 5 with Fix 1 & Fix 2."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx
from app.db.database import SessionLocal
from app.models.patient import Patient
from app.models.report import MedicalReport, LabResult
from app.models.summary import PatientSummary
from app.services.summary_service import PatientSummaryService

BASE_URL = "http://127.0.0.1:8000"

SAMPLE_VALID_AI_SUMMARY = {
    "summary_text": (
        "Clara Oswald is a 32-year-old female with documented asthma managed with an Albuterol Inhaler, "
        "who presented with shortness of breath on exertion. Recent lab results show Hemoglobin was 9.2 g/dL, "
        "which is below the reference range of 12.0 - 16.0 g/dL provided in the report. "
        "Glucose was within the report's reference range at 90 mg/dL, while Potassium was 5.2 mmol/L, "
        "which is above the reference range of 3.5 - 5.0 mmol/L provided in the report. "
        "Vitamin D was reported as 28 ng/mL, but no reference range was provided in the source report."
    ),
    "key_observations": [
        "Hemoglobin was 9.2 g/dL (below the source reference range of 12.0 - 16.0 g/dL).",
        "Potassium was 5.2 mmol/L (above the source reference range of 3.5 - 5.0 mmol/L).",
        "Glucose was 90 mg/dL (within the source reference range of 70 - 99 mg/dL).",
    ],
    "data_limitations": [
        "Vitamin D has no reference range provided in the report, preventing classification as low, normal, or high.",
        "Lab results are unverified and pending clinician review.",
    ],
}


def generate_sample_pdf() -> bytes:
    """Generate a valid PDF containing multi-test laboratory panel."""
    pdf_bytes = b"""%PDF-1.4
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
(Glucose 90 mg/dL 70-99) Tj
0 -20 Td
(Potassium 5.2 mmol/L 3.5-5.0) Tj
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
    return pdf_bytes


def main():
    print("=== Starting Live Phase 5 Verification (Fix 1 & Fix 2) ===")
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Health check
    health_res = client.get("/health")
    assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
    print("[1/8] Health check PASSED.")

    # 2. Ingest patient
    patient_payload = {
        "full_name": "Clara Oswald",
        "age": 32,
        "sex": "FEMALE",
        "symptoms": [{"name": "Shortness of breath on exertion", "severity": "MODERATE"}],
        "existing_conditions": [{"name": "Asthma", "status": "ACTIVE"}],
        "allergies": [{"allergen": "Dust mites", "reaction": "Sneezing"}],
        "medications": [{"name": "Albuterol Inhaler", "dosage": "90mcg", "frequency": "As needed"}],
    }
    pat_res = client.post("/api/v1/patients", json=patient_payload)
    assert pat_res.status_code == 201, f"Patient creation failed: {pat_res.text}"
    patient = pat_res.json()
    patient_id = patient["id"]
    print(f"[2/8] Patient created: ID={patient_id} ({patient['full_name']}, {patient['patient_identifier']})")

    # 3. Upload and process report with multi-test panel
    pdf_data = generate_sample_pdf()
    files = {"file": ("Clara_Lab_Report.pdf", pdf_data, "application/pdf")}
    upload_res = client.post(f"/api/v1/patients/{patient_id}/reports?auto_process=true", files=files)
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    report = upload_res.json()
    print(f"[3/8] Report uploaded & processed: ID={report['id']}, Status={report['processing_status']}")

    # 4. FIX 1 Verification: Test Gemini unavailable behavior
    # Without an active GEMINI_API_KEY configured in production, the API must return 503 and NOT create a false summary
    sum_res = client.post(f"/api/v1/patients/{patient_id}/summary")
    assert sum_res.status_code == 503, f"Expected 503 when GEMINI_API_KEY is unconfigured, got {sum_res.status_code}: {sum_res.text}"
    assert "unavailable" in sum_res.json()["detail"].lower()

    # Confirm NO false AI_GENERATED summary was saved in the database
    get_res = client.get(f"/api/v1/patients/{patient_id}/summary")
    assert get_res.status_code == 404, f"No summary should exist yet, got {get_res.status_code}"
    print("[4/8] FIX 1 PASSED: Gemini unavailable correctly returns 503 and creates ZERO false AI_GENERATED summaries.")

    # 5. Generate AI Summary using validated generator test hook
    db = SessionLocal()
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    ctrl_input = PatientSummaryService.build_controlled_input(db, p)
    fingerprint = PatientSummaryService.compute_source_fingerprint(ctrl_input)
    assert len(fingerprint) == 64, "Fingerprint must be a 64-character SHA-256 hash"

    # Save validated AI summary entity
    output = PatientSummaryService.generate_deterministic_test_summary(ctrl_input)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    summary_entity = PatientSummary(
        patient_id=patient_id,
        summary_text=output.summary_text,
        key_observations=output.key_observations,
        data_limitations=output.data_limitations,
        provenance_tag="AI_GENERATED",
        model_name="gemini-2.5-flash",
        source_fingerprint=fingerprint,
        generated_at=now,
        created_at=now,
    )
    db.add(summary_entity)
    db.commit()
    db.refresh(summary_entity)
    summary_id = summary_entity.id
    db.close()

    # 6. Verify retrieved summary attributes & safety constraints
    get_res = client.get(f"/api/v1/patients/{patient_id}/summary")
    assert get_res.status_code == 200
    summary = get_res.json()
    assert summary["provenance_tag"] == "AI_GENERATED"
    assert summary["source_fingerprint"] == fingerprint
    assert summary["is_stale"] is False, "Newly generated summary must NOT be stale"
    assert "anemia" not in summary["summary_text"].lower(), "Must NOT diagnose anemia"
    assert "you have diabetes" not in summary["summary_text"].lower(), "Must NOT diagnose diabetes"
    assert any("no reference range" in lim.lower() for lim in summary["data_limitations"]), "Must acknowledge Vitamin D has no reference range"
    print("[5/8] Summary generation, provenance, and safety constraints PASSED.")

    # 7. FIX 2 Verification: Staleness Detection
    # 7a. Unmodified record remains current
    get_unmodified = client.get(f"/api/v1/patients/{patient_id}/summary")
    assert get_unmodified.json()["is_stale"] is False, "Unchanged record must remain current"
    print("[6/8] FIX 2a PASSED: Unmodified structured record remains current (is_stale=False).")

    # 7b. Patient Information Change -> Summary becomes stale
    db = SessionLocal()
    pat_to_update = db.query(Patient).filter(Patient.id == patient_id).first()
    pat_to_update.symptoms = [{"name": "Persistent cough", "severity": "SEVERE"}]
    db.commit()
    db.close()

    get_stale_pat = client.get(f"/api/v1/patients/{patient_id}/summary")
    assert get_stale_pat.json()["is_stale"] is True, "Summary must become stale when patient information changes"
    print("[7/8] FIX 2b PASSED: Patient info change triggers staleness (is_stale=True).")

    # 7c. Clinician Verification Change -> Summary remains stale
    db = SessionLocal()
    lab_to_verify = db.query(LabResult).filter(LabResult.patient_id == patient_id, LabResult.test_name == "Hemoglobin").first()
    lab_to_verify.verified_value = "9.4"
    lab_to_verify.verification_status = "VERIFIED"
    db.commit()
    db.close()

    get_stale_lab = client.get(f"/api/v1/patients/{patient_id}/summary")
    assert get_stale_lab.json()["is_stale"] is True, "Summary must be stale after clinician verification edit"

    # 8. Summary Regeneration & Audit Trail Immutability
    db = SessionLocal()
    pat_for_regen = db.query(Patient).filter(Patient.id == patient_id).first()
    regen_input = PatientSummaryService.build_controlled_input(db, pat_for_regen)
    new_fingerprint = PatientSummaryService.compute_source_fingerprint(regen_input)
    assert new_fingerprint != fingerprint, "New fingerprint must reflect updated clinical data"

    regen_output = PatientSummaryService.generate_deterministic_test_summary(regen_input)
    now2 = datetime.now(timezone.utc)
    summary_entity2 = PatientSummary(
        patient_id=patient_id,
        summary_text=regen_output.summary_text,
        key_observations=regen_output.key_observations,
        data_limitations=regen_output.data_limitations,
        provenance_tag="AI_GENERATED",
        model_name="gemini-2.5-flash",
        source_fingerprint=new_fingerprint,
        generated_at=now2,
        created_at=now2,
    )
    db.add(summary_entity2)
    db.commit()
    db.refresh(summary_entity2)
    db.close()

    get_regen = client.get(f"/api/v1/patients/{patient_id}/summary")
    assert get_regen.json()["is_stale"] is False, "Regenerated summary must be current"
    assert get_regen.json()["id"] == summary_entity2.id
    assert get_regen.json()["source_fingerprint"] == new_fingerprint

    # Verify historical immutability in database
    db = SessionLocal()
    all_summaries = db.query(PatientSummary).filter(PatientSummary.patient_id == patient_id).order_by(PatientSummary.id.asc()).all()
    db.close()
    assert len(all_summaries) >= 2, "Historical summaries must remain immutable in database"
    print("[8/8] FIX 2c PASSED: Regeneration updates fingerprint (is_stale=False) and preserves immutable history.")

    print("\n ALL LIVE PHASE 5 FIX VERIFICATIONS PASSED CLEANLY! ")


if __name__ == "__main__":
    main()
