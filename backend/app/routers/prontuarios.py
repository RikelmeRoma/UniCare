from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select, or_

from app.database import get_session
from app.models.prontuario import ProntuarioPsico, FichaOdonto, StatusProntuario
from app.models.paciente import Paciente
from app.models.atribuicao import AtribuicaoClinica, SituacaoAtribuicao
from app.models.usuario import Usuario, PerfilUsuario, CursoUsuario
from app.schemas.prontuario import (
    ProntuarioPsicoCreate,
    ProntuarioPsicoRead,
    FichaOdontoCreate,
    FichaOdontoRead,
    HomologacaoRequest
)
from app.services.auth_service import require_roles, require_curso, autorizado_clinico
from app.services.auditoria_service import registrar_log, ip_do_cliente

router = APIRouter(prefix="/prontuarios", tags=["Prontuários Clínicos & Homologação"])

# Proteção Universal RN-001: Perfis de Recepção são terminantemente bloqueados
# nesta rota. A lista de perfis clínicos vive em auth_service.autorizado_clinico,
# compartilhada com as rotas de anamnese em pacientes.py.

autorizado_homologacao = require_roles([PerfilUsuario.SUPERVISOR, PerfilUsuario.RT])


def _validar_vinculo_estagiario(
    session: Session,
    usuario: Usuario,
    paciente_id: int,
) -> None:
    """Estagiário só escreve de paciente que esteja ativo em seu nome (RF-001).

    A regra é do vínculo paciente↔estagiário, e vale na escrita: filtrar só no
    dropdown deixaria qualquer cliente chamar a rota direto e registrar síntese
    em nome de quem não é o responsável.

    **Só para o perfil ESTAGIÁRIO.** Supervisor e RT abrem esta tela para
    consultar e, no fluxo da RT, para registrar o que a supervisao viu — e nenhum
    dos dois tem paciente vinculado, porque o vínculo é de responsabilidade
    do aluno. Aplicar a regra a eles trancaria a supervisão.

    Bloqueia nos dois sentidos, e é proposital:
      - paciente com outro responsável ativo → 403 (é o vínculo que protege);
      - paciente sem ninguém vinculado → 403 também. Se abrisse aqui, o aluno
        escreveria sem estar sob ninguém, e a recepção perderia o sentido de
        "sob responsabilidade de". Quem não tem paciente pede à recepção.
    """
    if usuario.perfil != PerfilUsuario.ESTAGIARIO:
        return

    ativa = session.exec(
        select(AtribuicaoClinica).where(
            AtribuicaoClinica.paciente_id == paciente_id,
            AtribuicaoClinica.curso == "psicologia",
            AtribuicaoClinica.situacao == SituacaoAtribuicao.ATIVA,
        )
    ).first()

    if ativa is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Este paciente ainda não está vinculado a um estagiário responsável. "
                "Procure a recepção da clínica."
            ),
        )

    if ativa.estagiario_matricula != usuario.matricula:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Este paciente está sob responsabilidade de "
                f"{ativa.estagiario_nome} ({ativa.estagiario_matricula}). "
                "Peça à recepção a transferência para ficar no seu nome."
            ),
        )


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
    # O vínculo vem do token, não do corpo: `dados.estagiario_matricula` é
    # ignorado aqui (é o que o Bloco 4 já fazia). Conferir o corpo deixaria
    # qualquer cliente escrever em nome de outro estagiário.
    _validar_vinculo_estagiario(session, current_user, dados.paciente_id)

    # RN-002 (CFP 06/2019) é garantido pelo schema: o validator de aspas roda
    # antes de chegar aqui, e o 422 é devolvido automaticamente.
    prontuario = ProntuarioPsico(
        paciente_id=dados.paciente_id,
        paciente_nome=dados.paciente_nome,
        # Autoria pelo token, não pelo corpo — mesma regra acima.
        estagiario_nome=current_user.nome,
        estagiario_matricula=current_user.matricula,
        supervisor_nome=dados.supervisor_nome,
        data_sessao=dados.data_sessao,
        numero_sessao=dados.numero_sessao,
        redacao_texto=dados.redacao_texto,
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
    # Carimbo de autoria docente, gravado pelo servidor a partir do token. A coluna
    # já existia e só era preenchida na criação, com o que o cliente mandava —
    # que desde o Bloco 4 é string vazia. Sem vínculo estagiário↔supervisor no
    # schema, esta é a fonte real de "quem viu": é o próprio homologador, no
    # momento do ato, e o mesmo nome já vai para a trilha de auditoria.
    prontuario.supervisor_nome = current_user.nome
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

def _resolver_estagiario_odonto(
    session: Session,
    matricula: str,
    papel: str,
) -> Usuario:
    """Resolve a matrícula de um membro da dupla para o cadastro real.

    A ficha odontológica é de atendimento em dupla (PDR-05), e a matrícula é o
    que permite segregar a listagem depois. Aceitar nome digitado deixaria o
    aluno gravar o próprio nome com a matrícula do colega — o mesmo defeito que
    o modal de agendamento tinha. A validação é de existência, perfil, clínica
    e conta ativa.
    """
    usuario = session.exec(
        select(Usuario).where(Usuario.matricula == matricula)
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

@router.get("/odonto", response_model=List[FichaOdontoRead])
def listar_fichas_odonto(
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    query = select(FichaOdonto)

    # Paridade com o prontuário psicológico: o estagiário vê as próprias
    # fichas. Aqui são duas pessoas, então operador e auxiliar da dupla veem o
    # registro que assinaram juntos.
    if current_user.perfil == PerfilUsuario.ESTAGIARIO:
        query = query.where(
            or_(
                FichaOdonto.operador_matricula == current_user.matricula,
                FichaOdonto.auxiliar_matricula == current_user.matricula,
            )
        )

    return session.exec(query).all()

@router.post("/odonto", response_model=FichaOdontoRead, status_code=status.HTTP_201_CREATED)
def criar_ficha_odonto(
    dados: FichaOdontoCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    _validar_paciente_do_curso(session, dados.paciente_id, "odontologia")

    operador = _resolver_estagiario_odonto(
        session, dados.operador_matricula, "Operador"
    )
    auxiliar = _resolver_estagiario_odonto(
        session, dados.auxiliar_matricula, "Auxiliar"
    )

    ficha = FichaOdonto(
        paciente_id=dados.paciente_id,
        # O texto da dupla é montado com os nomes do cadastro. Usar o que o
        # cliente mandasse deixaria o registro clínico com nome de uma pessoa e
        # matrícula de outra.
        dupla_estagiarios=f"{operador.nome} & {auxiliar.nome}",
        operador_matricula=operador.matricula,
        auxiliar_matricula=auxiliar.matricula,
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
    # Carimbo de autoria docente, do token e não do corpo. Antes a ficha não
    # dizia quem deu o visto: o nome só existia na trilha de auditoria.
    ficha.supervisor_nome = current_user.nome
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
