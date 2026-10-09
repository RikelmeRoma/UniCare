from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.prontuario import ProntuarioPsico, FichaOdonto, StatusProntuario
from app.models.paciente import Paciente
from app.models.usuario import Usuario, PerfilUsuario
from app.schemas.prontuario import (
    ProntuarioPsicoCreate,
    ProntuarioPsicoRead,
    FichaOdontoCreate,
    FichaOdontoRead,
    HomologacaoRequest
)
from app.services.auth_service import require_roles, require_curso
from app.services.auditoria_service import registrar_log, ip_do_cliente

router = APIRouter(prefix="/prontuarios", tags=["Prontuários Clínicos & Homologação"])

# Proteção Universal RN-001: Perfis de Recepção são terminantemente bloqueados
# nesta rota.
autorizado_clinico = require_roles([
    PerfilUsuario.ESTAGIARIO,
    PerfilUsuario.SUPERVISOR,
    PerfilUsuario.RT
])

autorizado_homologacao = require_roles([PerfilUsuario.SUPERVISOR, PerfilUsuario.RT])


def _validar_paciente_do_curso(
    session: Session,
    paciente_id: int,
    curso_clinica: str
) -> Paciente:
    """Garante que o paciente pertence à clínica que está sendo escrita.

    Sem isso, um supervisor de odontologia conseguiria registrar uma evolução
    psicológica para um paciente da psicologia: a segregação de leitura não
    protegeria nada, já que a escrita não é filtrada.
    """
    paciente = session.get(Paciente, paciente_id)
    if not paciente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente não localizado."
        )

    if paciente.curso not in (curso_clinica, "ambos"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Acesso negado: paciente pertence a '{paciente.curso}' e não pode "
                f"ser registrado na clínica de {curso_clinica}."
            )
        )

    return paciente


# --- Clínicas de Psicologia ---
# require_curso recebe o guard de papel em `base` para que o papel seja avaliado
# ANTES do curso. Sem isso a recepção receberia "clínica restrita" no lugar do
# RN-001, que é o detail normativo que os testes de conformidade afirmam.

@router.get("/psico", response_model=List[ProntuarioPsicoRead])
def listar_prontuarios_psico(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("psicologia", base=autorizado_clinico))
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
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("psicologia", base=autorizado_clinico))
):
    _validar_paciente_do_curso(session, dados.paciente_id, "psicologia")

    # RN-002 (CFP 06/2019) é garantido pelo schema: o validator de aspas roda
    # antes de chegar aqui, e o 422 é devolvido automaticamente.
    prontuario = ProntuarioPsico(
        paciente_id=dados.paciente_id,
        paciente_nome=dados.paciente_nome,
        estagiario_nome=dados.estagiario_nome,
        estagiario_matricula=dados.estagiario_matricula,
        supervisor_nome=dados.supervisor_nome,
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

    registrar_log(
        session, current_user, "SUBMISSAO_PRONTUARIO_PSICO", "prontuarios_psico",
        prontuario.id, endereco_ip=ip_do_cliente(http_request)
    )

    return prontuario

@router.patch("/psico/{prontuario_id}/homologar", response_model=ProntuarioPsicoRead)
def homologar_prontuario_psico(
    prontuario_id: int,
    body: HomologacaoRequest,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(
        require_curso("psicologia", base=autorizado_homologacao)
    )
):
    prontuario = session.get(ProntuarioPsico, prontuario_id)
    if not prontuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prontuário psicológico não localizado."
        )

    _validar_paciente_do_curso(session, prontuario.paciente_id, "psicologia")

    prontuario.status = body.decisao
    prontuario.parecer_supervisor = body.parecer
    session.add(prontuario)
    session.commit()
    session.refresh(prontuario)

    registrar_log(
        session,
        current_user,
        f"HOMOLOGACAO_STATUS_{body.decisao.value}",
        "prontuarios_psico",
        prontuario.id,
        endereco_ip=ip_do_cliente(http_request)
    )

    return prontuario

# --- Clínicas de Odontologia ---

@router.get("/odonto", response_model=List[FichaOdontoRead])
def listar_fichas_odonto(
    session: Session = Depends(get_session),
    _usuario: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    return session.exec(select(FichaOdonto)).all()

@router.post("/odonto", response_model=FichaOdontoRead, status_code=status.HTTP_201_CREATED)
def criar_ficha_odonto(
    dados: FichaOdontoCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    _validar_paciente_do_curso(session, dados.paciente_id, "odontologia")

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

    registrar_log(
        session, current_user, "SUBMISSAO_FICHA_ODONTO", "fichas_odonto", ficha.id,
        endereco_ip=ip_do_cliente(http_request)
    )

    return ficha

@router.patch("/odonto/{ficha_id}/homologar", response_model=FichaOdontoRead)
def homologar_ficha_odonto(
    ficha_id: int,
    body: HomologacaoRequest,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(
        require_curso("odontologia", base=autorizado_homologacao)
    )
):
    # Paridade de RF-004 com a clínica de psicologia: mesmo guard de papel, mesmo
    # guard de curso e mesma conference do curso do paciente.
    ficha = session.get(FichaOdonto, ficha_id)
    if not ficha:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ficha odontológica não localizada."
        )

    _validar_paciente_do_curso(session, ficha.paciente_id, "odontologia")

    ficha.status = body.decisao
    ficha.parecer_supervisor = body.parecer
    session.add(ficha)
    session.commit()
    session.refresh(ficha)

    registrar_log(
        session,
        current_user,
        f"HOMOLOGACAO_STATUS_{body.decisao.value}",
        "fichas_odonto",
        ficha.id,
        endereco_ip=ip_do_cliente(http_request)
    )

    return ficha