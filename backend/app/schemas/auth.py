from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.usuario import PerfilUsuario, CursoUsuario
# UsuarioRead mora em schemas/usuario.py: o mesmo formato serve para /auth/me e
# para a listagem de /usuarios, e duplicar a classe faria os dois divergirem.
from app.schemas.usuario import UsuarioRead

class LoginRequest(BaseModel):
    email_ou_matricula: str
    senha: str

class TrocaSenhaRequest(BaseModel):
    """Troca de senha pelo próprio usuário.

    A senha atual é exigida de propósito: sem ela, qualquer sessão aberta — ou
    qualquer pessoa na máquina — trocaria a senha de quem estivesse logado.

    `max_length=72` é o limite do bcrypt. Acima disso `get_password_hash` levanta
    SenhaLongaError, e a rota converte em 422 em vez de deixar virar 500.
    """
    senha_atual: str = Field(min_length=1, max_length=72)
    nova_senha: str = Field(min_length=6, max_length=72)

class RecuperacaoSolicitada(BaseModel):
    email_ou_matricula: str = Field(min_length=3, max_length=254)


class RecuperacaoResgate(BaseModel):
    """Resgate do token.

    `identificador` volta a ser o e-mail **ou** a matrícula: a pessoa esqueceu a
    senha, mas costuma lembrar uma das duas coisas.
    """
    identificador: str = Field(min_length=3, max_length=254)
    codigo: str = Field(min_length=4, max_length=12)
    # Mesmo limite do `UsuarioCreate`: 6 do schema e 72 do bcrypt.
    nova_senha: str = Field(min_length=6, max_length=72)

class Token(BaseModel):
    access_token: str
    token_type: str
    perfil: PerfilUsuario
    curso: CursoUsuario
    nome: str
    matricula: str

__all__ = [
    "LoginRequest",
    "Token",
    "TrocaSenhaRequest",
    "RecuperacaoSolicitada",
    "RecuperacaoResgate",
    "UsuarioRead",
]
