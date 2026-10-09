from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.agendamento import Agendamento, StatusAgendamento
from app.models.usuario import Usuario
from app.schemas.agendamento import AgendamentoCreate, AgendamentoRead, AgendamentoUpdateStatus
from app.services.auth_service import get_current_user, cursos_visiveis, validar_curso_do_registro
from app.services.auditoria_service import registrar_log, ip_do_cliente

router = APIRouter(prefix="/agendamentos", tags=["Agendamentos & Recepção"])

@router.get("", response_model=List[AgendamentoRead])
@router.get("/", response_model=List[AgendamentoRead], include_in_schema=False)
def listar_agendamentos(
    curso: Optional[str] = None,
    status_filtro: Optional[StatusAgendamento] = None,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    # Vertical slice: a agenda é da clínica do usuário, não da query string.
    visiveis = cursos_visiveis(current_user)
    query = select(Agendamento)
    if visiveis is not None:
        query = query.where(Agendamento.curso.in_(visiveis))
        if curso and curso in visiveis:
            query = query.where(Agendamento.curso == curso)
    if status_filtro:
        query = query.where(Agendamento.status == status_filtro)
    return session.exec(query).all()

@router.post("", response_model=AgendamentoRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=AgendamentoRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def criar_agendamento(
    dados: AgendamentoCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    # Agendamento não é compartilhado entre clínicas: tem cadeira e consultório
    # fixos, então o curso tem que ser o da clínica do usuário, sem "ambos".
    validar_curso_do_registro(current_user, dados.curso, permitir_compartilhado=False)
    agendamento = Agendamento(
        paciente_id=dados.paciente_id,
        paciente_nome=dados.paciente_nome,
        estagiario_nome=dados.estagiario_nome,
        estagiario_matricula=dados.estagiario_matricula,
        curso=dados.curso,
        horario=dados.horario,
        turno=dados.turno,
        sala_ou_cadeira=dados.sala_ou_cadeira,
        tipo_consulta=dados.tipo_consulta,
        status=StatusAgendamento.AGENDADO,
        observacao_logistica=dados.observacao_logistica
    )
    session.add(agendamento)
    session.commit()
    session.refresh(agendamento)

    registrar_log(
        session, current_user, "CRIAR_AGENDAMENTO", "agendamentos", agendamento.id,
        endereco_ip=ip_do_cliente(http_request)
    )

    return agendamento

@router.patch("/{agendamento_id}/status", response_model=AgendamentoRead)
def atualizar_status(
    agendamento_id: int,
    body: AgendamentoUpdateStatus,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    agendamento = session.get(Agendamento, agendamento_id)
    if not agendamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agendamento não localizado."
        )

    # Filtrar a listagem não impede agir sobre o id de outro curso. A recepção
    # de psicologia não confirma presença de uma consulta odontológica.
    validar_curso_do_registro(current_user, agendamento.curso)

    agendamento.status = body.status
    session.add(agendamento)
    session.commit()
    session.refresh(agendamento)

    registrar_log(
        session, current_user, f"STATUS_ALTERADO_PARA_{body.status.value}", "agendamentos",
        agendamento.id, endereco_ip=ip_do_cliente(http_request)
    )

    return agendamento
