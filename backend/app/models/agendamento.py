from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field

class StatusAgendamento(str, Enum):
    AGENDADO = "AGENDADO"
    PRESENTE = "PRESENTE"
    EM_ATENDIMENTO = "EM_ATENDIMENTO"
    CONCLUIDO = "CONCLUIDO"
    FALTOU = "FALTOU"
    CANCELADO = "CANCELADO"

class Agendamento(SQLModel, table=True):
    __tablename__ = "agendamentos"

    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)
    paciente_nome: str = Field(max_length=200)
    estagiario_nome: str = Field(max_length=200)
    estagiario_matricula: str = Field(max_length=32)
    curso: str = Field(max_length=20)
    horario: str = Field(max_length=5)
    turno: str = Field(default="tarde", max_length=10)
    sala_ou_cadeira: str = Field(max_length=100)
    tipo_consulta: str = Field(max_length=200)
    status: StatusAgendamento = Field(default=StatusAgendamento.AGENDADO)
    observacao_logistica: Optional[str] = Field(default=None, max_length=500)
