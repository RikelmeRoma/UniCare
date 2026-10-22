"""anamnese e sinais vitais do paciente

Revision ID: d7f2a9c4e1b8
Revises: c81d4e7a9b02
Create Date: 2026-10-09 22:41:18.664021

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'd7f2a9c4e1b8'
down_revision: Union[str, Sequence[str], None] = 'c81d4e7a9b02'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Uma linha por aferição. afetido_em é DateTime e não VARCHAR: é o que
    # permite ordenar a linha do tempo do paciente, problema que data_nascimento
    # e data_sessao carregam por serem str.
    op.create_table('anamneses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('paciente_id', sa.Integer(), nullable=False),
    sa.Column('afetido_em', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
    sa.Column('pressao_arterial', sqlmodel.sql.sqltypes.AutoString(length=7), nullable=True),
    sa.Column('glicemia_capilar', sa.Integer(), nullable=True),
    sa.Column('frequencia_cardiaca', sa.Integer(), nullable=True),
    sa.Column('temperatura', sa.Float(), nullable=True),
    sa.Column('alergias', sa.Text(), nullable=True),
    sa.Column('condicoes_cronicas', sa.Text(), nullable=True),
    sa.Column('medicacoes_em_uso', sa.Text(), nullable=True),
    sa.Column('responsavel_nome', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
    sa.Column('responsavel_matricula', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
    sa.Column('criado_em', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
    # Sem a PrimaryKeyConstraint o Integer primário não vira SERIAL no PostgreSQL
    # e o insert falha com "null value in column id". Foi o que aconteceu na
    # primeira versão desta migração.
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_anamneses_afetido_em'), 'anamneses', ['afetido_em'], unique=False)
    op.create_index(op.f('ix_anamneses_paciente_id'), 'anamneses', ['paciente_id'], unique=False)
    op.create_foreign_key('fk_anamneses_paciente_id_pacientes', 'anamneses', 'pacientes', ['paciente_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_anamneses_paciente_id_pacientes', 'anamneses', type_='foreignkey')
    op.drop_index(op.f('ix_anamneses_paciente_id'), table_name='anamneses')
    op.drop_index(op.f('ix_anamneses_afetido_em'), table_name='anamneses')
    op.drop_table('anamneses')