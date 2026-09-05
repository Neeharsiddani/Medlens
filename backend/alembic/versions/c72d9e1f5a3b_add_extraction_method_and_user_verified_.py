"""add_extraction_method_and_user_verified_provenance

Revision ID: c72d9e1f5a3b
Revises: f424416947e6
Create Date: 2026-09-05 19:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c72d9e1f5a3b'
down_revision: Union[str, Sequence[str], None] = 'f424416947e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('medical_reports') as batch_op:
        batch_op.add_column(sa.Column('extraction_method', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('extraction_model', sa.String(length=100), nullable=True))

    with op.batch_alter_table('lab_results') as batch_op:
        batch_op.add_column(sa.Column('original_provenance', sa.String(length=50), nullable=False, server_default='REPORT_EXTRACTED'))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('lab_results') as batch_op:
        batch_op.drop_column('original_provenance')

    with op.batch_alter_table('medical_reports') as batch_op:
        batch_op.drop_column('extraction_model')
        batch_op.drop_column('extraction_method')
