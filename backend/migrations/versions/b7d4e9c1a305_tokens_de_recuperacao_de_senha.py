"""tokens de recuperacao de senha

Revision ID: b7d4e9c1a305
Revises: f3c9a1e7b204
Create Date: 2026-10-15 17:04:31.882011

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b7d4e9c1a305'
down_revision: Union[str, Sequence[str], None] = 'f3c9a1e7b204'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Uma linha por token emitido. Guarda-se apenas o HASH do codigo: um dump
    # da tabela nao entrega o que a pessoa precisa para trocar a senha, e o token
    # em claro na base seria o mesmo que deixar senha guardada.
    #
    # `expira_em` e `usuario_id` tem indice porque a consulta do resgate filtra
    # exatamente por eles.
    op.create_table('tokens_recuperacao_senha',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('usuario_id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sqlmodel.sql.sqltypes.AutoString(length=64), nullable=False),
    sa.Column('expira_em', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
    sa.Column('usado_em', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=True),
    # Quem pediu o reset. Desnormalizado como nos logs: sobrevive a desativacao
    # do cadastro, entao a trilha continua explicando de onde veio o pedido.
    sa.Column('solicitante_nome', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
    sa.Column('solicitante_matricula', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=True),
    sa.Column('criado_em', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
    # Sem o PrimaryKeyConstraint o Integer primario nao vira SERIAL no
    # PostgreSQL e o primeiro insert falha com "null value in column id".
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tokens_recuperacao_senha_token_hash'), 'tokens_recuperacao_senha', ['token_hash'], unique=False)
    op.create_index(op.f('ix_tokens_recuperacao_senha_expira_em'), 'tokens_recuperacao_senha', ['expira_em'], unique=False)
    op.create_index(op.f('ix_tokens_recuperacao_senha_usuario_id'), 'tokens_recuperacao_senha', ['usuario_id'], unique=False)
    op.create_foreign_key('fk_tokens_recuperacao_senha_usuario_id_usuarios', 'tokens_recuperacao_senha', 'usuarios', ['usuario_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_tokens_recuperacao_senha_usuario_id_usuarios', 'tokens_recuperacao_senha', type_='foreignkey')
    op.drop_index(op.f('ix_tokens_recuperacao_senha_usuario_id'), table_name='tokens_recuperacao_senha')
    op.drop_index(op.f('ix_tokens_recuperacao_senha_expira_em'), table_name='tokens_recuperacao_senha')
    op.drop_index(op.f('ix_tokens_recuperacao_senha_token_hash'), table_name='tokens_recuperacao_senha')
    op.drop_table('tokens_recuperacao_senha')