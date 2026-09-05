"""Comprehensive tests for patient intake API endpoints, validation, and persistence."""
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_valid_patient():
    """Test creating a patient with full structured clinical intake data."""
    payload = {
        "full_name": "Arthur Pendelton",
        "patient_identifier": "PAT-TEST-001",
        "date_of_birth": "1975-06-15",
        "age": 51,
        "sex": "MALE",
        "symptoms": [
            {"symptom": "Chronic dry cough", "duration": "3 weeks", "severity": "Moderate"},
            {"symptom": "Mild dyspnea on exertion", "duration": "1 week", "severity": "Mild"},
        ],
        "existing_conditions": [
            {"condition": "Hypertension", "diagnosed_year": "2018", "notes": "Managed on ACE-inhibitor"},
            {"condition": "Hyperlipidemia", "diagnosed_year": "2020"},
        ],
        "allergies": [
            {"allergen": "Penicillin", "reaction": "Anaphylaxis / Hives", "severity": "Severe"},
            {"allergen": "Sulfa drugs", "reaction": "Cutaneous rash", "severity": "Moderate"},
        ],
        "medications": [
            {"name": "Lisinopril", "dosage": "10mg", "frequency": "Once daily"},
            {"name": "Atorvastatin", "dosage": "20mg", "frequency": "Nightly"},
        ],
        "other_information": "Patient reports regular moderate aerobic exercise. Non-smoker.",
    }

    response = client.post("/api/v1/patients", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] is not None
    assert data["full_name"] == "Arthur Pendelton"
    assert data["patient_identifier"] == "PAT-TEST-001"
    assert data["sex"] == "MALE"
    assert data["provenance_tag"] == "USER_PROVIDED"
    assert len(data["symptoms"]) == 2
    assert data["symptoms"][0]["symptom"] == "Chronic dry cough"
    assert data["symptoms"][0]["source"] == "USER_PROVIDED"
    assert len(data["medications"]) == 2
    assert data["medications"][0]["name"] == "Lisinopril"
    assert data["medications"][0]["dosage"] == "10mg"


def test_get_patient_by_id():
    """Test retrieving a single patient record by ID."""
    # Create patient
    create_resp = client.post(
        "/api/v1/patients",
        json={
            "full_name": "Clara Oswald",
            "age": 28,
            "sex": "FEMALE",
            "symptoms": ["Migraine headache"],
        },
    )
    assert create_resp.status_code == 201
    patient_id = create_resp.json()["id"]

    # Fetch patient
    get_resp = client.get(f"/api/v1/patients/{patient_id}")
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == patient_id
    assert data["full_name"] == "Clara Oswald"
    assert data["patient_identifier"].startswith("PAT-")
    assert len(data["symptoms"]) == 1
    assert data["symptoms"][0]["symptom"] == "Migraine headache"
    assert data["symptoms"][0]["source"] == "USER_PROVIDED"


def test_list_patients_and_pagination():
    """Test listing patients with pagination parameters."""
    response = client.get("/api/v1/patients?skip=0&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    assert data["limit"] == 10
    assert data["skip"] == 0


def test_search_patients():
    """Test filtering and searching patients by name and MRN."""
    unique_name = "Zachary UniqueSearchName"
    unique_mrn = "PAT-SEARCH-999"
    client.post(
        "/api/v1/patients",
        json={
            "full_name": unique_name,
            "patient_identifier": unique_mrn,
            "age": 40,
        },
    )

    # Search by full name substring
    search_resp = client.get(f"/api/v1/patients?search=UniqueSearchName")
    assert search_resp.status_code == 200
    results = search_resp.json()["items"]
    assert any(p["full_name"] == unique_name for p in results)

    # Search by identifier
    search_mrn_resp = client.get(f"/api/v1/patients?search=SEARCH-999")
    assert search_mrn_resp.status_code == 200
    mrn_results = search_mrn_resp.json()["items"]
    assert any(p["patient_identifier"] == unique_mrn for p in mrn_results)


def test_update_patient():
    """Test updating existing patient fields safely."""
    create_resp = client.post(
        "/api/v1/patients",
        json={
            "full_name": "Montgomery Scott",
            "age": 55,
            "medications": ["Aspirin 81mg"],
        },
    )
    assert create_resp.status_code == 201
    patient_id = create_resp.json()["id"]

    # Update patient: add new condition and change age
    update_payload = {
        "age": 56,
        "existing_conditions": [
            {"condition": "Gastritis", "diagnosed_year": "2023"}
        ],
        "medications": [
            {"name": "Aspirin", "dosage": "81mg", "frequency": "Daily"},
            {"name": "Omeprazole", "dosage": "20mg", "frequency": "Morning"},
        ],
    }
    update_resp = client.put(f"/api/v1/patients/{patient_id}", json=update_payload)
    assert update_resp.status_code == 200
    updated_data = update_resp.json()
    assert updated_data["age"] == 56
    assert len(updated_data["medications"]) == 2
    assert len(updated_data["existing_conditions"]) == 1
    assert updated_data["existing_conditions"][0]["condition"] == "Gastritis"


def test_delete_patient():
    """Test deleting a patient and verifying 404 on subsequent access."""
    create_resp = client.post(
        "/api/v1/patients",
        json={"full_name": "Temporary Record", "age": 30},
    )
    assert create_resp.status_code == 201
    patient_id = create_resp.json()["id"]

    # Delete
    del_resp = client.delete(f"/api/v1/patients/{patient_id}")
    assert del_resp.status_code == 204

    # Verify not found
    get_resp = client.get(f"/api/v1/patients/{patient_id}")
    assert get_resp.status_code == 404


def test_patient_not_found():
    """Test 404 response for non-existent patient queries."""
    non_existent_id = 999999
    assert client.get(f"/api/v1/patients/{non_existent_id}").status_code == 404
    assert client.put(f"/api/v1/patients/{non_existent_id}", json={"full_name": "Nobody"}).status_code == 404
    assert client.delete(f"/api/v1/patients/{non_existent_id}").status_code == 404


def test_invalid_patient_data():
    """Test validation errors when required fields are missing or empty."""
    # Missing full_name
    resp_missing_name = client.post("/api/v1/patients", json={"age": 45})
    assert resp_missing_name.status_code == 422

    # Neither DOB nor Age provided
    resp_no_age_dob = client.post("/api/v1/patients", json={"full_name": "No Age Person"})
    assert resp_no_age_dob.status_code == 422


def test_age_and_dob_validation():
    """Test boundary validation rules for age and date of birth."""
    # Negative age
    resp_neg_age = client.post(
        "/api/v1/patients",
        json={"full_name": "Benjamin Button", "age": -5},
    )
    assert resp_neg_age.status_code == 422

    # Future date of birth
    future_date = (date.today() + timedelta(days=10)).isoformat()
    resp_future_dob = client.post(
        "/api/v1/patients",
        json={"full_name": "Future Traveler", "date_of_birth": future_date},
    )
    assert resp_future_dob.status_code == 422


def test_duplicate_patient_identifier():
    """Test conflict error (409) when creating two patients with the same identifier."""
    dup_id = "PAT-DUP-CONFLICT-01"
    resp1 = client.post(
        "/api/v1/patients",
        json={"full_name": "First Patient", "patient_identifier": dup_id, "age": 35},
    )
    assert resp1.status_code == 201

    resp2 = client.post(
        "/api/v1/patients",
        json={"full_name": "Second Patient", "patient_identifier": dup_id, "age": 42},
    )
    assert resp2.status_code == 409
    assert "already exists" in resp2.json()["detail"]


def test_database_persistence_and_provenance_schema():
    """Verify database persistence and schema preservation of USER_PROVIDED provenance."""
    mrn = "PAT-PROV-901"
    create_resp = client.post(
        "/api/v1/patients",
        json={
            "full_name": "Fiona Gallagher",
            "patient_identifier": mrn,
            "age": 31,
            "symptoms": ["Fatigue", "Brain fog"],
            "allergies": ["Latex"],
        },
    )
    assert create_resp.status_code == 201
    created_id = create_resp.json()["id"]

    # Fetch fresh from database via separate request
    fetch_resp = client.get(f"/api/v1/patients/{created_id}")
    assert fetch_resp.status_code == 200
    res = fetch_resp.json()
    assert res["provenance_tag"] == "USER_PROVIDED"
    assert len(res["symptoms"]) == 2
    assert all(item["source"] == "USER_PROVIDED" for item in res["symptoms"])
    assert res["allergies"][0]["allergen"] == "Latex"
    assert res["allergies"][0]["source"] == "USER_PROVIDED"
