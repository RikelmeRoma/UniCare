from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlmodel import Session

from app.config import settings
from app.database import engine
from app.seed import run_seed
from app.routers import auth, pacientes, agendamentos, prontuarios, auditoria, relatorios, demandas

@asynccontextmanager
async def lifespan(app: FastAPI):
    # O schema e gerenciado pela Alembic (migrations/), nao por create_all.
    # Rode `alembic upgrade head` antes de iniciar a aplicacao.
    with Session(engine) as session:
        run_seed(session)

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API REST do Sistema UniCare • Clínicas-Escola de Psicologia e Odontologia (UNINASSAU)",
    lifespan=lifespan
)

# CORS com allowlist explicita (CORS_ORIGINS no .env). O "*" anterior, junto com
# allow_credentials=True, fazia o Starlette refletir qualquer origin: a lista de
# localhost era codigo morto e o navegador de qualquer site mandava a requisicao
# com o cookie/sessao. allow_credentials continua True porque a lista e fechada.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Inclusão dos Roteadores com prefixo v1
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(pacientes.router, prefix=settings.API_V1_STR)
app.include_router(agendamentos.router, prefix=settings.API_V1_STR)
app.include_router(prontuarios.router, prefix=settings.API_V1_STR)
app.include_router(auditoria.router, prefix=settings.API_V1_STR)
app.include_router(relatorios.router, prefix=settings.API_V1_STR)
app.include_router(demandas.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "sistema": "UniCare API",
        "versao": settings.VERSION,
        "documentacao": "/docs",
        "normas": ["CFP 06/2019", "CFO", "LGPD Art. 11"]
    }

@app.get("/health")
def health():
    # Diagnóstico de infraestrutura: confirma qual banco está de fato em uso.
    # Sem o probe real, uma falha de conexão no Postgres passava despercebida.
    info = {
        "status": "healthy",
        "dialect": engine.dialect.name,
        "driver": engine.dialect.driver,
    }
    try:
        with Session(engine) as s:
            s.execute(text("SELECT 1"))
            info["server_version"] = str(s.execute(text("SELECT version()")).scalar())[:80]
        info["conectado"] = True
    except Exception as exc:
        info["status"] = "degraded"
        info["conectado"] = False
        info["erro"] = str(exc).splitlines()[0][:200]
    return info