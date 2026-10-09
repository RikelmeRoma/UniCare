from typing import Optional
from enum import Enum
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Text

class StatusProntuario(str, Enum):
    EM_ELABORACAO = "EM_ELABORACAO"
    AGUARDANDO_VALIDACAO = "AGUARDANDO_VALIDACAO"
    VALIDADO = "VALIDADO"
    DEVOLVIDO_PARA_AJUSTE = "DEVOLVIDO_PARA_AJUSTE"

class ProntuarioPsico(SQLModel, table=True):
    __tablename__ = "prontuarios_psico"

    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)
    paciente_nome: str = Field(max_length=200)
    estagiario_nome: str = Field(max_length=200)
    estagiario_matricula: str = Field(max_length=32)
    supervisor_nome: Optional[str] = Field(default=None, max_length=200)
    data_sessao: str = Field(max_length=10)
    numero_sessao: str = Field(max_length=32)
    # Narrativas clinicas em Text, sem limite. Fixar max_length aqui seria
    # arbitrario e truncaria registro de prontuario — sob LGPD/CFP isso e perda
    # de documentacao, nao apenas um erro de validacao.
    # nullable=False explicito: sa.Column sem esse parametro gera nullable=True e
    # o model ficaria mais permissivo que o banco.
    inicio_sessao_texto: str = Field(sa_column=Column(Text, nullable=False))
    meio_sessao_texto: str = Field(sa_column=Column(Text, nullable=False))
    fim_sessao_texto: str = Field(sa_column=Column(Text, nullable=False))
    parecer_supervisor: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    status: StatusProntuario = Field(default=StatusProntuario.AGUARDANDO_VALIDACAO)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FichaOdonto(SQLModel, table=True):
    __tablename__ = "fichas_odonto"

    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)
    dupla_estagiarios: str = Field(max_length=200)
    dente_regiao: str = Field(max_length=100)
    procedimento_realizado: str = Field(sa_column=Column(Text, nullable=False))
    materiais_utilizados: str = Field(sa_column=Column(Text, nullable=False))
    anestesico: Optional[str] = Field(default=None, max_length=255)
    alerta_alergia: Optional[str] = Field(default=None, max_length=500)
    parecer_supervisor: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    status: StatusProntuario = Field(default=StatusProntuario.AGUARDANDO_VALIDACAO)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
