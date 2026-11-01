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


def como_utc(valor: datetime) -> datetime:
    """Interpreta um datetime vindo do banco como UTC.

    O Postgres devolve `timestamptz` com fuso; o SQLite, que é o dialeto dos
    testes, devolve naive — mas o valor gravado sempre foi UTC. Tratar naive
    como UTC mantém a mesma regra nos dois dialetos.

    Comparar com `datetime.now()` (hora local) era o erro: em Brasília o prazo
    de 15 minutos virava 3 h 15, e o teste de expiração só passava porque
    envelhecia o token manualmente.
    """
    if valor.tzinfo is None:
        return valor.replace(tzinfo=timezone.utc)
    return valor.astimezone(timezone.utc)


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
        return como_utc(self.expira_em) <= datetime.now(timezone.utc)

    @property
    def utilizavel(self) -> bool:
        return self.usado_em is None and not self.expirado

    def liberado_para_reenvio(self, intervalo_segundos: int) -> bool:
        """Já passou tempo suficiente desde a emissão deste token?

        O pedido de recuperação é público e sem autenticação: sem um intervalo
        mínimo, qualquer um dispara e-mails ilimitados pela conta institucional
        e queima a credencial do SMTP. O intervalo é curto porque reenviar
        precisa funcionar quando o e-mail se perde.
        """
        return (
            datetime.now(timezone.utc) - como_utc(self.criado_em)
        ).total_seconds() >= intervalo_segundos


def definir_validade(minutos: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=minutos)
