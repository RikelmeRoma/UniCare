from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import Text
from sqlmodel import Column, Field, SQLModel


class OcorrenciaEstagiario(SQLModel, table=True):
    """Registro operacional de ocorrência envolvendo estagiário pela recepção.

    Acompanhamento de pontualidade, ausências e ocorrências administrativas no
    serviço-escola, sem se confundir com evolução clínica de paciente.
    """

    __tablename__ = "ocorrencias_estagiarios"

    id: Optional[int] = Field(default=None, primary_key=True)
    estagiario_matricula: str = Field(max_length=32, index=True)
    estagiario_nome: str = Field(max_length=200)
    curso: str = Field(max_length=20, index=True)
    tipo: str = Field(max_length=60)
    data_ocorrencia: date = Field(index=True)
    descricao: str = Field(sa_column=Column(Text, nullable=False))
    registrado_por_nome: str = Field(max_length=200)
    registrado_por_matricula: str = Field(max_length=32)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
