"""Vinculo supervisor-estagiario (RF-005)

Revision ID: d8a2f0b3c194
Revises: b3e8f1a94c25
Create Date: 2026-10-19

Supervisor via todos os estagiarios da clinica porque nao existia vinculo
formal entre os dois: `registro_profissional` guardava texto livre ("Turma
Terca Tarde (SPA)") e o front filtrava a lista de `allUsers` so por curso.
O RF-005 pede que o supervisor gerencie os academicos vinculados a ele, entao
aqui entra a coluna `supervisor_matricula` em `usuarios`, referenciando a
matricula do supervisor da mesma clinica.

Nullable: supervisor, recepcao e RT nao tem supervisor; estagiario recem-criado
pode ficar sem atribuicao ate a RT decidir. `index=True` porque e o filtro que
o `GET /usuarios` do supervisor usa.

Sem tabela `turmas` separada por enquanto: uma coluna ja fecha a segregacao e
o relatorio descreve turma como conceito de gestao, nao como entidade com
ciclo de vida proprio. Se virar necessario (carga horaria por turma, meta
semestral), a coluna vira FK para `turmas` sem quebrar o que foi gravado.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd8a2f0b3c194'
down_revision: Union[str, Sequence[str], None] = 'b3e8f1a94c25'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'usuarios',
        sa.Column('supervisor_matricula', sa.String(length=32), nullable=True),
    )
    op.create_index(
        op.f('ix_usuarios_supervisor_matricula'),
        'usuarios',
        ['supervisor_matricula'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_usuarios_supervisor_matricula'), table_name='usuarios')
    op.drop_column('usuarios', 'supervisor_matricula')
