from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.atribuicao import AtribuicaoClinica, SituacaoAtribuicao
from app.models.paciente import Paciente
from app.models.usuario import PerfilUsuario, Usuario
from app.schemas.atribuicao import AtribuicaoCreate, AtribuicaoRead, TransferenciaRequest
from app.services.auditoria_service import registrar_log, ip_do_cliente
from app.services.auth_service import get_current_user, require_curso, require_roles
from app.services.vinculo_service import (
    exigir_estagiario_da_clinica,
    paciente_da_clinica,
    vinculo_ativo,
)

router = APIRouter(prefix="/atribuicoes", tags=["Vinculo Paciente-Estagiario"])

CLINICA = "psicologia"

# A recepção vincula e a RT acompanha. O supervisor acompanha o resultado pela
# evolução que o aluno escreve, não pelo vínculo -- e o estagiário é barrado:
# quem indica o próprio paciente anula a segregação que a regra cria.
autorizado_recepcao = require_roles([PerfilUsuario.RECEPCAO, PerfilUsuario.RT])


# As três regras de quem pode receber um paciente — paciente da clínica,
# matrícula de estagiário ativo e a linha ATIVA — vivem em
# `app/services/vinculo_service.py`. Elas não são exclusividade deste router: o
# agendamento precisa das mesmas, e duplicá-las é como "matrícula válida" e
# "paciente vinculado" passam a divergir, com a agenda aceitando alguém que o
# prontuário recusa.


def _serializar(session: Session, a: AtribuicaoClinica) -> AtribuicaoRead:
    paciente = session.get(Paciente, a.paciente_id)
    return AtribuicaoRead(
        id=a.id,
        paciente_id=a.paciente_id,
        paciente_nome=paciente.nome if paciente else "",
        curso=a.curso,
        estagiario_nome=a.estagiario_nome,
        estagiario_matricula=a.estagiario_matricula,
        situacao=a.situacao,
        motivo=a.motivo,
        atribuido_por_nome=a.atribuido_por_nome,
        atribuido_por_matricula=a.atribuido_por_matricula,
        data_atribuicao=a.data_atribuicao,
        data_encerramento=a.data_encerramento,
    )


@router.get("/psico", response_model=list[AtribuicaoRead])
def listar_atribuicoes(
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso(CLINICA)),
):
    """Histórico completo de vínculos da clínica: as ativas e as encerradas.

    Devolver só as ativas esconderia quem esteve antes — e o histórico é metade
    do valor da tabela, já que a linha antiga é o registro de que houve troca.
    """
    linhas = session.exec(
        select(AtribuicaoClinica)
        .where(AtribuicaoClinica.curso == CLINICA)
        .order_by(AtribuicaoClinica.id.desc())
    ).all()
    return [_serializar(session, a) for a in linhas]


@router.post("/psico", response_model=AtribuicaoRead, status_code=status.HTTP_201_CREATED)
def atribuir_paciente(
    dados: AtribuicaoCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso(CLINICA, base=autorizado_recepcao)),
):
    """Vincula um paciente a um estagiário.

    Se o paciente já tem responsável ativo, recusa: trocar é o endpoint de
    transferência, que guarda o motivo. Aceitar os dois deixaria dois
    responsáveis sem que ninguém decidisse por isso.
    """
    paciente_da_clinica(session, dados.paciente_id, CLINICA)
    estagiario = exigir_estagiario_da_clinica(
        session, dados.estagiario_matricula, dados.estagiario_nome, CLINICA
    )

    existente = vinculo_ativo(session, dados.paciente_id, CLINICA)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"O paciente já está sob responsabilidade de "
                f"{existente.estagiario_nome} ({existente.estagiario_matricula}). "
                "Use a transferência, que registra o motivo da troca."
            ),
        )

    agora = datetime.now(timezone.utc)
    atribuicao = AtribuicaoClinica(
        paciente_id=dados.paciente_id,
        curso=CLINICA,
        estagiario_nome=estagiario.nome,
        estagiario_matricula=estagiario.matricula,
        situacao=SituacaoAtribuicao.ATIVA,
        motivo=None,
        # O nome vem do cadastro, não do que a recepção digitou: duas fontes de
        # verdade para o mesmo campo é como nasce dado divergente.
        atribuido_por_nome=current_user.nome,
        atribuido_por_matricula=current_user.matricula,
        data_atribuicao=agora,
        criado_em=agora,
    )
    session.add(atribuicao)
    session.commit()
    session.refresh(atribuicao)

    registrar_log(
        session, current_user, "ATRIBUICAO_PACIENTE", "atribuicoes_clinicas",
        atribuicao.id, endereco_ip=ip_do_cliente(http_request),
    )
    return _serializar(session, atribuicao)


@router.patch("/psico/{atribuicao_id}/transferir", response_model=AtribuicaoRead)
def transferir_paciente(
    atribuicao_id: int,
    dados: TransferenciaRequest,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso(CLINICA, base=autorizado_recepcao)),
):
    """Troca o responsável: encerra a linha ativa e abre uma nova com o motivo.

    A linha antiga NÃO é apagada. Ela passa a SUBSTITUIDA com o motivo e a
    data, e é o que permite responder "quem era o responsável em tal data".

    O prontuário já guarda o autor no momento da escrita, então nenhum registro
    clínico é reescrito — a troca só muda para quem vale daqui em diante.
    """
    atual = session.get(AtribuicaoClinica, atribuicao_id)
    if not atual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vínculo não localizado.",
        )
    if atual.curso != CLINICA:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clínica restrita: este vínculo não é da psicologia.",
        )
    if atual.situacao != SituacaoAtribuicao.ATIVA:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este vínculo já foi encerrado. Só o responsável ativo pode ser trocado.",
        )

    novo_estagiario = exigir_estagiario_da_clinica(
        session, dados.estagiario_matricula, dados.estagiario_nome, CLINICA
    )
    if novo_estagiario.matricula == atual.estagiario_matricula:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"O paciente já está com {novo_estagiario.nome}. Escolha outro estagiário.",
        )

    agora = datetime.now(timezone.utc)
    atual.situacao = SituacaoAtribuicao.SUBSTITUIDA
    atual.motivo = dados.motivo.strip()
    atual.data_encerramento = agora
    session.add(atual)

    nova = AtribuicaoClinica(
        paciente_id=atual.paciente_id,
        curso=CLINICA,
        estagiario_nome=novo_estagiario.nome,
        estagiario_matricula=novo_estagiario.matricula,
        situacao=SituacaoAtribuicao.ATIVA,
        motivo=None,
        atribuido_por_nome=current_user.nome,
        atribuido_por_matricula=current_user.matricula,
        data_atribuicao=agora,
        criado_em=agora,
    )
    session.add(nova)
    session.commit()
    session.refresh(nova)

    registrar_log(
        session, current_user, "TROCA_ATRIBUICAO", "atribuicoes_clinicas",
        nova.id, endereco_ip=ip_do_cliente(http_request),
    )
    return _serializar(session, nova)


@router.get("/psico/minha", response_model=list[AtribuicaoRead])
def minhas_atribuicoes(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    """Pacientes ativos sob responsabilidade de quem está chamando.

    Rota do próprio aluno: o prontuário lista por aqui, em vez de filtrar no
    cliente. Filtrar só na tela deixaria qualquer cliente chamar a API e ver a
    clínica inteira.
    """
    linhas = session.exec(
        select(AtribuicaoClinica).where(
            AtribuicaoClinica.curso == CLINICA,
            AtribuicaoClinica.situacao == SituacaoAtribuicao.ATIVA,
            AtribuicaoClinica.estagiario_matricula == current_user.matricula,
        )
    ).all()
    return [_serializar(session, a) for a in linhas]
