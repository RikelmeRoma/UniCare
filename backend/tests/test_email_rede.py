"""Teste de rede do envio de e-mail (SMTP de verdade).

Por que este arquivo existe: a pendência "verificar o envio real contra um
SMTP de verdade" não se fecha com dublê. O dublê prova que o código chama o
serviço; o que ele não prova é se o serviço aceita a credencial e entrega a
mensagem. Foi exatamente aí que a pendência travou: o código estava certo e o
servidor respondia `535 5.7.3`.

O teste **não** faz parte da suíte padrão: `pytest.ini` traz
`addopts = -m "not rede"`, então `pytest` continua sem tocar a rede. Para
rodar:

    UNICARE_TESTE_SMTP=1 .\\.venv\\Scripts\\python.exe -m pytest -m rede -q

O destinatário é `UNICARE_TESTE_SMTP_DESTINO` ou, na falta, a própria conta
remetente — assim o e-mail de teste chega na inbox de quem configurou, e
ninguém precisa depender de endereço de terceiro.
"""
import os

import pytest

from app.config import settings
from app.services import email_service

pytestmark = pytest.mark.rede


@pytest.mark.skipif(
    not os.environ.get("UNICARE_TESTE_SMTP"),
    reason="Defina UNICARE_TESTE_SMTP=1 para falar com o SMTP de verdade.",
)
def test_envio_real_e_aceito_pelo_servidor():
    if not settings.mail_configurado:
        pytest.skip("SMTP nao configurado no .env.")

    destinatario = os.environ.get("UNICARE_TESTE_SMTP_DESTINO") or settings.mail_remetente

    resultado = email_service.enviar(
        destinatario,
        "UniCare - teste de envio (rede)",
        (
            "Teste de rede do UniCare.\n"
            "Se voce esta lendo, o caminho de envio esta funcionando.\n"
        ),
    )

    assert resultado.enviou, (
        f"O SMTP recusou o envio: status={resultado.status} "
        f"detalhe={resultado.detalhe}"
    )
