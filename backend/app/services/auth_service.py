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

def exigir_perfil(usuario: Usuario, allowed_roles: List[PerfilUsuario]) -> None:
    """Recusa quem não está na lista, com o detalhe do RN-001.

    Vive fora do `require_roles` porque este precisa ser chamado de dentro da
    função: o agendamento só sabe a clínica depois de ler o corpo, e uma
    dependência do FastAPI age antes disso.
    """
    # A Referência Técnica (RT) possui salvaguarda institucional ampla (RN-003)
    if usuario.perfil == PerfilUsuario.RT:
        return
    if usuario.perfil not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado: Perfil '{usuario.perfil.value}' não tem permissão para este recurso (RN-001)"
        )


def require_roles(allowed_roles: List[PerfilUsuario]):
    def role_checker(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        exigir_perfil(current_user, allowed_roles)
        return current_user
    return role_checker


# Perfis que podem acessar dado clínico. A recepção fica de fora pelo RN-001.
# Vive aqui e não duplicado em cada router: `prontuarios.py` e `pacientes.py`
# (rotas de anamnese) precisam da mesma lista, e duas listas divergem em silêncio.
autorizado_clinico = require_roles([
    PerfilUsuario.ESTAGIARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.RT
])


# Cursos clínicos. "geral" existe no ENUM por compatibilidade, mas NENHUM
# cadastro o usa: a recepção deixou de ser institucional e passou a ser uma
# conta por clínica (REC-001 odontologia, REC-002 psicologia).

CURSOS_CLINICOS = {"psicologia", "odontologia"}


def cursos_visiveis(usuario: Usuario) -> Optional[List[str]]:
    """Cursos que o usuário pode enxergar, para uso em filtro de listagem.

    Retorna None quando o cadastro não é de uma clínica — nesse caso o recurso
    não deve ser filtrado por curso. Não confundir com require_curso, que
    bloqueia com 403 em vez de filtrar.

    A RT não é exceção: cada RT responde pela própria clínica. O curso "geral"
    continua sem visão de clínica nenhuma, como qualquer cadastro sem curso.
    """
    curso = usuario.curso.value
    if curso in CURSOS_CLINICOS:
        # Paciente "ambos" pertence às duas clínicas: aparece para os dois.
        return [curso, "ambos"]
    return None


def validar_curso_solicitado(usuario: Usuario, curso: Optional[str]) -> None:
    """Recusa filtro de outra clínica quando quem pede é a RT.

    A recepção e o supervisor continuam com o comportamento anterior: o
    parâmetro do cliente não amplia o escopo, então pedir a clínica alheia
    devolve a própria lista. A RT, que antes era global, agora recebe 403 em
    vez de um filtro silenciosamente ignorado.
    """
    if curso is None or usuario.perfil != PerfilUsuario.RT:
        return
    if curso not in CURSOS_CLINICOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe psicologia ou odontologia para filtrar a clínica.",
        )
    if curso != usuario.curso.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Acesso negado: a RT de {usuario.curso.value} não pode consultar "
                f"a clínica de {curso}."
            ),
        )


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
    """Escopa o acesso ao curso da clínica, inclusive para a RT.

    A RT responde pela própria clínica: a de odontologia não lê prontuário,
    agenda ou auditoria da psicologia, e vice-versa. O supervisor e a recepção
    continuam presos ao curso do cadastro.

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
