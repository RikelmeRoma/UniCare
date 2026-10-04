from typing import Optional
from enum import Enum
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field

class StatusProntuario(str, Enum):
    EM_ELABORACAO = "EM_ELABORACAO"
    AGUARDANDO_VALIDACAO = "AGUARDANDO_VALIDACAO"
    VALIDADO = "VALIDADO"
    DEVOLVIDO_PARA_AJUSTE = "DEVOLVIDO_PARA_AJUSTE"

class ProntuarioPsico(SQLModel, table=True):
    __tablename__ = "prontuarios_psico"

    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)
    paciente_nome: str
    estagiario_nome: str
    estagiario_matricula: str
    supervisor_nome: Optional[str] = None
    data_sessao: str
    numero_sessao: str
    inicio_sessao_texto: str
    meio_sessao_texto: str
    fim_sessao_texto: str
    parecer_supervisor: Optional[str] = None
    status: StatusProntuario = Field(default=StatusProntuario.AGUARDANDO_VALIDACAO)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FichaOdonto(SQLModel, table=True):
    __tablename__ = "fichas_odonto"

    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)
    dupla_estagiarios: str
    dente_regiao: str
    procedimento_realizado: str
    materiais_utilizados: str
    anestesico: Optional[str] = None
    alerta_alergia: Optional[str] = None
    parecer_supervisor: Optional[str] = None
    status: StatusProntuario = Field(default=StatusProntuario.AGUARDANDO_VALIDACAO)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
