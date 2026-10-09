from datetime import datetime, timedelta, timezone
from typing import Any, Optional, List
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.models.usuario import Usuario, PerfilUsuario, CursoUsuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou token expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    statement = select(Usuario).where(Usuario.email == email)
    usuario = session.exec(statement).first()
    if usuario is None or not usuario.ativo:
        raise credentials_exception
    return usuario

def require_roles(allowed_roles: List[PerfilUsuario]):
    def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        # A Referência Técnica (RT) possui salvaguarda institucional ampla (RN-003)
        if current_user.perfil == PerfilUsuario.RT:
            return current_user
        if current_user.perfil not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado: Perfil '{current_user.perfil.value}' não tem permissão para este recurso (RN-001)"
            )
        return current_user
    return role_checker


# Cursos clínicos. "geral" existe no ENUM por compatibilidade, mas NENHUM
# cadastro o usa: a recepção deixou de ser institucional e passou a ser uma
# conta por clínica (REC-001 odontologia, REC-002 psicologia).

CURSOS_CLINICOS = {"psicologia", "odontologia"}


def cursos_visiveis(usuario: Usuario) -> Optional[List[str]]:
    """Cursos que o usuário pode enxergar, para uso em filtro de listagem.

    Retorna None quando o cadastro não é de uma clínica — nesse caso o recurso
    não deve ser filtrado por curso. Não confundir com require_curso, que
    bloqueia com 403 em vez de filtrar.
    """
    curso = usuario.curso.value
    if curso in CURSOS_CLINICOS:
        # Paciente "ambos" pertence às duas clínicas: aparece para os dois.
        return [curso, "ambos"]
    return None


def validar_curso_do_registro(
    usuario: Usuario,
    curso_registro: str,
    permitir_compartilhado: bool = True
) -> None:
    """403 quando o registro pertence a outra clínica.

    Usado nas escritas e no PATCH de registros que já existem: o filtro de
    listagem impede ver o registro, mas não impede agir sobre o id dele.

    `permitir_compartilhado` cobre o paciente "ambos", que atende nas duas
    clínicas. Agendamento não aceita: ele tem cadeira e consultório fixos.
    """
    permitidos = cursos_visiveis(usuario)
    if not permitir_compartilhado and permitidos is not None:
        permitidos = [c for c in permitidos if c != "ambos"]
    if permitidos is None or curso_registro in permitidos:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            f"Acesso negado: registro pertence à clínica de {curso_registro}. "
            f"Seu cadastro é da clínica de {usuario.curso.value}."
        )
    )


def require_curso(curso_da_clinica: str, base: Optional[Any] = None):
    """Escopa o acesso ao curso da clínica. Não há bypass para o perfil RT.

    Diferente de require_roles, aqui o RT NÃO é salvo: a vertical slice exige que
    a Referência Técnica de odontologia não leia prontuários psicológicos, e vice-
    versa. A salvaguarda institucional (RN-003) continua valendo nos recursos que
    não são específicos de uma clínica — auditoria e relatórios gerenciais.

    "geral" também não escapa: não existe mais cadastro institucional. Se um
    dia existir, ele é barrado das clínicas em vez de ver as duas.

    `base` é o guard de papel, avaliado ANTES do curso. Isso não é detalhe de
    estilo: a recepção é barrada das clínicas pelo RN-001, e se o curso
    respondesse primeiro ela receberia 403 de "clínica restrita" em vez do
    RN-001 — o `detail` normativo que os testes de conformidade afirmam.
    """
    def curso_checker(
        current_user: Usuario = Depends(base if base is not None else get_current_user)
    ) -> Usuario:
        curso_usuario = current_user.curso.value

        if curso_usuario != curso_da_clinica:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Acesso negado: clínica de {curso_da_clinica} restrita a usuários "
                    f"desse curso. Seu perfil é '{curso_usuario}'."
                )
            )
        return current_user
    return curso_checker
