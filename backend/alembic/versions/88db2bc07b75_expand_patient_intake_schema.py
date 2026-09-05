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
    """Upgrade schema using SQLite batch mode with backfilling."""
    conn = op.get_bind()

    # Step 1: Add new columns as nullable to allow data backfilling
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('patient_identifier', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('full_name', sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column('date_of_birth', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('sex', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('symptoms', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('existing_conditions', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('allergies', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('medications', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('other_information', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('provenance_tag', sa.String(length=50), nullable=True))

    # Step 2: Backfill existing rows with unique identifiers and migrate name/gender
    conn.execute(sa.text("UPDATE patients SET patient_identifier = 'PAT-MIGRATED-' || id WHERE patient_identifier IS NULL"))
    conn.execute(sa.text("UPDATE patients SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL"))
    conn.execute(sa.text("UPDATE patients SET sex = UPPER(gender) WHERE sex IS NULL AND gender IS NOT NULL"))
    conn.execute(sa.text("UPDATE patients SET symptoms = '[]' WHERE symptoms IS NULL"))
    conn.execute(sa.text("UPDATE patients SET existing_conditions = '[]' WHERE existing_conditions IS NULL"))
    conn.execute(sa.text("UPDATE patients SET allergies = '[]' WHERE allergies IS NULL"))
    conn.execute(sa.text("UPDATE patients SET medications = '[]' WHERE medications IS NULL"))
    conn.execute(sa.text("UPDATE patients SET provenance_tag = 'USER_PROVIDED' WHERE provenance_tag IS NULL"))

    # Step 3: Finalize table structure: drop legacy columns, set non-nullable, and add unique index
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.alter_column('patient_identifier', nullable=False)
        batch_op.alter_column('full_name', nullable=False)
        batch_op.alter_column('symptoms', nullable=False)
        batch_op.alter_column('existing_conditions', nullable=False)
        batch_op.alter_column('allergies', nullable=False)
        batch_op.alter_column('medications', nullable=False)
        batch_op.alter_column('provenance_tag', nullable=False)

        batch_op.create_index(batch_op.f('ix_patients_full_name'), ['full_name'], unique=False)
        batch_op.create_index(batch_op.f('ix_patients_patient_identifier'), ['patient_identifier'], unique=True)
        
        batch_op.drop_column('name')
        batch_op.drop_column('gender')


def downgrade() -> None:
    """Downgrade schema using SQLite batch mode."""
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('gender', sa.VARCHAR(length=50), nullable=True))
        batch_op.add_column(sa.Column('name', sa.VARCHAR(length=255), nullable=False, server_default='Unknown'))
        batch_op.create_index('ix_patients_name', ['name'], unique=False)
        
        batch_op.drop_index(batch_op.f('ix_patients_patient_identifier'))
        batch_op.drop_index(batch_op.f('ix_patients_full_name'))
        
        batch_op.drop_column('provenance_tag')
        batch_op.drop_column('other_information')
        batch_op.drop_column('medications')
        batch_op.drop_column('allergies')
        batch_op.drop_column('existing_conditions')
        batch_op.drop_column('symptoms')
        batch_op.drop_column('sex')
        batch_op.drop_column('date_of_birth')
        batch_op.drop_column('full_name')
        batch_op.drop_column('patient_identifier')
