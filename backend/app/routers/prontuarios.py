from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select, or_

from app.database import get_session
from app.models.prontuario import (
    ProntuarioPsico,
    FichaOdonto,
    DocumentoFichaOdonto,
    RadiografiaOdonto,
    StatusProntuario,
)
from app.models.dupla import DuplaOdonto
from app.models.paciente import Paciente
from app.models.atribuicao import AtribuicaoClinica, SituacaoAtribuicao
from app.models.usuario import Usuario, PerfilUsuario
from app.schemas.prontuario import (
    ProntuarioPsicoCreate,
    ProntuarioPsicoRead,
    FichaOdontoCreate,
    FichaOdontoRead,
    HomologacaoRequest,
    DocumentoFichaOdontoCreate,
    DocumentoFichaOdontoUpdate,
    DocumentoFichaOdontoRead,
    DocumentoFichaOdontoDetalhe,
    RadiografiaOdontoCreate,
    RadiografiaOdontoRead,
)
from app.services.auth_service import (
    require_roles,
    require_curso,
    autorizado_clinico,
    exigir_perfil,
)
from app.services.auditoria_service import registrar_log, ip_do_cliente
from app.services.dupla_service import resolver_estagiario_odonto

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
    o modal de agendamento tinha.
    """
    return resolver_estagiario_odonto(session, matricula, papel)

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

# --- Documento completo da ficha odontológica ---
# `FichaOdonto` continua sendo o registro por procedimento. O documento abaixo
# é a página Ficha Clínica inteira, com anamnese, odontograma, periograma e
# índices. A dupla submete; o supervisor das duplas homologa; a RT homologa na
# própria clínica.

def _matriculas_supervisionadas(session: Session, supervisor: Usuario) -> List[str]:
    return list(session.exec(
        select(Usuario.matricula).where(
            Usuario.perfil == PerfilUsuario.ESTAGIARIO,
            Usuario.curso == supervisor.curso,
            Usuario.supervisor_matricula == supervisor.matricula,
            Usuario.ativo.is_(True),
        )
    ).all())


def _pode_ver_documento(
    session: Session,
    usuario: Usuario,
    documento: DocumentoFichaOdonto,
) -> bool:
    if usuario.perfil == PerfilUsuario.RT:
        return True
    if usuario.perfil == PerfilUsuario.ESTAGIARIO:
        return usuario.matricula in (
            documento.operador_matricula,
            documento.auxiliar_matricula,
        )
    if usuario.perfil == PerfilUsuario.SUPERVISOR:
        matriculas = set(_matriculas_supervisionadas(session, usuario))
        return bool(
            {documento.operador_matricula, documento.auxiliar_matricula} & matriculas
        )
    return False


def _exigir_visao_documento(
    session: Session,
    usuario: Usuario,
    documento: DocumentoFichaOdonto,
) -> None:
    if not _pode_ver_documento(session, usuario, documento):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: esta ficha não é de uma dupla vinculada a você (RF-005).",
        )


def _exigir_dupla_do_documento(
    usuario: Usuario,
    operador_matricula: str,
    auxiliar_matricula: str,
) -> None:
    if usuario.perfil != PerfilUsuario.ESTAGIARIO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="A ficha clínica é preenchida pela dupla de estagiários responsável.",
        )
    if usuario.matricula not in (operador_matricula, auxiliar_matricula):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: você não faz parte da dupla desta ficha.",
        )


@router.get("/odonto/documentos", response_model=List[DocumentoFichaOdontoRead])
def listar_documentos_odonto(
    paciente_id: Optional[int] = None,
    status_filtro: Optional[StatusProntuario] = None,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    query = select(DocumentoFichaOdonto)

    if current_user.perfil == PerfilUsuario.ESTAGIARIO:
        query = query.where(
            or_(
                DocumentoFichaOdonto.operador_matricula == current_user.matricula,
                DocumentoFichaOdonto.auxiliar_matricula == current_user.matricula,
            )
        )
    elif current_user.perfil == PerfilUsuario.SUPERVISOR:
        matriculas = _matriculas_supervisionadas(session, current_user)
        query = query.where(
            or_(
                DocumentoFichaOdonto.operador_matricula.in_(matriculas),
                DocumentoFichaOdonto.auxiliar_matricula.in_(matriculas),
            )
        )

    if paciente_id is not None:
        query = query.where(DocumentoFichaOdonto.paciente_id == paciente_id)
    if status_filtro is not None:
        query = query.where(DocumentoFichaOdonto.status == status_filtro)

    return session.exec(
        query.order_by(DocumentoFichaOdonto.atualizado_em.desc())
    ).all()


@router.get(
    "/odonto/documentos/paciente/{paciente_id}",
    response_model=DocumentoFichaOdontoDetalhe,
)
def obter_documento_do_paciente(
    paciente_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    _validar_paciente_do_curso(session, paciente_id, "odontologia")

    documento = session.exec(
        select(DocumentoFichaOdonto)
        .where(DocumentoFichaOdonto.paciente_id == paciente_id)
        .order_by(DocumentoFichaOdonto.atualizado_em.desc())
    ).first()

    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este paciente ainda não tem ficha clínica odontológica.",
        )

    _exigir_visao_documento(session, current_user, documento)
    return documento


@router.get(
    "/odonto/documentos/{documento_id}",
    response_model=DocumentoFichaOdontoDetalhe,
)
def obter_documento_odonto(
    documento_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    documento = session.get(DocumentoFichaOdonto, documento_id)
    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ficha clínica odontológica não localizada.",
        )
    _validar_paciente_do_curso(session, documento.paciente_id, "odontologia")
    _exigir_visao_documento(session, current_user, documento)
    return documento


@router.post(
    "/odonto/documentos",
    response_model=DocumentoFichaOdontoDetalhe,
    status_code=status.HTTP_201_CREATED,
)
def criar_documento_odonto(
    dados: DocumentoFichaOdontoCreate,
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
    _exigir_dupla_do_documento(current_user, operador.matricula, auxiliar.matricula)

    existente = session.exec(
        select(DocumentoFichaOdonto).where(
            DocumentoFichaOdonto.paciente_id == dados.paciente_id
        )
    ).first()
    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Este paciente já tem uma ficha clínica odontológica. "
                "Reabra a ficha existente para corrigir ou reenviar."
            ),
        )

    agora = datetime.now(timezone.utc)
    documento = DocumentoFichaOdonto(
        paciente_id=dados.paciente_id,
        tipo=dados.tipo,
        dupla_estagiarios=f"{operador.nome} & {auxiliar.nome}",
        operador_matricula=operador.matricula,
        auxiliar_matricula=auxiliar.matricula,
        conteudo=dados.conteudo,
        status=StatusProntuario.AGUARDANDO_VALIDACAO,
        versao=1,
        criado_em=agora,
        atualizado_em=agora,
        submetido_em=agora,
    )
    session.add(documento)
    session.commit()
    session.refresh(documento)

    registrar_log(
        session, current_user, "SUBMISSAO_DOCUMENTO_ODONTO",
        "documentos_ficha_odonto", documento.id,
        endereco_ip=ip_do_cliente(http_request)
    )
    return documento


@router.patch(
    "/odonto/documentos/{documento_id}",
    response_model=DocumentoFichaOdontoDetalhe,
)
def reenviar_documento_odonto(
    documento_id: int,
    dados: DocumentoFichaOdontoUpdate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    documento = session.get(DocumentoFichaOdonto, documento_id)
    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ficha clínica odontológica não localizada.",
        )
    _validar_paciente_do_curso(session, documento.paciente_id, "odontologia")
    _exigir_dupla_do_documento(
        current_user, documento.operador_matricula, documento.auxiliar_matricula
    )

    if documento.status not in (
        StatusProntuario.EM_ELABORACAO,
        StatusProntuario.DEVOLVIDO_PARA_AJUSTE,
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Esta ficha não está disponível para reenvio. "
                "Aguarde a homologação ou a devolução do supervisor."
            ),
        )

    agora = datetime.now(timezone.utc)
    documento.conteudo = dados.conteudo
    documento.status = StatusProntuario.AGUARDANDO_VALIDACAO
    documento.versao += 1
    documento.atualizado_em = agora
    documento.submetido_em = agora
    session.add(documento)
    session.commit()
    session.refresh(documento)

    registrar_log(
        session, current_user, "REENVIO_DOCUMENTO_ODONTO",
        "documentos_ficha_odonto", documento.id,
        endereco_ip=ip_do_cliente(http_request)
    )
    return documento


@router.patch(
    "/odonto/documentos/{documento_id}/homologar",
    response_model=DocumentoFichaOdontoDetalhe,
)
def homologar_documento_odonto(
    documento_id: int,
    body: HomologacaoRequest,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(
        require_curso("odontologia", base=autorizado_homologacao)
    )
):
    documento = session.get(DocumentoFichaOdonto, documento_id)
    if not documento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ficha clínica odontológica não localizada.",
        )
    _validar_paciente_do_curso(session, documento.paciente_id, "odontologia")
    _exigir_visao_documento(session, current_user, documento)

    if documento.status != StatusProntuario.AGUARDANDO_VALIDACAO:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Esta ficha não está aguardando homologação.",
        )

    documento.status = body.decisao
    documento.parecer_supervisor = body.parecer
    documento.supervisor_nome = current_user.nome
    documento.atualizado_em = datetime.now(timezone.utc)
    session.add(documento)
    session.commit()
    session.refresh(documento)

    registrar_log(
        session,
        current_user,
        f"HOMOLOGACAO_DOCUMENTO_ODONTO_{body.decisao.value}",
        "documentos_ficha_odonto",
        documento.id,
        endereco_ip=ip_do_cliente(http_request),
    )
    return documento


# --- Exames de imagem do prontuário odontológico ---
# A aba Exames de Imagem grava no ato, sem esperar o envio da ficha completa.
# O exame continua vinculado ao paciente e à dupla que o assinou.

def _pode_ver_radiografia(
    session: Session,
    usuario: Usuario,
    radiografia: RadiografiaOdonto,
) -> bool:
    if usuario.perfil == PerfilUsuario.RT:
        return True
    if usuario.perfil == PerfilUsuario.ESTAGIARIO:
        return usuario.matricula in (
            radiografia.operador_matricula,
            radiografia.auxiliar_matricula,
        )
    if usuario.perfil == PerfilUsuario.SUPERVISOR:
        matriculas = set(_matriculas_supervisionadas(session, usuario))
        return bool(
            {
                radiografia.operador_matricula,
                radiografia.auxiliar_matricula,
            }
            & matriculas
        )
    return False


def _exigir_visao_radiografia(
    session: Session,
    usuario: Usuario,
    radiografia: RadiografiaOdonto,
) -> None:
    if not _pode_ver_radiografia(session, usuario, radiografia):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: este exame não pertence à sua dupla (RF-005).",
        )


def _resolver_dupla_do_exame(
    session: Session,
    usuario: Usuario,
    dupla_id: int,
) -> DuplaOdonto:
    if usuario.perfil != PerfilUsuario.ESTAGIARIO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="O exame de imagem é anexado pela dupla de estagiários responsável.",
        )

    dupla = session.get(DuplaOdonto, dupla_id)
    if not dupla or not dupla.ativo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "A dupla informada não está ativa. Monte a dupla com a "
                "supervisão antes de anexar o exame."
            ),
        )

    if usuario.matricula not in (
        dupla.operador_matricula,
        dupla.auxiliar_matricula,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado: você não faz parte desta dupla (PDR-05).",
        )

    return dupla


@router.get("/odonto/radiografias", response_model=List[RadiografiaOdontoRead])
def listar_radiografias_odonto(
    paciente_id: int,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    _validar_paciente_do_curso(session, paciente_id, "odontologia")

    query = select(RadiografiaOdonto).where(
        RadiografiaOdonto.paciente_id == paciente_id
    )

    if current_user.perfil == PerfilUsuario.ESTAGIARIO:
        query = query.where(
            or_(
                RadiografiaOdonto.operador_matricula == current_user.matricula,
                RadiografiaOdonto.auxiliar_matricula == current_user.matricula,
            )
        )
    elif current_user.perfil == PerfilUsuario.SUPERVISOR:
        matriculas = _matriculas_supervisionadas(session, current_user)
        query = query.where(
            or_(
                RadiografiaOdonto.operador_matricula.in_(matriculas),
                RadiografiaOdonto.auxiliar_matricula.in_(matriculas),
            )
        )

    return session.exec(
        query.order_by(RadiografiaOdonto.criado_em.desc())
    ).all()


@router.post(
    "/odonto/radiografias",
    response_model=RadiografiaOdontoRead,
    status_code=status.HTTP_201_CREATED,
)
def criar_radiografia_odonto(
    dados: RadiografiaOdontoCreate,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    _validar_paciente_do_curso(session, dados.paciente_id, "odontologia")
    dupla = _resolver_dupla_do_exame(session, current_user, dados.dupla_id)

    operador = _resolver_estagiario_odonto(
        session, dupla.operador_matricula, "Operador"
    )
    auxiliar = _resolver_estagiario_odonto(
        session, dupla.auxiliar_matricula, "Auxiliar"
    )

    radiografia = RadiografiaOdonto(
        paciente_id=dados.paciente_id,
        dupla_id=dupla.id,
        dupla_estagiarios=f"{operador.nome} & {auxiliar.nome}",
        operador_matricula=dupla.operador_matricula,
        auxiliar_matricula=dupla.auxiliar_matricula,
        tipo=dados.tipo,
        laudo=dados.laudo,
        imagem_nome=dados.imagem_nome,
        imagem_mime=dados.imagem_mime,
        imagem_data=dados.imagem_data,
        status="REGISTRADO",
    )
    session.add(radiografia)
    session.commit()
    session.refresh(radiografia)

    registrar_log(
        session,
        current_user,
        "REGISTRO_RADIOGRAFIA_ODONTO",
        "radiografias_odonto",
        radiografia.id,
        endereco_ip=ip_do_cliente(http_request),
    )
    return radiografia


@router.delete("/odonto/radiografias/{radiografia_id}")
def remover_radiografia_odonto(
    radiografia_id: int,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(require_curso("odontologia", base=autorizado_clinico))
):
    radiografia = session.get(RadiografiaOdonto, radiografia_id)
    if not radiografia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exame de imagem não localizado.",
        )

    _validar_paciente_do_curso(session, radiografia.paciente_id, "odontologia")
    _exigir_visao_radiografia(session, current_user, radiografia)

    session.delete(radiografia)
    session.commit()

    registrar_log(
        session,
        current_user,
        "REMOCAO_RADIOGRAFIA_ODONTO",
        "radiografias_odonto",
        radiografia_id,
        endereco_ip=ip_do_cliente(http_request),
    )
    return {"detail": "Exame de imagem removido do prontuário."}
