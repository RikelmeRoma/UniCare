"""ocorrencias_estagiarios.criado_em como timestamptz

A migration 8b4e2a9c1f07 criou a coluna com `sa.DateTime()`, que no Postgres
e `timestamp without time zone`. O model `OcorrenciaEstagiario.criado_em` e
UTCDateTime — o SQLModel mapeia `datetime` para `DateTime(timezone=True)`.
Toda as outras 11 tabelas do projeto tem `criado_em` como `timestamptz`; so
esta ficou para tras, e o `alembic check` passou a acusar `modify_type`.

Revisao nova, e nao edicao da 8b4e2a9c1f07: a versao anterior ja foi
aplicada nos bancos de desenvolvimento e de teste.

O `SET LOCAL` fixa o fuso da sessao durante a conversao: o Postgres
interpreta o valor sem fuso usando o fuso da sessao, e sem isso a conversao
dependeria do fuso de quem roda a migracao (aqui, o do container).

Revision ID: c7e91d4a2b08
Revises: 8b4e2a9c1f07
Create Date: 2026-11-12 20:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7e91d4a2b08'
down_revision: Union[str, Sequence[str], None] = '8b4e2a9c1f07'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("SET LOCAL TIME ZONE 'UTC'")
    op.alter_column(
        'ocorrencias_estagiarios',
        'criado_em',
        type_=sa.DateTime(timezone=True),
        existing_type=sa.DateTime(),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.execute("SET LOCAL TIME ZONE 'UTC'")
    op.alter_column(
        'ocorrencias_estagiarios',
        'criado_em',
        type_=sa.DateTime(),
        existing_type=sa.DateTime(timezone=True),
        existing_nullable=False,
    )
