from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.agendamento import Agendamento, StatusAgendamento
from app.models.usuario import Usuario, PerfilUsuario
from app.schemas.agendamento import AgendamentoCreate, AgendamentoRead, AgendamentoUpdateStatus
from app.services.auth_service import get_current_user, cursos_visiveis, validar_curso_do_registro, exigir_perfil
from app.services.auditoria_service import registrar_log, ip_do_cliente
from app.services.vinculo_service import (
    exigir_estagiario_da_clinica,
    paciente_da_clinica,
    vincular_ou_transferir,
)

router = APIRouter(prefix="/agendamentos", tags=["Agendamentos & Recepção"])

CLINICA_PSICO = "psicologia"

# Agendar sessão psicológica é ato da recepção (RN-001), igual a atribuir o
# paciente. Conferido aqui porque o `require_roles` é dependência do FastAPI e
# age antes de o corpo dizer a que clínica a sessão pertence.
AUTORIZADO_AGENDAR_PSICO = [PerfilUsuario.RECEPCAO, PerfilUsuario.RT]

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
    # Mesma segregação do prontuário psicológico: o estagiário enxerga a própria
    # agenda, não a dos colegas. Filtrar por curso não faz isso — ele continua
    # dentro da clínica, mas a agenda é da clínica inteira.
    if current_user.perfil == PerfilUsuario.ESTAGIARIO:
        query = query.where(Agendamento.estagiario_matricula == current_user.matricula)
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

    # Odontologia não tem vínculo paciente-estagiário: segue o caminho antigo,
    # com o nome e a matrícula exatamente como vieram no corpo.
    nome_paciente = dados.paciente_nome
    estagiario_nome = dados.estagiario_nome
    estagiario_matricula = dados.estagiario_matricula
    vinculo_id: Optional[int] = None
    vinculo_acao: Optional[str] = None

    if dados.curso == CLINICA_PSICO:
        # Agendar é atribuir: quem marca a sessão é a recepção, e o vínculo
        # nasce na MESMA transação. Se a sessão fosse recusada depois, o paciente
        # não ficaria vinculado a um estagiário que nunca o atendeu — e fazer o
        # vínculo num passo à parte deixaria agenda e prontuário divergentes.
        exigir_perfil(current_user, AUTORIZADO_AGENDAR_PSICO)

        # Confere antes de gravar: `paciente_id` inexistente virava 500 por
        # IntegrityError, e `paciente_nome` era aceito como viesse no corpo.
        paciente = paciente_da_clinica(session, dados.paciente_id, CLINICA_PSICO)
        nome_paciente = paciente.nome

        estagiario = exigir_estagiario_da_clinica(
            session, dados.estagiario_matricula, dados.estagiario_nome, CLINICA_PSICO
        )
        # Nome e matrícula saem do cadastro, não do que a recepção digitou: duas
        # fontes de verdade para o mesmo campo é como nasce dado divergente.
        estagiario_nome = estagiario.nome
        estagiario_matricula = estagiario.matricula

        vinculo, vinculo_acao = vincular_ou_transferir(
            session, current_user, dados.paciente_id, estagiario, CLINICA_PSICO
        )
        vinculo_id = vinculo.id

    agendamento = Agendamento(
        paciente_id=dados.paciente_id,
        paciente_nome=nome_paciente,
        estagiario_nome=estagiario_nome,
        estagiario_matricula=estagiario_matricula,
        curso=dados.curso,
        data_sessao=dados.data_sessao,
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

    if vinculo_acao:
        registrar_log(
            session, current_user, vinculo_acao, "atribuicoes_clinicas", vinculo_id,
            endereco_ip=ip_do_cliente(http_request)
        )

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
