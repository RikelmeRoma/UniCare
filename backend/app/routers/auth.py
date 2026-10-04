from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.usuario import Usuario, PerfilUsuario, CursoUsuario
from app.schemas.auth import LoginRequest, Token, UsuarioRead
from app.services.crypto_service import get_password_hash, verify_password
from app.services.auth_service import create_access_token, get_current_user
from app.services.auditoria_service import registrar_log

router = APIRouter(prefix="/auth", tags=["Autenticação & RBAC"])

@router.post("/login", response_model=Token)
def login(request: LoginRequest, session: Session = Depends(get_session)):
    ident = request.email_ou_matricula.strip()
    # Compatibilidade com DOC-EST-02 (REC-2026-01 e REC-001)
    if ident in ("REC-2026-01", "REC-001"):
        query = select(Usuario).where((Usuario.matricula == "REC-001") | (Usuario.matricula == "REC-2026-01") | (Usuario.email == "recepcao@uninassau.edu.br"))
    else:
        query = select(Usuario).where(
            (Usuario.email == ident) | (Usuario.matricula == ident)
        )
    user = session.exec(query).first()

    if not user or not verify_password(request.senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matrícula/E-mail ou senha incorretos."
        )

    token = create_access_token(data={"sub": user.email, "perfil": user.perfil, "curso": user.curso})

    registrar_log(session, user, "LOGIN_EFETUADO", "usuarios", user.id)

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

@router.post("/seed")
def seed_initial_users(session: Session = Depends(get_session)):
    """Cria os usuários padrão baseados na documentação da UNINASSAU (DOC-EST-02 e DOC-EST-03)"""
    usuarios_seed = [
        Usuario(
            nome="Rikelme Roma Santos",
            email="rikelmeroma13@gmail.com",
            senha_hash=get_password_hash("unicare123"),
            perfil=PerfilUsuario.ESTAGIARIO,
            curso=CursoUsuario.PSICOLOGIA,
            matricula="16032935"
        ),
        Usuario(
            nome="Augusto Cesar Farias Carvalho",
            email="augustocsar97@gmail.com",
            senha_hash=get_password_hash("unicare123"),
            perfil=PerfilUsuario.ESTAGIARIO,
            curso=CursoUsuario.ODONTOLOGIA,
            matricula="16024402"
        ),
        Usuario(
            nome="Prof. Dr. Robert Santos do Carmo",
            email="robert.carmo@uninassau.edu.br",
            senha_hash=get_password_hash("unicare123"),
            perfil=PerfilUsuario.SUPERVISOR,
            curso=CursoUsuario.PSICOLOGIA,
            matricula="DOC-8821",
            registro_profissional="CRP 19/0844"
        ),
        Usuario(
            nome="Profa. Dra. Bianca Nubia",
            email="bianca.silva@uninassau.edu.br",
            senha_hash=get_password_hash("unicare123"),
            perfil=PerfilUsuario.SUPERVISOR,
            curso=CursoUsuario.ODONTOLOGIA,
            matricula="DOC-9122",
            registro_profissional="CRO-SE 4512"
        ),
        Usuario(
            nome="Recepção Integrada Clínica",
            email="recepcao@uninassau.edu.br",
            senha_hash=get_password_hash("unicare123"),
            perfil=PerfilUsuario.RECEPCAO,
            curso=CursoUsuario.GERAL,
            matricula="REC-001"
        ),
        Usuario(
            nome="Dra. Camila (Referência Técnica RT)",
            email="camila.rt@uninassau.edu.br",
            senha_hash=get_password_hash("unicare123"),
            perfil=PerfilUsuario.RT,
            curso=CursoUsuario.GERAL,
            matricula="RT-001",
            registro_profissional="RT-GERAL"
        )
    ]

    criados = 0
    for u in usuarios_seed:
        existe = session.exec(select(Usuario).where(Usuario.email == u.email)).first()
        if not existe:
            session.add(u)
            criados += 1
    session.commit()

    return {"message": f"{criados} usuários iniciais criados com sucesso!", "total": len(usuarios_seed)}
