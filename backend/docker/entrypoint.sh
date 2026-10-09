#!/bin/sh
set -e

# O schema e gerenciado pela Alembic. Rodar upgrade head no boot garante que o
# container sempre suba com o banco no esquema esperado.
echo "[entrypoint] aplicando migracoes (alembic upgrade head)..."
alembic upgrade head

echo "[entrypoint] iniciando uvicorn..."
# --reload spawna um processo extra e consome o dobro de memoria. So faz sentido
# em desenvolvimento, controlado pela variavel RELOAD.
if [ "${RELOAD:-0}" = "1" ]; then
    exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000