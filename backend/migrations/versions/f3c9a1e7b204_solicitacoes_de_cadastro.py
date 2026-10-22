"""solicitacoes de cadastro de usuario

Revision ID: f3c9a1e7b204
Revises: d7f2a9c4e1b8
Create Date: 2026-10-14 09:12:44.101233

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f3c9a1e7b204'
down_revision: Union[str, Sequence[str], None] = 'd7f2a9c4e1b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Pedido de credencial feito por quem ainda nao tem conta. A linha nasce
    # PENDENTE e so vira APPROVADA quando a RT da clinica cria o usuario — a
    # aprovacao e a criacao acontecem na mesma acao, para nao existir estado
    # "aprovado sem conta".
    #
    # `perfil_declarado` e `curso_declarado` sao o que o solicitante AFIRMA, nao
    # o que sera gravado: quem decide e a RT, e o curso sai do token dela.
    # `perfilusuario` já existe desde a migration inicial. Passar `sa.Enum(...)`
    # inline faria o SQLAlchemy emitir CREATE TYPE de novo e a migration morreria
    # com "type perfilusuario already exists". `create_type=False` diz "usa o que
    # já está lá". `statussolicitacao` é novo e é criado normalmente.
    op.create_table('solicitacoes_cadastro',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('nome', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
    sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=254), nullable=False),
    sa.Column('matricula', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
    sa.Column('telefone', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=True),
    sa.Column('curso_declarado', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
    sa.Column('perfil_declarado', postgresql.ENUM('ESTAGIARIO', 'SUPERVISOR', 'RECEPCAO', 'RT', name='perfilusuario', create_type=False), nullable=False),
    sa.Column('situacao', sa.Enum('PENDENTE', 'APROVADA', 'RECUSADA', name='situacaosolicitacao'), nullable=False),
    sa.Column('decidido_por_nome', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
    sa.Column('decidido_por_matricula', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=True),
    sa.Column('decidido_em', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=True),
    sa.Column('motivo_recusa', sa.Text(), nullable=True),
    sa.Column('usuario_criado_id', sa.Integer(), nullable=True),
    sa.Column('criado_em', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
    # Sem o PrimaryKeyConstraint o Integer primario nao vira SERIAL no
    # PostgreSQL e o primeiro insert falha com "null value in column id".Foi o
    # que aconteceu na primeira versao da migracao de anamneses.
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_solicitacoes_cadastro_curso_declarado'), 'solicitacoes_cadastro', ['curso_declarado'], unique=False)
    op.create_index(op.f('ix_solicitacoes_cadastro_email'), 'solicitacoes_cadastro', ['email'], unique=False)
    op.create_index(op.f('ix_solicitacoes_cadastro_situacao'), 'solicitacoes_cadastro', ['situacao'], unique=False)
    op.create_foreign_key('fk_solicitacoes_cadastro_usuario_criado_id_usuarios', 'solicitacoes_cadastro', 'usuarios', ['usuario_criado_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_solicitacoes_cadastro_usuario_criado_id_usuarios', 'solicitacoes_cadastro', type_='foreignkey')
    op.drop_index(op.f('ix_solicitacoes_cadastro_situacao'), table_name='solicitacoes_cadastro')
    op.drop_index(op.f('ix_solicitacoes_cadastro_email'), table_name='solicitacoes_cadastro')
    op.drop_index(op.f('ix_solicitacoes_cadastro_curso_declarado'), table_name='solicitacoes_cadastro')
    op.drop_table('solicitacoes_cadastro')

    # op.drop_table NAO remove os tipos ENUM nativos do PostgreSQL. Sem esta
    # limpeza explicita, um ciclo downgrade -> upgrade falha com
    # "type ... already exists".
    sa.Enum(name='situacaosolicitacao').drop(op.get_bind(), checkfirst=True)