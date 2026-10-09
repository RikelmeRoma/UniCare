from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, desc

from app.database import get_session
from app.models.auditoria import LogAuditoria
from app.models.usuario import Usuario, PerfilUsuario
from app.schemas.auditoria import LogAuditoriaRead
from app.services.auth_service import require_roles, cursos_visiveis

router = APIRouter(prefix="/auditoria", tags=["Auditoria & LGPD (Art. 11)"])

# Apenas Referência Técnica (RT) e Supervisores podem auditar acessos (RN-003)
autorizado_auditoria = require_roles([PerfilUsuario.RT, PerfilUsuario.SUPERVISOR])

@router.get("", response_model=List[LogAuditoriaRead])
@router.get("/", response_model=List[LogAuditoriaRead], include_in_schema=False)
def listar_logs(
    limite: int = Query(default=50, le=200),
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_auditoria)
):
    query = select(LogAuditoria)
    # Vertical slice também na auditoria: o log é uma trilha de dado pessoal
    # (LGPD Art. 11), então a RT de odontologia não lê o que a de psicologia fez.
    # O filtro entra ANTES do limite, senão uma clínica que não audita enche a
    # página com log alheio e esconde o próprio.
    visiveis = cursos_visiveis(current_user)
    if visiveis is not None:
        query = query.where(LogAuditoria.curso.in_(visiveis))
    query = query.order_by(desc(LogAuditoria.timestamp)).limit(limite)
    return session.exec(query).all()
