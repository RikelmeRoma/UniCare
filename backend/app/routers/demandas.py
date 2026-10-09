from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.usuario import Usuario
from app.models.demanda import DemandaEstagio, StatusDemanda
from app.schemas.demanda import DemandaCreate, DemandaUpdateStatus, DemandaRead
from app.services.auth_service import get_current_user, cursos_visiveis, validar_curso_do_registro
from app.services.auditoria_service import registrar_log, ip_do_cliente

router = APIRouter(prefix="/demandas", tags=["Demandas de Estágio (RF-009)"])

# Demanda e uma fila de trabalho pedagogico: estagiarios solicitam pacientes e a
# recepcao concilia com a agenda. Nao envolve dado clinico, entao nao ha bloqueio
# RN-001 aqui — recepcao precisa VER a fila para poder atende-la. Mas a fila e da
# clinica do aluno: a recepcao ve a fila da propria clinica, nao as duas.

@router.get("", response_model=List[DemandaRead])
@router.get("/", response_model=List[DemandaRead], include_in_schema=False)
def listar_demandas(
    curso: Optional[str] = None,
    status_filtro: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    visiveis = cursos_visiveis(current_user)
    query = select(DemandaEstagio)
    if visiveis is not None:
        query = query.where(DemandaEstagio.curso.in_(visiveis))
        if curso and curso in visiveis:
            query = query.where(DemandaEstagio.curso == curso)
    if status_filtro:
        query = query.where(DemandaEstagio.status == status_filtro)

    # Mais recentes primeiro: a fila e consumida de cima para baixo.
    query = query.order_by(DemandaEstagio.id.desc())
    return session.exec(query).all()

@router.post("", response_model=DemandaRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DemandaRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def criar_demanda(
    dados: DemandaCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    validar_curso_do_registro(current_user, dados.curso)
    demanda = DemandaEstagio(
        aluno_nome=dados.aluno_nome,
        aluno_matricula=dados.aluno_matricula,
        curso=dados.curso,
        procedimento_desejado=dados.procedimento_desejado,
        prioridade=dados.prioridade,
        data_solicitacao=dados.data_solicitacao,
        status=StatusDemanda.PENDENTE
    )
    session.add(demanda)
    session.commit()
    session.refresh(demanda)

    registrar_log(
        session, current_user, "CRIAR_DEMANDA", "demandas_estagio", demanda.id,
        endereco_ip=ip_do_cliente(http_request)
    )

    return demanda

@router.patch("/{demanda_id}/status", response_model=DemandaRead)
def atualizar_status_demanda(
    demanda_id: int,
    body: DemandaUpdateStatus,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    demanda = session.get(DemandaEstagio, demanda_id)
    if not demanda:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demanda de estágio não localizada."
        )

    # A recepção concilia a fila da própria clínica; não a da outra.
    validar_curso_do_registro(current_user, demanda.curso)

    demanda.status = body.status
    session.add(demanda)
    session.commit()
    session.refresh(demanda)

    registrar_log(
        session, current_user, f"STATUS_DEMANDA_{body.status.value}", "demandas_estagio",
        demanda.id, endereco_ip=ip_do_cliente(http_request)
    )

    return demanda