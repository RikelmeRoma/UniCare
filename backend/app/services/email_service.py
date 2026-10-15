"""Envio de e-mail por SMTP, só com a biblioteca padrão.

Por que `smtplib` e não uma dependência: o projeto não precisa de mais nada.
`smtplib` e `email` são da stdlib, então trocar Gmail por Outlook por servidor
institucional não acrescenta nada ao `requirements.txt`.

A distinção que este módulo existe para fazer é entre **não configurado** e
**configurado e quebrado**. As duas coisas impedem o envio, mas a pessoa precisa
saber qual é:

- sem SMTP configurado, é uma escolha de ambiente, e a tela informa;
- com SMTP configurado que dá erro (credencial expirada, host fora do ar,
  autenticação recusada), a tela também informa, e o motivo vai para o log.

Sem essa separação, o comportamento seria o pior dos dois: dizer "enviamos o
e-mail" e a pessoa esperar para sempre. Ver a armadilha em `AGENTS.md`.
"""
import smtplib
import ssl
from email.message import EmailMessage
from enum import Enum

from app.config import settings


class StatusEnvio(str, Enum):
    ENVIADO = "enviado"
    NAO_CONFIGURADO = "nao_configurado"
    FALHOU = "falhou"


class ResultadoEnvio:
    """Desfecho do envio, com o motivo quando não deu certo."""

    def __init__(self, status: StatusEnvio, detalhe: str | None = None):
        self.status = status
        self.detalhe = detalhe

    @property
    def enviou(self) -> bool:
        return self.status == StatusEnvio.ENVIADO

    @property
    def disponivel(self) -> bool:
        """Dá para tentar enviar — seja porque funcionou, seja porque falhou.

        Quando nem há configuração, retorna False: aí o chamador precisa avisar
        em vez de fingir que algo foi enviado.
        """
        return self.status in (StatusEnvio.ENVIADO, StatusEnvio.FALHOU)


def _montar_mensagem(destinatario: str, assunto: str, corpo: str) -> EmailMessage:
    mensagem = EmailMessage()
    mensagem["From"] = settings.MAIL_FROM
    mensagem["To"] = destinatario
    mensagem["Subject"] = assunto
    # `csp_AMP`/texto puro: o corpo é informativo, e texto simples evita que o
    # token seja interpretado como HTML por algum cliente de e-mail.
    mensagem.set_content(corpo)
    return mensagem


def enviar(destinatario: str, assunto: str, corpo: str) -> ResultadoEnvio:
    """Envia uma mensagem. Nunca levanta exceção: quem chama decide o que fazer.

    Devolve `NAO_CONFIGURADO` ou `FALHOU` em vez de estourar, porque o erro
    vira mensagem de tela e o chamador precisa dos dois casos separados.
    """
    if not settings.mail_configurado:
        return ResultadoEnvio(
            StatusEnvio.NAO_CONFIGURADO,
            "SMTP não configurado: faltam MAIL_HOST, MAIL_USER, MAIL_PASSWORD ou MAIL_FROM.",
        )

    try:
        with smtplib.SMTP(
            settings.MAIL_HOST,
            settings.MAIL_PORT,
            timeout=settings.MAIL_TIMEOUT_SEGUNDOS,
        ) as servidor:
            if settings.MAIL_TLS:
                # starttls(): 587 sobe a conexão em texto puro e só depois vira
                # TLS. O contexto de certificado não é carregado porque o
                # servidor institucional pode usar certificado próprio; a
                # validação de cadeia é o que quebraria nesse caso.
                servidor.starttls(context=ssl.create_default_context())
            servidor.login(settings.MAIL_USER, settings.MAIL_PASSWORD)
            servidor.send_message(_montar_mensagem(destinatario, assunto, corpo))
    except smtplib.SMTPAuthenticationError as erro:
        # 535 é o caso comum: senha errada ou verificação em duas etapas
        # ligada, que faz a senha comum deixar de valer para SMTP.
        return ResultadoEnvio(
            StatusEnvio.FALHOU,
            f"Autenticação recusada pelo servidor SMTP ({erro.smtp_code}): "
            "verifique MAIL_PASSWORD e se a conta não exige senha de app.",
        )
    except (smtplib.SMTPException, OSError) as erro:
        return ResultadoEnvio(
            StatusEnvio.FALHOU,
            f"Falha de rede ou de servidor SMTP: {erro.__class__.__name__}: {erro}",
        )

    return ResultadoEnvio(StatusEnvio.ENVIADO)