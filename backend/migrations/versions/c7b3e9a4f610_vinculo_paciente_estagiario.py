"""vinculo paciente e estagiario por clinica

Revision ID: c7b3e9a4f610
Revises: a4e1b7c3d902
Create Date: 2026-10-16 14:05:22.331884

A recepcao vincula cada paciente ao estagiario responsavel. A transferencia
troca o responsavel e a antiga linha fica como SUBSTITUIDA -- e por isso a
tabela e tambem o historico de quem esteve com o paciente.

`situacao` e texto com dois valores, e nao ENUM de propósito: um ENUM exigiria
derrubar o tipo no downgrade (ver armadilha registrada no AGENTS.md) para guardar
uma coluna que so tem duas possibilidades.

O indice unico parcial em (paciente_id, curso) WHERE situacao = 'ATIVA' e a
invariante da regra: nenhum paciente fica sob dois responsaveis ao mesmo tempo.
Com ele, errar a logica da aplicacao nao duplica responsavel -- o banco recusa.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'c7b3e9a4f610'
down_revision: Union[str, Sequence[str], None] = 'a4e1b7c3d902'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'atribuicoes_clinicas',
        # PrimaryKeyConstraint explicito: `sa.Column('id', sa.Integer())` sozinho
        # vira `integer` sem default e o primeiro insert falha com
        # `null value in column "id"` -- e o `alembic check` continua limpo,
        # porque o comparador so olha o tipo.
        sa.Column('id', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.Column('paciente_id', sa.Integer(), nullable=False),
        # FK declarada, como em agendamentos e prontuarios. A segregação por
        # clínica NÃO vem daqui: ela é aplicada na camada de aplicação, porque
        # paciente `ambos` pertence às duas e uma FK não saberia disso.
        sa.ForeignKeyConstraint(['paciente_id'], ['pacientes.id'], ),
        sa.Column('curso', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('estagiario_nome', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('estagiario_matricula', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
        # 'ATIVA' | 'SUBSTITUIDA'
        sa.Column('situacao', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        # Texto em Text, sem limite: o motivo de uma troca e justificativa
        # pedagogica e um limite aqui truncaria o registro.
        sa.Column('motivo', sa.Text(), nullable=True),
        # Quem vinculou. Vem do token, nunca do corpo: um cliente nao pode se
        # passar pela recepcao que fez a atribuicao.
        sa.Column('atribuido_por_nome', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('atribuido_por_matricula', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
        sa.Column('data_atribuicao', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.Column('data_encerramento', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=True),
        sa.Column('criado_em', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
    )
    # A listagem da recepcao sempre filtra por clinica e a checagem do vinculo no
    # POST do prontuario olha o ATIVA do paciente -- os dois por id de paciente.
    op.create_index('ix_atribuicoes_clinicas_paciente_id', 'atribuicoes_clinicas', ['paciente_id'])
    op.create_index('ix_atribuicoes_clinicas_curso', 'atribuicoes_clinicas', ['curso'])
    op.create_index(
        'ix_atribuicoes_clinicas_estagiario_matricula',
        'atribuicoes_clinicas',
        ['estagiario_matricula'],
    )

    # Invariante: um responsavel ativo por (paciente, clinica). WHERE e obrigatorio
    # -- sem ele o indice barraria tambem o historico, que mantem varias linhas
    # SUBSTITUIDA para o mesmo paciente.
    op.create_index(
        'uq_atribuicao_ativa_por_paciente_clinica',
        'atribuicoes_clinicas',
        ['paciente_id', 'curso'],
        unique=True,
        postgresql_where=sa.text("situacao = 'ATIVA'"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_atribuicao_ativa_por_paciente_clinica', table_name='atribuicoes_clinicas')
    op.drop_index('ix_atribuicoes_clinicas_estagiario_matricula', table_name='atribuicoes_clinicas')
    op.drop_index('ix_atribuicoes_clinicas_curso', table_name='atribuicoes_clinicas')
    op.drop_index('ix_atribuicoes_clinicas_paciente_id', table_name='atribuicoes_clinicas')
    op.drop_table('atribuicoes_clinicas')