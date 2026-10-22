import os
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
TEST_DB_NAME = "unicare_test"


def _base_database_url() -> str:
    """Le a URL do banco sem importar app.config.

    Importar app.config executa `settings = Settings()` no nivel do modulo, o que
    fixaria a URL de desenvolvimento em sys.modules antes queravessemos redirecionar.
    Por isso o .env e lido diretamente aqui.
    """
    url = os.environ.get("DATABASE_URL")
    if url:
        return url

    env_path = BACKEND_DIR / ".env"
    if not env_path.exists():
        raise RuntimeError(
            f"backend/.env nao encontrado. Copie .env.example para .env antes de rodar os testes."
        )
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("DATABASE_URL ausente em backend/.env")


def _with_db_name(url: str, db_name: str) -> str:
    parts = urlsplit(url)
    return urlunsplit(parts._replace(path=f"/{db_name}"))


# A suite NUNCA deve rodar contra o banco de desenvolvimento. Por padrao, deriva
# unicare_test da URL configurada (preserva host, porta, usuario e senha), de modo
# que funcione tanto em 5432 quanto em 5433 sem codigo condicional.
# TEST_DATABASE_URL permite sobrescrever quando necessario (ex.: banco efemero em CI).
#
# E atribuido como variavel de ambiente ANTES de qualquer import de app.config: o
# pydantic-settings da prioridade a env var sobre o .env, e migrations/env.py le a
# URL do settings, entao Alembic e aplicacao enxergam sempre o mesmo banco.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL") or _with_db_name(
    _base_database_url(), TEST_DB_NAME
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL


@pytest.fixture(scope="session", autouse=True)
def initialize_database():
    # O schema e construido pela Alembic, nao por create_all(). Isso substitui o
    # comportamento antigo e tem a vantagem de validar tambem as migracoes, e nao
    # apenas os models.
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))

    # Comeca de um schema limpo: a suite cria pacientes e homologa prontuarios, o
    # que tornaria uma segunda execucao dependente do estado deixado pela primeira.
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")

    from app.main import app

    with TestClient(app):
        yield