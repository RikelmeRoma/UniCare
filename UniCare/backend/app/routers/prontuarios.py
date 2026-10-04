from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.prontuario import ProntuarioPsico, FichaOdonto, StatusProntuario
from app.models.usuario import Usuario, PerfilUsuario
from app.schemas.prontuario import (
    ProntuarioPsicoCreate,
    ProntuarioPsicoRead,
    FichaOdontoCreate,
    FichaOdontoRead,
    HomologacaoRequest
)
from app.services.auth_service import require_roles, get_current_user
from app.services.auditoria_service import registrar_log

router = APIRouter(prefix="/prontuarios", tags=["Prontuários Clínicos & Homologação"])

# Proteção Universal RN-001: Perfis de Recepção são terminantemente bloqueados nesta rota
autorizado_clinico = require_roles([
    PerfilUsuario.ESTAGIARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.RT
])

@router.get("/psico", response_model=List[ProntuarioPsicoRead])
def listar_prontuarios_psico(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_clinico)
):
    query = select(ProntuarioPsico)

    # Segregação por Orientação Docente (RF-004 e RN-003):
    # Se for estagiário, visualiza apenas os seus.
    if current_user.perfil == PerfilUsuario.ESTAGIARIO:
        query = query.where(ProntuarioPsico.estagiario_matricula == current_user.matricula)

    return session.exec(query).all()

@router.post("/psico", response_model=ProntuarioPsicoRead, status_code=status.HTTP_201_CREATED)
def criar_evolucao_psico(
    dados: ProntuarioPsicoCreate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_clinico)
):
    # A validação de aspas (RN-002) é executada automaticamente pelo Pydantic Schema antes de chegar aqui
    prontuario = ProntuarioPsico(
        paciente_id=dados.paciente_id,
        paciente_nome=dados.paciente_nome,
        estagiario_nome=dados.estagiario_nome,
        estagiario_matricula=dados.estagiario_matricula,
        supervisor_nome=dados.supervisor_nome or "Prof. Dr. Robert Santos do Carmo",
        data_sessao=dados.data_sessao,
        numero_sessao=dados.numero_sessao,
        inicio_sessao_texto=dados.inicio_sessao_texto,
        meio_sessao_texto=dados.meio_sessao_texto,
        fim_sessao_texto=dados.fim_sessao_texto,
        status=StatusProntuario.AGUARDANDO_VALIDACAO
    )
    session.add(prontuario)
    session.commit()
    session.refresh(prontuario)

    registrar_log(session, current_user, "SUBMISSAO_PRONTUARIO_PSICO", "prontuarios_psico", prontuario.id)

    return prontuario

@router.patch("/psico/{prontuario_id}/homologar", response_model=ProntuarioPsicoRead)
def homologar_prontuario_psico(
    prontuario_id: int,
    body: HomologacaoRequest,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_roles([PerfilUsuario.SUPERVISOR, PerfilUsuario.RT]))
):
    prontuario = session.get(ProntuarioPsico, prontuario_id)
    if not prontuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prontuário psicológico não localizado."
        )

    prontuario.status = body.decisao
    prontuario.parecer_supervisor = body.parecer
    session.add(prontuario)
    session.commit()
    session.refresh(prontuario)

    registrar_log(
        session,
        current_user,
        f"HOMOLOGACAO_STATUS_{body.decisao}",
        "prontuarios_psico",
        prontuario.id
    )

    return prontuario

@router.get("/odonto", response_model=List[FichaOdontoRead])
def listar_fichas_odonto(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_clinico)
):
    return session.exec(select(FichaOdonto)).all()

@router.post("/odonto", response_model=FichaOdontoRead, status_code=status.HTTP_201_CREATED)
def criar_ficha_odonto(
    dados: FichaOdontoCreate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(autorizado_clinico)
):
    ficha = FichaOdonto(
        paciente_id=dados.paciente_id,
        dupla_estagiarios=dados.dupla_estagiarios,
        dente_regiao=dados.dente_regiao,
        procedimento_realizado=dados.procedimento_realizado,
        materiais_utilizados=dados.materiais_utilizados,
        anestesico=dados.anestesico,
        alerta_alergia=dados.alerta_alergia,
        status=StatusProntuario.AGUARDANDO_VALIDACAO
    )
    session.add(ficha)
    session.commit()
    session.refresh(ficha)

    registrar_log(session, current_user, "SUBMISSAO_FICHA_ODONTO", "fichas_odonto", ficha.id)

    return ficha
