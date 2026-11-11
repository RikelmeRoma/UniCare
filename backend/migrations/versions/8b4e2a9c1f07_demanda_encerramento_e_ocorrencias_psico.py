"""demanda, encerramento em prontuarios_psico e ocorrencias_estagiarios

Revision ID: 8b4e2a9c1f07
Revises: 525d8633fd0e
Create Date: 2026-11-11 11:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '8b4e2a9c1f07'
down_revision: Union[str, Sequence[str], None] = '525d8633fd0e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'prontuarios_psico',
        sa.Column('tipo_registro', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
    )
    op.execute(
        "UPDATE prontuarios_psico SET tipo_registro = 'SESSAO' WHERE tipo_registro IS NULL"
    )
    op.alter_column(
        'prontuarios_psico',
        'tipo_registro',
        existing_type=sqlmodel.sql.sqltypes.AutoString(length=20),
        nullable=False,
    )
    op.create_index(
        op.f('ix_prontuarios_psico_tipo_registro'),
        'prontuarios_psico',
        ['tipo_registro'],
        unique=False,
    )
    op.add_column(
        'prontuarios_psico',
        sa.Column('conteudo_estruturado', sa.JSON(), nullable=True),
    )

    op.create_table(
        'ocorrencias_estagiarios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('estagiario_matricula', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
        sa.Column('estagiario_nome', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('curso', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('tipo', sqlmodel.sql.sqltypes.AutoString(length=60), nullable=False),
        sa.Column('data_ocorrencia', sa.Date(), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=False),
        sa.Column('registrado_por_nome', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('registrado_por_matricula', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
        sa.Column('criado_em', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_ocorrencias_estagiarios_curso'),
        'ocorrencias_estagiarios',
        ['curso'],
        unique=False,
    )
    op.create_index(
        op.f('ix_ocorrencias_estagiarios_data_ocorrencia'),
        'ocorrencias_estagiarios',
        ['data_ocorrencia'],
        unique=False,
    )
    op.create_index(
        op.f('ix_ocorrencias_estagiarios_estagiario_matricula'),
        'ocorrencias_estagiarios',
        ['estagiario_matricula'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_ocorrencias_estagiarios_estagiario_matricula'), table_name='ocorrencias_estagiarios')
    op.drop_index(op.f('ix_ocorrencias_estagiarios_data_ocorrencia'), table_name='ocorrencias_estagiarios')
    op.drop_index(op.f('ix_ocorrencias_estagiarios_curso'), table_name='ocorrencias_estagiarios')
    op.drop_table('ocorrencias_estagiarios')

    op.drop_column('prontuarios_psico', 'conteudo_estruturado')
    op.drop_index(op.f('ix_prontuarios_psico_tipo_registro'), table_name='prontuarios_psico')
    op.drop_column('prontuarios_psico', 'tipo_registro')
