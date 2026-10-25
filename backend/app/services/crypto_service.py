"""Hash de senha com bcrypt.

Antes era SHA-256 com uma iteração e salt de 16 bytes em hexadecimal, mais um
fallback que comparava a senha em texto puro quando o hash era malformado. Isso
significava que qualquer `senha_hash` corrompido aceitava a senha em claro.

Por que `bcrypt` direto e não `passlib[bcrypt]`: o passlib 1.7.4 descobre a
versão do bcrypt lendo `bcrypt.__about__`, atributo removido no bcrypt 5.0. Com
as versões deste projeto (passlib 1.7.4 + bcrypt 5.0.0) o passlib falha com
"error reading bcrypt version". A biblioteca bcrypt sozinha funciona.

Ver `AGENTS.md` para a armadilha.
"""

import secrets
import string

import bcrypt

# Custo do bcrypt: ~250ms por hash. Paga uma vez por login e uma vez por usuario
# no seed; 12 rounds e o equilibrio usual entre lentidao e resistencia a forca
# bruta sobre um hash vazado.
ROUNDS = 12

# O bcrypt trunca (ou recusa) acima de 72 bytes. Um truncamento silencioso faria
# "senha longa A" e "senha longa B" colidirem no mesmo hash.
LIMITE_BYTES = 72


class SenhaLongaError(ValueError):
    """Senha acima do limite aceito pelo bcrypt."""


# Alfabeto da senha inicial gerada pelo servidor. É o mesmo conjunto que a tela
# usava quando a gestão gerava no navegador, para a senha não mudar de formato.
ALFABETO_SENHA = string.ascii_letters + string.digits + "!@#$%^&*()"
TAMANHO_SENHA_INICIAL = 12


def gerar_senha_inicial() -> str:
    """Senha inicial aleatória, gerada no servidor.

    `secrets`, nunca `random`: a senha vai por e-mail e é a credencial de
    primeiro acesso. As quatro classes de caractere são garantidas na
    construção, e o `shuffle` espalha os obrigatórios — sem isso, a primeira
    posição seria sempre maiúscula.
    """
    obrigatorios = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$%^&*()"),
    ]
    restantes = [
        secrets.choice(ALFABETO_SENHA)
        for _ in range(TAMANHO_SENHA_INICIAL - len(obrigatorios))
    ]
    caracteres = obrigatorios + restantes
    secrets.SystemRandom().shuffle(caracteres)
    return "".join(caracteres)


def get_password_hash(password: str) -> str:
    """Gera hash bcrypt com salt novo a cada chamada."""
    if len(password.encode("utf-8")) > LIMITE_BYTES:
        raise SenhaLongaError(
            f"Senha excede {LIMITE_BYTES} bytes e nao pode ser usada com bcrypt."
        )
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=ROUNDS))
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Confere a senha contra o hash. Qualquer falha significa "senha errada".

    Nao existe caminho alternativo: hash malformado, senha longa demais ou hash de
    outro algoritmo resultam em False, nunca em aceitacao.
    """
    if not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        # Senha acima de 72 bytes, hash truncado ou em formato desconhecido.
        return False