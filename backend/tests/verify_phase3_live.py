"""End-to-End Live Verification Script for Phase 3."""
import io
import sys
import httpx
import pypdf

BASE_URL = "http://127.0.0.1:8000"


def generate_sample_lab_pdf() -> bytes:
    """Generate a valid PDF containing structured laboratory tests."""
    pdf_bytes = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length 300 >> stream
BT
/F1 12 Tf
72 712 Td
(LABORATORY REPORT - METRO HEALTH LAB) Tj
0 -20 Td
(Hemoglobin 9.2 g/dL 12.0 - 16.0) Tj
0 -20 Td
(Glucose 126 mg/dL 70-99) Tj
0 -20 Td
(Potassium 5.2 mmol/L 3.5-5.0) Tj
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
560
%%EOF"""
    return pdf_bytes


def main():
    print("=== Starting Live Phase 3 Verification ===")
    client = httpx.Client(base_url=BASE_URL, timeout=30.0)

    # 1. Health check
    health_res = client.get("/health")
    assert health_res.status_code == 200, f"Health check failed: {health_res.text}"
    print("[1/7] Health check PASSED:", health_res.json())

    # 2. Create patient
    patient_payload = {
        "full_name": "Eleanor Rigby",
        "age": 44,
        "sex": "FEMALE",
        "symptoms": [{"name": "Fatigue", "severity": "MODERATE"}],
        "existing_conditions": [{"name": "Type 2 Diabetes", "status": "ACTIVE"}],
        "allergies": [{"allergen": "Penicillin", "reaction": "Hives", "severity": "MODERATE"}],
        "medications": [{"name": "Metformin", "dosage": "500mg", "frequency": "Daily"}],
    }
    pat_res = client.post("/api/v1/patients", json=patient_payload)
    assert pat_res.status_code == 201, f"Patient creation failed: {pat_res.text}"
    patient = pat_res.json()
    patient_id = patient["id"]
    print(f"[2/7] Patient created: ID={patient_id} ({patient['full_name']}, {patient['patient_identifier']})")

    # 3. Upload report
    pdf_data = generate_sample_lab_pdf()
    files = {"file": ("MetroHealth_CBC_Panel.pdf", pdf_data, "application/pdf")}
    upload_res = client.post(f"/api/v1/patients/{patient_id}/reports?auto_process=true", files=files)
    assert upload_res.status_code == 201, f"Report upload failed: {upload_res.text}"
    report = upload_res.json()
    report_id = report["id"]
    print(f"[3/7] Report uploaded & processed: ID={report_id}, Hash={report['document_hash'][:16]}..., Status={report['processing_status']}")

    # 4. Check extraction structure & provenance
    assert report["processing_status"] == "REVIEW_REQUIRED", f"Expected REVIEW_REQUIRED, got {report['processing_status']}"
    assert report["provenance_tag"] == "REPORT_EXTRACTED", f"Expected REPORT_EXTRACTED, got {report['provenance_tag']}"
    assert len(report["lab_results"]) >= 3, f"Expected at least 3 lab results, got {len(report['lab_results'])}"

    hgb = next((l for l in report["lab_results"] if "Hemoglobin" in l["test_name"]), None)
    assert hgb is not None, "Hemoglobin test not found in extracted results"
    assert hgb["value_raw"] == "9.2", f"Expected value_raw '9.2', got {hgb['value_raw']}"
    assert hgb["reference_range_raw"] == "12.0 - 16.0", f"Expected reference range '12.0 - 16.0', got {hgb['reference_range_raw']}"
    assert hgb["reference_low"] == 12.0, f"Expected reference_low 12.0, got {hgb['reference_low']}"
    assert hgb["reference_high"] == 16.0, f"Expected reference_high 16.0, got {hgb['reference_high']}"
    assert hgb["provenance_tag"] == "REPORT_EXTRACTED"
    assert hgb["verification_status"] == "UNVERIFIED"
    print(f"[4/7] Lab results extraction validated: {hgb['test_name']} = {hgb['value_raw']} {hgb['unit']} (Ref: {hgb['reference_range_raw']}) [UNVERIFIED]")

    # 5. Test Clinician Verification / Edit
    lab_id = hgb["id"]
    verify_payload = {
        "verification_status": "VERIFIED",
        "verified_value": "9.3",
        "verified_by": "Dr. Sarah Jenkins",
        "verification_notes": "Repeat analyzer test confirmed 9.3 g/dL",
    }
    verify_res = client.patch(f"/api/v1/reports/{report_id}/lab-results/{lab_id}/verify", json=verify_payload)
    assert verify_res.status_code == 200, f"Verification failed: {verify_res.text}"
    verified_data = verify_res.json()
    assert verified_data["verification_status"] == "VERIFIED"
    assert verified_data["verified_value"] == "9.3"
    assert verified_data["value_raw"] == "9.2", "Raw value must remain unmutated!"
    assert verified_data["provenance_tag"] == "REPORT_EXTRACTED"
    print(f"[5/7] Clinician verification & edit tested: Status={verified_data['verification_status']}, VerifiedVal={verified_data['verified_value']}, OriginalRawVal={verified_data['value_raw']}")

    # 6. Test Report Retrieval
    get_res = client.get(f"/api/v1/reports/{report_id}")
    assert get_res.status_code == 200
    assert get_res.json()["document_hash"] == report["document_hash"]
    print(f"[6/7] Report metadata retrieved successfully by ID.")

    # 7. Test Extraction Retrieval
    ext_res = client.get(f"/api/v1/reports/{report_id}/extraction")
    assert ext_res.status_code == 200
    ext_data = ext_res.json()
    assert len(ext_data["lab_results"]) >= 3
    print(f"[7/7] Full structured extraction retrieved: {len(ext_data['lab_results'])} lab results.")

    print("\n ALL LIVE PHASE 3 VERIFICATIONS PASSED CLEANLY! ")


if __name__ == "__main__":
    main()
