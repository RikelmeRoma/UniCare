from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.usuario import PerfilUsuario, CursoUsuario
# UsuarioRead mora em schemas/usuario.py: o mesmo formato serve para /auth/me e
# para a listagem de /usuarios, e duplicar a classe faria os dois divergirem.
from app.schemas.usuario import UsuarioRead

class LoginRequest(BaseModel):
    email_ou_matricula: str
    senha: str

class Token(BaseModel):
    access_token: str
    token_type: str
    perfil: PerfilUsuario
    curso: CursoUsuario
    nome: str
    matricula: str

__all__ = ["LoginRequest", "Token", "UsuarioRead"]
