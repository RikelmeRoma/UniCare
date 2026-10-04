from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.paciente import Paciente
from app.models.usuario import Usuario, PerfilUsuario
from app.schemas.paciente import PacienteCreate, PacienteRead
from app.services.auth_service import get_current_user
from app.services.auditoria_service import registrar_log

router = APIRouter(prefix="/pacientes", tags=["Pacientes"])

@router.get("", response_model=List[PacienteRead])
@router.get("/", response_model=List[PacienteRead], include_in_schema=False)
def listar_pacientes(
    curso: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    query = select(Paciente)
    if curso and curso != "ambos":
        query = query.where((Paciente.curso == curso) | (Paciente.curso == "ambos"))
    return session.exec(query).all()

@router.post("", response_model=PacienteRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=PacienteRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def cadastrar_paciente(
    dados: PacienteCreate,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    # Verificação de CPF duplicado (RF-007)
    limpa_cpf = lambda c: "".join(filter(str.isdigit, c))
    cpf_limpo = limpa_cpf(dados.cpf_rg)

    todos = session.exec(select(Paciente)).all()
    if any(limpa_cpf(p.cpf_rg) == cpf_limpo for p in todos):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um paciente cadastrado com este número de CPF (RF-007)."
        )

    # Validação de Menor de Idade (RN-004 e UC-03)
    if dados.eh_menor and (not dados.nome_responsavel or not dados.contato_responsavel):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Para pacientes menores de idade, o nome e contato do responsável legal são obrigatórios (RN-004)."
        )

    paciente = Paciente(
        nome=dados.nome,
        cpf_rg=dados.cpf_rg,
        data_nascimento=dados.data_nascimento,
        telefone=dados.telefone,
        eh_menor=dados.eh_menor,
        nome_responsavel=dados.nome_responsavel,
        contato_responsavel=dados.contato_responsavel,
        curso=dados.curso
    )
    session.add(paciente)
    session.commit()
    session.refresh(paciente)

    registrar_log(session, current_user, "CADASTRO_PACIENTE", "pacientes", paciente.id)

    return paciente
