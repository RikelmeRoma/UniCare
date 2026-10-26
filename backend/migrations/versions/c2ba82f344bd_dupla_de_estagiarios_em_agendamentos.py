"""dupla de estagiarios em agendamentos

Revision ID: c2ba82f344bd
Revises: a1d5e8f3c207
Create Date: 2026-10-25 19:34:33.622587

A agenda odontologica e de dupla (PDR-05), mas `agendamentos` guardava so uma
matricula. O segundo aluno nao conseguia enxergar a sessao que assinou junto, e
o supervisor nao tinha como filtrar as duplas dos proprios alunos.

`estagiario_matricula` continua sendo o operador; a coluna nova guarda o
auxiliar. Nullable porque as sessoes anteriores nao tem como inferir a dupla a
partir do texto livre `estagiario_nome`, e a psicologia segue com um unico
responsavel (auxiliar nulo).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2ba82f344bd'
down_revision: Union[str, Sequence[str], None] = 'a1d5e8f3c207'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'agendamentos',
        sa.Column('auxiliar_matricula', sa.String(length=32), nullable=True),
    )
    op.create_index(
        op.f('ix_agendamentos_auxiliar_matricula'),
        'agendamentos',
        ['auxiliar_matricula'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(
        op.f('ix_agendamentos_auxiliar_matricula'),
        table_name='agendamentos',
    )
    op.drop_column('agendamentos', 'auxiliar_matricula')
