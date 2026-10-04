from typing import Optional
from sqlmodel import Session
from app.models.auditoria import LogAuditoria
from app.models.usuario import Usuario

def registrar_log(
    session: Session,
    usuario: Usuario,
    acao: str,
    tabela_afetada: str,
    registro_id: Optional[int] = None,
    endereco_ip: Optional[str] = "127.0.0.1"
) -> LogAuditoria:
    log = LogAuditoria(
        usuario_id=usuario.id or 0,
        usuario_nome=usuario.nome,
        acao=acao,
        tabela_afetada=tabela_afetada,
        registro_id=registro_id,
        endereco_ip=endereco_ip
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return log
