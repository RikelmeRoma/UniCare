"""une cabecas de psicologia e odontologia

Revision ID: 525d8633fd0e
Revises: e9750b3073ed, a3955e2873a6
Create Date: 2026-10-28 16:06:51.341546

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '525d8633fd0e'
down_revision: Union[str, Sequence[str], None] = ('e9750b3073ed', 'a3955e2873a6')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
