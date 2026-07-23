"""add strengths/improvements feedback points to question_evaluations

Revision ID: 9a4c1e7f2b3d
Revises: 773628c3638d
Create Date: 2026-07-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9a4c1e7f2b3d'
down_revision: Union[str, Sequence[str], None] = '773628c3638d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'question_evaluations',
        sa.Column('strengths', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
    )
    op.add_column(
        'question_evaluations',
        sa.Column('improvements', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('question_evaluations', 'improvements')
    op.drop_column('question_evaluations', 'strengths')
