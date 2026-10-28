from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.dupla import DuplaOdonto
from app.models.usuario import PerfilUsuario, Usuario
from app.schemas.dupla import DuplaOdontoCreate, DuplaOdontoRead
from app.services.auditoria_service import ip_do_cliente, registrar_log
from app.services.auth_service import (
    exigir_perfil,
    get_current_user,
    validar_curso_solicitado,
)
from app.services.dupla_service import (
    dupla_ativa_do_estagiario,
    dupla_ativa_repetida,
    resolver_estagiario_odonto,
    serializar_dupla,
)

router = APIRouter(prefix="/duplas-odonto", tags=["Duplas Clínicas de Odontologia"])


@router.get("", response_model=List[DuplaOdontoRead])
@router.get("/", response_model=List[DuplaOdontoRead], include_in_schema=False)
def listar_duplas(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    """Duplas ativas visíveis ao usuário.

    O supervisor enxerga as duplas sob a responsabilidade dele; a RT de
    odontologia enxerga as duplas da própria clínica. A RT de psicologia recebe
    403, e estagiário e recepção não têm gestão de dupla (RN-001).
    """
    exigir_perfil(current_user, [PerfilUsuario.SUPERVISOR])
    validar_curso_solicitado(current_user, "odontologia")

    query = select(DuplaOdonto).where(DuplaOdonto.ativo.is_(True))
    if current_user.perfil == PerfilUsuario.SUPERVISOR:
        query = query.where(
            DuplaOdonto.supervisor_matricula == current_user.matricula
        )

    duplas = session.exec(query).all()
    return [serializar_dupla(session, dupla) for dupla in duplas]


@router.post("", response_model=DuplaOdontoRead, status_code=status.HTTP_201_CREATED)
def criar_dupla(
    dados: DuplaOdontoCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    """Monta uma dupla com dois estagiários vinculados ao supervisor.

    A dupla é ato do supervisor responsável. A RT consulta todas as duplas e
    pode encerrá-las, mas não monta uma em nome de outro supervisor.
    """
    exigir_perfil(current_user, [PerfilUsuario.SUPERVISOR])
    if current_user.perfil != PerfilUsuario.SUPERVISOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "A montagem da dupla é ato do supervisor responsável pelos "
                "estagiários (RF-005)."
            ),
        )

    operador = resolver_estagiario_odonto(
        session, dados.operador_matricula, "Operador"
    )
    auxiliar = resolver_estagiario_odonto(
        session, dados.auxiliar_matricula, "Auxiliar"
    )

    for estagiario in (operador, auxiliar):
        if estagiario.supervisor_matricula != current_user.matricula:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Acesso negado: só é possível montar dupla com estagiários "
                    "vinculados a você (RF-005)."
                ),
            )

    repetida = dupla_ativa_repetida(
        session, operador.matricula, auxiliar.matricula
    )
    if repetida:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Estes dois estagiários já formam uma dupla ativa.",
        )

    for estagiario in (operador, auxiliar):
        existente = dupla_ativa_do_estagiario(session, estagiario.matricula)
        if existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"{estagiario.nome} já pertence a uma dupla ativa. "
                    "Desfaça a dupla anterior antes de montar outra."
                ),
            )

    dupla = DuplaOdonto(
        operador_matricula=operador.matricula,
        auxiliar_matricula=auxiliar.matricula,
        supervisor_matricula=current_user.matricula,
        ativo=True,
        criado_por_matricula=current_user.matricula,
    )
    session.add(dupla)
    session.commit()
    session.refresh(dupla)

    registrar_log(
        session,
        current_user,
        "CRIACAO_DUPLA_ODONTO",
        "duplas_odonto",
        dupla.id,
        endereco_ip=ip_do_cliente(http_request),
    )

    return serializar_dupla(session, dupla)


@router.delete("/{dupla_id}", response_model=DuplaOdontoRead)
def desativar_dupla(
    dupla_id: int,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    """Encerra a dupla ativa; a linha é preservada para auditoria."""
    exigir_perfil(current_user, [PerfilUsuario.SUPERVISOR])
    validar_curso_solicitado(current_user, "odontologia")

    dupla = session.get(DuplaOdonto, dupla_id)
    if not dupla or not dupla.ativo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dupla ativa não localizada.",
        )

    if (
        current_user.perfil == PerfilUsuario.SUPERVISOR
        and dupla.supervisor_matricula != current_user.matricula
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: esta dupla não está sob sua supervisão (RF-005).",
        )

    dupla.ativo = False
    dupla.desativado_em = datetime.now(timezone.utc)
    session.add(dupla)
    session.commit()
    session.refresh(dupla)

    registrar_log(
        session,
        current_user,
        "DESATIVACAO_DUPLA_ODONTO",
        "duplas_odonto",
        dupla.id,
        endereco_ip=ip_do_cliente(http_request),
    )

    return serializar_dupla(session, dupla)
