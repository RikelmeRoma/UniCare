import re
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.models.prontuario import StatusProntuario

QUOTE_REGEX = re.compile(r'["“”«»]')

class ProntuarioPsicoCreate(BaseModel):
    paciente_id: int
    paciente_nome: str
    estagiario_nome: str
    estagiario_matricula: str
    supervisor_nome: Optional[str] = None
    data_sessao: str
    numero_sessao: str
    redacao_texto: str

    @field_validator("redacao_texto")
    @classmethod
    def validar_texto_clinico(cls, v: str) -> str:
        # A redacao e obrigatoria e nao pode ficar em branco. Aceitar string
        # vazia deixava passar ficha em branco para homologacao: a tela
        # preenchia por conta propria, mas qualquer cliente chamando a rota
        # direto mandava o campo vazio e o banco aceitava.
        #
        # A regra e citada por descricao, e nao por "RNF-003": o relatorio
        # normativo nao tem nenhum identificador RNF-* -- so RF-* e RN-001,
        # RN-002 e RN-006. O rotulo aparecia na tela citando uma regra que nao
        # existe em fonte nenhuma.
        if not v.strip():
            raise ValueError(
                "Síntese clínica obrigatória: a redação da sessão não pode ficar "
                "em branco."
            )
        if QUOTE_REGEX.search(v):
            raise ValueError(
                "Violação à Resolução CFP nº 06/2019 (RN-002): O prontuário psicológico não pode conter falas literais ou citações diretas entre aspas."
            )
        return v

class HomologacaoRequest(BaseModel):
    decisao: StatusProntuario  # VALIDADO ou DEVOLVIDO_PARA_AJUSTE
    parecer: str

    @field_validator("parecer")
    @classmethod
    def validar_parecer_obrigatorio(cls, v: str) -> str:
        # Homologação sem parecer grava decisão sem autoria docente no prontuário.
        # A regra precisa valer no servidor: exigir isso só na tela deixa o 422
        # como nada, porque qualquer cliente pode chamar a rota direto.
        texto = v.strip()
        if not texto:
            raise ValueError(
                "O parecer do supervisor é obrigatório: uma decisão de homologação "
                "sem parecer fica sem autoria docente no prontuário."
            )
        return texto

class ProntuarioPsicoRead(BaseModel):
    id: int
    paciente_id: int
    paciente_nome: str
    estagiario_nome: str
    estagiario_matricula: str
    supervisor_nome: Optional[str] = None
    data_sessao: str
    numero_sessao: str
    redacao_texto: str
    parecer_supervisor: Optional[str] = None
    status: StatusProntuario
    criado_em: datetime

class FichaOdontoCreate(BaseModel):
    paciente_id: int
    dupla_estagiarios: str
    dente_regiao: str
    procedimento_realizado: str
    materiais_utilizados: str
    anestesico: Optional[str] = None
    alerta_alergia: Optional[str] = None

class FichaOdontoRead(BaseModel):
    id: int
    paciente_id: int
    dupla_estagiarios: str
    dente_regiao: str
    procedimento_realizado: str
    materiais_utilizados: str
    anestesico: Optional[str] = None
    alerta_alergia: Optional[str] = None
    parecer_supervisor: Optional[str] = None
    status: StatusProntuario
    criado_em: datetime
