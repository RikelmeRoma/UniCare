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
    # `None` para quem não tem supervisor (RT, recepção, supervisor, estagiário
    # recém-criado) ou para estagiário ainda não atribuído.
    supervisor_matricula: Optional[str] = None


class UsuarioCreate(BaseModel):
    """Cadastro feito pela RT. `curso` não entra: a clínica é a da RT."""
    nome: str = Field(min_length=2, max_length=200)
    email: EmailStr
    senha: str = Field(min_length=6, max_length=72)
    perfil: PerfilUsuario
    matricula: str = Field(min_length=2, max_length=32)
    registro_profissional: Optional[str] = Field(default=None, max_length=64)
    # Só a RT informa ao cadastrar; supervisor não se atribui estagiário.
    supervisor_matricula: Optional[str] = Field(default=None, max_length=32)


class EstagiarioRead(BaseModel):
    """Quem está disponível para atender, para a recepção montar a agenda.

    Só nome e matrícula. Email, id e hash de senha não são parte disso: a
    recepção precisa saber a quem atribuir a sessão, e o resto é gestão de
    usuário — que é o `GET /usuarios`, restrito a RT e supervisor pelo RN-001.
    """

    nome: str
    matricula: str


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
    # Só a RT pode trocar. Supervisor não se atribui estagiário nem se remove.
    supervisor_matricula: Optional[str] = Field(default=None, max_length=32)
