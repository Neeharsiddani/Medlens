"""Gemini extraction service with strict medical schema prompting and offline mock support."""
import base64
import json
import logging
import re
from typing import Optional, Dict, Any, List
import httpx
from app.core.config import settings
from app.schemas.report import ReportExtraction, ExtractedLabResult, ExtractedObservation, ExtractedMedication

logger = logging.getLogger(__name__)

EXTRACTION_SYSTEM_PROMPT = """You are MedLens Structured Medical Extraction Engine.
Your SOLE task is to extract medical data from the provided document text or image into a strict, validated JSON structure.

CRITICAL MEDICAL SAFETY RULES (EXTRACTION ONLY):
- You MUST extract ONLY information explicitly written in the source document.
- DO NOT diagnose diseases.
- DO NOT infer diseases, conditions, or causes from laboratory values or symptoms.
- DO NOT recommend treatments, tests, or medication changes.
- DO NOT invent missing values or missing information.
- DO NOT invent reference ranges or lookup reference ranges from external medical knowledge.
- If a laboratory test has NO reference range written in the document, reference_range_raw MUST be null, reference_low MUST be null, and reference_high MUST be null.
- DO NOT classify laboratory values as LOW, NORMAL, HIGH, or ABNORMAL.
- DO NOT generate clinical conclusions or overall diagnoses.
- "diagnoses_or_conditions_as_stated" must contain ONLY diagnoses, clinical impressions, or conditions EXPLICITLY written as a diagnosis by the clinician in the report.
- Preserve the exact raw text of values (value_raw) and reference ranges (reference_range_raw) as written in the report (e.g., '9.2', '12.0 - 16.0', '> 40', '< 100', 'Negative').
- If numeric parsing of value is straightforward, populate value_numeric as float; otherwise null.
- If reference range has simple lower and upper numeric bounds, populate reference_low and reference_high as floats; otherwise leave them null while preserving reference_range_raw.
- Include source_page (integer page number, 1-indexed, or null if unknown) and source_text (exact line or text excerpt from the document) for every extracted item.
- For report_type, classify as one of: LABORATORY_REPORT, PRESCRIPTION, DISCHARGE_SUMMARY, CONSULTATION_NOTE, MEDICAL_HISTORY, OTHER. If uncertain, use OTHER.

OUTPUT FORMAT:
Return ONLY valid JSON matching this exact structure with no markdown backticks, no markdown formatting, and no commentary:
{
  "report_type": "LABORATORY_REPORT",
  "report_date": "YYYY-MM-DD or null",
  "facility_name": "Clinic or Hospital Name or null",
  "physician_name": "Dr. Name or null",
  "observations": [
    {
      "category": "CLINICAL_OBSERVATION",
      "description": "Text of observation",
      "source_page": 1,
      "source_text": "Exact text line"
    }
  ],
  "laboratory_results": [
    {
      "test_name": "Hemoglobin",
      "value_raw": "9.2",
      "value_numeric": 9.2,
      "unit": "g/dL",
      "reference_range_raw": "12.0 - 16.0",
      "reference_low": 12.0,
      "reference_high": 16.0,
      "reference_unit": "g/dL",
      "observation": null,
      "source_page": 1,
      "source_text": "Hemoglobin 9.2 g/dL 12.0 - 16.0",
      "provenance_tag": "REPORT_EXTRACTED",
      "verification_status": "UNVERIFIED"
    }
  ],
  "medications": [
    {
      "medication_name": "Metformin",
      "dosage": "500 mg",
      "frequency": "BID",
      "route": "Oral",
      "instructions": "With meals",
      "source_page": 1,
      "source_text": "Metformin 500mg BID Oral with meals"
    }
  ],
  "diagnoses_or_conditions_as_stated": [],
  "other_clinical_information": null
}
"""


class GeminiExtractionService:
    """Service to communicate with Google Gemini API for controlled structured extraction."""

    # Test override mock hook
    _mock_response_override: Optional[Dict[str, Any]] = None

    @classmethod
    def set_mock_response(cls, response: Optional[Dict[str, Any]]):
        """Set a test mock response override for automated unit tests."""
        cls._mock_response_override = response

    @classmethod
    async def extract_structured_data(
        cls,
        text_content: Optional[str] = None,
        file_bytes: Optional[bytes] = None,
        mime_type: Optional[str] = None,
    ) -> ReportExtraction:
        """
        Execute controlled extraction via Gemini or fallback deterministic mock if unconfigured/testing.
        Validates output strictly through Pydantic ReportExtraction.
        """
        # 1. Check for test mock override
        if cls._mock_response_override is not None:
            return ReportExtraction.model_validate(cls._mock_response_override)

        # 2. Check if live GEMINI_API_KEY is available
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key.strip() == "" or api_key == "test_key":
            logger.info("No active GEMINI_API_KEY configured; running deterministic offline extraction.")
            return cls._fallback_offline_extraction(text_content, mime_type)

        # 3. Call live Gemini API
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={api_key}"
        parts = [{"text": EXTRACTION_SYSTEM_PROMPT}]

        if text_content and text_content.strip():
            parts.append({
                "text": f"DOCUMENT CONTENT FOR EXTRACTION:\n\n{text_content}"
            })
        elif file_bytes and mime_type:
            b64_data = base64.b64encode(file_bytes).decode("utf-8")
            parts.append({
                "inline_data": {
                    "mime_type": mime_type,
                    "data": b64_data,
                }
            })
            parts.append({
                "text": "Extract all medical data from this document image according to the strict instructions."
            })
        else:
            raise ValueError("No text or visual content provided for extraction.")

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.0,
                "response_mime_type": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
                data = response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"Gemini API error {e.response.status_code}: {e.response.text}")
                raise RuntimeError(f"Gemini API returned error {e.response.status_code}: {e.response.text}")
            except Exception as e:
                logger.error(f"Gemini request failed: {str(e)}")
                raise RuntimeError(f"Failed to communicate with Gemini API: {str(e)}")

        raw_text = ""
        try:
            candidates = data.get("candidates", [])
            if candidates and "content" in candidates[0]:
                parts = candidates[0]["content"].get("parts", [])
                if parts and "text" in parts[0]:
                    raw_text = parts[0]["text"]
        except Exception as e:
            raise ValueError(f"Malformed Gemini API response envelope: {str(e)}")

        # Parse JSON and enforce Pydantic validation
        return cls._clean_and_validate_json(raw_text)

    @classmethod
    def _clean_and_validate_json(cls, raw_json_str: str) -> ReportExtraction:
        """Strip markdown ticks if present, parse JSON, and validate against ReportExtraction."""
        cleaned = raw_json_str.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON returned by Gemini: {raw_json_str}")
            raise ValueError(f"AI response is not valid JSON: {str(e)}")

        # Strict validation: will raise pydantic.ValidationError if schema is violated
        return ReportExtraction.model_validate(parsed)

    @classmethod
    def _fallback_offline_extraction(
        cls, text_content: Optional[str], mime_type: Optional[str]
    ) -> ReportExtraction:
        """
        Deterministic parser for offline runs and test environments when live Gemini is not configured.
        Parses common laboratory patterns safely without hallucination.
        """
        lab_results = []
        observations = []
        medications = []
        diagnoses = []
        doc_text = text_content or ""
        report_type = "LABORATORY_REPORT" if "lab" in doc_text.lower() or "test" in doc_text.lower() else "OTHER"

        lines = doc_text.splitlines()
        current_page = 1

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue

            page_match = re.match(r"^---\s*PAGE\s*(\d+)\s*---", line_str, re.IGNORECASE)
            if page_match:
                current_page = int(page_match.group(1))
                continue

            # Check for standard lab line: TestName Value [Unit] [RangeLow-RangeHigh]
            # Example: Hemoglobin 14.2 g/dL 12.0 - 16.0
            # Example: Glucose 95 mg/dL 70-99
            # Example: WBC 6.8 10^3/uL 4.5-11.0
            lab_match = re.search(
                r"^([A-Za-z0-9\s\-_]+?)\s+([<>]?\s*\d+(?:\.\d+)?)\s*([a-zA-Z/%^0-9\-_]+)?(?:\s+((?:[<>]?\s*\d+(?:\.\d+)?\s*[-–]\s*\d+(?:\.\d+)?)|(?:[<>]\s*\d+(?:\.\d+)?)|(?:Negative|Positive|Normal)))?",
                line_str,
            )
            if lab_match:
                test_name = lab_match.group(1).strip()
                val_raw = lab_match.group(2).strip()
                unit = lab_match.group(3).strip() if lab_match.group(3) else None
                ref_raw = lab_match.group(4).strip() if lab_match.group(4) else None

                # Discard common non-test headers
                if test_name.lower() in {"test", "test name", "page", "date", "patient", "name", "result", "reference", "units"}:
                    continue

                val_num = None
                try:
                    val_num = float(re.sub(r"[^0-9.]", "", val_raw))
                except (ValueError, TypeError):
                    pass

                ref_low = None
                ref_high = None
                if ref_raw:
                    bounds = re.findall(r"\d+(?:\.\d+)?", ref_raw)
                    if len(bounds) == 2:
                        try:
                            ref_low = float(bounds[0])
                            ref_high = float(bounds[1])
                        except ValueError:
                            pass

                lab_results.append(
                    ExtractedLabResult(
                        test_name=test_name,
                        value_raw=val_raw,
                        value_numeric=val_num,
                        unit=unit,
                        reference_range_raw=ref_raw,
                        reference_low=ref_low,
                        reference_high=ref_high,
                        reference_unit=unit,
                        observation=None,
                        source_page=current_page,
                        source_text=line_str,
                        provenance_tag="REPORT_EXTRACTED",
                        verification_status="UNVERIFIED",
                    )
                )

        return ReportExtraction(
            report_type=report_type,
            report_date=None,
            facility_name=None,
            physician_name=None,
            observations=observations,
            laboratory_results=lab_results,
            medications=medications,
            diagnoses_or_conditions_as_stated=diagnoses,
            other_clinical_information=None,
        )
