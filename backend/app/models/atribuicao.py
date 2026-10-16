from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Index, text
from sqlmodel import Column, Field, SQLModel
from sqlalchemy import Text


class SituacaoAtribuicao:
    """Valores aceitos em `AtribuicaoClinica.situacao`.

    Classe e nao Enum de proposito: em migration, `op.drop_table()` nao remove
    tipos ENUM no PostgreSQL e o downgrade passa a exigir dropar o tipo na mao
    para guardar duas opcoes. Ver a armadilha registrada no AGENTS.md.
    """

    ATIVA = "ATIVA"
    SUBSTITUIDA = "SUBSTITUIDA"

    TODAS = (ATIVA, SUBSTITUIDA)


class AtribuicaoClinica(SQLModel, table=True):
    """Vinculo entre paciente e estagiario responsavel, por clinica (RF-001).

    A recepcao vincula; o estagiario so escreve prontuario de paciente que
    esteja ativo em seu nome. A transferencia encerra a linha antiga e abre uma
    nova, entao a tabela e tambem o historico de quem esteve com aquele paciente.

    O prontuario ja guarda `estagiario_nome` e `estagiario_matricula` no momento
    da escrita, entao o registro clinico antigo continua apontando para quem
    era o responsavel na epoca -- a atribuicao nao reescreve historico.
    """

    __tablename__ = "atribuicoes_clinicas"

    # Invariante da regra: um responsável ativo por (paciente, clínica). O WHERE
    # é obrigatório — sem ele o índice barraria o próprio histórico, que
    # mantém várias linhas SUBSTITUIDA do mesmo paciente.
    #
    # Declarado no model e não só na migration porque o `alembic check` compara
    # o banco com o metadata: índice que existe em um e não no outro vira
    # "remove_index" e a suíte perde `alembic check` limpo.
    __table_args__ = (
        Index(
            "uq_atribuicao_ativa_por_paciente_clinica",
            "paciente_id",
            "curso",
            unique=True,
            postgresql_where=text("situacao = 'ATIVA'"),
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)
    curso: str = Field(max_length=20, index=True)
    estagiario_nome: str = Field(max_length=200)
    estagiario_matricula: str = Field(max_length=32, index=True)
    situacao: str = Field(default=SituacaoAtribuicao.ATIVA, max_length=20)
    # Texto livre: o motivo de uma troca e justificativa pedagogica. Vazio em
    # ATIVA (nao ha troca a justificar); obrigatorio quando SUBSTITUIDA.
    # `sa_column` explicito porque o padrao seria VARCHAR(n) -- e o motivo nao
    # tem tamanho maximo legitimo.
    motivo: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    # Quem vinculou. O servidor preenche a partir do token da requisicao: um
    # cliente nao pode se passar pela recepcao que fez a atribuicao.
    atribuido_por_nome: str = Field(max_length=200)
    atribuido_por_matricula: str = Field(max_length=32)
    data_atribuicao: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_encerramento: Optional[datetime] = None
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))