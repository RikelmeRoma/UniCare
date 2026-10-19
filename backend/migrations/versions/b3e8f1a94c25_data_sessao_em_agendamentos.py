"""Data da sessao em agendamentos

Revision ID: b3e8f1a94c25
Revises: f4a7c2d9e053
Create Date: 2026-10-17

`Agendamento` guardava so `horario` (VARCHAR(5), "14:00") e `turno`. Tres
painel proprio dela - a tabela da recepcao, a agenda do estagiario e a
auditoria - queriam dizer "hoje" ou "na semana", e nenhuma delas podia, porque
o dia nao existia no cadastro. A data da sessao nao pode ser inventada na tela
para fechar isso.

**Por que `sa.Date` e nao `sa.DateTime`.** Data de sessao nao tem hora: o
`horario` ja e uma coluna separada. Gravar meia-noite UTC e formatar no
fuso de Aracaju (UTC-3) faz a tela mostrar o dia ANTERIOR -- exatamente o tipo
de erro que ninguem percebe olhando. `Date` nao tem fuso, entao o dia e o dia.

**Por que nullable na base mas obrigatorio na API.** A tabela tem linhas (o seed
grava 8), e `ALTER TABLE ... ADD COLUMN ... NOT NULL` sem default morre em
tabela com dados. O `NOT NULL` vem depois que o seed passa a gravar a coluna,
porem no model ela continua opcional: um agendamento gravado antes desta
revisao e historico legitimo, e a tela mostra "data nao registrada" em vez de
mentir. Quem cria sessao nova ja recebe 422 sem a data.

Declarado tambem em `models/agendamento.py`: sem o `index=True` nos dois
lugaress, o `alembic check` passa a acusar `remove_index` sempre.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'b3e8f1a94c25'
down_revision: Union[str, Sequence[str], None] = 'f4a7c2d9e053'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('agendamentos', sa.Column('data_sessao', sa.Date(), nullable=True))
    op.create_index(
        op.f('ix_agendamentos_data_sessao'), 'agendamentos', ['data_sessao'], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_agendamentos_data_sessao'), table_name='agendamentos')
    op.drop_column('agendamentos', 'data_sessao')
