# MedLens — Architecture & Phase Roadmap

MedLens is an AI-powered clinical information intelligence application designed to synthesize, organize, and audit scattered medical information across patient history, prescriptions, laboratory reports, and previous clinical records with complete provenance.

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
                       |
                       v
        +-----------------------------+
        |   SQLite Database Storage   |
        |     (Alembic Migrations)    |
        +-----------------------------+
```

## Multi-Phase Implementation Roadmap

1. **Phase 1: Foundation (Current)**
   - Core full-stack skeleton (FastAPI + SQLAlchemy + Alembic + React + Vite).
   - Database connection and migration pipelines.
   - Pydantic v2 schemas and validation foundation.
   - Health check telemetry and connection verification.
   - **No AI / No document processing**.

2. **Phase 2: Patient Management & Document Ingestion (Upcoming)**
   - Patient intake and profiling.
   - Medical document upload handling (PDF, image, text).
   - File storage and metadata tracking.

3. **Phase 3: Deterministic Laboratory Engine & AI Extraction (Upcoming)**
   - Gemini Vision / multimodal document extraction into strict Pydantic schemas.
   - Deterministic reference-range rule engine (LOW / NORMAL / HIGH).
   - Non-hallucinatory data guarantees.

4. **Phase 4: Synthesis, Timeline & Provenance (Upcoming)**
   - Interactive clinical timeline and trend analysis.
   - Medical entity linking with source document bounding boxes and provenance.

5. **Phase 5: Clinical Summarization & Conflict Detection (Upcoming)**
   - AI clinical brief generation anchored in verified findings.
   - Drug-drug and diagnosis conflict detection algorithms.
