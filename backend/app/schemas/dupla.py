from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class DuplaOdontoCreate(BaseModel):
    """Duas matrículas reais, distintas, de estagiários de odontologia."""

    operador_matricula: str = Field(min_length=2, max_length=32)
    auxiliar_matricula: str = Field(min_length=2, max_length=32)

    @model_validator(mode="after")
    def validar_membros_distintos(self):
        if self.operador_matricula.strip().upper() == self.auxiliar_matricula.strip().upper():
            raise ValueError(
                "A dupla exige dois estagiários distintos (PDR-05)."
            )
        return self


class DuplaOdontoRead(BaseModel):
    id: int
    operador_matricula: str
    operador_nome: str
    auxiliar_matricula: str
    auxiliar_nome: str
    supervisor_matricula: str
    supervisor_nome: Optional[str] = None
    ativo: bool
    criado_em: datetime
    desativado_em: Optional[datetime] = None
