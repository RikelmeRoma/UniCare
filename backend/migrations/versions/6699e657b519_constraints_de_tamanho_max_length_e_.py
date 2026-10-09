"""constraints de tamanho: max_length e Text nos narrativos

Revision ID: 6699e657b519
Revises: 6962282d3bc9
Create Date: 2026-10-04 22:57:10.519295

Nota sobre a geracao automatica
-------------------------------
O --autogenerate so detecta as mudancas VARCHAR -> Text. As colunas que continuam
VARCHAR e apenas ganham um limite de tamanho NAO sao detectaveis, porque o tipo
permanece String e so o comprimento muda. Por isso os `ALTER ... TYPE VARCHAR(n)`
abaixo foram escritos a mao.

Todos os limites sao expansivos: o maior valor real observado no banco foi medido
antes desta revisao (usuarios.senha_hash=97, prontuarios_psico.meio_sessao_texto=157)
e todo `n` aqui e maior que o correspondente. Acessors em sa.Column perdem o NOT NULL
do model, entao os dois grupos de narrativos foram corrigidos manualmente.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '6699e657b519'
down_revision: Union[str, Sequence[str], None] = '6962282d3bc9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (tabela, coluna, limite) — limites expansivos, ver nota no topo do arquivo
_LIMITES = [
    ('usuarios', 'nome', 200),
    ('usuarios', 'email', 254),
    ('usuarios', 'senha_hash', 128),
    ('usuarios', 'matricula', 32),
    ('usuarios', 'registro_profissional', 64),
    ('pacientes', 'nome', 200),
    ('pacientes', 'cpf_rg', 32),
    ('pacientes', 'data_nascimento', 10),
    ('pacientes', 'telefone', 32),
    ('pacientes', 'nome_responsavel', 200),
    ('pacientes', 'contato_responsavel', 32),
    ('pacientes', 'curso', 20),
    ('agendamentos', 'paciente_nome', 200),
    ('agendamentos', 'estagiario_nome', 200),
    ('agendamentos', 'estagiario_matricula', 32),
    ('agendamentos', 'curso', 20),
    ('agendamentos', 'horario', 5),
    ('agendamentos', 'turno', 10),
    ('agendamentos', 'sala_ou_cadeira', 100),
    ('agendamentos', 'tipo_consulta', 200),
    ('agendamentos', 'observacao_logistica', 500),
    ('prontuarios_psico', 'paciente_nome', 200),
    ('prontuarios_psico', 'estagiario_nome', 200),
    ('prontuarios_psico', 'estagiario_matricula', 32),
    ('prontuarios_psico', 'supervisor_nome', 200),
    ('prontuarios_psico', 'data_sessao', 10),
    ('prontuarios_psico', 'numero_sessao', 32),
    ('fichas_odonto', 'dupla_estagiarios', 200),
    ('fichas_odonto', 'dente_regiao', 100),
    ('fichas_odonto', 'anestesico', 255),
    ('fichas_odonto', 'alerta_alergia', 500),
    ('logs_auditoria', 'usuario_nome', 200),
    ('logs_auditoria', 'acao', 100),
    ('logs_auditoria', 'tabela_afetada', 64),
    ('logs_auditoria', 'endereco_ip', 45),
]

# Narrativos que passam de VARCHAR para Text, preservando o NOT NULL do model.
_NARRATIVOS_NOT_NULL = [
    ('prontuarios_psico', 'inicio_sessao_texto'),
    ('prontuarios_psico', 'meio_sessao_texto'),
    ('prontuarios_psico', 'fim_sessao_texto'),
    ('fichas_odonto', 'procedimento_realizado'),
    ('fichas_odonto', 'materiais_utilizados'),
]

# Narrativos opcionais (Optional[str]) que passam de VARCHAR para Text.
_NARRATIVOS_NULLABLE = [
    ('prontuarios_psico', 'parecer_supervisor'),
    ('fichas_odonto', 'parecer_supervisor'),
]


def upgrade() -> None:
    """Upgrade schema."""
    # Escrever um --autogenerate, please adjust! em tudo daqui: qualquer
    # operacao que o Alembic não conseguir reverter com seguranca e melhor feita
    # a mao do que medida para um generated file.
    for tabela, coluna, limite in _LIMITES:
        op.alter_column(
            tabela,
            coluna,
            existing_type=sa.VARCHAR(),
            type_=sa.VARCHAR(limite),
            existing_nullable=coluna not in ('registro_profissional', 'nome_responsavel',
                                             'contato_responsavel', 'observacao_logistica',
                                             'supervisor_nome', 'anestesico',
                                             'alerta_alergia', 'endereco_ip'),
        )

    for tabela, coluna in _NARRATIVOS_NOT_NULL:
        op.alter_column(
            tabela, coluna,
            existing_type=sa.VARCHAR(),
            type_=sa.Text(),
            existing_nullable=False,
            nullable=False,
        )

    for tabela, coluna in _NARRATIVOS_NULLABLE:
        op.alter_column(
            tabela, coluna,
            existing_type=sa.VARCHAR(),
            type_=sa.Text(),
            existing_nullable=True,
            nullable=True,
        )


def downgrade() -> None:
    """Downgrade schema."""
    # Voltar para VARCHAR sem limite e seguro: e a condicao mais permissiva,
    # aceita qualquer valor que o Text aceitaria.
    for tabela, coluna in _NARRATIVOS_NULLABLE:
        op.alter_column(
            tabela, coluna,
            existing_type=sa.Text(),
            type_=sa.VARCHAR(),
            existing_nullable=True,
            nullable=True,
        )

    for tabela, coluna in _NARRATIVOS_NOT_NULL:
        op.alter_column(
            tabela, coluna,
            existing_type=sa.Text(),
            type_=sa.VARCHAR(),
            existing_nullable=False,
            nullable=False,
        )

    for tabela, coluna, _limite in _LIMITES:
        op.alter_column(
            tabela,
            coluna,
            existing_type=sa.VARCHAR(),
            type_=sa.VARCHAR(),
            existing_nullable=coluna not in ('registro_profissional', 'nome_responsavel',
                                             'contato_responsavel', 'observacao_logistica',
                                             'supervisor_nome', 'anestesico',
                                             'alerta_alergia', 'endereco_ip'),
        )