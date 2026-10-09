from typing import Optional
from enum import Enum
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Text

class PrioridadeDemanda(str, Enum):
    ALTA = "Alta"
    MEDIA = "Média"
    NORMAL = "Normal"

class StatusDemanda(str, Enum):
    PENDENTE = "Pendente"
    AGENDADO = "Agendado"

class DemandaEstagio(SQLModel, table=True):
    """Fila de trabalho dos estagiários (RF-009).

    Aluno solicita pacientes para a próxima semana; a recepção concilia a fila
    com a agenda real.
    """
    __tablename__ = "demandas_estagio"

    id: Optional[int] = Field(default=None, primary_key=True)
    aluno_nome: str = Field(max_length=200)
    aluno_matricula: str = Field(max_length=32, index=True)
    curso: str = Field(max_length=20, index=True)
    # Texto livre redigido pelo aluno — mesmo critério dos narrativos clínicos:
    # um limite aqui seria arbitrário e truncaria o pedido.
    procedimento_desejado: str = Field(sa_column=Column(Text, nullable=False))
    prioridade: PrioridadeDemanda = Field(default=PrioridadeDemanda.MEDIA)
    data_solicitacao: str = Field(max_length=10)
    status: StatusDemanda = Field(default=StatusDemanda.PENDENTE)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))