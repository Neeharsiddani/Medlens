"""expand_patient_intake_schema

Revision ID: 88db2bc07b75
Revises: b97bb153f079
Create Date: 2026-09-05 14:04:22.681216

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '88db2bc07b75'
down_revision: Union[str, Sequence[str], None] = 'b97bb153f079'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema deterministically via standard SQLite table replacement."""
    conn = op.get_bind()

    # 1. Ensure temp table does not exist
    conn.execute(sa.text("DROP TABLE IF EXISTS _patients_old"))
    conn.execute(sa.text("DROP TABLE IF EXISTS patients_new"))
    conn.execute(sa.text("DROP TABLE IF EXISTS _alembic_tmp_patients"))

    # 2. Create the target patients_new table
    conn.execute(sa.text("""
        CREATE TABLE patients_new (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            patient_identifier VARCHAR(64) NOT NULL,
            full_name VARCHAR(255) NOT NULL,
            date_of_birth DATE,
            age INTEGER,
            sex VARCHAR(50),
            symptoms JSON NOT NULL DEFAULT '[]',
            existing_conditions JSON NOT NULL DEFAULT '[]',
            allergies JSON NOT NULL DEFAULT '[]',
            medications JSON NOT NULL DEFAULT '[]',
            other_information TEXT,
            provenance_tag VARCHAR(50) NOT NULL DEFAULT 'USER_PROVIDED',
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """))

    # 3. Check existing columns in current patients table to copy data safely
    res = conn.execute(sa.text("PRAGMA table_info(patients)")).fetchall()
    existing_cols = {row[1] for row in res}

    name_expr = "name" if "name" in existing_cols else "full_name"
    gender_expr = "gender" if "gender" in existing_cols else "sex"
    
    conn.execute(sa.text(f"""
        INSERT INTO patients_new (
            id,
            patient_identifier,
            full_name,
            date_of_birth,
            age,
            sex,
            symptoms,
            existing_conditions,
            allergies,
            medications,
            other_information,
            provenance_tag,
            created_at,
            updated_at
        )
        SELECT
            id,
            'PAT-MIGRATED-' || id,
            COALESCE({name_expr}, 'Unknown'),
            NULL,
            age,
            UPPER(COALESCE({gender_expr}, 'UNKNOWN')),
            '[]',
            '[]',
            '[]',
            '[]',
            NULL,
            'USER_PROVIDED',
            created_at,
            updated_at
        FROM patients
    """))

    # 4. Swap tables
    conn.execute(sa.text("DROP TABLE patients"))
    conn.execute(sa.text("ALTER TABLE patients_new RENAME TO patients"))

    # 5. Create indices
    conn.execute(sa.text("CREATE INDEX ix_patients_id ON patients (id)"))
    conn.execute(sa.text("CREATE INDEX ix_patients_full_name ON patients (full_name)"))
    conn.execute(sa.text("CREATE UNIQUE INDEX ix_patients_patient_identifier ON patients (patient_identifier)"))


def downgrade() -> None:
    """Downgrade schema back to Phase 1."""
    conn = op.get_bind()
    conn.execute(sa.text("""
        CREATE TABLE patients_old (
            id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            age INTEGER,
            gender VARCHAR(50),
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL
        )
    """))
    conn.execute(sa.text("""
        INSERT INTO patients_old (id, name, age, gender, created_at, updated_at)
        SELECT id, full_name, age, sex, created_at, updated_at FROM patients
    """))
    conn.execute(sa.text("DROP TABLE patients"))
    conn.execute(sa.text("ALTER TABLE patients_old RENAME TO patients"))
    conn.execute(sa.text("CREATE INDEX ix_patients_id ON patients (id)"))
    conn.execute(sa.text("CREATE INDEX ix_patients_name ON patients (name)"))
