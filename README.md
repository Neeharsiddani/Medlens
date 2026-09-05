# MedLens — Clinical Information Intelligence

MedLens synthesizes and audits scattered medical records, multi-page laboratory reports, clinical intake data, and patient history into structured, actionable intelligence with strict clinical provenance and deterministic safety guarantees.

> **CRITICAL PRODUCT ARCHITECTURE:**  
> MedLens is a **real, functional clinical application**, not a demo or prototype.  
> - **Zero Simulated Workflows**: No dummy patients, hardcoded statistics, or synthetic API responses in production paths.
> - **Zero Fabricated AI**: Gemini is invoked only when configured. If unconfigured or unavailable, MedLens responds with an honest HTTP 503 error; it never fakes AI extraction.
> - **Explicit Extraction Attribution**: Reports clearly differentiate between `Gemini AI · {model}`, `Deterministic Local Parser · Non-AI`, and `AI Extraction Unavailable`.
> - **Deterministic Reference Ranges**: Laboratory status (`LOW`, `NORMAL`, `HIGH`) is computed exclusively by deterministic Python logic against source report ranges. Gemini is never permitted to classify lab ranges.
> - **Immutable Provenance**: Raw extracted values (`value_raw`, `reference_range_raw`, `source_text`, `source_page`) remain permanently immutable. Clinician verification creates a distinct `USER_VERIFIED` record while preserving `REPORT_EXTRACTED` origin.
> - **Dynamic Summary Staleness**: Patient AI summaries track changes across 7 clinical mutation categories via SHA-256 source fingerprinting.

---

## Completed Architecture (Phases 1–5 & Hardening Passes 1–2)

### 1. Patient Intake & Management (Phase 1 & 2)
- Structured clinical intake capturing demographics, presenting complaints, diagnosed conditions, allergies, and active medications.
- Strict Pydantic v2 data validation and SQLite/SQLAlchemy persistence.
- Automatic source provenance tagging (`USER_PROVIDED`).

### 2. Document Ingestion & Structured Extraction (Phase 3)
- Multi-format ingestion supporting multi-page PDF documents and medical images (PNG, JPG, JPEG) up to 25 MB.
- Document integrity guaranteed by cryptographic SHA-256 hashing.
- Structured extraction pipeline with honest availability handling:
  - **With Gemini Configured**: Schema-constrained extraction attributed to `GEMINI_AI` with configured model (e.g. `gemini-2.5-flash`).
  - **Without Gemini Configured**: Digital text PDFs are parsed by a genuine local deterministic regex engine attributed to `LOCAL_DETERMINISTIC` (`Non-AI`). Scanned PDFs and images fail honestly with HTTP 503 and clear configuration instructions.

### 3. Deterministic Reference-Range Engine & Clinician Verification (Phase 4)
- Deterministic Python classification engine (`LOW`, `NORMAL`, `HIGH`, `NO_RANGE_AVAILABLE`, `UNDETERMINED`).
- Strictly utilizes explicit reference ranges from the source document; never queries external medical ranges or invents missing boundaries.
- Boundary values are strictly `NORMAL`; unit mismatches yield `UNDETERMINED`.
- Clinician verification workflow:
  - Preserves immutable `value_raw` and original source excerpt.
  - Stores human-corrected `verified_value` and deterministically re-evaluates `verified_classification`.
  - Upgrades provenance to `USER_VERIFIED` while retaining `REPORT_EXTRACTED` audit trace.
  - Never fabricates clinician identities (`verified_by` remains null without authenticated identity).

### 4. Grounded AI Summaries & Staleness Detection (Phase 5)
- Patient-friendly clinical summaries synthesized strictly from structured database entities (no external medical hallucinations, no diagnostic leaps, no unverified prescriptions).
- Pydantic validation gate (`ControlledSummaryOutput`) validates AI output before database persistence.
- Real-time staleness engine: Computes an SHA-256 fingerprint over 7 clinical mutation categories (demographics, intake, reports, lab values, verifications, classifications, observations). Any chart mutation marks the summary as stale (`is_stale = True`).

---

## Technology Stack

- **Frontend**: React 18, Vite, Lucide React, Vanilla CSS Design System (Responsive 1600px desktop workspace)
- **Backend**: Python 3.13+, FastAPI, Uvicorn (ASGI)
- **Database**: SQLite with SQLAlchemy 2.0 ORM
- **Database Migrations**: Alembic
- **Validation**: Pydantic v2
- **Document Processing**: PyPDF, hashlib (SHA-256)
- **AI Integration**: Google Gemini API (with deterministic local fallback and honest unavailable handling)
- **Testing**: Pytest (60 automated unit and integration tests)

---

## Directory Structure

```
Medlens/
├── backend/
│   ├── alembic/                  # Database migration versions
│   │   └── versions/             # Migration history through c72d9e1f5a3b
│   ├── app/
│   │   ├── api/v1/endpoints/     # Health, Patients, Reports, Summaries
│   │   ├── core/                 # Centralized settings & Pydantic config
│   │   ├── db/                   # Engine, SessionLocal, get_db dependency
│   │   ├── models/               # Patient, MedicalReport, LabResult, Summary
│   │   ├── schemas/              # Pydantic validation schemas
│   │   ├── services/             # Patient, Document, Gemini, Reference Range, Summary
│   │   └── main.py               # FastAPI entrypoint, CORS, global handlers
│   ├── tests/                    # 60 automated unit & integration tests
│   ├── medlens.db                # SQLite database (clean, 0 production rows)
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Template environment configuration
├── frontend/
│   ├── src/
│   │   ├── api/                  # API client & resource endpoints
│   │   ├── components/           # Clinical UI components & review modals
│   │   ├── App.jsx               # Primary application shell & navigation
│   │   └── index.css             # Vanilla CSS design system
│   ├── public/                   # Static assets & clinical favicon
│   ├── vite.config.js            # Vite configuration (port 5173, GitHub Pages base)
│   └── package.json              # Frontend dependencies
├── .github/workflows/
│   └── deploy.yml                # GitHub Pages deployment workflow
├── docs/
│   └── ARCHITECTURE.md           # Detailed architecture specification
└── README.md                     # This documentation
```

---

## Environment Configuration

### Backend (`backend/.env`)
| Variable | Default | Description |
|:---|:---|:---|
| `PROJECT_NAME` | `MedLens API` | Application title |
| `VERSION` | `0.1.0` | API version |
| `DATABASE_URL` | `sqlite:///./medlens.db` | SQLAlchemy connection string |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed origins |
| `GEMINI_API_KEY` | `null` | Gemini API key (optional; system falls back honestly if unset) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Configured Gemini extraction & summary model |
| `UPLOAD_DIR` | `uploads` | Directory for uploaded medical files |
| `MAX_UPLOAD_SIZE_BYTES` | `26214400` | 25 MB upload limit |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|:---|:---|:---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API base URL |

---

## Getting Started

### 1. Backend Setup

```powershell
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run database migrations to head
alembic upgrade head

# Start FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend services will be available at:
- **API Root**: `http://127.0.0.1:8000/`
- **Health Check**: `http://127.0.0.1:8000/health`
- **Interactive Documentation (Swagger)**: `http://127.0.0.1:8000/docs`

### 2. Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend application will be live at `http://localhost:5173`.

---

## Running Automated Tests

All 62 automated tests run in complete isolation against a temporary database and upload directory, guaranteeing zero side-effects on production databases:

```powershell
cd backend
.\venv\Scripts\pytest -v
```

Test coverage includes:
- Patient intake CRUD, duplicate prevention, and validation gates
- Report upload, file hashing, and oversize/unsupported file rejection
- Scanned PDF and image upload when Gemini is unavailable (honest 503)
- Deterministic local text extraction and attribution
- Deterministic reference-range rule engine (boundary cases, unit mismatches, one-sided bounds)
- Human clinician verification workflow and `USER_VERIFIED` provenance
- AI summary generation, Pydantic validation, and Gemini unavailable states
- Summary staleness detection across all 7 clinical mutation categories
- Test mock isolation (zero mock leaks in production paths)
