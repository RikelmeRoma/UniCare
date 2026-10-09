from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, Token, UsuarioRead
from app.services.crypto_service import verify_password
from app.services.auth_service import create_access_token, get_current_user
from app.services.auditoria_service import registrar_log, ip_do_cliente

router = APIRouter(prefix="/auth", tags=["Autenticação & RBAC"])

# A recepcao virou uma conta por clinica (REC-001 odontologia, REC-002 psicologia).
# Nao existe mais login unico de triagem, entao o atalho antigo da recepcao
# institucional foi embora com ele.
ALIASES_RECEPCAO = {"REC-2026-01": "REC-001"}

@router.post("/login", response_model=Token)
def login(
    dados: LoginRequest,
    http_request: Request,
    session: Session = Depends(get_session)
):
    # O corpo era chamado `request`, que colide com o Request do FastAPI: o
    # injetado precisa de outro nome para o IP do log de acesso ser real.
    ident = dados.email_ou_matricula.strip()
    # Matricula citada no projeto antes da separacao por clinica.
    ident = ALIASES_RECEPCAO.get(ident, ident)
    query = session.exec(
        select(Usuario).where(
            (Usuario.email == ident) | (Usuario.matricula == ident)
        )
    ).first()
    user = query

    if not user or not verify_password(dados.senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matrícula/E-mail ou senha incorretos."
        )

    token = create_access_token(data={"sub": user.email, "perfil": user.perfil, "curso": user.curso})

    registrar_log(
        session, user, "LOGIN_EFETUADO", "usuarios", user.id,
        endereco_ip=ip_do_cliente(http_request)
    )

    return Token(
        access_token=token,
        token_type="bearer",
        perfil=user.perfil,
        curso=user.curso,
        nome=user.nome,
        matricula=user.matricula
    )

@router.get("/me", response_model=UsuarioRead)
def get_me(current_user: Usuario = Depends(get_current_user)):
    return current_user

