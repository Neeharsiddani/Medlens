"""Patient AI Summary generation service with strict safety constraints and Pydantic validation."""
import hashlib
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from fastapi import HTTPException, status
import httpx
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.ai_utils import clean_markdown_json
from app.models.patient import Patient
from app.models.report import MedicalReport, LabResult, ReportObservation, ReportMedication
from app.models.summary import PatientSummary
from app.schemas.summary import (
    ControlledSummaryInput,
    PatientSummaryOutput,
    PatientSummaryResponse,
)

logger = logging.getLogger(__name__)

PATIENT_SUMMARY_SYSTEM_PROMPT = """You are MedLens Patient Summary Engine.
Your task is to generate a concise, patient-friendly narrative summary of the patient's structured health record.

CRITICAL MEDICAL SAFETY & RESPONSIBLE AI RULES:
1. Grounding: Use ONLY the supplied structured facts in the input. Do NOT introduce outside medical knowledge or cite medical literature.
2. NO Diagnosis: You MUST NOT diagnose diseases or tell the patient they have a condition based on lab values or symptoms.
   - GOOD: "Hemoglobin was 9.2 g/dL, which is below the reference range of 12.0-16.0 g/dL provided in the report."
   - FORBIDDEN: "You have anemia."
   - GOOD: "Glucose was 126 mg/dL, which is above the reference range of 70-99 mg/dL provided in the report."
   - FORBIDDEN: "You have diabetes."
3. NO Treatments or Prescriptions: You MUST NOT recommend treatments, medications, changing medication, or stopping medication.
4. Deterministic Lab Authority: The reference-range engine has already classified results as LOW, NORMAL, HIGH, or NO_RANGE_AVAILABLE. You MUST NOT recalculate, alter, or dispute these classifications.
5. Missing Ranges: If a test has NO reference range provided (or status NO_RANGE_AVAILABLE), explicitly note that the report did not provide a reference range and MedLens cannot classify it as low, normal, or high. Never guess or lookup normal values.
6. Verified Values: When a clinician-verified value exists, acknowledge that a clinician confirmed or updated this value.
7. Plain Language: Write in reassuring, accessible, patient-friendly terms without overwhelming medical jargon.
8. Concise: The summary text should be a clear 1 to 3 paragraph explanation.

OUTPUT FORMAT:
Return ONLY valid JSON matching this schema with no markdown formatting and no commentary:
{
  "summary_text": "Plain language narrative summary of the patient record...",
  "key_observations": [
    "Observation 1 grounded strictly in data",
    "Observation 2..."
  ],
  "data_limitations": [
    "Limitation 1 (e.g. Vitamin D report did not include a reference range)",
    "Limitation 2 (e.g. Unverified laboratory values)"
  ]
}
"""


class PatientSummaryService:
    """Service to construct controlled payloads, coordinate Gemini summary generation, and persist results."""

    # Test override mock hook for unit testing
    _mock_response_override: Optional[Dict[str, Any]] = None

    @classmethod
    def set_mock_response(cls, response: Optional[Dict[str, Any]]):
        """Set a test mock response override for automated unit testing."""
        cls._mock_response_override = response

    @staticmethod
    def build_controlled_input(db: Session, patient: Patient) -> ControlledSummaryInput:
        """Construct a bounded, controlled summary payload from database entities."""
        # Retrieve all reports and lab results for patient with batch eager loading
        reports = (
            db.query(MedicalReport)
            .options(
                selectinload(MedicalReport.lab_results),
                selectinload(MedicalReport.observations),
                selectinload(MedicalReport.medications),
            )
            .filter(MedicalReport.patient_id == patient.id)
            .order_by(MedicalReport.created_at.desc())
            .all()
        )

        reports_data = []
        all_labs = []
        all_obs = []
        all_rep_meds = []

        for rep in reports:
            reports_data.append({
                "id": rep.id,
                "report_type": rep.report_type,
                "facility_name": rep.facility_name,
                "physician_name": rep.physician_name,
                "report_date": str(rep.report_date) if rep.report_date else None,
                "extraction_method": rep.extraction_method,
                "document_hash": rep.document_hash,
                "processing_status": rep.processing_status,
            })
            for lab in rep.lab_results:
                all_labs.append({
                    "id": lab.id,
                    "report_id": lab.report_id,
                    "test_name": lab.test_name,
                    "value_raw": lab.value_raw,
                    "value_numeric": lab.value_numeric,
                    "verified_value": lab.verified_value,
                    "display_value": lab.verified_value or lab.value_raw,
                    "unit": lab.unit,
                    "reference_range": lab.reference_range_raw,
                    "reference_range_raw": lab.reference_range_raw,
                    "status": lab.verified_classification or lab.reference_range_status,
                    "reference_range_status": lab.reference_range_status,
                    "verified_classification": lab.verified_classification,
                    "verification_status": lab.verification_status,
                    "provenance_tag": lab.provenance_tag,
                    "report_date": str(lab.report_date) if lab.report_date else None,
                    "observation": lab.observation,
                })
            for obs in rep.observations:
                all_obs.append({
                    "id": obs.id,
                    "report_id": obs.report_id,
                    "category": obs.category,
                    "description": obs.description,
                    "verification_status": obs.verification_status,
                    "provenance_tag": obs.provenance_tag,
                })
            for med in rep.medications:
                all_rep_meds.append({
                    "id": med.id,
                    "report_id": med.report_id,
                    "medication_name": med.medication_name,
                    "dosage": med.dosage,
                    "frequency": med.frequency,
                    "route": med.route,
                    "instructions": med.instructions,
                    "verification_status": med.verification_status,
                    "provenance_tag": med.provenance_tag,
                })

        return ControlledSummaryInput(
            patient_identifier=patient.patient_identifier,
            full_name=patient.full_name,
            age=patient.age,
            sex=patient.sex,
            symptoms=patient.symptoms or [],
            existing_conditions=patient.existing_conditions or [],
            allergies=patient.allergies or [],
            medications=patient.medications or [],
            other_information=patient.other_information,
            reports=reports_data,
            laboratory_results=all_labs,
            observations=all_obs,
            report_medications=all_rep_meds,
        )

    @staticmethod
    def compute_source_fingerprint(controlled_input: ControlledSummaryInput) -> str:
        """
        Compute a deterministic, stable SHA-256 fingerprint of the structured clinical record.
        Includes patient demographics, symptoms, conditions, allergies, medications,
        reports, laboratory results, range statuses, and clinician verification data.
        """
        data = controlled_input.model_dump()
        # Sort lists of dicts by primary clinical identifiers to guarantee deterministic ordering
        if "reports" in data and isinstance(data["reports"], list):
            data["reports"] = sorted(
                data["reports"],
                key=lambda x: (
                    str(x.get("id") or ""),
                    x.get("report_date") or "",
                    x.get("document_hash") or "",
                ),
            )
        if "laboratory_results" in data and isinstance(data["laboratory_results"], list):
            data["laboratory_results"] = sorted(
                data["laboratory_results"],
                key=lambda x: (
                    str(x.get("id") or ""),
                    str(x.get("report_id") or ""),
                    x.get("test_name") or "",
                    x.get("report_date") or "",
                    str(x.get("display_value") or ""),
                    str(x.get("status") or ""),
                    str(x.get("verification_status") or ""),
                    str(x.get("provenance_tag") or ""),
                ),
            )
        if "observations" in data and isinstance(data["observations"], list):
            data["observations"] = sorted(
                data["observations"],
                key=lambda x: (str(x.get("id") or ""), x.get("category") or "", x.get("description") or ""),
            )
        if "report_medications" in data and isinstance(data["report_medications"], list):
            data["report_medications"] = sorted(
                data["report_medications"],
                key=lambda x: (str(x.get("id") or ""), x.get("medication_name") or "", x.get("dosage") or ""),
            )

        canonical_json = json.dumps(data, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    @classmethod
    async def generate_summary(cls, db: Session, patient_id: int) -> PatientSummaryResponse:
        """
        Generate or regenerate a patient-friendly summary:
        1. Validate patient existence
        2. Build controlled summary input
        3. Compute stable source fingerprint
        4. Call Gemini (or explicit test mock)
        5. Validate with Pydantic gate
        6. Assign AI_GENERATED provenance in backend ONLY upon genuine AI generation
        7. Persist to database with source fingerprint
        """
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {patient_id} not found.",
            )

        controlled_input = cls.build_controlled_input(db, patient)
        source_fingerprint = cls.compute_source_fingerprint(controlled_input)

        # Execute AI generation or explicit test mock with strict schema protection
        # If Gemini is unavailable, _execute_ai_generation raises HTTPException(503).
        summary_output = await cls._execute_ai_generation(controlled_input)

        # Backend explicitly assigns AI_GENERATED provenance ONLY upon valid AI generation
        now = datetime.now(timezone.utc)
        summary_entity = PatientSummary(
            patient_id=patient.id,
            summary_text=summary_output.summary_text,
            key_observations=summary_output.key_observations,
            data_limitations=summary_output.data_limitations,
            provenance_tag="AI_GENERATED",
            model_name=settings.GEMINI_MODEL,
            source_fingerprint=source_fingerprint,
            generated_at=now,
            created_at=now,
        )
        db.add(summary_entity)
        db.commit()
        db.refresh(summary_entity)

        return PatientSummaryResponse(
            id=summary_entity.id,
            patient_id=summary_entity.patient_id,
            summary_text=summary_entity.summary_text,
            key_observations=summary_entity.key_observations or [],
            data_limitations=summary_entity.data_limitations or [],
            provenance_tag=summary_entity.provenance_tag,
            model_name=summary_entity.model_name,
            source_fingerprint=summary_entity.source_fingerprint,
            is_stale=False,
            generated_at=summary_entity.generated_at,
            created_at=summary_entity.created_at,
        )

    @classmethod
    def get_latest_summary(cls, db: Session, patient_id: int) -> Optional[PatientSummary]:
        """Fetch the most recent raw summary entity for a patient."""
        return (
            db.query(PatientSummary)
            .filter(PatientSummary.patient_id == patient_id)
            .order_by(PatientSummary.generated_at.desc())
            .first()
        )

    @classmethod
    def get_summary_response(cls, db: Session, patient_id: int) -> PatientSummaryResponse:
        """Fetch the most recent summary for a patient, evaluating real-time source staleness."""
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {patient_id} not found.",
            )

        summary = cls.get_latest_summary(db, patient_id)
        if not summary:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No summary generated for patient {patient_id} yet.",
            )

        # Recalculate current source fingerprint from live structured data
        controlled_input = cls.build_controlled_input(db, patient)
        current_fingerprint = cls.compute_source_fingerprint(controlled_input)

        # Summary is stale if current structured source fingerprint differs from stored fingerprint
        is_stale = (summary.source_fingerprint != current_fingerprint)

        return PatientSummaryResponse(
            id=summary.id,
            patient_id=summary.patient_id,
            summary_text=summary.summary_text,
            key_observations=summary.key_observations or [],
            data_limitations=summary.data_limitations or [],
            provenance_tag=summary.provenance_tag,
            model_name=summary.model_name,
            source_fingerprint=summary.source_fingerprint,
            is_stale=is_stale,
            generated_at=summary.generated_at,
            created_at=summary.created_at,
        )

    @classmethod
    async def _execute_ai_generation(
        cls, controlled_input: ControlledSummaryInput
    ) -> PatientSummaryOutput:
        """
        Invoke Gemini (or explicit test mock) with strict Pydantic validation.
        NEVER silently falls back to offline generator or labels non-AI as AI_GENERATED.
        """
        # 1. Test mock override check (strictly for automated unit tests)
        if cls._mock_response_override is not None:
            try:
                return PatientSummaryOutput.model_validate(cls._mock_response_override)
            except Exception as e:
                logger.error(f"Test mock output failed schema validation: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"AI output failed schema validation: {str(e)}",
                )

        # 2. Check if live Gemini API key is configured
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key.strip() == "" or api_key == "test_key":
            logger.warning("Gemini summary requested but GEMINI_API_KEY is not configured.")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI summary service is unavailable: GEMINI_API_KEY is not configured.",
            )

        # 3. Call live Gemini API
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={api_key}"
        user_content = (
            f"PATIENT STRUCTURED RECORD FOR SUMMARY GENERATION:\n\n"
            f"{json.dumps(controlled_input.model_dump(), indent=2)}"
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": PATIENT_SUMMARY_SYSTEM_PROMPT},
                        {"text": user_content},
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.1,
                "response_mime_type": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"Gemini Summary API error {e.response.status_code}: {e.response.text}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Gemini API returned error {e.response.status_code}: {e.response.text}",
            )
        except Exception as e:
            logger.error(f"Gemini request failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to communicate with Gemini API: {str(e)}",
            )

        try:
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    raw_text = parts[0]["text"]
                else:
                    raise ValueError("No text content in Gemini response candidates")
            else:
                raise ValueError("No candidates returned in Gemini response")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Malformed Gemini API response envelope: {str(e)}",
            )

        return cls._clean_and_validate_json(raw_text)

    @classmethod
    def _clean_and_validate_json(cls, raw_json_str: str) -> PatientSummaryOutput:
        """Strip markdown markers and enforce Pydantic validation."""
        cleaned = clean_markdown_json(raw_json_str)

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON returned by Gemini: {raw_json_str}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"AI response is not valid JSON: {str(e)}",
            )

        try:
            return PatientSummaryOutput.model_validate(parsed)
        except Exception as e:
            logger.error(f"AI response failed Pydantic validation: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"AI response failed schema validation: {str(e)}",
            )

    @classmethod
    def generate_deterministic_test_summary(
        cls, controlled_input: ControlledSummaryInput
    ) -> PatientSummaryOutput:
        """
        Explicit test utility for deterministic summary evaluation in unit testing.
        NOTE: This is strictly a test utility. It is NEVER used in production generation
        and NEVER persisted or returned as AI_GENERATED.
        """
        obs_list = []
        limitations = []

        # Demographic context
        demo_parts = []
        if controlled_input.age:
            demo_parts.append(f"{controlled_input.age} years old")
        if controlled_input.sex:
            demo_parts.append(controlled_input.sex.lower())
        demo_str = ", ".join(demo_parts) if demo_parts else "unspecified age and sex"

        # Baseline conditions
        cond_names = [c.get("condition") or c.get("name") for c in controlled_input.existing_conditions if c]
        cond_str = ", ".join(filter(None, cond_names)) or "no ongoing medical conditions reported"

        # Symptoms
        symp_names = [s.get("symptom") or s.get("name") for s in controlled_input.symptoms if s]
        symp_str = ", ".join(filter(None, symp_names)) or "no presenting symptoms documented"

        # Medications
        med_names = [m.get("name") or m.get("medication_name") for m in controlled_input.medications if m]
        med_str = ", ".join(filter(None, med_names)) or "no active medications noted"

        narrative_parts = [
            f"This summary is generated from structured records for patient {controlled_input.patient_identifier} ({demo_str}). "
            f"Documented history notes {cond_str}, with complaints of {symp_str}. "
            f"Current documented medications include {med_str}."
        ]

        if cond_names:
            obs_list.append(f"Documented clinical history includes {cond_str}.")
        if symp_names:
            obs_list.append(f"Presenting complaints documented during intake: {symp_str}.")

        # Laboratory findings
        labs = controlled_input.laboratory_results
        if labs:
            lab_narratives = []
            for lab in labs:
                test_name = lab.get("test_name", "Test")
                val = lab.get("display_value") or lab.get("value_raw") or "Unknown"
                unit = lab.get("unit") or ""
                unit_str = f" {unit}" if unit else ""
                ref = lab.get("reference_range")
                status_val = lab.get("status", "UNDETERMINED")
                is_verified = lab.get("verification_status") == "VERIFIED"

                verified_prefix = "Clinician-verified " if is_verified else ""

                if ref and status_val in {"LOW", "NORMAL", "HIGH"}:
                    rel = "below" if status_val == "LOW" else "above" if status_val == "HIGH" else "within"
                    lab_narratives.append(
                        f"{verified_prefix}{test_name} was reported at {val}{unit_str}, which is {rel} the source reference range of {ref}{unit_str}."
                    )
                    obs_list.append(
                        f"{test_name}: {val}{unit_str} ({status_val} relative to source range {ref}{unit_str})."
                    )
                elif not ref or status_val == "NO_RANGE_AVAILABLE":
                    lab_narratives.append(
                        f"{test_name} was reported as {val}{unit_str}. The source report provided no reference range."
                    )
                    limitations.append(
                        f"{test_name} has no reference range provided in the report, preventing low/normal/high classification."
                    )
                else:
                    lab_narratives.append(
                        f"{test_name} was reported as {val}{unit_str} with range status {status_val}."
                    )
                    limitations.append(
                        f"{test_name} reference range ({ref}) could not be safely evaluated."
                    )

                if not is_verified:
                    limitations.append(f"Result for {test_name} is unverified and pending clinician review.")

            narrative_parts.append(" ".join(lab_narratives))
        else:
            narrative_parts.append("No medical laboratory reports have been uploaded or extracted for this patient.")
            limitations.append("No laboratory report data is currently available in the patient record.")

        # Deduplicate limitations
        limitations = list(dict.fromkeys(limitations))

        return PatientSummaryOutput(
            summary_text=" ".join(narrative_parts),
            key_observations=obs_list,
            data_limitations=limitations,
        )
