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
    inicio_sessao_texto: str
    meio_sessao_texto: str
    fim_sessao_texto: str

    @field_validator("inicio_sessao_texto", "meio_sessao_texto", "fim_sessao_texto")
    @classmethod
    def validar_vedacao_aspas(cls, v: str) -> str:
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
    inicio_sessao_texto: str
    meio_sessao_texto: str
    fim_sessao_texto: str
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
