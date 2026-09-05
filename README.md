# MedLens — AI-Powered Clinical Information Intelligence

MedLens synthesizes and audits scattered clinical records, laboratory reports, prescriptions, and patient history into structured, actionable intelligence with complete audit provenance.

---

## Current Status: Phase 1 — Foundation

> **CRITICAL NOTICE:**  
> This release implements **Phase 1: Foundation ONLY**.  
> The following capabilities are **NOT YET IMPLEMENTED** and are scheduled for subsequent phases:
> - AI Extraction / Google Gemini API integration
> - Medical document / PDF processing & OCR
> - Reference-range classification engine
> - Clinical provenance viewer & bounding boxes
> - AI summary generation & drug conflict detection
> - User authentication

Phase 1 establishes the reliable, tested full-stack skeleton connecting **FastAPI**, **SQLAlchemy**, **SQLite**, **Alembic**, and **React (Vite)**.

---

## Technology Stack

- **Frontend**: React 18, Vite, Lucide React, Vanilla CSS Design System (no Tailwind)
- **Backend**: Python 3.13+, FastAPI, Uvicorn (ASGI)
- **Database**: SQLite with SQLAlchemy 2.0 ORM
- **Database Migrations**: Alembic
- **Validation**: Pydantic v2
- **Testing**: Pytest, HTTPX TestClient

---

## Directory Structure

```
Medlens/
├── backend/
│   ├── alembic/                  # Database migration scripts & versions
│   ├── alembic.ini               # Alembic configuration
│   ├── app/
│   │   ├── api/                  # FastAPI routers (v1 endpoints)
│   │   ├── core/                 # Centralized configuration (BaseSettings)
│   │   ├── db/                   # Engine, SessionLocal, get_db dependency
│   │   ├── models/               # SQLAlchemy ORM entities (Patient foundation)
│   │   ├── schemas/              # Pydantic v2 data transfer schemas
│   │   ├── services/             # Business logic layer
│   │   └── main.py               # FastAPI entry point & CORS configuration
│   ├── tests/                    # Backend automated tests (health, db, config)
│   ├── medlens.db                # SQLite database (auto-generated)
│   ├── requirements.txt          # Python dependencies
│   ├── .env                      # Local backend environment
│   └── .env.example              # Template backend environment
├── frontend/
│   ├── src/
│   │   ├── api/                  # API client & health service
│   │   ├── App.jsx               # Application shell & status verification UI
│   │   ├── index.css             # Vanilla CSS clinical design system
│   │   └── main.jsx              # React DOM mounting entry point
│   ├── index.html                # HTML entry point with Inter typography
│   ├── vite.config.js            # Vite configuration (port 5173)
│   ├── package.json              # Frontend dependencies and scripts
│   ├── .env                      # Local frontend environment
│   └── .env.example              # Template frontend environment
├── docs/
│   └── ARCHITECTURE.md           # Architecture blueprint and roadmap
├── .gitignore                    # Project ignore rules
└── README.md                     # This file
```

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `PROJECT_NAME` | `MedLens API` | Application title |
| `VERSION` | `0.1.0` | Application version |
| `API_V1_STR` | `/api/v1` | Prefix for v1 routes |
| `DATABASE_URL` | `sqlite:///./medlens.db` | SQLAlchemy connection string |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed frontend origins |
| `GEMINI_API_KEY` | `""` | Placeholder for Phase 3+ AI integration |

### Frontend (`frontend/.env`)
| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Target FastAPI backend URL |

---

## Getting Started

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at:
- **Root Health Check**: `http://127.0.0.1:8000/health`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc Documentation**: `http://127.0.0.1:8000/redoc`

### 2. Frontend Setup

```bash
# Open a new terminal in the frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Running Automated Tests

Run backend unit and integration tests with `pytest`:

```bash
cd backend
.\venv\Scripts\pytest -v
```

Verified test coverage:
1. `GET /health` root endpoint returns HTTP 200 with database connectivity status
2. `GET /api/v1/health` versioned endpoint returns HTTP 200
3. `GET /` service metadata endpoint works
4. Database session creation and `SELECT 1` query succeed
5. SQLAlchemy ORM `Patient` model CRUD operations function correctly
6. Centralized configuration loads defaults and parses CORS correctly

---

## Next Steps: Phase 2

Phase 2 will introduce:
- Patient entity management and profiles
- Medical document upload pipeline
- Metadata indexing for clinical files
