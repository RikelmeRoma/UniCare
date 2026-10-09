from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.database import get_session
from app.models.usuario import Usuario, PerfilUsuario, CursoUsuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioRead
from app.services.auth_service import require_roles, require_curso
from app.services.crypto_service import get_password_hash
from app.services.auditoria_service import registrar_log, ip_do_cliente

router = APIRouter(prefix="/usuarios", tags=["Gestão de Usuários (RF-009)"])

# RF-009: Gerenciamento RBAC com Ciclo de Vida Completo.
#
# A RT cadastra, edita e desativa usuários da PRÓPRIA clínica — a salvaguarda
# institucional do RN-003 não atravessa a segregação por curso.
#
# O SUPERVISOR administra apenas ESTAGIÁRIOS da clínica dele (o relatório:
# "supervisores de odontologia podem gerenciar acadêmicos vinculados à Clínica
# Integrada"). Ele não promove ninguém a supervisor nem a RT, nem toca em
# recepção. Estagiário e recepção não administram ninguém.

autorizado_gestao = require_roles([PerfilUsuario.RT, PerfilUsuario.SUPERVISOR])


def _pode_gerenciar(gestor: Usuario, perfil_alvo: PerfilUsuario) -> bool:
    if gestor.perfil == PerfilUsuario.RT:
        return True
    # Supervisor só cria/edita estagiário. Promover a supervisor ou a RT passa a
    # ser ato exclusivo da RT da clínica.
    return gestor.perfil == PerfilUsuario.SUPERVISOR and perfil_alvo == PerfilUsuario.ESTAGIARIO


def _negar_gestao(perfil_alvo: PerfilUsuario) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            f"Acesso negado: supervisor só administra estagiários. "
            f"Criar ou editar perfil '{perfil_alvo.value}' é ato exclusivo da RT."
        )
    )


@router.get("", response_model=List[UsuarioRead])
@router.get("/", response_model=List[UsuarioRead], include_in_schema=False)
def listar_usuarios(
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_gestao)
):
    """Lista os usuários visíveis ao gestor.

    A RT enxerga a clínica inteira; o supervisor vê os estagiários da clínica
    dele. Nenhum dos dois atravessa a segregação de curso.
    """
    query = select(Usuario).where(Usuario.curso == current_user.curso)

    if current_user.perfil == PerfilUsuario.SUPERVISOR:
        query = query.where(Usuario.perfil == PerfilUsuario.ESTAGIARIO)

    return session.exec(query).all()


@router.post("", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def cadastrar_usuario(
    dados: UsuarioCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_gestao)
):
    """Cadastra um usuário na clínica do gestor.

    O curso nunca vem do corpo: é o da RT ou do supervisor que está cadastrando.
    """
    if not _pode_gerenciar(current_user, dados.perfil):
        raise _negar_gestao(dados.perfil)

    usuario = Usuario(
        nome=dados.nome.strip(),
        email=dados.email.strip().lower(),
        # bcrypt direto, nunca SHA-256: ver crypto_service.
        senha_hash=get_password_hash(dados.senha),
        perfil=dados.perfil,
        # O curso vem da RT, não do corpo: nenhuma chamada pode criar usuário
        # em clínica alheia nem escrever `geral` por engano.
        curso=current_user.curso,
        matricula=dados.matricula.strip().upper(),
        registro_profissional=(dados.registro_profissional or None),
        ativo=True
    )

    session.add(usuario)
    try:
        session.commit()
    except IntegrityError:
        # email e matricula são únicos no banco. Sem este catch o cliente recebe
        # 500 por uma violação de unicidade previsível.
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe usuário com este e-mail ou esta matrícula (unicidade no banco)."
        )
    session.refresh(usuario)

    registrar_log(
        session, current_user, f"CADASTRO_USUARIO_{usuario.perfil.value}", "usuarios",
        usuario.id, endereco_ip=ip_do_cliente(http_request)
    )

    return usuario


@router.patch("/{usuario_id}", response_model=UsuarioRead)
def atualizar_usuario(
    usuario_id: int,
    dados: UsuarioUpdate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_gestao)
):
    """Edita um usuário da clínica. Não altera perfil, curso nem a si mesmo."""
    if usuario_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A RT não pode editar o próprio cadastro por esta rota."
        )

    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não localizado."
        )

    if usuario.curso != current_user.curso:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado: usuário pertence à clínica de {usuario.curso.value}. "
                   f"Seu cadastro é da clínica de {current_user.curso.value}."
        )

    # Supervisor não edita supervisor nem RT, mesmo na própria clínica.
    if not _pode_gerenciar(current_user, usuario.perfil):
        raise _negar_gestao(usuario.perfil)

    if dados.nome is not None:
        usuario.nome = dados.nome.strip()
    if dados.email is not None:
        usuario.email = dados.email.strip().lower()
    if dados.matricula is not None:
        usuario.matricula = dados.matricula.strip().upper()
    if dados.registro_profissional is not None:
        usuario.registro_profissional = dados.registro_profissional or None
    if dados.ativo is not None:
        usuario.ativo = dados.ativo

    # Trocar a senha é uma operação separada e explícita, para o hash nunca ser
    # sobrescrito por um PATCH de nome/e-mail.
    if dados.senha:
        usuario.senha_hash = get_password_hash(dados.senha)

    session.add(usuario)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe usuário com este e-mail ou esta matrícula (unicidade no banco)."
        )
    session.refresh(usuario)

    registrar_log(
        session, current_user, "EDICAO_USUARIO", "usuarios",
        usuario.id, endereco_ip=ip_do_cliente(http_request)
    )

    return usuario


@router.delete("/{usuario_id}", response_model=UsuarioRead)
def desativar_usuario(
    usuario_id: int,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_gestao)
):
    """Desativa o usuário. NÃO apaga a linha.

    `logs_auditoria.usuario_id` referencia o usuário sem foreign key, mas apagar
    a conta destruiria a autoria dos registros e o histórico de uma clínica
    inteira. Desativar corta o acesso (o login já checa `ativo`) preservando a
    trilha.
    """
    if usuario_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A RT não pode desativar o próprio cadastro."
        )

    usuario = session.get(Usuario, usuario_id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não localizado."
        )

    if usuario.curso != current_user.curso:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado: usuário pertence à clínica de {usuario.curso.value}. "
                   f"Seu cadastro é da clínica de {current_user.curso.value}."
        )

    if not _pode_gerenciar(current_user, usuario.perfil):
        raise _negar_gestao(usuario.perfil)

    usuario.ativo = False
    session.add(usuario)
    session.commit()
    session.refresh(usuario)

    registrar_log(
        session, current_user, "DESATIVACAO_USUARIO", "usuarios",
        usuario.id, endereco_ip=ip_do_cliente(http_request)
    )

    return usuario