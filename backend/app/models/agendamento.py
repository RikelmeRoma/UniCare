from typing import Optional
from datetime import date
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
    # Na odontologia, `estagiario_matricula` e o operador da dupla e
    # `auxiliar_matricula` e o segundo estagiario (PDR-05). Na psicologia a
    # sessao e de um estagiario so e o auxiliar fica nulo. Nullable porque as
    # sessoes anteriores a esta coluna nao tem como inferir a dupla a partir do
    # texto livre.
    estagiario_matricula: str = Field(max_length=32)
    auxiliar_matricula: Optional[str] = Field(default=None, max_length=32, index=True)
    curso: str = Field(max_length=20)
    # `Date` e nao `str`: texto nao ordena nem compara, e `STATUS.md` registra
    # `data_sessao` de prontuario como str justamente por isso. `Date` e nao
    # `DateTime`: a hora e a coluna `horario`, e meia-noite UTC em Aracaju
    # (UTC-3) sairia como o dia anterior na tela.
    #
    # Opcional no banco porque as linhas anteriores a esta coluna continuam
    # valendo; obrigatorio em `AgendamentoCreate`. `index=True` declarado aqui
    # e na migration pelo mesmo motivo: em so um dos dois o `alembic check`
    # acusa `remove_index`.
    data_sessao: Optional[date] = Field(default=None, index=True)
    horario: str = Field(max_length=5)
    turno: str = Field(default="tarde", max_length=10)
    sala_ou_cadeira: str = Field(max_length=100)
    tipo_consulta: str = Field(max_length=200)
    status: StatusAgendamento = Field(default=StatusAgendamento.AGENDADO)
    observacao_logistica: Optional[str] = Field(default=None, max_length=500)
    # Motivo operacional da ausência, separado da observação logística: a
    # recepção registra um na criação da sessão e o outro no ato da falta.
    motivo_falta: Optional[str] = Field(default=None, max_length=500)
