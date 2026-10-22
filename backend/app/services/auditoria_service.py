from typing import Optional
from fastapi import Request
from sqlmodel import Session

from app.models.auditoria import LogAuditoria
from app.models.usuario import Usuario


def ip_do_cliente(request: Request) -> Optional[str]:
    """IP de quem fez a requisição, para a trilha de auditoria.

    O default anterior era "127.0.0.1" em 100% dos logs: uma trilha que declara
    LGPD Art. 11 mas mostra sempre loopback não tem valor probatório.

    `X-Forwarded-For` NÃO é lido de propósito. O header é controlado por quem
    faz a requisição, então aceita-lo transformaria a coluna em campo livre. Só
    faz sentido atrás de um proxy confiável que sobrescreva o header — cenário
    que não existe aqui.
    """
    cliente = request.client
    return cliente.host if cliente else None


def registrar_log(
    session: Session,
    usuario: Usuario,
    acao: str,
    tabela_afetada: str,
    registro_id: Optional[int] = None,
    endereco_ip: Optional[str] = None
) -> LogAuditoria:
    # O padrao e None, nao um IP: quem esquece de passar o IP deixa o campo vazio
    # (visivel como falha de registro) em vez de gravar um endereco falso.
    log = LogAuditoria(
        usuario_id=usuario.id or 0,
        usuario_nome=usuario.nome,
        acao=acao,
        tabela_afetada=tabela_afetada,
        registro_id=registro_id,
        curso=usuario.curso.value,
        endereco_ip=endereco_ip
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return log