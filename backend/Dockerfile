FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Nao ha build-essential/libpq-dev aqui de proposito: psycopg2-binary distribui
# wheel pronto, e uvloop/httptools, cryptography e reportlab tambem tem wheels
# cp312. Adicionar essas ferramentas custava ~250-300 MB de camada.
# ATENCAO: trocar psycopg2-binary por psycopg2 (versao que compila) exigirá
# reintroduzir build-essential e libpq-dev.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# O .dockerignore impede que .env, .venv/ e caches entrem na imagem.
COPY . .

# Garante permissao de execucao no entrypoint, independente do host de build
RUN chmod +x docker/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["./docker/entrypoint.sh"]
