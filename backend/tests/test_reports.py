"""Tests for Phase 3: Medical Report Processing & Structured Extraction."""
import io
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from app.main import app
from app.db.database import get_db, SessionLocal
from app.models.patient import Patient
from app.models.report import MedicalReport, LabResult
from app.services.gemini_service import GeminiExtractionService
from app.core.config import settings

client = TestClient(app)


def create_sample_pdf_bytes(text_lines=None) -> bytes:
    """Generate a minimal valid PDF in-memory with text."""
    # Write a clean PDF with pypdf or minimal valid PDF stream
    writer = PdfWriter()
    page = writer.add_blank_page(width=612, height=792)
    stream = io.BytesIO()
    writer.write(stream)
    return stream.getvalue()


@pytest.fixture(autouse=True)
def reset_gemini_mock():
    """Ensure mock response is cleared after each test."""
    GeminiExtractionService.set_mock_response(None)
    yield
    GeminiExtractionService.set_mock_response(None)


@pytest.fixture
def sample_patient():
    """Create a sample patient for report tests."""
    db = SessionLocal()
    patient = Patient(
        full_name="Report Test Patient",
        age=52,
        sex="MALE",
        symptoms=[{"name": "Fatigue", "severity": "MODERATE"}],
        existing_conditions=[{"name": "Hypertension", "status": "ACTIVE"}],
        allergies=[],
        medications=[],
        provenance_tag="USER_PROVIDED",
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    patient_id = patient.id
    db.close()
    return patient_id


def test_valid_pdf_upload_and_metadata(sample_patient):
    """Test 1 & 6 & 7: Valid PDF upload, metadata persistence, SHA-256 hash generation."""
    # Set controlled mock extraction
    GeminiExtractionService.set_mock_response({
        "report_type": "LABORATORY_REPORT",
        "report_date": "2026-09-01",
        "facility_name": "Metro Health Laboratory",
        "physician_name": "Dr. Sarah Jenkins",
        "observations": [],
        "laboratory_results": [
            {
                "test_name": "Hemoglobin",
                "value_raw": "14.2",
                "value_numeric": 14.2,
                "unit": "g/dL",
                "reference_range_raw": "12.0 - 16.0",
                "reference_low": 12.0,
                "reference_high": 16.0,
                "reference_unit": "g/dL",
                "source_page": 1,
                "source_text": "Hemoglobin 14.2 g/dL 12.0 - 16.0",
            }
        ],
        "medications": [],
        "diagnoses_or_conditions_as_stated": [],
        "other_clinical_information": None,
    })

    pdf_content = create_sample_pdf_bytes()
    response = client.post(
        f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
        files={"file": ("test_report.pdf", pdf_content, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["patient_id"] == sample_patient
    assert data["original_filename"] == "test_report.pdf"
    assert data["mime_type"] == "application/pdf"
    assert len(data["document_hash"]) == 64  # SHA-256 hash
    assert data["report_type"] == "LABORATORY_REPORT"
    assert data["facility_name"] == "Metro Health Laboratory"
    assert data["physician_name"] == "Dr. Sarah Jenkins"
    assert data["processing_status"] == "REVIEW_REQUIRED"
    assert data["provenance_tag"] == "REPORT_EXTRACTED"
    assert len(data["lab_results"]) == 1

    lab = data["lab_results"][0]
    assert lab["test_name"] == "Hemoglobin"
    assert lab["value_raw"] == "14.2"
    assert lab["value_numeric"] == 14.2
    assert lab["unit"] == "g/dL"
    assert lab["reference_range_raw"] == "12.0 - 16.0"
    assert lab["reference_low"] == 12.0
    assert lab["reference_high"] == 16.0
    assert lab["provenance_tag"] == "REPORT_EXTRACTED"
    assert lab["verification_status"] == "UNVERIFIED"


def test_valid_image_upload(sample_patient):
    """Test 2: Valid image upload (PNG/JPG)."""
    GeminiExtractionService.set_mock_response({
        "report_type": "LABORATORY_REPORT",
        "report_date": "2026-09-02",
        "facility_name": "Diagnostic Imaging & Labs",
        "physician_name": None,
        "observations": [
            {
                "category": "CLINICAL_OBSERVATION",
                "description": "Clear lung fields",
                "source_page": 1,
                "source_text": "Lungs: Clear",
            }
        ],
        "laboratory_results": [],
        "medications": [],
        "diagnoses_or_conditions_as_stated": [],
        "other_clinical_information": None,
    })

    # Fake 1x1 PNG header
    png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"

    response = client.post(
        f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
        files={"file": ("lab_snapshot.png", png_data, "image/png")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["mime_type"] == "image/png"
    assert data["processing_status"] == "REVIEW_REQUIRED"
    assert len(data["observations"]) == 1
    assert data["observations"][0]["provenance_tag"] == "REPORT_EXTRACTED"
    assert data["observations"][0]["verification_status"] == "UNVERIFIED"


def test_unsupported_file_rejection(sample_patient):
    """Test 3: Reject unsupported formats cleanly."""
    txt_data = b"Some medical report plain text"
    response = client.post(
        f"/api/v1/patients/{sample_patient}/reports",
        files={"file": ("report.txt", txt_data, "text/plain")},
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_oversized_file_rejection(sample_patient, monkeypatch):
    """Test 4: Reject files exceeding size limit."""
    # Temporarily set max size to 100 bytes
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 100)

    oversized_data = b"A" * 500
    response = client.post(
        f"/api/v1/patients/{sample_patient}/reports",
        files={"file": ("oversized.pdf", oversized_data, "application/pdf")},
    )
    assert response.status_code == 413
    assert "File exceeds maximum allowed size" in response.json()["detail"]


def test_patient_not_found_rejection():
    """Test 5: Reject upload if patient does not exist."""
    pdf_content = create_sample_pdf_bytes()
    response = client.post(
        "/api/v1/patients/999999/reports",
        files={"file": ("sample.pdf", pdf_content, "application/pdf")},
    )
    assert response.status_code == 404
    assert "Patient with ID 999999 not found" in response.json()["detail"]


def test_missing_reference_range_remains_null(sample_patient):
    """Test 9, 10, 11, 12: Missing reference range remains null; no guessing or fabrication."""
    GeminiExtractionService.set_mock_response({
        "report_type": "LABORATORY_REPORT",
        "report_date": "2026-09-03",
        "facility_name": "Community Clinic",
        "physician_name": None,
        "observations": [],
        "laboratory_results": [
            {
                "test_name": "Blood Glucose",
                "value_raw": "105",
                "value_numeric": 105.0,
                "unit": "mg/dL",
                "reference_range_raw": None,  # NOT provided in document
                "reference_low": None,
                "reference_high": None,
                "reference_unit": None,
                "source_page": 1,
                "source_text": "Blood Glucose: 105 mg/dL",
            },
            {
                "test_name": "COVID-19 Antigen",
                "value_raw": "Negative",
                "value_numeric": None,
                "unit": None,
                "reference_range_raw": "Negative",  # Non-numeric range preserved exactly
                "reference_low": None,
                "reference_high": None,
                "reference_unit": None,
                "source_page": 1,
                "source_text": "COVID-19 Antigen Negative (Ref: Negative)",
            }
        ],
        "medications": [],
        "diagnoses_or_conditions_as_stated": [],
        "other_clinical_information": None,
    })

    pdf_content = create_sample_pdf_bytes()
    response = client.post(
        f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
        files={"file": ("glucose_covid.pdf", pdf_content, "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    labs = data["lab_results"]
    assert len(labs) == 2

    # Glucose has NULL reference ranges -> deterministic NO_RANGE_AVAILABLE
    glucose = next(l for l in labs if l["test_name"] == "Blood Glucose")
    assert glucose["reference_range_raw"] is None
    assert glucose["reference_low"] is None
    assert glucose["reference_high"] is None
    assert glucose["reference_range_status"] == "NO_RANGE_AVAILABLE"
    assert glucose["provenance_tag"] == "REPORT_EXTRACTED"
    assert glucose["verification_status"] == "UNVERIFIED"

    # COVID test has exact non-numeric range preserved -> UNDETERMINED
    covid = next(l for l in labs if l["test_name"] == "COVID-19 Antigen")
    assert covid["reference_range_raw"] == "Negative"
    assert covid["reference_low"] is None
    assert covid["reference_high"] is None
    assert covid["reference_range_status"] == "UNDETERMINED"
    assert covid["provenance_tag"] == "REPORT_EXTRACTED"
    assert covid["verification_status"] == "UNVERIFIED"


def test_malformed_ai_response_does_not_reach_database(sample_patient):
    """Test 13: Schema violation in AI response fails safely and does not corrupt DB."""
    # Malformed: test_name is missing, which is a required field in ExtractedLabResult
    GeminiExtractionService.set_mock_response({
        "report_type": "LABORATORY_REPORT",
        "laboratory_results": [
            {
                # Missing test_name!
                "value_raw": "100",
            }
        ]
    })

    pdf_content = create_sample_pdf_bytes()
    response = client.post(
        f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
        files={"file": ("bad_ai.pdf", pdf_content, "application/pdf")},
    )

    # Must fail with unprocessable entity / error, not 201
    assert response.status_code == 422
    assert "Report processing failed" in response.json()["detail"]

    # Verify no lab results were inserted in the database
    db = SessionLocal()
    labs = db.query(LabResult).filter(LabResult.patient_id == sample_patient).all()
    assert len(labs) == 0
    db.close()


def test_report_and_extraction_retrieval(sample_patient):
    """Test 14 & 15: Retrieve report list, report metadata, and structured extraction."""
    GeminiExtractionService.set_mock_response({
        "report_type": "PRESCRIPTION",
        "report_date": "2026-09-04",
        "facility_name": "City Health Pharmacy",
        "physician_name": "Dr. Adams",
        "observations": [],
        "laboratory_results": [],
        "medications": [
            {
                "medication_name": "Amoxicillin",
                "dosage": "500 mg",
                "frequency": "TID",
                "route": "Oral",
                "instructions": "Take with food for 10 days",
                "source_page": 1,
                "source_text": "Amoxicillin 500mg TID Oral",
            }
        ],
        "diagnoses_or_conditions_as_stated": ["Acute Bronchitis"],
        "other_clinical_information": None,
    })

    pdf_content = create_sample_pdf_bytes()
    upload_res = client.post(
        f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
        files={"file": ("rx.pdf", pdf_content, "application/pdf")},
    )
    assert upload_res.status_code == 201
    report_id = upload_res.json()["id"]

    # 1. List patient reports
    list_res = client.get(f"/api/v1/patients/{sample_patient}/reports")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(r["id"] == report_id for r in list_data["reports"])

    # 2. Get report metadata
    meta_res = client.get(f"/api/v1/reports/{report_id}")
    assert meta_res.status_code == 200
    meta_data = meta_res.json()
    assert meta_data["report_type"] == "PRESCRIPTION"
    assert meta_data["facility_name"] == "City Health Pharmacy"

    # 3. Get report extraction details
    ext_res = client.get(f"/api/v1/reports/{report_id}/extraction")
    assert ext_res.status_code == 200
    ext_data = ext_res.json()
    assert len(ext_data["medications"]) == 1
    assert ext_data["medications"][0]["medication_name"] == "Amoxicillin"
    assert ext_data["medications"][0]["provenance_tag"] == "REPORT_EXTRACTED"
    # Diagnosis observation
    assert any(o["category"] == "DIAGNOSIS_AS_STATED" and o["description"] == "Acute Bronchitis" for o in ext_data["observations"])


def test_clinician_verification_workflow(sample_patient):
    """Test 16: Verify/edit lab result without overwriting raw value."""
    GeminiExtractionService.set_mock_response({
        "report_type": "LABORATORY_REPORT",
        "laboratory_results": [
            {
                "test_name": "Serum Potassium",
                "value_raw": "5.8",
                "value_numeric": 5.8,
                "unit": "mmol/L",
                "reference_range_raw": "3.5 - 5.0",
                "reference_low": 3.5,
                "reference_high": 5.0,
                "reference_unit": "mmol/L",
                "source_page": 1,
                "source_text": "Serum Potassium 5.8 mmol/L 3.5-5.0",
            }
        ],
        "observations": [],
        "medications": [],
        "diagnoses_or_conditions_as_stated": [],
    })

    pdf_content = create_sample_pdf_bytes()
    upload_res = client.post(
        f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
        files={"file": ("potassium.pdf", pdf_content, "application/pdf")},
    )
    report_data = upload_res.json()
    report_id = report_data["id"]
    result_id = report_data["lab_results"][0]["id"]
    # Initial state: UNVERIFIED, reference_range_status HIGH (5.8 on 3.5 - 5.0)
    assert report_data["lab_results"][0]["verification_status"] == "UNVERIFIED"
    assert report_data["lab_results"][0]["value_raw"] == "5.8"
    assert report_data["lab_results"][0]["reference_range_status"] == "HIGH"
    assert report_data["lab_results"][0]["verified_classification"] is None
    assert report_data["lab_results"][0]["current_classification"] == "HIGH"

    # Clinician verifies with a corrected value "5.7"
    verify_res = client.patch(
        f"/api/v1/reports/{report_id}/lab-results/{result_id}/verify",
        json={
            "verification_status": "VERIFIED",
            "verified_value": "5.7",
            "verified_by": "Dr. House",
            "verification_notes": "Sample re-run confirmed 5.7",
        },
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()

    assert verify_data["verification_status"] == "VERIFIED"
    assert verify_data["verified_value"] == "5.7"
    assert verify_data["verified_by"] == "Dr. House"
    # CRITICAL: value_raw MUST remain original "5.8"
    assert verify_data["value_raw"] == "5.8"
    # CRITICAL: original reference_range_status MUST remain "HIGH"
    assert verify_data["reference_range_status"] == "HIGH"
    # Verified classification is evaluated on 5.7 (also HIGH on 3.5-5.0)
    assert verify_data["verified_classification"] == "HIGH"
    assert verify_data["current_classification"] == "HIGH"
    # Provenance gap fix: Verified item has USER_VERIFIED provenance, while original extracted source value retains REPORT_EXTRACTED
    assert verify_data["provenance_tag"] == "USER_VERIFIED"
    assert verify_data["original_provenance"] == "REPORT_EXTRACTED"


def test_gemini_unavailable_scanned_pdf_fails_honestly(sample_patient):
    """Requirement 1: When Gemini is unavailable, scanned PDF fails honestly instead of silent 0-item success."""
    GeminiExtractionService.set_mock_response(None)
    original_key = settings.GEMINI_API_KEY
    try:
        settings.GEMINI_API_KEY = ""
        pdf_content = create_sample_pdf_bytes()
        res = client.post(
            f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
            files={"file": ("scanned_bloodwork.pdf", pdf_content, "application/pdf")},
        )
        assert res.status_code == 503
        assert "AI extraction is unavailable" in res.json()["detail"]

        # Verify database record: marked FAILED honestly with NOT_AVAILABLE extraction_method
        db = SessionLocal()
        rep = db.query(MedicalReport).filter(MedicalReport.patient_id == sample_patient, MedicalReport.original_filename == "scanned_bloodwork.pdf").first()
        assert rep is not None
        assert rep.processing_status == "FAILED"
        assert rep.extraction_status == "FAILED"
        assert rep.extraction_method == "NOT_AVAILABLE"
        assert "AI extraction is unavailable" in rep.extraction_error
        db.close()
    finally:
        settings.GEMINI_API_KEY = original_key


def test_gemini_unavailable_image_fails_honestly(sample_patient):
    """Requirement 1: Image upload fails honestly when Gemini is unavailable."""
    GeminiExtractionService.set_mock_response(None)
    original_key = settings.GEMINI_API_KEY
    try:
        settings.GEMINI_API_KEY = ""
        png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
        res = client.post(
            f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
            files={"file": ("lab_photo.png", png_data, "image/png")},
        )
        assert res.status_code == 503
        assert "AI extraction is unavailable" in res.json()["detail"]

        db = SessionLocal()
        rep = db.query(MedicalReport).filter(MedicalReport.patient_id == sample_patient, MedicalReport.original_filename == "lab_photo.png").first()
        assert rep.processing_status == "FAILED"
        assert rep.extraction_method == "NOT_AVAILABLE"
        db.close()
    finally:
        settings.GEMINI_API_KEY = original_key


def test_deterministic_local_extraction_attribution(sample_patient, monkeypatch):
    """Requirement 1 & 2: Clean text PDF with unconfigured Gemini uses LOCAL_DETERMINISTIC method, never AI_GENERATED."""
    GeminiExtractionService.set_mock_response(None)
    original_key = settings.GEMINI_API_KEY
    try:
        settings.GEMINI_API_KEY = ""
        # Mock extract_text_from_pdf to return digital text
        sample_text = (
            "--- PAGE 1 ---\n"
            "Comprehensive Metabolic Panel\n"
            "Hemoglobin 13.5 g/dL 12.0 - 16.0\n"
            "Platelets 250 10^3/uL 150-450\n"
        )
        from app.services.document_service import DocumentService
        monkeypatch.setattr(
            DocumentService,
            "extract_text_from_pdf",
            lambda path: (sample_text, [{"page_number": 1, "text": sample_text}], False),
        )

        pdf_content = create_sample_pdf_bytes()
        res = client.post(
            f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
            files={"file": ("digital_report.pdf", pdf_content, "application/pdf")},
        )
        assert res.status_code == 201
        data = res.json()

        # Must explicitly declare LOCAL_DETERMINISTIC and NO model
        assert data["extraction_method"] == "LOCAL_DETERMINISTIC"
        assert data["extraction_model"] is None
        assert data["processing_status"] == "REVIEW_REQUIRED"
        assert len(data["lab_results"]) == 2

        # Results must be labeled REPORT_EXTRACTED, never AI_GENERATED
        assert all(l["provenance_tag"] == "REPORT_EXTRACTED" for l in data["lab_results"])
        assert all(l["original_provenance"] == "REPORT_EXTRACTED" for l in data["lab_results"])
    finally:
        settings.GEMINI_API_KEY = original_key


def test_gemini_extraction_success_attribution(sample_patient):
    """Requirement 2: Successful Gemini extraction records GEMINI_AI and actual model name."""
    GeminiExtractionService.set_mock_response({
        "report_type": "LABORATORY_REPORT",
        "report_date": "2026-09-05",
        "facility_name": "Apex Central Lab",
        "physician_name": "Dr. Smith",
        "observations": [],
        "laboratory_results": [
            {
                "test_name": "Sodium",
                "value_raw": "140",
                "value_numeric": 140.0,
                "unit": "mmol/L",
                "reference_range_raw": "135 - 145",
                "reference_low": 135.0,
                "reference_high": 145.0,
                "source_page": 1,
                "source_text": "Sodium 140 mmol/L 135-145",
            }
        ],
        "medications": [],
        "diagnoses_or_conditions_as_stated": [],
    })

    pdf_content = create_sample_pdf_bytes()
    res = client.post(
        f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
        files={"file": ("ai_panel.pdf", pdf_content, "application/pdf")},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["extraction_method"] == "GEMINI_AI"
    assert data["extraction_model"] == settings.GEMINI_MODEL


def test_gemini_rate_limit_surfaces_honestly(sample_patient, monkeypatch):
    """Requirement 9: Gemini 429 rate limit is surfaced honestly without silent fallback."""
    GeminiExtractionService.set_mock_response(None)
    original_key = settings.GEMINI_API_KEY
    try:
        settings.GEMINI_API_KEY = "mock_valid_key"

        async def mock_extract(*args, **kwargs):
            raise RuntimeError("Gemini API rate limit exceeded (HTTP 429). Please retry shortly.")

        monkeypatch.setattr(GeminiExtractionService, "extract_structured_data", mock_extract)

        pdf_content = create_sample_pdf_bytes()
        res = client.post(
            f"/api/v1/patients/{sample_patient}/reports?auto_process=true",
            files={"file": ("rate_limited.pdf", pdf_content, "application/pdf")},
        )
        assert res.status_code == 422
        assert "429" in res.json()["detail"]

        db = SessionLocal()
        rep = db.query(MedicalReport).filter(MedicalReport.patient_id == sample_patient, MedicalReport.original_filename == "rate_limited.pdf").first()
        assert rep.processing_status == "FAILED"
        assert rep.extraction_method == "NOT_AVAILABLE"
        assert "429" in rep.extraction_error
        db.close()
    finally:
        settings.GEMINI_API_KEY = original_key


def test_extraction_mock_isolation():
    """Requirement 8: Ensure extraction mock override starts None and is isolated from production."""
    assert GeminiExtractionService._mock_response_override is None
    res = client.get("/api/v1/reports/999999")
    assert res.status_code == 404
    assert GeminiExtractionService._mock_response_override is None


def test_dashboard_stats_endpoint():
    """Verify GET /api/v1/reports/stats returns SQL-computed workspace metrics."""
    res = client.get("/api/v1/reports/stats")
    assert res.status_code == 200
    data = res.json()
    for key in ["total_patients", "total_reports", "pending_reviews", "total_labs", "verified_labs", "out_of_range_labs"]:
        assert key in data
        assert isinstance(data[key], int)


def test_global_reports_and_labs_endpoints():
    """Verify GET /api/v1/reports and /api/v1/reports/lab-results pagination and structure."""
    rep_res = client.get("/api/v1/reports?skip=0&limit=10")
    assert rep_res.status_code == 200
    rep_data = rep_res.json()
    assert "total" in rep_data
    assert "reports" in rep_data
    assert isinstance(rep_data["reports"], list)

    lab_res = client.get("/api/v1/reports/lab-results?skip=0&limit=10")
    assert lab_res.status_code == 200
    lab_data = lab_res.json()
    assert "total" in lab_data
    assert "labs" in lab_data
    assert isinstance(lab_data["labs"], list)


def test_verify_lab_result_mismatched_report_id_returns_404(sample_patient):
    """Ensure verifying a lab result against a mismatched or non-existent report_id returns HTTP 404."""
    # 1. Non-existent report and result
    res = client.patch(
        "/api/v1/reports/999999/lab-results/999999/verify",
        json={"verification_status": "VERIFIED", "verified_value": "15.0"},
    )
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()

    # 2. Existing report A with lab result, and separate existing report B
    db = SessionLocal()
    rep_a = MedicalReport(
        patient_id=sample_patient,
        original_filename="report_a.pdf",
        stored_filename="mock_a.pdf",
        storage_path="uploads/mock_a.pdf",
        document_hash="hash_a_1234567890123456789012345678901234567890123456789012345678901234",
        file_size=1024,
        mime_type="application/pdf",
        provenance_tag="REPORT_EXTRACTED",
    )
    rep_b = MedicalReport(
        patient_id=sample_patient,
        original_filename="report_b.pdf",
        stored_filename="mock_b.pdf",
        storage_path="uploads/mock_b.pdf",
        document_hash="hash_b_1234567890123456789012345678901234567890123456789012345678901234",
        file_size=1024,
        mime_type="application/pdf",
        provenance_tag="REPORT_EXTRACTED",
    )
    db.add_all([rep_a, rep_b])
    db.commit()
    db.refresh(rep_a)
    db.refresh(rep_b)

    lab_a = LabResult(
        report_id=rep_a.id,
        patient_id=sample_patient,
        test_name="Hemoglobin",
        value_raw="14.2",
        unit="g/dL",
        provenance_tag="REPORT_EXTRACTED",
        verification_status="UNVERIFIED",
    )
    db.add(lab_a)
    db.commit()
    db.refresh(lab_a)

    rep_a_id = rep_a.id
    rep_b_id = rep_b.id
    lab_a_id = lab_a.id
    db.close()

    # Attempt to verify lab_a under rep_b -> must return 404
    res_mismatch = client.patch(
        f"/api/v1/reports/{rep_b_id}/lab-results/{lab_a_id}/verify",
        json={"verification_status": "VERIFIED", "verified_value": "14.5"},
    )
    assert res_mismatch.status_code == 404
    detail = res_mismatch.json()["detail"]
    assert f"not found on report {rep_b_id}" in detail


def test_global_lab_results_filtering_by_patient_id(sample_patient):
    """Verify list_global_lab_results can filter accurately by patient_id without N+1 requests."""
    res = client.get(f"/api/v1/reports/lab-results?patient_id={sample_patient}")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "labs" in data
    for lab in data["labs"]:
        assert lab["patient_id"] == sample_patient


