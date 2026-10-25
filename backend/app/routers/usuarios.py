from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from app.database import get_session
from app.models.usuario import Usuario, PerfilUsuario, CursoUsuario
from app.schemas.usuario import (
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioRead,
    EstagiarioRead,
    EstagiarioDisponivelRead,
    VincularSupervisorRequest,
)
from app.services.auth_service import (
    require_roles,
    require_curso,
    get_current_user,
    cursos_visiveis,
    exigir_perfil,
)
from app.services.crypto_service import get_password_hash
from app.services.auditoria_service import registrar_log, ip_do_cliente

router = APIRouter(prefix="/usuarios", tags=["Gestão de Usuários (RF-009)"])

# RF-009: Gerenciamento RBAC com Ciclo de Vida Completo.
#
# A RT cadastra, edita e desativa usuários da PRÓPRIA clínica — a salvaguarda
# institucional do RN-003 não atravessa a segregação por curso.
#
# A COORDENAÇÃO tem a mesma governança da RT dentro da própria clínica, mas não
# gerencia RT nem outra coordenação: esses dois perfis são ato exclusivo da RT.
#
# O SUPERVISOR administra apenas ESTAGIÁRIOS da clínica dele (o relatório:
# "supervisores de odontologia podem gerenciar acadêmicos vinculados à Clínica
# Integrada"). Ele não promove ninguém a supervisor nem a RT, nem toca em
# recepção. Estagiário e recepção não administram ninguém.

autorizado_gestao = require_roles([
    PerfilUsuario.RT,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.COORDENACAO,
])


def _pode_gerenciar(gestor: Usuario, perfil_alvo: PerfilUsuario) -> bool:
    if gestor.perfil == PerfilUsuario.RT:
        return True
    if gestor.perfil == PerfilUsuario.COORDENACAO:
        # A coordenação administra a operação da clínica, não a RT nem outra
        # coordenação. Criar ou editar esses dois perfis continua sendo ato da RT.
        return perfil_alvo in (
            PerfilUsuario.SUPERVISOR,
            PerfilUsuario.ESTAGIARIO,
            PerfilUsuario.RECEPCAO,
        )
    # Supervisor só cria/edita estagiário. Promover a supervisor, RT ou
    # coordenação passa a ser ato exclusivo da RT da clínica.
    return gestor.perfil == PerfilUsuario.SUPERVISOR and perfil_alvo == PerfilUsuario.ESTAGIARIO


def _supervisor_valido(session: Session, matricula: str, curso: str) -> Usuario:
    """Confere que a matrícula é de um supervisor ativo da mesma clínica.

    Sem isso a RT vincularia um estagiário a alguém que não existe, ou a um
    estagiário de outra clínica — o mesmo furo que a matrícula fixa do modal
    de agendamento tinha.
    """
    supervisor = session.exec(
        select(Usuario).where(Usuario.matricula == matricula.strip().upper())
    ).first()
    if not supervisor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum usuário com a matrícula {matricula}.",
        )
    if supervisor.perfil != PerfilUsuario.SUPERVISOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{matricula} é {supervisor.perfil.value}, não supervisor.",
        )
    if supervisor.curso != curso:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{matricula} é de {supervisor.curso.value} e não pode supervisionar "
                   f"estagiário de {curso.value if hasattr(curso, 'value') else curso}.",
        )
    if not supervisor.ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{matricula} está desativado e não pode receber estagiários.",
        )
    return supervisor


def _negar_gestao(gestor: Usuario, perfil_alvo: PerfilUsuario) -> HTTPException:
    if gestor.perfil == PerfilUsuario.COORDENACAO:
        detalhe = (
            "Acesso negado: a coordenação administra supervisores, estagiários e "
            "recepção. Criar, editar ou desativar RT ou coordenação é ato "
            "exclusivo da RT."
        )
    else:
        detalhe = (
            f"Acesso negado: supervisor só administra estagiários. "
            f"Criar ou editar perfil '{perfil_alvo.value}' é ato exclusivo da RT."
        )
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detalhe,
    )


@router.get("", response_model=List[UsuarioRead])
@router.get("/", response_model=List[UsuarioRead], include_in_schema=False)
def listar_usuarios(
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_gestao)
):
    """Lista os usuários visíveis ao gestor.

    A RT e a coordenação enxergam a clínica inteira; o supervisor vê os
    estagiários da clínica dele. Nenhum deles atravessa a segregação de curso.
    """
    query = select(Usuario).where(Usuario.curso == current_user.curso)

    if current_user.perfil == PerfilUsuario.SUPERVISOR:
        # Supervisor vê apenas os estagiários vinculados a ele. Antes via todos
        # da clínica, porque não existia vínculo formal — o RF-005 resolve isso.
        query = query.where(
            Usuario.perfil == PerfilUsuario.ESTAGIARIO,
            Usuario.supervisor_matricula == current_user.matricula,
        )
    elif current_user.perfil in (PerfilUsuario.RT, PerfilUsuario.COORDENACAO):
        # RT e coordenação veem a clínica inteira, inclusive os estagiários sem
        # supervisor ainda. A coordenação vê a RT, mas não a gerencia.
        pass
    else:
        # Recepção não administra ninguém — mas a rota exige autorizado_gestao,
        # então nunca chega aqui.
        query = query.where(Usuario.perfil == PerfilUsuario.ESTAGIARIO)

    return session.exec(query).all()


@router.get("/estagiarios", response_model=List[EstagiarioRead])
def listar_estagiarios(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Estagiários ativos da clínica de quem pergunta.

    Não é gestão de usuário: é dado de referência para a recepção montar a
    agenda. Por isso não usa `autorizado_gestao` — a recepção precisa escolher
    quem atende a sessão, e `GET /usuarios` devolve 403 para ela (RN-001).
    Fica no mesmo prefixo porque a origem do dado é a mesma.

    Devolve só nome e matrícula, nunca email nem hash.

    O filtro é pelo ENUM `cursousuario`, e aqui NÃO se pode usar
    `cursos_visiveis`: ele devolve `[curso, "ambos"]`, e "ambos" é convenção das
    colunas VARCHAR de paciente e agendamento — não é valor do ENUM. Contra
    `usuarios.curso` a query morre com InvalidTextRepresentation. A RT, cujo curso
    é `geral`, recebe as duas clínicas.
    """
    query = select(Usuario).where(
        Usuario.perfil == PerfilUsuario.ESTAGIARIO,
        Usuario.ativo.is_(True),
    )
    if current_user.curso == CursoUsuario.GERAL:
        query = query.where(
            Usuario.curso.in_([CursoUsuario.PSICOLOGIA, CursoUsuario.ODONTOLOGIA])
        )
    else:
        query = query.where(Usuario.curso == current_user.curso)

    estagiarios = session.exec(query).all()
    return [
        {"nome": u.nome, "matricula": u.matricula}
        for u in sorted(estagiarios, key=lambda u: u.nome)
    ]


@router.get("/estagiarios/disponiveis", response_model=List[EstagiarioDisponivelRead])
def listar_estagiarios_disponiveis(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Estagiários ativos da clínica que ainda NÃO têm supervisor.

    É a lista que o supervisor usa para assumir um aluno que já estava no
    sistema — o que a gestão cadastrou, por exemplo. Sem esta rota o supervisor
    só enxergava quem ele mesmo criou, e um aluno criado pela gestão ficava
    invisível para todo mundo.

    O filtro `supervisor_matricula IS NULL` é NO SERVIDOR. Devolver todos e
    filtrar no navegador entregaria ao supervisor o nome de todos os
    colegas da clínica — inclusive os que já são de outro supervisor, que é
    justamente a segregação que o RF-005 cria.

    Supervisor, RT e coordenação. A recepção não precisa: para a agenda ela usa
    `GET /usuarios/estagiarios`, que traz todos os estagiários da clínica.
    """
    exigir_perfil(current_user, [
        PerfilUsuario.SUPERVISOR,
        PerfilUsuario.RT,
        PerfilUsuario.COORDENACAO,
    ])

    query = select(Usuario).where(
        Usuario.perfil == PerfilUsuario.ESTAGIARIO,
        Usuario.ativo.is_(True),
        Usuario.supervisor_matricula.is_(None),
    )
    if current_user.curso == CursoUsuario.GERAL:
        query = query.where(Usuario.curso.in_([CursoUsuario.PSICOLOGIA, CursoUsuario.ODONTOLOGIA]))
    else:
        query = query.where(Usuario.curso == current_user.curso)

    estagiarios = session.exec(query).all()
    return [
        {"id": u.id, "nome": u.nome, "matricula": u.matricula}
        for u in sorted(estagiarios, key=lambda u: u.nome)
    ]


def criar_usuario_para_gestor(
    session: Session,
    gestor: Usuario,
    http_request: Request,
    nome: str,
    email: str,
    matricula: str,
    perfil: PerfilUsuario,
    senha: str,
    registro_profissional: Optional[str] = None,
    supervisor_matricula: Optional[str] = None,
) -> Usuario:
    """Cria um usuário na clínica de quem está autorizando.

    Função compartilhada de propósito: o POST /usuarios e a aprovação de uma
    solicitação de cadastro precisam obedecer exatamente a mesma regra — curso
    vindo do gestor, bcrypt, unicidade e auditoria. Duas cópias desse bloco
    divergem na primeira mudança, e a que divergisse seria a do pedido.

    Levanta 403 quando o gestor não pode criar aquele perfil e 400 quando o
    e-mail ou a matrícula já existem.
    """
    if not _pode_gerenciar(gestor, perfil):
        raise _negar_gestao(gestor, perfil)

    # Coordenação é um perfil da psicologia; a clínica de odontologia não tem
    # essa função. A checagem fica depois da alçada para o supervisor receber
    # 403 (não administra esse perfil) em vez de 400 (perfil da outra clínica).
    if perfil == PerfilUsuario.COORDENACAO and gestor.curso != CursoUsuario.PSICOLOGIA:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Coordenação é exclusiva da clínica de psicologia.",
        )

    usuario = Usuario(
        nome=nome.strip(),
        email=email.strip().lower(),
        # bcrypt direto, nunca SHA-256: ver crypto_service.
        senha_hash=get_password_hash(senha),
        perfil=perfil,
        # O curso vem do gestor, não do corpo: nenhuma chamada pode criar usuário
        # em clínica alheia nem escrever `geral` por engano.
        curso=gestor.curso,
        matricula=matricula.strip().upper(),
        registro_profissional=(registro_profissional or None),
        supervisor_matricula=(
            gestor.matricula
            if gestor.perfil == PerfilUsuario.SUPERVISOR and perfil == PerfilUsuario.ESTAGIARIO
            else None
        ),
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
        session, gestor, f"CADASTRO_USUARIO_{usuario.perfil.value}", "usuarios",
        usuario.id, endereco_ip=ip_do_cliente(http_request)
    )

    return usuario


@router.post("", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def cadastrar_usuario(
    dados: UsuarioCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_gestao)
):
    """Cadastra um usuário na clínica do gestor.

    O curso nunca vem do corpo: é o da RT, da coordenação ou do supervisor que
    está cadastrando.
    """
    return criar_usuario_para_gestor(
        session=session,
        gestor=current_user,
        http_request=http_request,
        nome=dados.nome,
        email=dados.email,
        matricula=dados.matricula,
        perfil=dados.perfil,
        senha=dados.senha,
        registro_profissional=dados.registro_profissional,
        supervisor_matricula=dados.supervisor_matricula,
    )



@router.post("/{usuario_id}/vincular-supervisor", response_model=UsuarioRead)
def vincular_supervisor(
    usuario_id: int,
    dados: VincularSupervisorRequest,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Vincula um estagiário a um supervisor (RF-005).

    Ato próprio, e não um PATCH: vincular é decisão, não edição de campo, e
    merece ação própria na trilha de auditoria — o mesmo motivo do vínculo
    paciente↔estagiário ter rota própria.

    Quem pode:
    - o supervisor vincula **a si mesmo**. A matrícula vem do token; mandar a
      de outro no corpo seria o supervisor montar lista dos colegas;
    - a RT e a coordenação vinculam a um supervisor escolhido, e aí o corpo é
      consultado.

    Regras que não cedem:
    - só estagiário, e da mesma clínica de quem está chamando;
    - **apenas se ainda não tiver supervisor**. Estagiário com dono não é
      puxado por outro supervisor: a troca de dono é ato da RT ou da
      coordenação, senão a segregação que o RF-005 cria vira decorativa.
    """
    if current_user.perfil in (PerfilUsuario.RT, PerfilUsuario.COORDENACAO):
        matricula_alvo = dados.supervisor_matricula
        if not matricula_alvo:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Informe a matrícula do supervisor que vai assumir o estagiário.",
            )
        supervisor = _supervisor_valido(
            session, matricula_alvo, current_user.curso
        )
    elif current_user.perfil == PerfilUsuario.SUPERVISOR:
        supervisor = current_user
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Acesso negado: Perfil '{current_user.perfil.value}' não tem "
                "permissão para este recurso (RN-001)"
            ),
        )

    estagiario = session.get(Usuario, usuario_id)
    if not estagiario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não localizado.",
        )
    if estagiario.perfil != PerfilUsuario.ESTAGIARIO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só estagiário recebe supervisor.",
        )
    if estagiario.curso != current_user.curso and current_user.curso != CursoUsuario.GERAL:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Acesso negado: usuário pertence à clínica de {estagiario.curso.value}. "
                f"Seu cadastro é da clínica de {current_user.curso.value}."
            ),
        )
    if estagiario.supervisor_matricula:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Este estagiário já está sob responsabilidade de "
                f"{estagiario.supervisor_matricula}. Trocar o responsável é ato "
                "da Referência Técnica ou da Coordenação."
            ),
        )

    estagiario.supervisor_matricula = supervisor.matricula
    session.add(estagiario)
    session.commit()
    session.refresh(estagiario)

    registrar_log(
        session, current_user, "VINCULO_SUPERVISOR", "usuarios",
        estagiario.id, endereco_ip=ip_do_cliente(http_request)
    )

    return estagiario


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
            detail="A gestão não pode editar o próprio cadastro por esta rota."
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

    # Supervisor não edita supervisor nem RT; coordenação não edita RT nem
    # outra coordenação, mesmo na própria clínica.
    if not _pode_gerenciar(current_user, usuario.perfil):
        raise _negar_gestao(current_user, usuario.perfil)

    # Supervisor só edita estagiário vinculado a ele. RT e coordenação podem
    # editar todos os perfis que gerenciam.
    if (
        current_user.perfil == PerfilUsuario.SUPERVISOR
        and usuario.supervisor_matricula != current_user.matricula
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: este estagiário não está vinculado a você (RF-005).",
        )

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
    # Atribuir supervisor é ato da RT ou da coordenação. Supervisor não se
    # auto-atribui estagiário.
    if dados.supervisor_matricula is not None:
        if current_user.perfil not in (PerfilUsuario.RT, PerfilUsuario.COORDENACAO):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Atribuir estagiário a supervisor é ato da Referência Técnica "
                    "ou da Coordenação (RF-009)."
                ),
            )
        if dados.supervisor_matricula == '':
            usuario.supervisor_matricula = None
        else:
            supervisor = _supervisor_valido(
                session, dados.supervisor_matricula, usuario.curso
            )
            usuario.supervisor_matricula = supervisor.matricula

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
            detail="A gestão não pode desativar o próprio cadastro."
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
        raise _negar_gestao(current_user, usuario.perfil)

    # Supervisor só desativa estagiário vinculado a ele.
    if (
        current_user.perfil == PerfilUsuario.SUPERVISOR
        and usuario.supervisor_matricula != current_user.matricula
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: este estagiário não está vinculado a você (RF-005).",
        )

    usuario.ativo = False
    session.add(usuario)
    session.commit()
    session.refresh(usuario)

    registrar_log(
        session, current_user, "DESATIVACAO_USUARIO", "usuarios",
        usuario.id, endereco_ip=ip_do_cliente(http_request)
    )

    return usuario