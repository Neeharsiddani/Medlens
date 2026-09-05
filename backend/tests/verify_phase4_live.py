"""End-to-End Live Verification Script for Phase 4 Deterministic Reference-Range Engine."""
import httpx

BASE_URL = "http://127.0.0.1:8000"


def generate_phase4_sample_pdf() -> bytes:
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
(METRO CLINICAL PATHOLOGY REPORT) Tj
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
    print("=== Starting Live Phase 4 Verification ===")
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Health check
    health_res = client.get("/health")
    assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
    print("[1/6] Health check PASSED.")

    # 2. Ingest patient
    patient_payload = {
        "full_name": "Arthur Pendelton",
        "age": 61,
        "sex": "MALE",
        "symptoms": [{"name": "Dizziness", "severity": "MILD"}],
        "existing_conditions": [{"name": "Chronic Kidney Disease", "status": "ACTIVE"}],
        "allergies": [],
        "medications": [],
    }
    pat_res = client.post("/api/v1/patients", json=patient_payload)
    assert pat_res.status_code == 201, f"Patient creation failed: {pat_res.text}"
    patient = pat_res.json()
    patient_id = patient["id"]
    print(f"[2/6] Patient created: ID={patient_id} ({patient['full_name']})")

    # 3. Upload and process report
    pdf_data = generate_phase4_sample_pdf()
    files = {"file": ("Metro_Comprehensive_Metabolic_Panel.pdf", pdf_data, "application/pdf")}
    upload_res = client.post(f"/api/v1/patients/{patient_id}/reports?auto_process=true", files=files)
    assert upload_res.status_code == 201, f"Upload failed: {upload_res.text}"
    report = upload_res.json()
    report_id = report["id"]
    print(f"[3/6] Report uploaded & processed: ID={report_id}, Status={report['processing_status']}")

    # 4. Verify deterministic classifications
    labs = report["lab_results"]
    assert len(labs) >= 4, f"Expected 4 lab results, got {len(labs)}"

    hgb = next((l for l in labs if "Hemoglobin" in l["test_name"]), None)
    assert hgb is not None
    assert hgb["value_raw"] == "9.2"
    assert hgb["reference_range_raw"] == "12.0 - 16.0"
    assert hgb["reference_range_status"] == "LOW", f"Expected LOW for 9.2 in 12.0-16.0, got {hgb['reference_range_status']}"
    assert hgb["current_classification"] == "LOW"
    print(f"      - Hemoglobin 9.2 in [12.0 - 16.0] -> {hgb['reference_range_status']} (Reason: {hgb['classification_reason']})")

    glu = next((l for l in labs if "Glucose" in l["test_name"]), None)
    assert glu is not None
    assert glu["value_raw"] == "90"
    assert glu["reference_range_status"] == "NORMAL", f"Expected NORMAL for 90 in 70-99, got {glu['reference_range_status']}"
    assert glu["current_classification"] == "NORMAL"
    print(f"      - Glucose 90 in [70-99] -> {glu['reference_range_status']}")

    pot = next((l for l in labs if "Potassium" in l["test_name"]), None)
    assert pot is not None
    assert pot["value_raw"] == "5.2"
    assert pot["reference_range_status"] == "HIGH", f"Expected HIGH for 5.2 in 3.5-5.0, got {pot['reference_range_status']}"
    assert pot["current_classification"] == "HIGH"
    print(f"      - Potassium 5.2 in [3.5-5.0] -> {pot['reference_range_status']}")

    vit_d = next((l for l in labs if "Vitamin D" in l["test_name"]), None)
    assert vit_d is not None
    assert vit_d["reference_range_raw"] is None or vit_d["reference_range_raw"] == ""
    assert vit_d["reference_range_status"] == "NO_RANGE_AVAILABLE", f"Expected NO_RANGE_AVAILABLE, got {vit_d['reference_range_status']}"
    assert vit_d["current_classification"] == "NO_RANGE_AVAILABLE"
    print(f"      - Vitamin D 28 (no range in report) -> {vit_d['reference_range_status']}")
    print("[4/6] Deterministic range awareness verified across LOW, NORMAL, HIGH, and NO_RANGE_AVAILABLE.")

    # 5. Verify Clinician Verification Audit Preservation
    hgb_id = hgb["id"]
    verify_payload = {
        "verification_status": "VERIFIED",
        "verified_value": "13.5",
        "verified_by": "Dr. Sarah Jenkins",
        "verification_notes": "Venous redraw confirmed 13.5 g/dL",
    }
    verify_res = client.patch(f"/api/v1/reports/{report_id}/lab-results/{hgb_id}/verify", json=verify_payload)
    assert verify_res.status_code == 200, f"Verification failed: {verify_res.text}"
    verified_data = verify_res.json()

    # Original value & classification MUST be preserved!
    assert verified_data["value_raw"] == "9.2", "Raw value must remain unmutated!"
    assert verified_data["reference_range_status"] == "LOW", "Original extraction classification must remain untouched!"
    # Verified value & classification MUST reflect clinician action
    assert verified_data["verified_value"] == "13.5"
    assert verified_data["verified_classification"] == "NORMAL", f"Expected verified NORMAL for 13.5 in 12.0-16.0, got {verified_data['verified_classification']}"
    assert verified_data["current_classification"] == "NORMAL"
    assert verified_data["verification_status"] == "VERIFIED"
    print(f"[5/6] Clinician verification audited: Original Raw='{verified_data['value_raw']}' (Orig Status: {verified_data['reference_range_status']}), Verified Val='{verified_data['verified_value']}' (Verified Status: {verified_data['verified_classification']})")

    # 6. Fetch full structured extraction
    ext_res = client.get(f"/api/v1/reports/{report_id}/extraction")
    assert ext_res.status_code == 200
    ext_data = ext_res.json()
    assert len(ext_data["lab_results"]) >= 4
    print("[6/6] Full structured extraction response verified.")

    print("\n ALL LIVE PHASE 4 VERIFICATIONS PASSED CLEANLY! ")


if __name__ == "__main__":
    main()
