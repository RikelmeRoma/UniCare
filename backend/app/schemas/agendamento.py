from pydantic import BaseModel
from typing import Optional
from app.models.agendamento import StatusAgendamento

class AgendamentoCreate(BaseModel):
    paciente_id: int
    paciente_nome: str
    estagiario_nome: str
    estagiario_matricula: str
    curso: str
    horario: str
    turno: str = "tarde"
    sala_ou_cadeira: str
    tipo_consulta: str
    observacao_logistica: Optional[str] = None

class AgendamentoUpdateStatus(BaseModel):
    status: StatusAgendamento

class AgendamentoRead(BaseModel):
    id: int
    paciente_id: int
    paciente_nome: str
    estagiario_nome: str
    estagiario_matricula: str
    curso: str
    horario: str
    turno: str
    sala_ou_cadeira: str
    tipo_consulta: str
    status: StatusAgendamento
    observacao_logistica: Optional[str] = None
