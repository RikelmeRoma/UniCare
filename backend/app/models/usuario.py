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
    nome: str = Field(index=True, max_length=200)
    email: str = Field(unique=True, index=True, max_length=254)
    # 97 caracteres em uso: salt(32) + ":" + sha256(64). Limite abaixo de 97
    # truncaria o hash e quebraria todo login.
    senha_hash: str = Field(max_length=128)
    perfil: PerfilUsuario = Field(default=PerfilUsuario.ESTAGIARIO)
    curso: CursoUsuario = Field(default=CursoUsuario.GERAL)
    matricula: str = Field(unique=True, index=True, max_length=32)
    registro_profissional: Optional[str] = Field(default=None, max_length=64)
    ativo: bool = Field(default=True)
