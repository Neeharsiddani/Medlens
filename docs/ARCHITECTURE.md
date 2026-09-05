# MedLens — Architecture & Clinical Safety Blueprint

MedLens is an AI-powered clinical information intelligence application designed to synthesize, organize, and audit scattered medical information across patient history, prescriptions, laboratory reports, and previous clinical records with complete provenance and deterministic safety guarantees.

## Architectural Layers

```
                                +---------------------------+
                                |  React 18 + Vite Frontend |
                                |  (Vanilla CSS UI System)  |
                                +-------------+-------------+
                                              |
                                              | REST / JSON
                                              v
                                +---------------------------+
                                |      FastAPI Backend      |
                                |     (Python 3.13 / CORS)  |
                                +-------------+-------------+
                                              |
                       +----------------------+----------------------+
                       |                                             |
                       v                                             v
        +-----------------------------+               +-----------------------------+
        |  SQLAlchemy 2.0 ORM Engine  |               |    Pydantic v2 Validation   |
        +--------------+--------------+               +-----------------------------+
                       |                                             |
                       v                                             v
        +-----------------------------+               +-----------------------------+
        |   SQLite Database Storage   |               | Deterministic Reference-    |
        |     (Alembic Migrations)    |               | Range Engine (Phase 4)      |
        +-----------------------------+               +-----------------------------+
                       |                                             |
                       v                                             v
        +-----------------------------+               +-----------------------------+
        |  SHA-256 Document Hashing   |               | Gemini AI Extraction &      |
        |  & Local Fallback Parser    |               | Patient Summary Service     |
        +-----------------------------+               +-----------------------------+
```

## Implemented Architecture Phases

1. **Phase 1: Foundation (Completed)**
   - Asynchronous FastAPI core with centralized Pydantic settings.
   - Database connection management, session scoping, and health check telemetry.
   - Pydantic v2 schemas and validation foundation.
   - Comprehensive test suite setup with isolated temporary test database.

2. **Phase 2: Patient Intake & Management (Completed)**
   - Structured intake model capturing demographics, symptoms, conditions, allergies, and medications.
   - Automatic provenance assignment (`USER_PROVIDED`).
   - Query pagination, search indexing, and patient identifier collision conflict prevention (HTTP 409).

3. **Phase 3: Document Ingestion & Structured Extraction (Completed)**
   - Cryptographic document integrity hashing (SHA-256) and upload deduplication.
   - Ingestion whitelist (PDF, PNG, JPG, JPEG) up to 25 MB.
   - Structured extraction with honest availability handling:
     - Configured Gemini: Schema-constrained extraction attributed to `GEMINI_AI` with configured model name.
     - Unconfigured Gemini: Digital text PDFs fall back to deterministic regex parser (`LOCAL_DETERMINISTIC`). Scanned PDFs and images return honest HTTP 503 error.

4. **Phase 4: Deterministic Reference-Range Engine & Clinician Verification (Completed)**
   - Pure Python deterministic rule engine for reference range evaluation (`LOW`, `NORMAL`, `HIGH`, `NO_RANGE_AVAILABLE`, `UNDETERMINED`).
   - Gemini is strictly prohibited from evaluating clinical range classifications.
   - Clinician verification workflow:
     - Preserves immutable `value_raw` and source excerpt.
     - Upgrades provenance to `USER_VERIFIED` while preserving `REPORT_EXTRACTED` source origin.
     - No fabricated clinician identities.

5. **Phase 5: Grounded Clinical Summaries & Staleness Engine (Completed)**
   - Patient-friendly AI summaries synthesized strictly from structured database entities.
   - Pydantic output validation gate (`ControlledSummaryOutput`) before database persistence.
   - SHA-256 source fingerprinting tracking mutations across all 7 clinical categories.

## Architectural Scope & Non-Claims

To maintain honest, transparent clinical claims, MedLens explicitly documents the exact scope of key capabilities:

1. **Conflict Detection**: Refers strictly to cryptographic file deduplication (SHA-256) and database Patient Identifier (MRN) collision prevention (HTTP 409 Conflict). It does **not** claim automated pharmacological or drug-drug interaction conflict detection.
2. **Access Control**: MedLens is designed as a single-clinician / local workstation clinical intelligence application. It does **not** claim multi-tenant enterprise Role-Based Access Control (RBAC) or enterprise authentication; `verified_by` and audit records strictly record real clinician identities and never simulate authentication.
3. **Confidence Scoring**: MedLens relies on strict deterministic schema validation, Pydantic type bounds, and Python rule evaluation, rather than arbitrary, uncalibrated probabilistic "confidence scores".
4. **Report Comparison & Aggregation**: Multi-report handling aggregates and tracks longitudinal laboratory trends and chronological audit events across multiple ingested documents for a patient chart. It does **not** claim an automated semantic PDF diffing/comparison engine.
5. **Print & Export Scope**: The "Print / Export Summary" action triggers browser-native printing formatted via dedicated `@media print` CSS. It is **not** a server-side PDF generator.
