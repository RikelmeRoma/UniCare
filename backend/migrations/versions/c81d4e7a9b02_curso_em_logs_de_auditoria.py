"""curso em logs de auditoria (segregacao por clinica)

Revision ID: c81d4e7a9b02
Revises: 779eeac7703e
Create Date: 2026-10-09 19:12:04.113907

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'c81d4e7a9b02'
down_revision: Union[str, Sequence[str], None] = '779eeac7703e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # A tabela nao tem coluna de curso e o log nao carrega o registro afetado,
    # entao o curso do autor e a unica fonte disponivel. As escritas ja sao
    # validadas contra o curso de quem executa, entao os dois coincidem.
    op.add_column(
        'logs_auditoria',
        sa.Column('curso', sqlmodel.sql.sqltypes.AutoString(length=20),
                  nullable=False, server_default='geral')
    )
    # O server_default serve so para preencher as linhas legadas, que nao tem
    # curso proprio. Elas ficam marcadas como 'geral' — ou seja, invisiveis
    # para quem tem clinica, em vez de vazarem para a clinica errada. O model
    # nao tem default: toda escrita nova passa por registrar_log.
    op.alter_column('logs_auditoria', 'curso', server_default=None)
    op.create_index(op.f('ix_logs_auditoria_curso'), 'logs_auditoria', ['curso'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_logs_auditoria_curso'), table_name='logs_auditoria')
    op.drop_column('logs_auditoria', 'curso')