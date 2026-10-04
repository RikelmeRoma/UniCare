from typing import Optional
from datetime import datetime, timezone
from sqlmodel import SQLModel, Field

class Paciente(SQLModel, table=True):
    __tablename__ = "pacientes"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(index=True)
    cpf_rg: str = Field(unique=True, index=True)
    data_nascimento: str
    telefone: str
    eh_menor: bool = Field(default=False)
    nome_responsavel: Optional[str] = None
    contato_responsavel: Optional[str] = None
    curso: str = Field(default="odontologia")
    prontuario_ativo: bool = Field(default=True)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
