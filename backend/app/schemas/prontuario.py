import re
from pydantic import BaseModel, field_validator, model_validator
from typing import Any, Optional
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
    # A dupla vem por matrícula, não por nome digitado: o servidor resolve os
    # dois estagiários e monta `dupla_estagiarios` com os nomes do cadastro.
    operador_matricula: str
    auxiliar_matricula: str
    dente_regiao: str
    procedimento_realizado: str
    materiais_utilizados: str
    anestesico: Optional[str] = None
    alerta_alergia: Optional[str] = None

    @field_validator("operador_matricula", "auxiliar_matricula")
    @classmethod
    def validar_matricula_obrigatoria(cls, v: str) -> str:
        texto = v.strip()
        if not texto:
            raise ValueError(
                "A dupla de estagiários é obrigatória (PDR-05): informe a "
                "matrícula do operador e a do auxiliar."
            )
        return texto

    @field_validator("dente_regiao", "procedimento_realizado", "materiais_utilizados")
    @classmethod
    def validar_conteudo_clinico(cls, v: str) -> str:
        # O formulário já marca os campos como obrigatórios, mas a regra vale
        # no servidor: qualquer cliente pode chamar a rota direto e mandar
        # ficha em branco para a fila de homologação.
        if not v.strip():
            raise ValueError(
                "Registro clínico incompleto: dente/região, procedimento e "
                "materiais utilizados não podem ficar em branco."
            )
        return v

    @model_validator(mode="after")
    def validar_dupla_distinta(self):
        if self.operador_matricula == self.auxiliar_matricula:
            raise ValueError(
                "Operador e auxiliar precisam ser estagiários diferentes: a "
                "ficha odontológica é de atendimento em dupla (PDR-05)."
            )
        return self

class FichaOdontoRead(BaseModel):
    id: int
    paciente_id: int
    dupla_estagiarios: str
    operador_matricula: Optional[str] = None
    auxiliar_matricula: Optional[str] = None
    dente_regiao: str
    procedimento_realizado: str
    materiais_utilizados: str
    anestesico: Optional[str] = None
    alerta_alergia: Optional[str] = None
    supervisor_nome: Optional[str] = None
    parecer_supervisor: Optional[str] = None
    status: StatusProntuario
    criado_em: datetime

class DocumentoFichaOdontoCreate(BaseModel):
    paciente_id: int
    operador_matricula: str
    auxiliar_matricula: str
    tipo: str
    conteudo: dict[str, Any]

    @field_validator("operador_matricula", "auxiliar_matricula")
    @classmethod
    def validar_matricula_obrigatoria(cls, v: str) -> str:
        texto = v.strip()
        if not texto:
            raise ValueError("A dupla de estagiários é obrigatória (PDR-05).")
        return texto

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, v: str) -> str:
        if v not in ("adulto", "infantil"):
            raise ValueError("Tipo de ficha inválido: use adulto ou infantil.")
        return v

    @field_validator("conteudo")
    @classmethod
    def validar_conteudo(cls, v: dict[str, Any]) -> dict[str, Any]:
        if not v:
            raise ValueError("A ficha clínica não pode ser enviada vazia.")
        return v

    @model_validator(mode="after")
    def validar_dupla_distinta(self):
        if self.operador_matricula == self.auxiliar_matricula:
            raise ValueError(
                "Operador e auxiliar precisam ser estagiários diferentes: a "
                "ficha odontológica é de atendimento em dupla (PDR-05)."
            )
        return self


class DocumentoFichaOdontoUpdate(BaseModel):
    conteudo: dict[str, Any]

    @field_validator("conteudo")
    @classmethod
    def validar_conteudo(cls, v: dict[str, Any]) -> dict[str, Any]:
        if not v:
            raise ValueError("A ficha clínica não pode ser enviada vazia.")
        return v


class DocumentoFichaOdontoRead(BaseModel):
    id: int
    paciente_id: int
    tipo: str
    dupla_estagiarios: str
    operador_matricula: str
    auxiliar_matricula: str
    status: StatusProntuario
    parecer_supervisor: Optional[str] = None
    supervisor_nome: Optional[str] = None
    versao: int
    criado_em: datetime
    atualizado_em: datetime
    submetido_em: Optional[datetime] = None


class DocumentoFichaOdontoDetalhe(DocumentoFichaOdontoRead):
    conteudo: dict[str, Any]
