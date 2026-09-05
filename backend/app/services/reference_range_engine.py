"""Deterministic Reference-Range Awareness Engine for MedLens.

NON-NEGOTIABLE CLINICAL PRINCIPLES:
1. Zero AI: Gemini is NEVER invoked for classification.
2. Source-Provided Exclusively: Reference ranges must come exclusively from the uploaded report.
3. No External Lookups: Never invent, infer, or query external standard ranges.
4. Boundary Values are Normal: Values exactly on the boundary (e.g. 12.0 on 12.0 - 16.0) are NORMAL.
5. Unit Safety: If value unit and reference unit conflict, refuse conversion and return UNDETERMINED.
6. Responsible AI: Purely informational comparison against source document; never diagnoses disease.
"""
import re
from dataclasses import dataclass
from typing import Optional, Tuple
from app.core.enums import ReferenceRangeStatus


@dataclass(frozen=True)
class ClassificationResult:
    """Immutable result of deterministic reference-range evaluation."""
    status: ReferenceRangeStatus
    reason: str
    is_evaluable: bool


class ReferenceRangeEngine:
    """Pure-Python deterministic engine for reference-range parsing and classification."""

    @staticmethod
    def normalize_unit(unit_str: Optional[str]) -> str:
        """Normalize unit string for safe comparison (case-insensitive, whitespace stripped)."""
        if not unit_str:
            return ""
        # Strip whitespace, lowercase, remove trailing dot
        normalized = unit_str.strip().lower().rstrip(".")
        # Normalize slash variants
        normalized = normalized.replace(" / ", "/").replace(" /", "/").replace("/ ", "/")
        return normalized

    @staticmethod
    def units_compatible(value_unit: Optional[str], reference_unit: Optional[str]) -> bool:
        """
        Determine if units are compatible without conversion.
        If both exist, they must be identical after normalization.
        If either is missing, we assume source report used the same implicit unit.
        """
        if not value_unit or not reference_unit:
            return True
        return ReferenceRangeEngine.normalize_unit(value_unit) == ReferenceRangeEngine.normalize_unit(reference_unit)

    @staticmethod
    def parse_numeric_value(value_raw: Optional[str], value_numeric: Optional[float]) -> Optional[float]:
        """Safely extract float from numeric value or raw string."""
        if value_numeric is not None:
            return float(value_numeric)
        if not value_raw:
            return None
        # Try direct float parsing from value_raw
        cleaned = value_raw.strip()
        # Handle cases like "<0.01" or ">100" or raw numbers
        try:
            return float(cleaned)
        except (ValueError, TypeError):
            # Try regex to extract first clean number
            match = re.search(r"^-?\d+(?:\.\d+)?", cleaned)
            if match:
                try:
                    return float(match.group(0))
                except (ValueError, TypeError):
                    return None
            return None

    @classmethod
    def parse_range_boundaries(
        cls,
        reference_range_raw: Optional[str],
        reference_low: Optional[float] = None,
        reference_high: Optional[float] = None,
    ) -> Tuple[Optional[str], Optional[float], Optional[float], bool, bool]:
        """
        Parse reference range into interval specification.
        Returns:
            range_type: "TWO_SIDED", "UPPER_BOUNDED", "LOWER_BOUNDED", or None
            low: lower bound float
            high: upper bound float
            low_inclusive: bool
            high_inclusive: bool
        """
        if not reference_range_raw or not reference_range_raw.strip():
            # If no raw string, fallback to explicit low/high if provided
            if reference_low is not None and reference_high is not None:
                return "TWO_SIDED", float(reference_low), float(reference_high), True, True
            if reference_low is not None:
                return "LOWER_BOUNDED", float(reference_low), None, True, False
            if reference_high is not None:
                return "UPPER_BOUNDED", None, float(reference_high), False, True
            return None, None, None, False, False

        raw = reference_range_raw.strip()

        # Check for explicit 'none' / unstated indicators
        if raw.lower() in {"none", "n/a", "not specified", "none provided", "null"}:
            return None, None, None, False, False

        # Pattern 1: One-sided upper bound: <= X, < X, less than X, up to X
        upper_match = re.match(r"^(?:<=\s*|le\s+)(\d+(?:\.\d+)?)\b", raw, re.IGNORECASE)
        if upper_match:
            return "UPPER_BOUNDED", None, float(upper_match.group(1)), False, True

        upper_strict = re.match(r"^(?:<\s*|less\s+than\s+)(\d+(?:\.\d+)?)\b", raw, re.IGNORECASE)
        if upper_strict:
            return "UPPER_BOUNDED", None, float(upper_strict.group(1)), False, False

        # Pattern 2: One-sided lower bound: >= X, > X, greater than X
        lower_match = re.match(r"^(?:>=\s*|ge\s+)(\d+(?:\.\d+)?)\b", raw, re.IGNORECASE)
        if lower_match:
            return "LOWER_BOUNDED", float(lower_match.group(1)), None, True, False

        lower_strict = re.match(r"^(?:>\s*|greater\s+than\s+)(\d+(?:\.\d+)?)\b", raw, re.IGNORECASE)
        if lower_strict:
            return "LOWER_BOUNDED", float(lower_strict.group(1)), None, False, False

        # Pattern 3: Standard two-sided interval: "12.0 - 16.0", "12.0–16.0", "12 - 16", "70-99", "3.5 to 5.0"
        two_sided_match = re.match(
            r"^(-?\d+(?:\.\d+)?)\s*(?:-|–|—|\bto\b)\s*(-?\d+(?:\.\d+)?)\b",
            raw,
            re.IGNORECASE,
        )
        if two_sided_match:
            low = float(two_sided_match.group(1))
            high = float(two_sided_match.group(2))
            return "TWO_SIDED", low, high, True, True

        # Fallback to pre-extracted numeric bounds if available
        if reference_low is not None and reference_high is not None:
            return "TWO_SIDED", float(reference_low), float(reference_high), True, True
        if reference_low is not None:
            return "LOWER_BOUNDED", float(reference_low), None, True, False
        if reference_high is not None:
            return "UPPER_BOUNDED", None, float(reference_high), False, True

        # Unrecognized or qualitative format (e.g. "Negative", "Variable")
        return "UNRECOGNIZED", None, None, False, False

    @classmethod
    def classify(
        cls,
        value_raw: Optional[str],
        value_numeric: Optional[float] = None,
        unit: Optional[str] = None,
        reference_range_raw: Optional[str] = None,
        reference_low: Optional[float] = None,
        reference_high: Optional[float] = None,
        reference_unit: Optional[str] = None,
    ) -> ClassificationResult:
        """
        Deterministically classify a laboratory result against the source reference range.
        Returns a ClassificationResult with status, clinical explanation reason, and is_evaluable flag.
        """
        # 1. Check if source document provided a reference range
        has_range = bool(
            (reference_range_raw and reference_range_raw.strip())
            or reference_low is not None
            or reference_high is not None
        )
        if not has_range:
            return ClassificationResult(
                status=ReferenceRangeStatus.NO_RANGE_AVAILABLE,
                reason="NO_RANGE_AVAILABLE — No reference range was provided in the source report.",
                is_evaluable=False,
            )

        # 2. Check for numeric value availability
        parsed_value = cls.parse_numeric_value(value_raw, value_numeric)
        if parsed_value is None:
            val_display = f"'{value_raw}'" if value_raw else "empty"
            return ClassificationResult(
                status=ReferenceRangeStatus.UNDETERMINED,
                reason=f"UNDETERMINED — Result value {val_display} is non-numeric and cannot be evaluated against numeric reference boundaries.",
                is_evaluable=False,
            )

        # 3. Check for unit mismatch
        if not cls.units_compatible(unit, reference_unit):
            return ClassificationResult(
                status=ReferenceRangeStatus.UNDETERMINED,
                reason=f"UNDETERMINED — Unit mismatch prevents safe classification: value unit '{unit}' vs reference range unit '{reference_unit}'.",
                is_evaluable=False,
            )

        # 4. Parse boundaries
        range_type, low, high, low_inclusive, high_inclusive = cls.parse_range_boundaries(
            reference_range_raw=reference_range_raw,
            reference_low=reference_low,
            reference_high=reference_high,
        )

        display_unit = unit or reference_unit or ""
        unit_suffix = f" {display_unit}" if display_unit else ""

        # Handle two-sided interval
        if range_type == "TWO_SIDED" and low is not None and high is not None:
            if low > high:
                return ClassificationResult(
                    status=ReferenceRangeStatus.UNDETERMINED,
                    reason=f"UNDETERMINED — Inverted boundaries in source report: lower bound ({low}) exceeds upper bound ({high}).",
                    is_evaluable=False,
                )

            # Strict boundary evaluation
            # Boundaries are NORMAL
            if parsed_value < low:
                return ClassificationResult(
                    status=ReferenceRangeStatus.LOW,
                    reason=f"LOW — {parsed_value}{unit_suffix} is below the source-provided reference range of {low} - {high}{unit_suffix}.",
                    is_evaluable=True,
                )
            elif parsed_value > high:
                return ClassificationResult(
                    status=ReferenceRangeStatus.HIGH,
                    reason=f"HIGH — {parsed_value}{unit_suffix} is above the source-provided reference range of {low} - {high}{unit_suffix}.",
                    is_evaluable=True,
                )
            else:
                return ClassificationResult(
                    status=ReferenceRangeStatus.NORMAL,
                    reason=f"NORMAL — {parsed_value}{unit_suffix} is within the source-provided reference range of {low} - {high}{unit_suffix}.",
                    is_evaluable=True,
                )

        # Handle one-sided upper bounded (e.g. "< 5" or "<= 5")
        if range_type == "UPPER_BOUNDED" and high is not None:
            is_within = (parsed_value <= high) if high_inclusive else (parsed_value < high)
            op = "<=" if high_inclusive else "<"
            if is_within:
                return ClassificationResult(
                    status=ReferenceRangeStatus.NORMAL,
                    reason=f"NORMAL — {parsed_value}{unit_suffix} is within the source-provided upper limit of {op} {high}{unit_suffix}.",
                    is_evaluable=True,
                )
            else:
                return ClassificationResult(
                    status=ReferenceRangeStatus.HIGH,
                    reason=f"HIGH — {parsed_value}{unit_suffix} exceeds the source-provided upper limit of {op} {high}{unit_suffix}.",
                    is_evaluable=True,
                )

        # Handle one-sided lower bounded (e.g. "> 40" or ">= 40")
        if range_type == "LOWER_BOUNDED" and low is not None:
            is_within = (parsed_value >= low) if low_inclusive else (parsed_value > low)
            op = ">=" if low_inclusive else ">"
            if is_within:
                return ClassificationResult(
                    status=ReferenceRangeStatus.NORMAL,
                    reason=f"NORMAL — {parsed_value}{unit_suffix} is within the source-provided lower limit of {op} {low}{unit_suffix}.",
                    is_evaluable=True,
                )
            else:
                return ClassificationResult(
                    status=ReferenceRangeStatus.LOW,
                    reason=f"LOW — {parsed_value}{unit_suffix} is below the source-provided lower limit of {op} {low}{unit_suffix}.",
                    is_evaluable=True,
                )

        # Could not interpret format safely
        raw_repr = f"'{reference_range_raw}'" if reference_range_raw else "provided"
        return ClassificationResult(
            status=ReferenceRangeStatus.UNDETERMINED,
            reason=f"UNDETERMINED — Reference range format {raw_repr} cannot be safely parsed into numeric boundaries.",
            is_evaluable=False,
        )
