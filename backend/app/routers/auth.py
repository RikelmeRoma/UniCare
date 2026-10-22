from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select

from app.database import get_session
from app.config import settings
from app.models.usuario import Usuario
from app.models.token_recuperacao import (
    TokenRecuperacaoSenha,
    gerar_codigo,
    hash_token,
    definir_validade,
)
from app.schemas.auth import (
    LoginRequest,
    Token,
    TrocaSenhaRequest,
    RecuperacaoSolicitada,
    RecuperacaoResgate,
    UsuarioRead,
)
from app.services.crypto_service import verify_password, get_password_hash, SenhaLongaError
from app.services.auth_service import create_access_token, get_current_user
from app.services import email_service
from app.services.email_service import StatusEnvio
from app.services.auditoria_service import registrar_log, ip_do_cliente

router = APIRouter(prefix="/auth", tags=["Autenticação & RBAC"])

# A recepcao virou uma conta por clinica (REC-001 odontologia, REC-002 psicologia).
# Nao existe mais login unico de triagem, entao o atalho antigo da recepcao
# institucional foi embora com ele.
ALIASES_RECEPCAO = {"REC-2026-01": "REC-001"}

@router.post("/login", response_model=Token)
def login(
    dados: LoginRequest,
    http_request: Request,
    session: Session = Depends(get_session)
):
    # O corpo era chamado `request`, que colide com o Request do FastAPI: o
    # injetado precisa de outro nome para o IP do log de acesso ser real.
    ident = dados.email_ou_matricula.strip()
    # Matricula citada no projeto antes da separacao por clinica.
    ident = ALIASES_RECEPCAO.get(ident, ident)
    query = session.exec(
        select(Usuario).where(
            (Usuario.email == ident) | (Usuario.matricula == ident)
        )
    ).first()
    user = query

    if not user or not verify_password(dados.senha, user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Matrícula/E-mail ou senha incorretos."
        )

    # `get_current_user` já recusava conta inativa, mas o login em si não: a
    # desativação pelo RF-009 devolvia 200 com token válido. Agora o corte de
    # acesso acontece na porta de entrada.
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário desativado. Procure a Referência Técnica da clínica."
        )

    token = create_access_token(data={"sub": user.email, "perfil": user.perfil, "curso": user.curso})

    registrar_log(
        session, user, "LOGIN_EFETUADO", "usuarios", user.id,
        endereco_ip=ip_do_cliente(http_request)
    )

    return Token(
        access_token=token,
        token_type="bearer",
        perfil=user.perfil,
        curso=user.curso,
        nome=user.nome,
        matricula=user.matricula
    )

@router.get("/me", response_model=UsuarioRead)
def get_me(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.patch("/senha")
def trocar_senha(
    dados: TrocaSenhaRequest,
    http_request: Request,
    session: Session = Depends(get_session),
    current_user: Usuario = Depends(get_current_user)
):
    """Troca a senha de quem está autenticado, exigindo a senha atual.

    A senha atual não é enfeite: sem ela, qualquer sessão aberta trocaria a
    senha do dono. `verify_password` não tem caminho alternativo — hash
    malformado ou senha acima do limite devolvem False, nunca True.
    """
    if not verify_password(dados.senha_atual, current_user.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha atual incorreta."
        )

    if dados.nova_senha == dados.senha_atual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha precisa ser diferente da senha atual."
        )

    try:
        # Nova senha nova: salt novo a cada chamada, nunca reaproveitado.
        current_user.senha_hash = get_password_hash(dados.nova_senha)
    except SenhaLongaError as exc:
        # O `max_length=72` do schema já barra isso, mas um 422 é melhor que o
        # 500 que a exceção viraria se escapasse daqui.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc)
        )

    session.add(current_user)
    session.commit()

    registrar_log(
        session, current_user, "SENHA_ALTERADA", "usuarios", current_user.id,
        endereco_ip=ip_do_cliente(http_request)
    )

    # Nem a senha nem o hash entram na resposta nem na trilha.
    return {"message": "Senha alterada com sucesso."}


# --- Recuperação de senha por token no e-mail ---
#
# Rota pública sem autenticação, como a de login. Duas regras valem aqui e se
# confundem com detalhe de implementação, mas são a razão de o fluxo existir:
#
# 1. **A resposta do pedido não diz se a conta existe.** Uma rota anônima que
#    responde "e-mail não encontrado" serve de oráculo para enumerar o cadastro
#    e para testar quais e-mails são institucionais.
# 2. **A resposta do resgate é uma só.** Código errado, expirado, já usado ou
#    conta inexistente devolvem exatamente a mesma mensagem. Se divergissem,
#    quem tentasse códigos saberia quantos existem válidos.

_MENSAGEM_GENERICA_SOLICITACAO = (
    "Se houver uma conta ativa para esse identificador, enviaremos o código "
    "de recuperação para o e-mail cadastrado."
)
_MENSAGEM_TOKEN_INVALIDO = "Código inválido ou expirado."


def _buscar_por_identificador(session: Session, identificador: str) -> Optional[Usuario]:
    ident = identificador.strip()
    return session.exec(
        select(Usuario).where(
            (Usuario.email == ident.lower()) | (Usuario.matricula == ident.upper())
        )
    ).first()


@router.post("/senha/recuperar/solicitar")
def solicitar_recuperacao(
    dados: RecuperacaoSolicitada,
    http_request: Request,
    session: Session = Depends(get_session)
):
    """Envia o código de recuperação por e-mail.

    Sem SMTP configurado a resposta é **honesta** e nenhum token é gerado: dizer
    "enviamos" sem ter enviado é o que deixa a pessoa esperando para sempre. Com
    SMTP quebrado, o mesmo aviso e o motivo vai para o log.
    """
    if not settings.mail_configurado:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "O envio de e-mail não está configurado neste ambiente, então a "
                "recuperação por token está indisponível. Procure a coordenação "
                "da clínica para que a RT redefina a senha."
            ),
        )

    usuario = _buscar_por_identificador(session, dados.email_ou_matricula)

    # Antes de qualquer outra coisa: conta inativa não recebe token. A resposta
    # continua genérica, porque revelar "essa conta está desativada" também é
    # vazar informação de cadastro.
    if usuario and usuario.ativo:
        codigo = gerar_codigo()
        agora = datetime.now(timezone.utc)

        # Emitir um novo token invalida os anteriores da mesma pessoa: sem isso
        # dava para acumular códigos válidos por conta.
        for antigo in session.exec(
            select(TokenRecuperacaoSenha).where(
                TokenRecuperacaoSenha.usuario_id == usuario.id,
                TokenRecuperacaoSenha.usado_em.is_(None),
            )
        ).all():
            session.delete(antigo)

        token = TokenRecuperacaoSenha(
            usuario_id=usuario.id,
            token_hash=hash_token(codigo),
            expira_em=definir_validade(settings.TOKEN_RECUPERACAO_MINUTOS),
        )
        session.add(token)
        session.commit()

        resultado = email_service.enviar(
            usuario.email,
            "UniCare - código de recuperação de senha",
            (
                f"Olá, {usuario.nome}.\n\n"
                f"Você pediu a recuperação da senha do acesso ao UniCare "
                f"({usuario.matricula}).\n\n"
                f"Seu código é: {codigo}\n\n"
                f"Ele vale por {settings.TOKEN_RECUPERACAO_MINUTOS} minutos e só pode "
                "ser usado uma vez. Se não foi você, ignore esta mensagem: nenhuma "
                "senha foi alterada.\n\n"
                "UniCare - Serviço de Psicologia Aplicada e Clínica Odontológica Integrada\n"
                "Ambiente acadêmico de demonstração."
            ),
        )

        if not resultado.enviou:
            # O token foi gravado antes do envio (a invalidate dos anteriores
            # depende disso), então a falha deixaria um token válido e órfão:
            # existe no banco, ninguém sabe o código e ele sobrevive até
            # expirar. Apagá-lo aqui deixa o estado igual ao de antes do pedido.
            session.delete(token)
            session.commit()

            # A tela distingue "SMTP não configurado" de "SMTP quebrado", e as
            # duas precisam dizer alguma coisa honesta. Sem esta checagem, um
            # serviço devolvendo NAO_CONFIGURADO cairia no texto genérico de
            # "não foi possível enviar" e a pessoa receberia a orientação errada.
            detalhe = (
                "O envio por e-mail não está configurado neste ambiente, então a "
                "recuperação por token está indisponível."
                if resultado.status is StatusEnvio.NAO_CONFIGURADO
                else "Não foi possível enviar o e-mail de recuperação agora."
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    f"{detalhe} Procure a coordenação da clínica para que a RT "
                    "redefina a senha."
                ),
            )

        registrar_log(
            session, usuario, "RECUPERACAO_SOLICITADA", "usuarios", usuario.id,
            endereco_ip=ip_do_cliente(http_request)
        )

    return {"message": _MENSAGEM_GENERICA_SOLICITACAO}


@router.post("/senha/recuperar/redeem")
def resgatar_recuperacao(
    dados: RecuperacaoResgate,
    http_request: Request,
    session: Session = Depends(get_session)
):
    """Troca a senha a partir do código enviado.

    Quem não tem sessão não consegue usar `PATCH /auth/senha`: é exatamente o
    caso que vem para cá.
    """
    usuario = _buscar_por_identificador(session, dados.identificador)

    token_utilizavel: Optional[TokenRecuperacaoSenha] = None
    if usuario:
        token_utilizavel = session.exec(
            select(TokenRecuperacaoSenha).where(
                TokenRecuperacaoSenha.usuario_id == usuario.id,
                TokenRecuperacaoSenha.token_hash == hash_token(dados.codigo.strip().upper()),
            )
        ).first()
        if token_utilizavel and not token_utilizavel.utilizavel:
            token_utilizavel = None

    # Uma única saída para tudo que deu errado, de propósito.
    if token_utilizavel is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_MENSAGEM_TOKEN_INVALIDO,
        )

    try:
        usuario.senha_hash = get_password_hash(dados.nova_senha)
    except SenhaLongaError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc)
        )

    token_utilizavel.usado_em = datetime.now(timezone.utc)
    session.add(usuario)
    session.add(token_utilizavel)
    session.commit()

    registrar_log(
        session, usuario, "SENHA_RECUPERADA", "usuarios", usuario.id,
        endereco_ip=ip_do_cliente(http_request)
    )

    # A trilha registra QUE houve reset, nunca o código.
    return {"message": "Senha redefinida. Você já pode entrar com a nova senha."}

