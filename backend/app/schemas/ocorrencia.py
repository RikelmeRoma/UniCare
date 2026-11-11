from datetime import date, datetime
from typing import Literal
from pydantic import BaseModel, field_validator


TIPOS_OCORRENCIA_PSICO = (
    "ATRASO",
    "FALTA",
    "CONDUTA",
    "ATENDIMENTO",
    "ADMINISTRATIVO",
    "OUTRO",
)


class OcorrenciaEstagiarioCreate(BaseModel):
    estagiario_matricula: str
    tipo: Literal[
        "ATRASO",
        "FALTA",
        "CONDUTA",
        "ATENDIMENTO",
        "ADMINISTRATIVO",
        "OUTRO",
    ] = "ADMINISTRATIVO"
    data_ocorrencia: date
    descricao: str

    @field_validator("estagiario_matricula")
    @classmethod
    def normalizar_matricula(cls, v: str) -> str:
        texto = v.strip().upper()
        if not texto:
            raise ValueError("Informe a matrícula do estagiário.")
        return texto

    @field_validator("descricao")
    @classmethod
    def validar_descricao(cls, v: str) -> str:
        texto = v.strip()
        if not texto:
            raise ValueError("A descrição da ocorrência é obrigatória.")
        return texto


class OcorrenciaEstagiarioRead(BaseModel):
    id: int
    estagiario_matricula: str
    estagiario_nome: str
    curso: str
    tipo: str
    data_ocorrencia: date
    descricao: str
    registrado_por_nome: str
    registrado_por_matricula: str
    criado_em: datetime
