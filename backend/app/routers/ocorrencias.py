from typing import List
from fastapi import APIRouter, Depends, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.ocorrencia import OcorrenciaEstagiario
from app.models.usuario import CursoUsuario, PerfilUsuario, Usuario
from app.schemas.ocorrencia import (
    OcorrenciaEstagiarioCreate,
    OcorrenciaEstagiarioRead,
)
from app.services.auditoria_service import ip_do_cliente, registrar_log
from app.services.auth_service import require_curso, require_roles
from app.services.vinculo_service import exigir_estagiario_da_clinica

router = APIRouter(prefix="/ocorrencias", tags=["Ocorrências de Estagiários"])

CLINICA_PSICO = "psicologia"

autorizado_ler_ocorrencias = require_roles(
    [PerfilUsuario.RECEPCAO, PerfilUsuario.SUPERVISOR, PerfilUsuario.ESTAGIARIO]
)
autorizado_registrar_ocorrencia = require_roles([PerfilUsuario.RECEPCAO])


@router.get("/psico", response_model=List[OcorrenciaEstagiarioRead])
def listar_ocorrencias_psico(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(
        require_curso(CLINICA_PSICO, base=autorizado_ler_ocorrencias)
    ),
):
    query = select(OcorrenciaEstagiario).where(
        OcorrenciaEstagiario.curso == CLINICA_PSICO
    )

    if current_user.perfil == PerfilUsuario.ESTAGIARIO:
        query = query.where(
            OcorrenciaEstagiario.estagiario_matricula == current_user.matricula
        )
    elif current_user.perfil == PerfilUsuario.SUPERVISOR:
        matriculas_supervisionados = list(
            session.exec(
                select(Usuario.matricula).where(
                    Usuario.curso == CursoUsuario.PSICOLOGIA,
                    Usuario.perfil == PerfilUsuario.ESTAGIARIO,
                    Usuario.supervisor_matricula == current_user.matricula,
                )
            ).all()
        )
        if not matriculas_supervisionados:
            return []
        query = query.where(
            OcorrenciaEstagiario.estagiario_matricula.in_(matriculas_supervisionados)
        )

    return session.exec(
        query.order_by(
            OcorrenciaEstagiario.data_ocorrencia.desc(),
            OcorrenciaEstagiario.id.desc(),
        )
    ).all()


@router.post(
    "/psico",
    response_model=OcorrenciaEstagiarioRead,
    status_code=status.HTTP_201_CREATED,
)
def criar_ocorrencia_psico(
    dados: OcorrenciaEstagiarioCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(
        require_curso(CLINICA_PSICO, base=autorizado_registrar_ocorrencia)
    ),
):
    estagiario = exigir_estagiario_da_clinica(
        session, dados.estagiario_matricula, "", CLINICA_PSICO
    )

    ocorrencia = OcorrenciaEstagiario(
        estagiario_matricula=estagiario.matricula,
        estagiario_nome=estagiario.nome,
        curso=CLINICA_PSICO,
        tipo=dados.tipo,
        data_ocorrencia=dados.data_ocorrencia,
        descricao=dados.descricao,
        registrado_por_nome=current_user.nome,
        registrado_por_matricula=current_user.matricula,
    )
    session.add(ocorrencia)
    session.commit()
    session.refresh(ocorrencia)

    registrar_log(
        session,
        current_user,
        "REGISTRO_OCORRENCIA_ESTAGIARIO",
        "ocorrencias_estagiarios",
        ocorrencia.id,
        endereco_ip=ip_do_cliente(http_request),
    )

    return ocorrencia
