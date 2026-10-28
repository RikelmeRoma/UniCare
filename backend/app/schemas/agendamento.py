from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import date
from typing import Optional
from app.models.agendamento import StatusAgendamento

class AgendamentoCreate(BaseModel):
    paciente_id: int
    paciente_nome: str
    estagiario_nome: str
    # Matricula do estagiario que atende a sessao. Na odontologia a cadeira e
    # sempre de dupla (PDR-05) e o segundo aluno vai em `auxiliar_matricula`;
    # na psicologia a sessao e de um estagiario so e o campo e recusado.
    estagiario_matricula: str
    auxiliar_matricula: Optional[str] = None
    curso: str
    # Obrigatoria: sessao sem dia nao existe, e quem atende precisa saber
    # quando. O banco aceita nulo so para as linhas anteriores a coluna.
    data_sessao: date
    horario: str
    turno: str = "tarde"
    sala_ou_cadeira: str
    tipo_consulta: str
    observacao_logistica: Optional[str] = None

    @field_validator("estagiario_matricula")
    @classmethod
    def normalizar_estagiario(cls, v: str) -> str:
        texto = v.strip().upper()
        if not texto:
            raise ValueError(
                "Informe a matricula do estagiario responsavel/operador."
            )
        return texto

    @field_validator("auxiliar_matricula")
    @classmethod
    def normalizar_auxiliar(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        texto = v.strip().upper()
        return texto or None

    @model_validator(mode="after")
    def validar_dupla_de_estagiarios(self):
        # A dupla e regra da cadeira odontologica (PDR-05). A psicologia atende
        # com um estagiario por sessao: a recusa do auxiliar fica no router,
        # depois do guard de perfil, para nao mascarar o 403 do RN-001.
        if self.curso != "odontologia":
            return self
        if not self.auxiliar_matricula:
            raise ValueError(
                "A cadeira odontologica e atendida em dupla: informe a matricula "
                "do estagiario auxiliar."
            )
        if self.auxiliar_matricula == self.estagiario_matricula:
            raise ValueError(
                "Os dois estagiarios da dupla precisam ser diferentes."
            )
        return self

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
    auxiliar_matricula: Optional[str] = None
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
