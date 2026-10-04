from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field

class PerfilUsuario(str, Enum):
    ESTAGIARIO = "estagiario"
    SUPERVISOR = "supervisor"
    RECEPCAO = "recepcao"
    RT = "rt"

class CursoUsuario(str, Enum):
    PSICOLOGIA = "psicologia"
    ODONTOLOGIA = "odontologia"
    GERAL = "geral"

class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(index=True)
    email: str = Field(unique=True, index=True)
    senha_hash: str
    perfil: PerfilUsuario = Field(default=PerfilUsuario.ESTAGIARIO)
    curso: CursoUsuario = Field(default=CursoUsuario.GERAL)
    matricula: str = Field(unique=True, index=True)
    registro_profissional: Optional[str] = None
    ativo: bool = Field(default=True)
