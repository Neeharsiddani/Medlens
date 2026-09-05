"""Core enumeration types for MedLens clinical domain."""
from enum import Enum


class ReferenceRangeStatus(str, Enum):
    """
    Deterministic classification of a laboratory result against the source-provided reference range.
    Note: Gemini never decides this classification; it is evaluated strictly via deterministic logic.
    """
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    NO_RANGE_AVAILABLE = "NO_RANGE_AVAILABLE"
    UNDETERMINED = "UNDETERMINED"


class VerificationStatus(str, Enum):
    """Human review and verification lifecycle states."""
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class ProcessingStatus(str, Enum):
    """Document processing lifecycle states."""
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
