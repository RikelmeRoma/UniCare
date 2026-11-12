from typing import Dict, List, Literal, Optional
from pydantic import BaseModel, Field


AssistenteCurso = Literal["psicologia", "odontologia"]
AssistenteModo = Literal["chat", "resumo", "rascunho"]


class IaStatusResponse(BaseModel):
    configurado: bool
    modelo_padrao: str
    modelos_fallback: List[str] = Field(default_factory=list)
    modelo_transcricao: str


class HistoricoMensagemIA(BaseModel):
    papel: Literal["user", "assistant"]
    texto: str = Field(min_length=1, max_length=6000)


class SaidaPsicologiaLLM(BaseModel):
    transcricao: Optional[str] = Field(
        default=None,
        description=(
            "Transcrição fiel e limpa do áudio enviado pelo profissional, "
            "ou null se nenhum áudio tiver sido enviado."
        ),
    )
    resposta: str = Field(
        description=(
            "Resposta clínica clara, empática e objetiva em português do Brasil, "
            "sem citações literais entre aspas."
        )
    )
    redacao_texto: Optional[str] = Field(
        default=None,
        description=(
            "Rascunho completo da síntese da sessão em 3ª pessoa, do acolhimento ao "
            "fechamento, estritamente sem aspas ou falas literais (CFP 06/2019). "
            "Preencha quando o profissional pedir ou ditar evolução da sessão."
        ),
    )
    avaliacao_demanda: Optional[str] = Field(
        default=None,
        description="Rascunho para Avaliação da Demanda ou Queixa (sem aspas).",
    )
    objetivos_intervencao: Optional[str] = Field(
        default=None,
        description="Rascunho para Definição dos Objetivos da Intervenção (sem aspas).",
    )
    hipotese_diagnostica: Optional[str] = Field(
        default=None,
        description="Rascunho cauteloso para Hipótese Diagnóstica Inicial (sem aspas).",
    )
    avaliacao_final: Optional[str] = Field(
        default=None,
        description="Rascunho para Avaliação Final do Caso no encerramento (sem aspas).",
    )
    informacoes_adicionais: Optional[str] = Field(
        default=None,
        description="Observações ou encaminhamentos adicionais do encerramento (sem aspas).",
    )
    alertas_clinicos: List[str] = Field(
        default_factory=list,
        description="Lista curta de pontos de atenção clínicos, faltas ou lacunas de dados.",
    )


class SaidaOdontologiaLLM(BaseModel):
    transcricao: Optional[str] = Field(
        default=None,
        description=(
            "Transcrição fiel e limpa do áudio enviado pelo profissional, "
            "ou null se nenhum áudio tiver sido enviado."
        ),
    )
    resposta: str = Field(
        description="Resposta clínica objetiva para apoio ao cirurgião-dentista/estagiário."
    )
    historia_doenca: Optional[str] = Field(
        default=None,
        description="Rascunho técnico da queixa principal / História da Doença Atual.",
    )
    plano_tratamento: Optional[str] = Field(
        default=None,
        description="Etapa ou linha de tratamento programado estruturada para a ficha.",
    )
    evolucao_procedimento: Optional[str] = Field(
        default=None,
        description=(
            "Registro técnico conciso para Folha de Evolução (intervenção/procedimento, "
            "dente/região FDI, materiais e anestésico quando informados)."
        ),
    )
    observacoes_exame: Optional[str] = Field(
        default=None,
        description="Observações estruturadas para exame clínico, periodonto ou exames.",
    )
    alertas_clinicos: List[str] = Field(
        default_factory=list,
        description=(
            "Alertas críticos de risco sistêmico, alergias, medicações ou sinais "
            "vitais identificados no prontuário."
        ),
    )


class AssistenteResponse(BaseModel):
    transcricao: Optional[str] = None
    resposta: str
    campos_sugeridos: Dict[str, str] = Field(default_factory=dict)
    alertas_clinicos: List[str] = Field(default_factory=list)
    avisos_conformidade: List[str] = Field(default_factory=list)
    modelo_utilizado: str


class TranscricaoResponse(BaseModel):
    texto: str
    modelo_utilizado: str
    avisos_conformidade: List[str] = Field(default_factory=list)
