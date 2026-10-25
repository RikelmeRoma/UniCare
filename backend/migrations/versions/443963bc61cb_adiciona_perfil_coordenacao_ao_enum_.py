"""adiciona perfil coordenacao ao enum perfilusuario

Revision ID: 443963bc61cb
Revises: c69c627004f8
Create Date: 2026-10-23 14:36:16.166906

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '443963bc61cb'
down_revision: Union[str, Sequence[str], None] = 'c69c627004f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # O tipo `perfilusuario` é compartilhado por `usuarios.perfil` e
    # `solicitacoes_cadastro.perfil_declarado`. Nenhuma das duas colunas é
    # recriada: o ALTER TYPE preserva os valores existentes.
    op.execute(
        "ALTER TYPE perfilusuario ADD VALUE IF NOT EXISTS 'COORDENACAO'"
    )


def downgrade() -> None:
    """Downgrade schema."""
    # PostgreSQL não remove um valor de ENUM com ALTER TYPE. O downgrade
    # precisa recriar o tipo. As linhas de coordenação viram RT porque não
    # existe outro perfil com a mesma governança; é uma perda deliberada e
    # necessária para o `alembic downgrade base` do conftest.
    op.execute(
        "UPDATE usuarios SET perfil = 'RT' WHERE perfil = 'COORDENACAO'"
    )
    op.execute(
        "UPDATE solicitacoes_cadastro SET perfil_declarado = 'RT' "
        "WHERE perfil_declarado = 'COORDENACAO'"
    )

    op.execute(
        "ALTER TABLE usuarios ALTER COLUMN perfil TYPE VARCHAR(32) "
        "USING perfil::text"
    )
    op.execute(
        "ALTER TABLE solicitacoes_cadastro ALTER COLUMN perfil_declarado "
        "TYPE VARCHAR(32) USING perfil_declarado::text"
    )
    op.execute("DROP TYPE perfilusuario")
    op.execute(
        "CREATE TYPE perfilusuario AS ENUM "
        "('ESTAGIARIO', 'SUPERVISOR', 'RECEPCAO', 'RT')"
    )
    op.execute(
        "ALTER TABLE usuarios ALTER COLUMN perfil TYPE perfilusuario "
        "USING perfil::perfilusuario"
    )
    op.execute(
        "ALTER TABLE solicitacoes_cadastro ALTER COLUMN perfil_declarado "
        "TYPE perfilusuario USING perfil_declarado::perfilusuario"
    )
