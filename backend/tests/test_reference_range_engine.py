"""Unit and integration tests for Phase 4 Deterministic Reference-Range Awareness Engine."""
import pytest
from app.core.enums import ReferenceRangeStatus
from app.services.reference_range_engine import ReferenceRangeEngine, ClassificationResult
from app.services.gemini_service import GeminiExtractionService


# ==============================================================================
# 1. Deterministic Engine Pure Unit Tests (Zero AI)
# ==============================================================================

def test_value_below_range_classified_as_low():
    """Report: Hemoglobin 9.2 g/dL, Reference Range: 12.0 - 16.0 g/dL -> LOW."""
    res = ReferenceRangeEngine.classify(
        value_raw="9.2",
        value_numeric=9.2,
        unit="g/dL",
        reference_range_raw="12.0 - 16.0",
        reference_low=12.0,
        reference_high=16.0,
        reference_unit="g/dL",
    )
    assert res.status == ReferenceRangeStatus.LOW
    assert res.is_evaluable is True
    assert "below" in res.reason.lower()


def test_value_inside_range_classified_as_normal():
    """Report: Glucose 90 mg/dL, Reference Range: 70 - 99 mg/dL -> NORMAL."""
    res = ReferenceRangeEngine.classify(
        value_raw="90",
        value_numeric=90.0,
        unit="mg/dL",
        reference_range_raw="70-99",
        reference_low=70.0,
        reference_high=99.0,
        reference_unit="mg/dL",
    )
    assert res.status == ReferenceRangeStatus.NORMAL
    assert res.is_evaluable is True
    assert "within" in res.reason.lower()


def test_value_above_range_classified_as_high():
    """Report: Potassium 5.2 mmol/L, Reference Range: 3.5 - 5.0 mmol/L -> HIGH."""
    res = ReferenceRangeEngine.classify(
        value_raw="5.2",
        value_numeric=5.2,
        unit="mmol/L",
        reference_range_raw="3.5-5.0",
        reference_low=3.5,
        reference_high=5.0,
        reference_unit="mmol/L",
    )
    assert res.status == ReferenceRangeStatus.HIGH
    assert res.is_evaluable is True
    assert "above" in res.reason.lower()


def test_boundary_values_are_strictly_normal():
    """Values exactly equal to lower or upper boundary must be classified as NORMAL."""
    # Lower boundary test: 12.0 on 12.0 - 16.0
    res_low_boundary = ReferenceRangeEngine.classify(
        value_raw="12.0",
        value_numeric=12.0,
        unit="g/dL",
        reference_range_raw="12.0 - 16.0",
        reference_low=12.0,
        reference_high=16.0,
    )
    assert res_low_boundary.status == ReferenceRangeStatus.NORMAL

    # Upper boundary test: 16.0 on 12.0 - 16.0
    res_high_boundary = ReferenceRangeEngine.classify(
        value_raw="16.0",
        value_numeric=16.0,
        unit="g/dL",
        reference_range_raw="12.0 - 16.0",
        reference_low=12.0,
        reference_high=16.0,
    )
    assert res_high_boundary.status == ReferenceRangeStatus.NORMAL

    # Just outside boundaries: 11.9 -> LOW, 16.1 -> HIGH
    res_just_below = ReferenceRangeEngine.classify(
        value_raw="11.9",
        value_numeric=11.9,
        unit="g/dL",
        reference_range_raw="12.0 - 16.0",
    )
    assert res_just_below.status == ReferenceRangeStatus.LOW

    res_just_above = ReferenceRangeEngine.classify(
        value_raw="16.1",
        value_numeric=16.1,
        unit="g/dL",
        reference_range_raw="12.0 - 16.0",
    )
    assert res_just_above.status == ReferenceRangeStatus.HIGH


def test_missing_reference_range_yields_no_range_available():
    """Non-negotiable: When report has NO range, NEVER guess or lookup external medical databases."""
    res = ReferenceRangeEngine.classify(
        value_raw="28",
        value_numeric=28.0,
        unit="ng/mL",
        reference_range_raw=None,
        reference_low=None,
        reference_high=None,
    )
    assert res.status == ReferenceRangeStatus.NO_RANGE_AVAILABLE
    assert res.is_evaluable is False
    assert "No reference range was provided" in res.reason


def test_missing_or_non_numeric_value_yields_undetermined():
    """When numeric value is unavailable or unparsable, return UNDETERMINED."""
    res = ReferenceRangeEngine.classify(
        value_raw="Pending",
        value_numeric=None,
        unit="g/dL",
        reference_range_raw="12.0 - 16.0",
    )
    assert res.status == ReferenceRangeStatus.UNDETERMINED
    assert res.is_evaluable is False
    assert "non-numeric" in res.reason


def test_malformed_range_yields_undetermined():
    """When range cannot be safely parsed into valid boundaries, return UNDETERMINED rather than guessing."""
    # Qualitative/text reference note
    res_qual = ReferenceRangeEngine.classify(
        value_raw="14.0",
        value_numeric=14.0,
        unit="g/dL",
        reference_range_raw="See clinical notes attached",
    )
    assert res_qual.status == ReferenceRangeStatus.UNDETERMINED
    assert res_qual.is_evaluable is False

    # Inverted boundaries (lower > upper)
    res_inverted = ReferenceRangeEngine.classify(
        value_raw="14.0",
        value_numeric=14.0,
        unit="g/dL",
        reference_range_raw="16.0 - 12.0",
    )
    assert res_inverted.status == ReferenceRangeStatus.UNDETERMINED
    assert "Inverted boundaries" in res_inverted.reason


def test_one_sided_upper_bound_ranges():
    """Test one-sided upper limit formats (< 5, <= 5)."""
    # Strict less than '< 5'
    res_normal = ReferenceRangeEngine.classify(
        value_raw="3.2",
        value_numeric=3.2,
        unit="mg/L",
        reference_range_raw="< 5.0",
    )
    assert res_normal.status == ReferenceRangeStatus.NORMAL

    res_at_limit = ReferenceRangeEngine.classify(
        value_raw="5.0",
        value_numeric=5.0,
        unit="mg/L",
        reference_range_raw="< 5.0",
    )
    assert res_at_limit.status == ReferenceRangeStatus.HIGH

    # Inclusive less than or equal '<= 5'
    res_inclusive = ReferenceRangeEngine.classify(
        value_raw="5.0",
        value_numeric=5.0,
        unit="mg/L",
        reference_range_raw="<= 5.0",
    )
    assert res_inclusive.status == ReferenceRangeStatus.NORMAL


def test_one_sided_lower_bound_ranges():
    """Test one-sided lower limit formats (> 40, >= 40)."""
    # Strict greater than '> 40'
    res_normal = ReferenceRangeEngine.classify(
        value_raw="45",
        value_numeric=45.0,
        unit="mg/dL",
        reference_range_raw="> 40",
    )
    assert res_normal.status == ReferenceRangeStatus.NORMAL

    res_below = ReferenceRangeEngine.classify(
        value_raw="35",
        value_numeric=35.0,
        unit="mg/dL",
        reference_range_raw="> 40",
    )
    assert res_below.status == ReferenceRangeStatus.LOW

    # Inclusive '>= 40'
    res_at_boundary = ReferenceRangeEngine.classify(
        value_raw="40",
        value_numeric=40.0,
        unit="mg/dL",
        reference_range_raw=">= 40",
    )
    assert res_at_boundary.status == ReferenceRangeStatus.NORMAL


def test_unit_mismatch_prevents_classification():
    """Refuse automatic unit conversion; return UNDETERMINED with clear safety reason."""
    res = ReferenceRangeEngine.classify(
        value_raw="14.0",
        value_numeric=14.0,
        unit="g/dL",
        reference_range_raw="120 - 160",
        reference_unit="mg/dL",
    )
    assert res.status == ReferenceRangeStatus.UNDETERMINED
    assert res.is_evaluable is False
    assert "Unit mismatch" in res.reason


def test_en_dash_and_em_dash_range_formats():
    """Handle Unicode en-dash (\u2013) and em-dash (\u2014) commonly produced by medical reports."""
    res_en_dash = ReferenceRangeEngine.classify(
        value_raw="14.2",
        value_numeric=14.2,
        unit="g/dL",
        reference_range_raw="12.0\u201316.0",
    )
    assert res_en_dash.status == ReferenceRangeStatus.NORMAL

    res_em_dash = ReferenceRangeEngine.classify(
        value_raw="9.2",
        value_numeric=9.2,
        unit="g/dL",
        reference_range_raw="12.0\u201416.0",
    )
    assert res_em_dash.status == ReferenceRangeStatus.LOW


def test_engine_never_calls_gemini(monkeypatch):
    """Safety Guarantee: The deterministic engine must execute 100% locally without invoking Gemini."""
    def gemini_call_bomb(*args, **kwargs):
        raise AssertionError("CRITICAL VIOLATION: Gemini was called by deterministic engine!")

    monkeypatch.setattr(GeminiExtractionService, "extract_structured_data", gemini_call_bomb)

    res = ReferenceRangeEngine.classify(
        value_raw="9.2",
        value_numeric=9.2,
        unit="g/dL",
        reference_range_raw="12.0 - 16.0",
    )
    assert res.status == ReferenceRangeStatus.LOW
