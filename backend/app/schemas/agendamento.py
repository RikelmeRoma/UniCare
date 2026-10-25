from pydantic import BaseModel, Field
from datetime import date
from typing import Optional
from app.models.agendamento import StatusAgendamento

class AgendamentoCreate(BaseModel):
    paciente_id: int
    paciente_nome: str
    estagiario_nome: str
    estagiario_matricula: str
    curso: str
    # Obrigatoria: sessao sem dia nao existe, e quem atende precisa saber
    # quando. O banco aceita nulo so para as linhas anteriores a coluna.
    data_sessao: date
    horario: str
    turno: str = "tarde"
    sala_ou_cadeira: str
    tipo_consulta: str
    observacao_logistica: Optional[str] = None

class AgendamentoUpdateStatus(BaseModel):
    status: StatusAgendamento
    # Opcional: só faz sentido quando o status é FALTOU. O router recusa o
    # campo nos demais status para não misturar motivo de ausência com uma
    # mudança de presença.
    motivo_falta: Optional[str] = Field(default=None, max_length=500)

class AgendamentoRead(BaseModel):
    id: int
    paciente_id: int
    paciente_nome: str
    estagiario_nome: str
    estagiario_matricula: str
    curso: str
    # Opcional na leitura porque as linhas antigas ficam sem dia. A tela mostra
    # "data nao registrada" em vez de inventar uma.
    data_sessao: Optional[date] = None
    horario: str
    turno: str
    sala_ou_cadeira: str
    tipo_consulta: str
    status: StatusAgendamento
    observacao_logistica: Optional[str] = None
    motivo_falta: Optional[str] = None
