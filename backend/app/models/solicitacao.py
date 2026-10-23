from typing import Optional
from enum import Enum
from datetime import datetime, timezone

from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Text

from app.models.usuario import PerfilUsuario


class SituacaoSolicitacao(str, Enum):
    PENDENTE = "PENDENTE"
    APROVADA = "APROVADA"
    RECUSADA = "RECUSADA"


class SolicitacaoCadastro(SQLModel, table=True):
    """Pedido de credencial feito por quem ainda não tem conta.

    O fluxo é: a pessoa pede na tela pública, a RT da clínica **autoriza**, e a
    conta nasce no mesmo ato da aprovação. Por isso não existe estado
    "aprovada sem usuário" — `usuario_criado_id` aponta para a conta criada.

    `perfil_declarado` e `curso_declarado` são o que o solicitante **afirma**,
    não o que será gravado. Quem decide é a RT, e o curso do usuário sai do
    token dela — não do pedido. Guardar a declaração é útil para a RT decidir
    rápido, e errado se fosse tratado como decisão.
    """
    __tablename__ = "solicitacoes_cadastro"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(max_length=200)
    # Índice porque a RT filtra a fila por clínica e o anti-duplicidade da rota
    # pública procura pendência pelo e-mail.
    email: str = Field(max_length=254, index=True)
    matricula: str = Field(max_length=32)
    telefone: Optional[str] = Field(default=None, max_length=32)
    curso_declarado: str = Field(max_length=20, index=True)
    perfil_declarado: PerfilUsuario
    situacao: SituacaoSolicitacao = Field(
        default=SituacaoSolicitacao.PENDENTE, index=True
    )

    # Quem decidiu. Desnormalizado como nos logs: sobrevive à desativação do
    # cadastro, então a fila continua explicando quem recusou o quê.
    decidido_por_nome: Optional[str] = Field(default=None, max_length=200)
    decidido_por_matricula: Optional[str] = Field(default=None, max_length=32)
    decidido_em: Optional[datetime] = None
    # Texto livre: a recusa precisa dizer o motivo, e limitar linha traria
    # problema de truncamento silencioso.
    motivo_recusa: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))

    usuario_criado_id: Optional[int] = Field(default=None, foreign_key="usuarios.id")
    senha_enviada_por_email: Optional[bool] = Field(default=None)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))