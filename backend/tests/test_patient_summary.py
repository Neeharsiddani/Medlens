"""Unit and API integration tests for Phase 5 AI-Powered Patient-Friendly Summary with Fix 1 & Fix 2."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.db.database import SessionLocal
from app.models.patient import Patient
from app.models.report import MedicalReport, LabResult
from app.models.summary import PatientSummary
from app.services.summary_service import PatientSummaryService

client = TestClient(app)

SAMPLE_VALID_GEMINI_SUMMARY = {
    "summary_text": (
        "Beatrice Stone is a 58-year-old female with documented hypertension managed with Lisinopril, "
        "who presented with moderate fatigue. Recent lab results indicate Hemoglobin was 9.2 g/dL, "
        "which is below the reference range of 12.0 - 16.0 g/dL provided in the report. "
        "Glucose was within the report's reference range at 90 mg/dL. "
        "Vitamin D was reported as 28 ng/mL, but no reference range was provided in the source report."
    ),
    "key_observations": [
        "Hemoglobin was 9.2 g/dL, which is below the source reference range of 12.0 - 16.0 g/dL.",
        "Glucose was 90 mg/dL, which is within the source reference range of 70 - 99 mg/dL.",
        "Active documented medication is Lisinopril for hypertension.",
    ],
    "data_limitations": [
        "Vitamin D has no reference range provided in the report, preventing classification as low, normal, or high.",
        "Lab results are unverified and pending clinician review.",
    ],
}


@pytest.fixture(autouse=True)
def reset_summary_mock():
    """Ensure summary mock override is reset after each test."""
    PatientSummaryService.set_mock_response(None)
    yield
    PatientSummaryService.set_mock_response(None)


@pytest.fixture
def populated_patient():
    """Create a patient record with baseline intake data and an extracted lab result."""
    db = SessionLocal()
    patient = Patient(
        full_name="Beatrice Stone",
        age=58,
        sex="FEMALE",
        symptoms=[{"name": "Fatigue", "severity": "MODERATE"}],
        existing_conditions=[{"name": "Hypertension", "status": "ACTIVE"}],
        allergies=[{"allergen": "Sulfa", "reaction": "Rash"}],
        medications=[{"name": "Lisinopril", "dosage": "10mg", "frequency": "Daily"}],
        other_information="Patient notes increased fatigue over 3 weeks.",
        provenance_tag="USER_PROVIDED",
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Create associated report
    report = MedicalReport(
        patient_id=patient.id,
        original_filename="CBC_Panel.pdf",
        stored_filename="fake_cbc.pdf",
        storage_path="uploads/fake_cbc.pdf",
        mime_type="application/pdf",
        file_size=1024,
        document_hash="a" * 64,
        report_type="LABORATORY_REPORT",
        processing_status="REVIEW_REQUIRED",
        extraction_status="COMPLETED",
        provenance_tag="REPORT_EXTRACTED",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Add Lab Results: one LOW, one NORMAL, one with NO reference range
    hgb = LabResult(
        report_id=report.id,
        patient_id=patient.id,
        test_name="Hemoglobin",
        value_raw="9.2",
        value_numeric=9.2,
        unit="g/dL",
        reference_range_raw="12.0 - 16.0",
        reference_low=12.0,
        reference_high=16.0,
        reference_unit="g/dL",
        source_page=1,
        source_text="Hemoglobin 9.2 g/dL 12.0 - 16.0",
        provenance_tag="REPORT_EXTRACTED",
        verification_status="UNVERIFIED",
        reference_range_status="LOW",
        classification_reason="LOW — 9.2 g/dL is below the source-provided reference range of 12.0 - 16.0 g/dL.",
    )
    glucose = LabResult(
        report_id=report.id,
        patient_id=patient.id,
        test_name="Glucose",
        value_raw="90",
        value_numeric=90.0,
        unit="mg/dL",
        reference_range_raw="70-99",
        reference_low=70.0,
        reference_high=99.0,
        reference_unit="mg/dL",
        source_page=1,
        source_text="Glucose 90 mg/dL 70-99",
        provenance_tag="REPORT_EXTRACTED",
        verification_status="UNVERIFIED",
        reference_range_status="NORMAL",
        classification_reason="NORMAL — 90.0 mg/dL is within the source-provided reference range of 70.0 - 99.0 mg/dL.",
    )
    vit_d = LabResult(
        report_id=report.id,
        patient_id=patient.id,
        test_name="Vitamin D",
        value_raw="28",
        value_numeric=28.0,
        unit="ng/mL",
        reference_range_raw=None,
        reference_low=None,
        reference_high=None,
        source_page=1,
        source_text="Vitamin D 28 ng/mL",
        provenance_tag="REPORT_EXTRACTED",
        verification_status="UNVERIFIED",
        reference_range_status="NO_RANGE_AVAILABLE",
        classification_reason="NO_RANGE_AVAILABLE — No reference range was provided in the source report.",
    )
    db.add_all([hgb, glucose, vit_d])
    db.commit()

    patient_id = patient.id
    db.close()
    return patient_id


def test_gemini_success_produces_ai_generated_summary(populated_patient):
    """FIX 1: Valid Gemini generation produces summary with AI_GENERATED provenance and source fingerprint."""
    PatientSummaryService.set_mock_response(SAMPLE_VALID_GEMINI_SUMMARY)

    res = client.post(f"/api/v1/patients/{populated_patient}/summary")
    assert res.status_code == 201
    data = res.json()

    assert data["patient_id"] == populated_patient
    assert data["provenance_tag"] == "AI_GENERATED"
    assert data["source_fingerprint"] is not None
    assert len(data["source_fingerprint"]) == 64
    assert data["is_stale"] is False
    assert "below the reference range" in data["summary_text"]
    assert len(data["key_observations"]) >= 2
    assert len(data["data_limitations"]) >= 1


def test_gemini_unavailable_prevents_false_ai_generated_summary(populated_patient):
    """FIX 1: When Gemini is unavailable/unconfigured, return 503 and do NOT create false AI_GENERATED summary."""
    PatientSummaryService.set_mock_response(None)
    original_key = settings.GEMINI_API_KEY
    try:
        settings.GEMINI_API_KEY = ""  # Force unconfigured state
        res = client.post(f"/api/v1/patients/{populated_patient}/summary")
        assert res.status_code == 503
        assert "unavailable" in res.json()["detail"].lower()

        # Verify no false summary was persisted in database
        db = SessionLocal()
        summaries = db.query(PatientSummary).filter(PatientSummary.patient_id == populated_patient).all()
        db.close()
        assert len(summaries) == 0, "No summary must be persisted when Gemini is unavailable!"

        # Verify GET returns 404
        get_res = client.get(f"/api/v1/patients/{populated_patient}/summary")
        assert get_res.status_code == 404
    finally:
        settings.GEMINI_API_KEY = original_key


def test_pydantic_validation_gate_rejects_malformed_response(populated_patient):
    """FIX 1: Pydantic gate rejects malformed AI response and prevents database corruption."""
    PatientSummaryService.set_mock_response({
        "key_observations": ["Some observation"],
        "data_limitations": [],
    })

    res = client.post(f"/api/v1/patients/{populated_patient}/summary")
    assert res.status_code == 422
    assert "failed schema validation" in res.json()["detail"]


def test_missing_patient_returns_404():
    """Requesting summary for non-existent patient returns 404."""
    res = client.post("/api/v1/patients/999999/summary")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_deterministic_test_utility_preserves_safety_and_uncertainty(populated_patient):
    """Test deterministic test utility generator directly without saving false AI_GENERATED summary."""
    db = SessionLocal()
    patient = db.query(Patient).filter(Patient.id == populated_patient).first()
    controlled_input = PatientSummaryService.build_controlled_input(db, patient)
    db.close()

    output = PatientSummaryService.generate_deterministic_test_summary(controlled_input)
    assert len(output.summary_text) > 20
    # Must preserve uncertainty without guessing a reference range
    assert any("no reference range" in lim.lower() for lim in output.data_limitations)
    # Must never diagnose
    assert "you have anemia" not in output.summary_text.lower()
    assert "you have diabetes" not in output.summary_text.lower()


def test_deterministic_classifications_remain_unchanged(populated_patient):
    """Phase 4 deterministic classifications in summary input remain unchanged."""
    db = SessionLocal()
    p = db.query(Patient).filter(Patient.id == populated_patient).first()
    controlled_input = PatientSummaryService.build_controlled_input(db, p)
    db.close()

    labs = controlled_input.laboratory_results
    hgb = next(l for l in labs if l["test_name"] == "Hemoglobin")
    glu = next(l for l in labs if l["test_name"] == "Glucose")
    vit = next(l for l in labs if l["test_name"] == "Vitamin D")

    assert hgb["status"] == "LOW"
    assert glu["status"] == "NORMAL"
    assert vit["status"] == "NO_RANGE_AVAILABLE"


def test_staleness_detection_no_change_remains_current(populated_patient):
    """FIX 2: Summary remains current (is_stale=False) when structured record is unmodified."""
    PatientSummaryService.set_mock_response(SAMPLE_VALID_GEMINI_SUMMARY)

    post_res = client.post(f"/api/v1/patients/{populated_patient}/summary")
    assert post_res.status_code == 201
    assert post_res.json()["is_stale"] is False

    get_res = client.get(f"/api/v1/patients/{populated_patient}/summary")
    assert get_res.status_code == 200
    assert get_res.json()["is_stale"] is False


def test_staleness_detection_patient_info_change(populated_patient):
    """FIX 2: Summary becomes stale (is_stale=True) when patient information changes."""
    PatientSummaryService.set_mock_response(SAMPLE_VALID_GEMINI_SUMMARY)

    post_res = client.post(f"/api/v1/patients/{populated_patient}/summary")
    assert post_res.status_code == 201

    # Modify patient symptoms
    db = SessionLocal()
    patient = db.query(Patient).filter(Patient.id == populated_patient).first()
    patient.symptoms = [{"name": "Chest tightness", "severity": "SEVERE"}]
    db.commit()
    db.close()

    # Query latest summary
    get_res = client.get(f"/api/v1/patients/{populated_patient}/summary")
    assert get_res.status_code == 200
    assert get_res.json()["is_stale"] is True


def test_staleness_detection_new_report_and_lab_result(populated_patient):
    """FIX 2: Summary becomes stale (is_stale=True) when new report/lab result is added."""
    PatientSummaryService.set_mock_response(SAMPLE_VALID_GEMINI_SUMMARY)

    post_res = client.post(f"/api/v1/patients/{populated_patient}/summary")
    assert post_res.status_code == 201

    # Add a new report and lab result
    db = SessionLocal()
    new_rep = MedicalReport(
        patient_id=populated_patient,
        original_filename="Electrolytes.pdf",
        stored_filename="fake_elec.pdf",
        storage_path="uploads/fake_elec.pdf",
        mime_type="application/pdf",
        file_size=1024,
        document_hash="b" * 64,
        report_type="LABORATORY_REPORT",
        processing_status="COMPLETED",
        extraction_status="COMPLETED",
        provenance_tag="REPORT_EXTRACTED",
    )
    db.add(new_rep)
    db.commit()
    db.refresh(new_rep)

    new_lab = LabResult(
        report_id=new_rep.id,
        patient_id=populated_patient,
        test_name="Potassium",
        value_raw="5.8",
        value_numeric=5.8,
        unit="mmol/L",
        reference_range_raw="3.5 - 5.0",
        reference_low=3.5,
        reference_high=5.0,
        reference_range_status="HIGH",
        provenance_tag="REPORT_EXTRACTED",
        verification_status="UNVERIFIED",
    )
    db.add(new_lab)
    db.commit()
    db.close()

    get_res = client.get(f"/api/v1/patients/{populated_patient}/summary")
    assert get_res.status_code == 200
    assert get_res.json()["is_stale"] is True


def test_staleness_detection_lab_verification_change(populated_patient):
    """FIX 2: Summary becomes stale (is_stale=True) when a clinician verifies or modifies a lab result."""
    PatientSummaryService.set_mock_response(SAMPLE_VALID_GEMINI_SUMMARY)

    post_res = client.post(f"/api/v1/patients/{populated_patient}/summary")
    assert post_res.status_code == 201

    # Clinician verifies Hemoglobin
    db = SessionLocal()
    hgb = db.query(LabResult).filter(LabResult.patient_id == populated_patient, LabResult.test_name == "Hemoglobin").first()
    hgb.verified_value = "9.5"
    hgb.verification_status = "VERIFIED"
    db.commit()
    db.close()

    get_res = client.get(f"/api/v1/patients/{populated_patient}/summary")
    assert get_res.status_code == 200
    assert get_res.json()["is_stale"] is True


def test_regeneration_stores_new_fingerprint_and_preserves_history(populated_patient):
    """FIX 2: Regenerating summary stores updated fingerprint and preserves immutable audit history."""
    PatientSummaryService.set_mock_response(SAMPLE_VALID_GEMINI_SUMMARY)

    res1 = client.post(f"/api/v1/patients/{populated_patient}/summary")
    assert res1.status_code == 201
    sum1 = res1.json()
    fp1 = sum1["source_fingerprint"]

    # Change patient data to make it stale
    db = SessionLocal()
    p = db.query(Patient).filter(Patient.id == populated_patient).first()
    p.age = 59
    db.commit()
    db.close()

    # Check stale
    get_res = client.get(f"/api/v1/patients/{populated_patient}/summary")
    assert get_res.json()["is_stale"] is True

    # Regenerate summary
    res2 = client.post(f"/api/v1/patients/{populated_patient}/summary")
    assert res2.status_code == 201
    sum2 = res2.json()
    fp2 = sum2["source_fingerprint"]

    assert sum2["id"] != sum1["id"], "New summary record created"
    assert fp2 != fp1, "New fingerprint computed from updated patient data"
    assert sum2["is_stale"] is False

    # Historical verification: Database contains both records
    db = SessionLocal()
    history = db.query(PatientSummary).filter(PatientSummary.patient_id == populated_patient).order_by(PatientSummary.id.asc()).all()
    db.close()

    assert len(history) == 2
    assert history[0].id == sum1["id"]
    assert history[0].source_fingerprint == fp1
    assert history[1].id == sum2["id"]
    assert history[1].source_fingerprint == fp2
