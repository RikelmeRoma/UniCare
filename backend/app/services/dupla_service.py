from datetime import datetime, timezone
from typing import List

from fastapi import HTTPException, status
from sqlmodel import Session, select
from sqlalchemy import or_

from app.models.dupla import DuplaOdonto
from app.models.usuario import CursoUsuario, PerfilUsuario, Usuario


def resolver_estagiario_odonto(
    session: Session,
    matricula: str,
    papel: str,
) -> Usuario:
    """Resolve uma matrícula para estagiário ativo de odontologia.

    A dupla é resolvida contra o cadastro, nunca contra texto digitado: aceitar
    nome livre deixaria uma pessoa assinar com a matrícula de outra.
    """
    usuario = session.exec(
        select(Usuario).where(Usuario.matricula == matricula.strip().upper())
    ).first()

    if (
        usuario is None
        or not usuario.ativo
        or usuario.perfil != PerfilUsuario.ESTAGIARIO
        or usuario.curso != CursoUsuario.ODONTOLOGIA
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"{papel} inválido: a matrícula '{matricula}' não é de "
                "estagiário ativo da clínica de odontologia."
            ),
        )

    return usuario


def dupla_ativa_do_estagiario(
    session: Session, matricula: str
) -> DuplaOdonto | None:
    return session.exec(
        select(DuplaOdonto).where(
            DuplaOdonto.ativo.is_(True),
            or_(
                DuplaOdonto.operador_matricula == matricula,
                DuplaOdonto.auxiliar_matricula == matricula,
            ),
        )
    ).first()


def dupla_ativa_repetida(
    session: Session, operador_matricula: str, auxiliar_matricula: str
) -> DuplaOdonto | None:
    """Dupla ativa com o mesmo par, em qualquer ordem."""
    return session.exec(
        select(DuplaOdonto).where(
            DuplaOdonto.ativo.is_(True),
            or_(
                (DuplaOdonto.operador_matricula == operador_matricula)
                & (DuplaOdonto.auxiliar_matricula == auxiliar_matricula),
                (DuplaOdonto.operador_matricula == auxiliar_matricula)
                & (DuplaOdonto.auxiliar_matricula == operador_matricula),
            ),
        )
    ).first()


def serializar_dupla(session: Session, dupla: DuplaOdonto) -> dict:
    operador = session.exec(
        select(Usuario).where(Usuario.matricula == dupla.operador_matricula)
    ).first()
    auxiliar = session.exec(
        select(Usuario).where(Usuario.matricula == dupla.auxiliar_matricula)
    ).first()
    supervisor = session.exec(
        select(Usuario).where(Usuario.matricula == dupla.supervisor_matricula)
    ).first()

    return {
        "id": dupla.id,
        "operador_matricula": dupla.operador_matricula,
        "operador_nome": operador.nome if operador else dupla.operador_matricula,
        "auxiliar_matricula": dupla.auxiliar_matricula,
        "auxiliar_nome": auxiliar.nome if auxiliar else dupla.auxiliar_matricula,
        "supervisor_matricula": dupla.supervisor_matricula,
        "supervisor_nome": supervisor.nome if supervisor else None,
        "ativo": dupla.ativo,
        "criado_em": dupla.criado_em,
        "desativado_em": dupla.desativado_em,
    }


def desativar_duplas_do_estagiario(
    session: Session, matricula: str
) -> List[DuplaOdonto]:
    """Encerra duplas ativas de um aluno que saiu ou trocou de vínculo."""
    duplas = list(session.exec(
        select(DuplaOdonto).where(
            DuplaOdonto.ativo.is_(True),
            or_(
                DuplaOdonto.operador_matricula == matricula,
                DuplaOdonto.auxiliar_matricula == matricula,
            ),
        )
    ).all())
    agora = datetime.now(timezone.utc)
    for dupla in duplas:
        dupla.ativo = False
        dupla.desativado_em = agora
        session.add(dupla)
    return duplas


def desativar_duplas_do_supervisor(
    session: Session, matricula: str
) -> List[DuplaOdonto]:
    """Encerra as duplas de um supervisor desativado."""
    duplas = list(session.exec(
        select(DuplaOdonto).where(
            DuplaOdonto.ativo.is_(True),
            DuplaOdonto.supervisor_matricula == matricula,
        )
    ).all())
    agora = datetime.now(timezone.utc)
    for dupla in duplas:
        dupla.ativo = False
        dupla.desativado_em = agora
        session.add(dupla)
    return duplas
