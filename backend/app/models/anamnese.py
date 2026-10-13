from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Text

class Anamnese(SQLModel, table=True):
    """Anamnese e aferição de sinais vitais de um paciente na clínica.

    Uma linha por aferição: a tela mostra a mais recente e o histórico fica no
    banco. `afetido_em` é DateTime e não str de propósito — `data_nascimento` e
    `data_sessao` são str e por isso não ordenam nem comparam.
    """
    __tablename__ = "anamneses"

    id: Optional[int] = Field(default=None, primary_key=True)
    paciente_id: int = Field(foreign_key="pacientes.id", index=True)

    afetido_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)

    # Sinais vitais. Todos opcionais: aferição parcial é comum em cadeira.
    pressao_arterial: Optional[str] = Field(default=None, max_length=7)
    glicemia_capilar: Optional[int] = None
    frequencia_cardiaca: Optional[int] = None
    temperatura: Optional[float] = Field(default=None)

    # Anamnese. Texto livre porque é descritiva, mas com limite de linha para
    # o --autogenerate enxergar a mudança depois.
    alergias: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    condicoes_cronicas: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    medicacoes_em_uso: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))

    # Autoria desnormalizada: sobrevive à desativação do cadastro, como nos logs.
    responsavel_nome: str = Field(max_length=200)
    responsavel_matricula: str = Field(max_length=32)

    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))