import re
from pydantic import BaseModel, field_validator, model_validator
from typing import Any, Literal, Optional
from datetime import datetime
from app.models.prontuario import StatusProntuario

QUOTE_REGEX = re.compile(r'["“”«»]')

MOTIVOS_ENCERRAMENTO_PSICO = (
    "Desistência do cliente",
    "Finalização do período de estágio",
    "Mudança de Estagiário/Horário/Dia",
    "Perda da vaga por falta do cliente",
    "Alta do Cliente/Finalização",
    "Saída do estagiário",
)


def _exigir_sem_aspas(valor: Optional[str]) -> None:
    if valor and QUOTE_REGEX.search(valor):
        raise ValueError(
            "Violação à Resolução CFP nº 06/2019 (RN-002): O prontuário psicológico não pode conter falas literais ou citações diretas entre aspas."
        )


class ProntuarioPsicoCreate(BaseModel):
    paciente_id: int
    paciente_nome: str
    estagiario_nome: str
    estagiario_matricula: str
    supervisor_nome: Optional[str] = None
    data_sessao: str
    numero_sessao: str
    tipo_registro: Literal["SESSAO", "DEMANDA", "ENCERRAMENTO"] = "SESSAO"
    redacao_texto: str = ""
    # Folha de Avaliação da Demanda
    avaliacao_demanda: Optional[str] = None
    objetivos_intervencao: Optional[str] = None
    hipotese_diagnostica: Optional[str] = None
    # Folha de Registro de Encerramento
    avaliacao_final: Optional[str] = None
    motivos_encerramento: Optional[list[str]] = None
    informacoes_adicionais: Optional[str] = None

    @model_validator(mode="after")
    def validar_e_sintetizar(self):
        # RN-002 (CFP 06/2019): nenhum campo narrativo do prontuário psicológico
        # pode conter falas literais ou citações diretas entre aspas.
        for campo in (
            self.redacao_texto,
            self.avaliacao_demanda,
            self.objetivos_intervencao,
            self.hipotese_diagnostica,
            self.avaliacao_final,
            self.informacoes_adicionais,
        ):
            _exigir_sem_aspas(campo)

        if self.tipo_registro == "SESSAO":
            # A redacao e obrigatoria e nao pode ficar em branco. Aceitar string
            # vazia deixava passar ficha em branco para homologacao: a tela
            # preenchia por conta propria, mas qualquer cliente chamando a rota
            # direto mandava o campo vazio e o banco aceitava.
            if not self.redacao_texto.strip():
                raise ValueError(
                    "Síntese clínica obrigatória: a redação da sessão não pode ficar "
                    "em branco."
                )
            return self

        if self.tipo_registro == "DEMANDA":
            av = (self.avaliacao_demanda or "").strip()
            obj = (self.objetivos_intervencao or "").strip()
            hip = (self.hipotese_diagnostica or "").strip()
            if not av or not obj or not hip:
                raise ValueError(
                    "Preencha todos os campos da Avaliação da Demanda: Queixa/Demanda, "
                    "Objetivos da Intervenção e Hipótese Diagnóstica Inicial."
                )
            self.avaliacao_demanda = av
            self.objetivos_intervencao = obj
            self.hipotese_diagnostica = hip
            if not self.numero_sessao.strip():
                self.numero_sessao = "Avaliação da Demanda"
            self.redacao_texto = (
                f"Avaliação da Demanda ou Queixa:\n{av}\n\n"
                f"Definição dos Objetivos da Intervenção:\n{obj}\n\n"
                f"Hipótese Diagnóstica Inicial:\n{hip}"
            )
            return self

        # ENCERRAMENTO
        av_final = (self.avaliacao_final or "").strip()
        if not av_final:
            raise ValueError(
                "A Avaliação Final do Caso é obrigatória no Registro de Encerramento."
            )
        motivos_brutos = self.motivos_encerramento or []
        motivos_validos = [
            m for m in MOTIVOS_ENCERRAMENTO_PSICO if m in motivos_brutos
        ]
        invalidos = [m for m in motivos_brutos if m not in MOTIVOS_ENCERRAMENTO_PSICO]
        if invalidos:
            raise ValueError(
                f"Motivo de encerramento inválido: {', '.join(invalidos)}."
            )
        if not motivos_validos:
            raise ValueError(
                "Selecione ao menos uma opção no quadro Registro de Encerramento."
            )
        info_adicional = (self.informacoes_adicionais or "").strip()
        self.avaliacao_final = av_final
        self.motivos_encerramento = motivos_validos
        self.informacoes_adicionais = info_adicional
        if not self.numero_sessao.strip():
            self.numero_sessao = "Encerramento"
        partes = [
            f"Avaliação Final do Caso:\n{av_final}",
            f"Registro de Encerramento:\n{', '.join(motivos_validos)}",
        ]
        if info_adicional:
            partes.append(f"Informações Adicionais:\n{info_adicional}")
        self.redacao_texto = "\n\n".join(partes)
        return self

    def extrair_conteudo_estruturado(self) -> Optional[dict[str, Any]]:
        if self.tipo_registro == "DEMANDA":
            return {
                "avaliacao_demanda": self.avaliacao_demanda or "",
                "objetivos_intervencao": self.objetivos_intervencao or "",
                "hipotese_diagnostica": self.hipotese_diagnostica or "",
            }
        if self.tipo_registro == "ENCERRAMENTO":
            return {
                "avaliacao_final": self.avaliacao_final or "",
                "motivos_encerramento": self.motivos_encerramento or [],
                "informacoes_adicionais": self.informacoes_adicionais or "",
            }
        return None

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
    tipo_registro: str = "SESSAO"
    conteudo_estruturado: Optional[dict[str, Any]] = None
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


MAX_IMAGEM_DATA_URL = 8_000_000


class RadiografiaOdontoCreate(BaseModel):
    paciente_id: int
    dupla_id: int
    tipo: str
    laudo: str
    imagem_nome: Optional[str] = None
    imagem_mime: Optional[str] = None
    imagem_data: Optional[str] = None

    @field_validator("tipo", "laudo")
    @classmethod
    def validar_campos_obrigatorios(cls, v: str) -> str:
        texto = v.strip()
        if not texto:
            raise ValueError(
                "Modalidade e laudo do exame são obrigatórios: o anexo precisa "
                "ter interpretação clínica no prontuário."
            )
        return texto

    @field_validator("imagem_nome", "imagem_mime")
    @classmethod
    def validar_texto_opcional(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        texto = v.strip()
        return texto or None

    @field_validator("imagem_data")
    @classmethod
    def validar_imagem_data(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        texto = v.strip()
        if not texto:
            return None
        if len(texto) > MAX_IMAGEM_DATA_URL:
            raise ValueError(
                "Arquivo do exame acima do limite de 5 MB. Reduza a imagem "
                "antes de anexar."
            )
        if not (
            texto.startswith("data:image/")
            or texto.startswith("data:application/pdf")
        ):
            raise ValueError(
                "Formato de arquivo inválido: anexe uma imagem ou um PDF."
            )
        return texto


class RadiografiaOdontoRead(BaseModel):
    id: int
    paciente_id: int
    dupla_id: int
    dupla_estagiarios: str
    operador_matricula: str
    auxiliar_matricula: str
    tipo: str
    laudo: str
    imagem_nome: Optional[str] = None
    imagem_mime: Optional[str] = None
    imagem_data: Optional[str] = None
    status: str
    criado_em: datetime
