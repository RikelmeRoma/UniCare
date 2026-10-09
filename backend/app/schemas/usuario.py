from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.usuario import PerfilUsuario, CursoUsuario


class UsuarioRead(BaseModel):
    """Leitura de usuário. `senha_hash` nunca aparece aqui — nem em resposta,
    nem em log, nem em erro."""
    id: int
    nome: str
    email: str
    perfil: PerfilUsuario
    curso: CursoUsuario
    matricula: str
    registro_profissional: Optional[str] = None
    ativo: bool


class UsuarioCreate(BaseModel):
    """Cadastro feito pela RT. `curso` não entra: a clínica é a da RT."""
    nome: str = Field(min_length=2, max_length=200)
    email: EmailStr
    senha: str = Field(min_length=6, max_length=72)
    perfil: PerfilUsuario
    matricula: str = Field(min_length=2, max_length=32)
    registro_profissional: Optional[str] = Field(default=None, max_length=64)


class UsuarioUpdate(BaseModel):
    """Edição parcial. Perfil e curso são imutáveis por esta rota.

    `max_length=72` na senha é o limite do bcrypt: acima disso `get_password_hash`
    levanta SenhaLongaError, e um 500 seria pior que um 422 de validação.
    """
    nome: Optional[str] = Field(default=None, min_length=2, max_length=200)
    email: Optional[EmailStr] = None
    matricula: Optional[str] = Field(default=None, min_length=2, max_length=32)
    registro_profissional: Optional[str] = Field(default=None, max_length=64)
    ativo: Optional[bool] = None
    senha: Optional[str] = Field(default=None, min_length=6, max_length=72)