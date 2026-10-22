"""Diagnóstico do SMTP: testa o caminho real de envio do e-mail.

Por que este script existe: a pendência "verificar o envio real contra um
SMTP de verdade" não se resolve lendo o código. O código estava certo e o
servidor respondia `535 5.7.3` — credencial. O que falta é o **handshake**:
conectar, ver o que o servidor anuncia, autenticar e entregar uma mensagem.

O script imprime o caminho percorrido passo a passo. A senha **nunca** é
impressa: só o comprimento, se tem espaços internos e o comprimento da forma
compacta. Um diagnóstico que imprime a senha põe a credencial no histórico do
terminal e da conversa — ver a armadilha em `AGENTS.md`.

Uso, a partir de `backend/`:

    .\\.venv\\Scripts\\python.exe scripts\\verificar_smtp.py

Destinatário do e-mail de teste: `UNICARE_TESTE_SMTP_DESTINO` ou, na falta,
a própria conta remetente (o e-mail chega na inbox de quem configurou).
"""
import os
import smtplib
import ssl
import sys
from pathlib import Path

# `python scripts/verificar_smtp.py` deixa o `backend/scripts` no sys.path, e
# o pacote `app` vive um nível acima.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings  # noqa: E402  (import depois do sys.path)


def _titulo(texto: str) -> None:
    print(f"\n=== {texto} ===")


def _configuracao() -> None:
    _titulo("Configuracao lida do .env")
    senha = settings.MAIL_PASSWORD
    compacta = senha.replace(" ", "")
    print(f"  MAIL_HOST        : {settings.MAIL_HOST}")
    print(f"  MAIL_PORT        : {settings.MAIL_PORT}")
    modo = "TLS implicito (SMTP_SSL)" if settings.mail_tls_implicito else (
        "STARTTLS" if settings.MAIL_TLS else "sem TLS"
    )
    print(f"  modo de conexao  : {modo}")
    print(f"  MAIL_USER        : {settings.MAIL_USER}")
    print(f"  MAIL_FROM        : {settings.mail_remetente}")
    print(f"  MAIL_PASSWORD    : <oculto> "
          f"len={len(senha)} compacto_len={len(compacta)} "
          f"espacos_internos={senha.count(' ')}")
    if settings.MAIL_PASSWORD != settings.mail_senha:
        print("  (a senha sera normalizada: espacos internos removidos)")
    print(f"  mail_configurado : {settings.mail_configurado}")


def _abrir():
    if settings.mail_tls_implicito:
        return smtplib.SMTP_SSL(
            settings.MAIL_HOST,
            settings.MAIL_PORT,
            timeout=settings.MAIL_TIMEOUT_SEGUNDOS,
            context=ssl.create_default_context(),
        )
    return smtplib.SMTP(
        settings.MAIL_HOST,
        settings.MAIL_PORT,
        timeout=settings.MAIL_TIMEOUT_SEGUNDOS,
    )


def main() -> int:
    _configuracao()

    if not settings.mail_configurado:
        print("\nSMTP NAO CONFIGURADO: faltam MAIL_HOST, MAIL_USER ou MAIL_PASSWORD.")
        return 2

    destinatario = os.environ.get("UNICARE_TESTE_SMTP_DESTINO") or settings.mail_remetente
    print(f"\n  e-mail de teste sera enviado para: {destinatario}")

    _titulo("1. Conexao")
    try:
        servidor = _abrir()
    except (smtplib.SMTPException, OSError) as erro:
        print(f"  FALHOU: {erro.__class__.__name__}: {erro}")
        return 1

    with servidor:
        print(f"  conectado em {settings.MAIL_HOST}:{settings.MAIL_PORT}")

        _titulo("2. Banner e mechanisms anunciados (EHLO)")
        codigo, mensagem = servidor.ehlo()
        print(f"  codigo EHLO: {codigo}")
        print(f"  banner: {mensagem.strip()[:200]}")
        recursos = servidor.esmtp_features
        for recurso in sorted(recursos):
            print(f"  - {recurso}")

        if settings.MAIL_TLS and not settings.mail_tls_implicito:
            _titulo("3. STARTTLS")
            try:
                servidor.starttls(context=ssl.create_default_context())
                print("  TLS ativado")
                codigo, _ = servidor.ehlo()
                print(f"  recursos apos TLS: {sorted(servidor.esmtp_features)}")
            except (smtplib.SMTPException, OSError) as erro:
                print(f"  FALHOU no STARTTLS: {erro.__class__.__name__}: {erro}")
                return 1
        else:
            _titulo("3. TLS")
            print(" TLS implicito ja aplicado na conexao" if settings.mail_tls_implicito
                  else "  STARTTLS desligado por configuracao")

        _titulo("4. Autenticacao")
        try:
            servidor.login(settings.MAIL_USER, settings.mail_senha)
        except smtplib.SMTPAuthenticationError as erro:
            print(f"  RECUSADO ({erro.smtp_code}): {erro}")
            print("  Causas provaveis:")
            print("    - MAIL_PASSWORD errada")
            print("    - Gmail: senha de app de 16 caracteres SEM espacos")
            print("    - Gmail: a senha de app ainda nao foi usada em nenhum login")
            print("    - a conta tem verificacao em duas etapas e o codigo nao foi usado")
            return 1
        except (smtplib.SMTPException, OSError) as erro:
            print(f"  FALHOU: {erro.__class__.__name__}: {erro}")
            return 1
        print("  autenticado")

        _titulo("5. Envio da mensagem de teste")
        from email.message import EmailMessage

        mensagem = EmailMessage()
        mensagem["From"] = settings.mail_remetente
        mensagem["To"] = destinatario
        mensagem["Subject"] = "UniCare - teste de envio do SMTP"
        mensagem.set_content(
            "Este e um e-mail de teste do diagnostico do SMTP do UniCare.\n"
            "Se voce esta lendo, o caminho de envio funciona.\n",
            cte="base64",
        )
        try:
            servidor.send_message(mensagem)
        except (smtplib.SMTPException, OSError) as erro:
            print(f"  FALHOU: {erro.__class__.__name__}: {erro}")
            return 1
        print(f"  enviado para {destinatario}")
        print(f"  confirme o recebimento na caixa de entrada de {destinatario}")

    print("\nRESULTADO: o caminho de envio funciona.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
