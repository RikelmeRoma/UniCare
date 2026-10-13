import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

# "120/80" — sistólica sobre diastólica, sem espaço.
PRESSAO_REGEX = re.compile(r"^\d{2,3}/\d{2,3}$")

# Faixas fisiológicas. Servem para pegar erro de digitação e de unidade: uma
# glicemia de 980 é quase sempre "98" digitado em campo de 3 dígitos, e um dado
# impossível na ficha é pior do que a ficha sem o dado.
GLICEMIA_MIN, GLICEMIA_MAX = 20, 600
FC_MIN, FC_MAX = 20, 250
TEMPERATURA_MIN, TEMPERATURA_MAX = 30.0, 45.0


class AnamneseCreate(BaseModel):
    pressao_arterial: Optional[str] = Field(default=None, max_length=7)
    glicemia_capilar: Optional[int] = Field(default=None, ge=GLICEMIA_MIN, le=GLICEMIA_MAX)
    frequencia_cardiaca: Optional[int] = Field(default=None, ge=FC_MIN, le=FC_MAX)
    temperatura: Optional[float] = Field(default=None, ge=TEMPERATURA_MIN, le=TEMPERATURA_MAX)

    alergias: Optional[str] = Field(default=None, max_length=2000)
    condicoes_cronicas: Optional[str] = Field(default=None, max_length=2000)
    medicacoes_em_uso: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("pressao_arterial")
    @classmethod
    def validar_pressao(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        texto = v.strip()
        if not texto:
            return None
        if not PRESSAO_REGEX.match(texto):
            raise ValueError(
                "Pressão arterial deve estar no formato sistólica/diastólica, "
                "ex.: 120/80."
            )
        return texto

    @field_validator("alergias", "condicoes_cronicas", "medicacoes_em_uso")
    @classmethod
    def normalizar_texto(cls, v: Optional[str]) -> Optional[str]:
        # Texto só com espaços vira None em vez de gravar campo em branco.
        if v is None:
            return None
        texto = v.strip()
        return texto or None


class AnamneseRead(BaseModel):
    id: int
    paciente_id: int
    afetido_em: datetime
    pressao_arterial: Optional[str] = None
    glicemia_capilar: Optional[int] = None
    frequencia_cardiaca: Optional[int] = None
    temperatura: Optional[float] = None
    alergias: Optional[str] = None
    condicoes_cronicas: Optional[str] = None
    medicacoes_em_uso: Optional[str] = None
    responsavel_nome: str
    responsavel_matricula: str
    criado_em: datetime