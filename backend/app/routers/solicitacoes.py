"""Pedido de credencial e autorização pela RT.

O fluxo: alguém sem conta pede na tela pública, a **RT da clínica** autoriza, e a
conta nasce no mesmo ato da aprovação. Por isso não existe estado "aprovada sem
usuário" — `usuario_criado_id` aponta para a conta criada.

Quem decide é só a RT. O supervisor já cria estagiário direto pelo RF-009 e não
passa por esta fila: misturar os dois caminhos só confundiria quem tem conta de
quem ainda não tem.

As regras do relatório (RF-009) descrevem o ciclo de vida do usuário já
cadastrado e **não** mencionam este pedido, então aqui nada é numerado como RF.
"""
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.models.solicitacao import SolicitacaoCadastro, SituacaoSolicitacao
from app.models.usuario import Usuario, PerfilUsuario, CursoUsuario
from app.schemas.solicitacao import (
    SolicitacaoCreate,
    SolicitacaoRead,
    AprovacaoSolicitacao,
    RecusaSolicitacao,
)
from app.services.auth_service import get_current_user, validar_curso_solicitado
from app.services.auditoria_service import registrar_log, ip_do_cliente
from app.services import email_service
from app.services.email_service import StatusEnvio
from app.routers.usuarios import criar_usuario_para_gestor

router = APIRouter(prefix="/solicitacoes-cadastro", tags=["Solicitação de Credencial"])


def _exigir_rt(current_user: Usuario = Depends(get_current_user)) -> Usuario:
    """Só a RT gerencia pedidos de credencial.

    O `Depends` interno é obrigatório: `Usuario` é um SQLModel, e portanto também
    um modelo Pydantic. Sem o `Depends`, o FastAPI o trataria como tipo de corpo
    da requisição e responderia 422 pedindo os campos do usuário.
    """
    if current_user.perfil != PerfilUsuario.RT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente a Referência Técnica da clínica autoriza solicitações de credencial.",
        )
    return current_user


@router.post("", response_model=SolicitacaoRead, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=SolicitacaoRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def solicitar_credencial(
    dados: SolicitacaoCreate,
    session: Session = Depends(get_session)
):
    """Pedido público, sem autenticação.

    A resposta é sempre a mesma estrutura e **não diz** se o e-mail ou a
    matrícula já têm conta no sistema: uma rota pública que responde "existe"
    serve de oráculo para enumerar cadastro. A RT descobre o conflito na hora
    de aprovar, que é quem pode agir sobre ele.
    """
    ja_pendente = session.exec(
        select(SolicitacaoCadastro).where(
            (SolicitacaoCadastro.email == dados.email)
            & (SolicitacaoCadastro.situacao == SituacaoSolicitacao.PENDENTE)
        )
    ).first()
    if ja_pendente:
        # Também é o que substitui um rate limiter: sem isso, qualquer chamada
        # anônima inundaria a fila da RT.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Já existe uma solicitação pendente com este e-mail. Aguarde a análise da RT.",
        )

    solicitacao = SolicitacaoCadastro(
        nome=dados.nome,
        email=dados.email,
        matricula=dados.matricula.strip().upper(),
        telefone=dados.telefone,
        curso_declarado=dados.curso_declarado,
        perfil_declarado=dados.perfil_declarado,
        situacao=SituacaoSolicitacao.PENDENTE,
    )
    session.add(solicitacao)
    session.commit()
    session.refresh(solicitacao)

    # Sem log de auditoria aqui: quem pede ainda não é usuário, e `registrar_log`
    # exige um Usuario. A própria linha da solicitação é o registro; o que entra
    # na trilha é a decisão da RT, que é a parte sensível.
    return solicitacao


@router.get("", response_model=List[SolicitacaoRead])
@router.get("/", response_model=List[SolicitacaoRead], include_in_schema=False)
def listar_solicitacoes(
    situacao: Optional[SituacaoSolicitacao] = SituacaoSolicitacao.PENDENTE,
    curso: Optional[CursoUsuario] = None,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(_exigir_rt),
):
    """Fila da própria clínica da RT."""
    validar_curso_solicitado(current_user, curso.value if curso is not None else None)
    query = select(SolicitacaoCadastro).where(
        SolicitacaoCadastro.curso_declarado == current_user.curso.value
    )
    if situacao is not None:
        query = query.where(SolicitacaoCadastro.situacao == situacao)
    return session.exec(query.order_by(SolicitacaoCadastro.criado_em)).all()


def _buscar_da_clinica(session: Session, solicitacao_id: int, rt: Usuario) -> SolicitacaoCadastro:
    solicitacao = session.get(SolicitacaoCadastro, solicitacao_id)
    if not solicitacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solicitação não localizada.",
        )
    validar_curso_solicitado(rt, solicitacao.curso_declarado)
    return solicitacao


def _recusar_se_ja_decidida(solicitacao: SolicitacaoCadastro) -> None:
    if solicitacao.situacao != SituacaoSolicitacao.PENDENTE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Esta solicitação já está {solicitacao.situacao.value.lower()}.",
        )


@router.post("/{solicitacao_id}/aprovar", response_model=SolicitacaoRead)
def aprovar_solicitacao(
    solicitacao_id: int,
    dados: AprovacaoSolicitacao,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(_exigir_rt),
):
    """Aprova e **cria a conta no mesmo ato**, só se o e-mail com a senha inicial for enviado.

    O fluxo é: primeiro tenta enviar o e-mail com a senha inicial para o
    solicitante. Se o e-mail não for entregue (SMTP não configurado ou falha de
    rede), a conta **não é criada** e a solicitação permanece PENDENTE — a RT
    tenta novamente depois ou comunica a senha por outro canal.

    Se o e-mail for enviado com sucesso, a conta é criada e a solicitação
    marcada como APROVADA.
    """
    solicitacao = _buscar_da_clinica(session, solicitacao_id, current_user)
    _recusar_se_ja_decidida(solicitacao)

    # 1. PRIMEIRO: tenta enviar o e-mail com a senha inicial.
    # Só cria a conta se o envio tiver sucesso.
    corpo = (
        f"Olá, {solicitacao.nome}.\n\n"
        f"Sua solicitação de credencial foi aprovada pela Referência Técnica.\n\n"
        f"Sua senha inicial de acesso ao UniCare é: {dados.senha}\n\n"
        f"Ao entrar pela primeira vez, troque essa senha.\n\n"
        f"Matrícula: {solicitacao.matricula}\n"
        f"Clínica: {solicitacao.curso_declarado}\n"
        f"Perfil: {dados.perfil.value}\n\n"
        "UniCare - Serviço de Psicologia Aplicada e Clínica Odontológica Integrada\n"
    )
    resultado = email_service.enviar(
        solicitacao.email,
        "UniCare - sua senha inicial de acesso",
        corpo,
    )

    if not resultado.enviou:
        # SMTP não configurado ou quebrou: não cria conta, a solicitação fica
        # PENDENTE para a RT tentar novamente depois.
        detalhe = (
            "O envio de e-mail não está configurado neste ambiente."
            if resultado.status is StatusEnvio.NAO_CONFIGURADO
            else "Não foi possível enviar o e-mail de senha inicial."
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"{detalhe} A conta não foi criada. "
                f"Comunique a senha à pessoa por outro canal ou tente novamente depois."
            ),
        )

    # 2. E-MAIL ENVIADO: agora sim cria a conta.
    usuario = criar_usuario_para_gestor(
        session=session,
        gestor=current_user,
        http_request=http_request,
        nome=solicitacao.nome,
        email=solicitacao.email,
        matricula=solicitacao.matricula,
        perfil=dados.perfil,
        senha=dados.senha,
        registro_profissional=dados.registro_profissional,
        curso=CursoUsuario(solicitacao.curso_declarado),
    )

    solicitacao.situacao = SituacaoSolicitacao.APROVADA
    solicitacao.decidido_por_nome = current_user.nome
    solicitacao.decidido_por_matricula = current_user.matricula
    solicitacao.decidido_em = datetime.now(timezone.utc)
    solicitacao.usuario_criado_id = usuario.id
    solicitacao.senha_enviada_por_email = True
    session.add(solicitacao)
    session.commit()
    session.refresh(solicitacao)

    registrar_log(
        session, current_user, "APROVACAO_SOLICITACAO_CREDENCIAL", "solicitacoes_cadastro",
        solicitacao.id, endereco_ip=ip_do_cliente(http_request)
    )
    return solicitacao


@router.post("/{solicitacao_id}/recusar", response_model=SolicitacaoRead)
def recusar_solicitacao(
    solicitacao_id: int,
    dados: RecusaSolicitacao,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(_exigir_rt),
):
    """Recusa com motivo obrigatório. Nenhum usuário é criado."""
    solicitacao = _buscar_da_clinica(session, solicitacao_id, current_user)
    _recusar_se_ja_decidida(solicitacao)

    solicitacao.situacao = SituacaoSolicitacao.RECUSADA
    solicitacao.motivo_recusa = dados.motivo.strip()
    solicitacao.decidido_por_nome = current_user.nome
    solicitacao.decidido_por_matricula = current_user.matricula
    solicitacao.decidido_em = datetime.now(timezone.utc)
    session.add(solicitacao)
    session.commit()
    session.refresh(solicitacao)

    registrar_log(
        session, current_user, "RECUSA_SOLICITACAO_CREDENCIAL", "solicitacoes_cadastro",
        solicitacao.id, endereco_ip=ip_do_cliente(http_request)
    )
    return solicitacao