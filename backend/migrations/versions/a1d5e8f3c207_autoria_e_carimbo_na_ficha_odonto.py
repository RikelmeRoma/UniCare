"""autoria da dupla e carimbo docente na ficha odontologica

Revision ID: a1d5e8f3c207
Revises: c69c627004f8
Create Date: 2026-10-23 00:00:00.000000

Paridade com `prontuarios_psico`: a ficha odontologica passa a guardar as
matriculas dos dois estagiarios (PDR-05) e o nome de quem homologou. As tres
colunas sao nullable porque as fichas anteriores nao tem como inferir autoria
a partir do texto livre `dupla_estagiarios`.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1d5e8f3c207'
down_revision: Union[str, Sequence[str], None] = 'c69c627004f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'fichas_odonto',
        sa.Column('operador_matricula', sa.String(length=32), nullable=True),
    )
    op.add_column(
        'fichas_odonto',
        sa.Column('auxiliar_matricula', sa.String(length=32), nullable=True),
    )
    op.add_column(
        'fichas_odonto',
        sa.Column('supervisor_nome', sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('fichas_odonto', 'supervisor_nome')
    op.drop_column('fichas_odonto', 'auxiliar_matricula')
    op.drop_column('fichas_odonto', 'operador_matricula')
