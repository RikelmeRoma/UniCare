from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.usuario import PerfilUsuario, CursoUsuario

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

class UsuarioRead(BaseModel):
    id: int
    nome: str
    email: str
    perfil: PerfilUsuario
    curso: CursoUsuario
    matricula: str
    registro_profissional: Optional[str] = None
    ativo: bool
