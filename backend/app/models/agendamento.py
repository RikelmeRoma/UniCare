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
    paciente_nome: str
    estagiario_nome: str
    estagiario_matricula: str
    curso: str
    horario: str
    turno: str = Field(default="tarde")
    sala_ou_cadeira: str
    tipo_consulta: str
    status: StatusAgendamento = Field(default=StatusAgendamento.AGENDADO)
    observacao_logistica: Optional[str] = None
