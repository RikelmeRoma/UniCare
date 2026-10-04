from datetime import datetime, timedelta, timezone
from typing import Optional, List
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.models.usuario import Usuario, PerfilUsuario

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
                detail=f"Acesso negado: Perfil '{current_user.perfil}' não tem permissão para este recurso (RN-001)"
            )
        return current_user
    return role_checker
