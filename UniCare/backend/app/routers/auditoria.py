from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select, desc

from app.database import get_session
from app.models.auditoria import LogAuditoria
from app.models.usuario import Usuario, PerfilUsuario
from app.schemas.auditoria import LogAuditoriaRead
from app.services.auth_service import require_roles

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
    query = select(LogAuditoria).order_by(desc(LogAuditoria.timestamp)).limit(limite)
    return session.exec(query).all()
