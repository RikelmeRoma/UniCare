from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field

class Paciente(SQLModel, table=True):
    __tablename__ = "pacientes"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(index=True, max_length=200)
    cpf_rg: str = Field(unique=True, index=True, max_length=32)
    data_nascimento: str = Field(max_length=10)
    telefone: str = Field(max_length=32)
    eh_menor: bool = Field(default=False)
    nome_responsavel: Optional[str] = Field(default=None, max_length=200)
    contato_responsavel: Optional[str] = Field(default=None, max_length=32)
    curso: str = Field(default="odontologia", max_length=20)
    prontuario_ativo: bool = Field(default=True)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
