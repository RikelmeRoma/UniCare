from typing import Optional
from enum import Enum
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, JSON, Text

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
    # A redacao e uma unica narrativa livre. Antes eram tres colunas
    # (inicio/meio/fim) porque a tela exigia que o estagiario separasse por
    # fase; a restricao era de interface, nao de prontuario. Quem redige conhece a ordem
    # a ordem em que as coisas aconteceram e escreve em paragrafos.
    # nullable=False explicito: sa.Column sem esse parametro gera nullable=True e
    # o model ficaria mais permissivo que o banco.
    redacao_texto: str = Field(sa_column=Column(Text, nullable=False))
    parecer_supervisor: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    status: StatusProntuario = Field(default=StatusProntuario.AGUARDANDO_VALIDACAO)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class FichaOdonto(SQLModel, table=True):
    __tablename__ = "fichas_odonto"

    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)
    # Texto de exibição da dupla. O servidor o monta a partir das matrículas
    # resolvidas, e não do corpo do cliente: nome digitado à mão gravava uma
    # pessoa com a matrícula de outra.
    dupla_estagiarios: str = Field(max_length=200)
    # Autoria da dupla (PDR-05). Referência fraca por matrícula, como em
    # `usuarios.supervisor_matricula`. Nullable porque as fichas anteriores a
    # esta coluna não têm como inferir o autor a partir do texto livre.
    operador_matricula: Optional[str] = Field(default=None, max_length=32)
    auxiliar_matricula: Optional[str] = Field(default=None, max_length=32)
    dente_regiao: str = Field(max_length=100)
    procedimento_realizado: str = Field(sa_column=Column(Text, nullable=False))
    materiais_utilizados: str = Field(sa_column=Column(Text, nullable=False))
    anestesico: Optional[str] = Field(default=None, max_length=255)
    alerta_alergia: Optional[str] = Field(default=None, max_length=500)
    # Carimbo de autoria docente, gravado pelo servidor no ato da homologação.
    # Antes a ficha não dizia quem deu o visto; o nome só existia na trilha.
    supervisor_nome: Optional[str] = Field(default=None, max_length=200)
    parecer_supervisor: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    status: StatusProntuario = Field(default=StatusProntuario.AGUARDANDO_VALIDACAO)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DocumentoFichaOdonto(SQLModel, table=True):
    """Ficha clínica odontológica completa, persistida no servidor.

    `FichaOdonto` continua sendo o registro por procedimento (PDR-05). Esta
    tabela guarda o documento da página Ficha Clínica: anamnese, odontograma,
    periograma, índices e plano, em um JSON versionado. O conteúdo é do
    domínio, então o servidor não interpreta cada campo; ele controla autoria,
    versão, status e parecer.
    """

    __tablename__ = "documentos_ficha_odonto"

    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)
    tipo: str = Field(max_length=20, default="adulto")
    dupla_estagiarios: str = Field(max_length=200)
    operador_matricula: str = Field(max_length=32, index=True)
    auxiliar_matricula: str = Field(max_length=32, index=True)
    conteudo: dict = Field(sa_column=Column(JSON, nullable=False))
    status: StatusProntuario = Field(default=StatusProntuario.AGUARDANDO_VALIDACAO)
    parecer_supervisor: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    supervisor_nome: Optional[str] = Field(default=None, max_length=200)
    versao: int = Field(default=1)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    submetido_em: Optional[datetime] = Field(default=None)
