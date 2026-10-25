from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.solicitacao import SituacaoSolicitacao
from app.models.usuario import PerfilUsuario

# Só o domínio institucional entra. A rota é pública e sem autenticação: sem
# esse filtro, qualquer pessoa da internet criaria linhas na fila da gestão.
DOMINIOS_INSTITUCIONAIS = (
    "@uninassau.edu.br",
    "@prof.uninassau.edu.br",
    "@sempreuninassau.com.br",
)


def _e_institucional(email: str) -> bool:
    normalizado = email.strip().lower()
    return normalizado.endswith(DOMINIOS_INSTITUCIONAIS)


class SolicitacaoCreate(BaseModel):
    """Pedido de credencial. Rota pública, sem token.

    Não há campo de senha: a senha é definida pela gestão no ato de aprovar.
    Guardar credencial de quem nem tem conta, em tabela alcançável por
    qualquer chamada anônima, não é uma superfície que vale a pena abrir.
    """
    nome: str = Field(min_length=3, max_length=200)
    email: EmailStr
    matricula: str = Field(min_length=2, max_length=32)
    telefone: Optional[str] = Field(default=None, max_length=32)
    # O que o solicitante AFIRMA. Quem decide é a gestão, e o curso do usuário
    # sai do token de quem aprova — nunca do corpo do pedido.
    curso_declarado: str = Field(max_length=20)
    perfil_declarado: PerfilUsuario

    @field_validator("email")
    @classmethod
    def exigir_email_institucional(cls, v: str) -> str:
        if not _e_institucional(v):
            raise ValueError(
                "O pedido de credencial exige e-mail institucional "
                "(@uninassau.edu.br, @prof.uninassau.edu.br ou @sempreuninassau.com.br)."
            )
        return v.strip().lower()

    @field_validator("curso_declarado")
    @classmethod
    def curso_clinico(cls, v: str) -> str:
        normalizado = v.strip().lower()
        if normalizado not in ("psicologia", "odontologia"):
            raise ValueError("O pedido precisa indicar a clínica: psicologia ou odontologia.")
        return normalizado


class SolicitacaoRead(BaseModel):
    id: int
    nome: str
    email: str
    matricula: str
    telefone: Optional[str] = None
    curso_declarado: str
    perfil_declarado: PerfilUsuario
    situacao: SituacaoSolicitacao
    decidido_por_nome: Optional[str] = None
    decidido_por_matricula: Optional[str] = None
    decidido_em: Optional[datetime] = None
    motivo_recusa: Optional[str] = None
    usuario_criado_id: Optional[int] = None
    senha_enviada_por_email: Optional[bool] = None
    criado_em: datetime


class AprovacaoSolicitacao(BaseModel):
    """Decisão da gestão que aprova. A aprovação cria a conta no mesmo ato.

    O perfil enviado é o FINAL, não o declarado: a gestão pode corrigir o que o
    solicitante pediu.

    `senha` é opcional no schema porque a obrigatoriedade depende de quem aprova:
    na psicologia, RT e coordenação **não escolhem** a senha — o servidor gera e
    envia por e-mail. Na odontologia, a RT continua definindo a senha. Quem
    aplica essa diferença é a rota, que conhece o token; o schema sozinho não
    tem como saber.
    """
    perfil: PerfilUsuario
    registro_profissional: Optional[str] = Field(default=None, max_length=64)
    # Mesmo limite do `UsuarioCreate`: 6 do schema e 72 do bcrypt.
    senha: Optional[str] = Field(default=None, min_length=6, max_length=72)


class RecusaSolicitacao(BaseModel):
    """Recusa exige motivo: a pessoa precisa saber por que não entrou."""
    motivo: str = Field(min_length=3, max_length=1000)