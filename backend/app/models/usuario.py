from typing import Optional
from enum import Enum
from sqlmodel import SQLModel, Field

class PerfilUsuario(str, Enum):
    ESTAGIARIO = "estagiario"
    SUPERVISOR = "supervisor"
    RECEPCAO = "recepcao"
    RT = "rt"
    COORDENACAO = "coordenacao"

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
    # Vínculo supervisor ↔ estagiário (RF-005). Só faz sentido para
    # estagiários: um supervisor gerencia quem está vinculado a ele, e a RT
    # vê e gerencia todos. Nullable porque o cadastro pode vir sem supervisor
    # definido (RT atribui depois) e porque supervisor/recepção/RT não têm.
    # Referência fraca (string, não FK): segue o padrão do projeto para
    # matrícula, e evita cascade delete silencioso se o supervisor for
    # desativado.
    supervisor_matricula: Optional[str] = Field(default=None, max_length=32, index=True)
    ativo: bool = Field(default=True)
