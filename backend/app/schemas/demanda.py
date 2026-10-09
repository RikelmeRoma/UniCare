from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.demanda import StatusDemanda, PrioridadeDemanda

class DemandaCreate(BaseModel):
    aluno_nome: str
    aluno_matricula: str
    curso: str
    procedimento_desejado: str
    prioridade: PrioridadeDemanda = PrioridadeDemanda.MEDIA
    data_solicitacao: str

class DemandaUpdateStatus(BaseModel):
    status: StatusDemanda

class DemandaRead(BaseModel):
    id: int
    aluno_nome: str
    aluno_matricula: str
    curso: str
    procedimento_desejado: str
    prioridade: PrioridadeDemanda
    data_solicitacao: str
    status: StatusDemanda
    criado_em: Optional[datetime] = None