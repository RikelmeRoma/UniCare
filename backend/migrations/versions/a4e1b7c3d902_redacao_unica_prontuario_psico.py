"""redacao unica do prontuario psicologico

Revision ID: a4e1b7c3d902
Revises: b7d4e9c1a305
Create Date: 2026-10-15 19:20:10.114503

Substitui inicio_sessao_texto / meio_sessao_texto / fim_sessao_texto por uma
coluna unica, redacao_texto. A tela passou a oferecer uma caixa so, com a
redacao inteira escrita pelo estagiario; as tres colunas obrigavam a tela a
pedir que ele separem por fase, o que e restricao de tela, nao de prontuario.

O conteudo ja registrado nao se perde: entra concatenado com linha em branco
entre as partes, preservando a separacao dos paragrafos na leitura.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a4e1b7c3d902'
down_revision: Union[str, Sequence[str], None] = 'b7d4e9c1a305'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # nullable=True de proposito no passo que adiciona a coluna: a tabela ja
    # tem linhas e nenhuma delas conhece o valor novo. O NOT NULL real vem no
    # passo seguinte, depois do backfill. Declarar `nullable=False` aqui faria o
    # Alembic gerar o default do servidor e o `alembic check` passaria a acusar
    # modify_nullable no model.
    op.add_column(
        'prontuarios_psico',
        sa.Column('redacao_texto', sa.Text(), nullable=True),
    )

    # `concat_ws` ignora NULL, entao um prontuario com alguma fase vazia nao
    # ganha separador fantasma. `btrim` tira o espaco das pontas caso alguma
    # fase tenha sido gravada so com quebra.
    op.execute(
        """
        UPDATE prontuarios_psico
        SET redacao_texto = btrim(
            concat_ws(E'\\n\\n', inicio_sessao_texto, meio_sessao_texto, fim_sessao_texto)
        )
        """
    )

    op.alter_column(
        'prontuarios_psico',
        'redacao_texto',
        existing_type=sa.Text(),
        nullable=False,
    )

    op.drop_column('prontuarios_psico', 'inicio_sessao_texto')
    op.drop_column('prontuarios_psico', 'meio_sessao_texto')
    op.drop_column('prontuarios_psico', 'fim_sessao_texto')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        'prontuarios_psico',
        sa.Column('inicio_sessao_texto', sa.Text(), nullable=False, server_default=''),
    )
    op.add_column(
        'prontuarios_psico',
        sa.Column('meio_sessao_texto', sa.Text(), nullable=False, server_default=''),
    )
    op.add_column(
        'prontuarios_psico',
        sa.Column('fim_sessao_texto', sa.Text(), nullable=False, server_default=''),
    )

    # A separacao em fases NAO e reversivel: o banco nunca guardou onde uma
    # fase terminava e outra começava, e inferir por ponto final seria fabricar
    # fronteira clinica. O texto volta inteiro em inicio_sessao_texto e as outras
    # duas ficam vazias. Perdendo granularidade no downgrade, o conteudo continua
    # integro — que e o que importa se algo precisar voltar.
    op.execute(
        """
        UPDATE prontuarios_psico
        SET inicio_sessao_texto = redacao_texto,
            meio_sessao_texto = '',
            fim_sessao_texto = ''
        """
    )

    op.drop_column('prontuarios_psico', 'redacao_texto')