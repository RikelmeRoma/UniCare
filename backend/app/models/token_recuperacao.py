import hashlib
import secrets
from typing import Optional
from datetime import datetime, timezone, timedelta

from sqlmodel import SQLModel, Field
from sqlalchemy import Column

from app.models.usuario import Usuario

# O que a pessoa digita tem 6 caracteres. 10^6 combinações é pouco contra
# tentativa online, mas o token expira em minutos e é de uso único — e o
# resgate compara o hash, o que impede comparar o valor em claro.
TAMANHO_CODIGO = 6
# Alfabeto sem caracteres que se confundem na leitura em voz alta: sem 0/O
# e sem 1/l/I.
ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


def gerar_codigo() -> str:
    return "".join(secrets.choice(ALFABETO) for _ in range(TAMANHO_CODIGO))


def hash_token(codigo: str) -> str:
    """SHA-256 do código.

    Diferente da senha, aqui não há bcrypt: o código tem 6 caracteres de um
    alfabeto reduzido, não tem entropia de senha escolhida por gente, e o custo
    de bcrypt aqui só atrasaria o resgate. O que protege é a entropia, a
    expiração curta e o uso único — não a lentidão do hash.
    """
    return hashlib.sha256(codigo.encode("utf-8")).hexdigest()


class TokenRecuperacaoSenha(SQLModel, table=True):
    """Token de uso único para a pessoa escolher a própria senha.

    O código em claro **nunca** é gravado: só o SHA-256. Se a tabela vazar, ela
    não entrega nada que sirva para trocar senha.
    """
    __tablename__ = "tokens_recuperacao_senha"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id", index=True)
    token_hash: str = Field(max_length=64, index=True)
    expira_em: datetime = Field(index=True)
    usado_em: Optional[datetime] = None
    solicitante_nome: Optional[str] = Field(default=None, max_length=200)
    solicitante_matricula: Optional[str] = Field(default=None, max_length=32)
    criado_em: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def expirado(self) -> bool:
        # `expira_em` volta do banco sem fuso quando o SQLite é o dialeto de
        # teste; normalizar evita comparar naive com aware e estourar.
        expira = self.expira_em
        agora = datetime.now(timezone.utc)
        if expira.tzinfo is None:
            expira = expira.replace(tzinfo=timezone.utc)
            agora = datetime.now()
        return expira <= agora

    @property
    def utilizavel(self) -> bool:
        return self.usado_em is None and not self.expirado


def definir_validade(minutos: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=minutos)
