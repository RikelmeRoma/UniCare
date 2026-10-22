"""remove a fila de demandas de estagio

Revision ID: f4a7c2d9e053
Revises: c7b3e9a4f610
Create Date: 2026-10-16 15:38:41.902774

A tabela foi removida: o botao "Conciliar" so escrevia a palavra `Agendado` sem
agendar, sem atribuir paciente a ninguem e sem criar vinculo. Com o vinculo
paciente-estagiario (RF-001, revisao c7b3e9a4f610) fazendo o trabalho de
verdade, as duas telas ficavam lado a lado quase fazendo a mesma coisa, uma
delas sem executar nada.

**Os dois tipos ENUM sao derrubados explicitamente.** `op.drop_table()` remove a
tabela e NAO remove o tipo: deixar os dois para tras faz o upgrade seguinte
morrer com `type ... already exists`. A ordem importa — o `DROP TYPE` vem
depois do `drop_table`, porque as colunas ainda os referenciam. E o `checkfirst`
protege o caso de o tipo ja nao existir.

O `downgrade` recria a tabela com a definicao EXATA de 779eeac7703e — inclusive
os nomes dos valores do enum em caixa alta (`ALTA`, `PENDENTE`), que e o que o
PostgreSQL gravou. Reprovar com 'Alta' criaria um enum diferente do original.

A trilha de auditoria NAO e tocada: as linhas de `CRIAR_DEMANDA` e
`STATUS_DEMANDA_*` ja gravadas continuam. Reescrever log e pior do que guardar.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'f4a7c2d9e053'
down_revision: Union[str, Sequence[str], None] = 'c7b3e9a4f610'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_index('ix_demandas_estagio_aluno_matricula', table_name='demandas_estagio')
    op.drop_index('ix_demandas_estagio_curso', table_name='demandas_estagio')
    op.drop_table('demandas_estagio')
    # Depois da tabela: enquanto as colunas existirem, o tipo esta em uso.
    sa.Enum(name='statusdemanda').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='prioridadedemanda').drop(op.get_bind(), checkfirst=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.create_table(
        'demandas_estagio',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('aluno_nome', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column('aluno_matricula', sqlmodel.sql.sqltypes.AutoString(length=32), nullable=False),
        sa.Column('curso', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column('procedimento_desejado', sa.Text(), nullable=False),
        sa.Enum('ALTA', 'MEDIA', 'NORMAL', name='prioridadedemanda', create_type=True),
        sa.Column('data_solicitacao', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False),
        sa.Enum('PENDENTE', 'AGENDADO', name='statusdemanda', create_type=True),
        sa.Column('criado_em', sqlmodel.sql.sqltypes.UTCDateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_demandas_estagio_aluno_matricula', 'demandas_estagio', ['aluno_matricula'])
    op.create_index('ix_demandas_estagio_curso', 'demandas_estagio', ['curso'])