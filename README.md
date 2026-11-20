# UniCare

Plataforma ambulatorial das Clínicas-Escola da **UNINASSAU Aracaju**, unindo o
Serviço de Psicologia Aplicada (SPA) e a Clínica Odontológica Integrada em um
único sistema: recepção, agendamento, prontuário, homologação docente, gestão de
contas e auditoria.

**Stack:** React 19 + TypeScript + Vite 8 + Tailwind v4 + React Router 7 ·
FastAPI + SQLModel + Alembic + PostgreSQL 16.

**Layout:** a raiz deste repositório é o frontend (Vite + React); `backend/` é a
API FastAPI. Não existe pasta `frontend/` — `package.json`, `src/`, `public/` e as
configurações de build ficam na raiz de propósito.

---

## Subir o projeto

Requisitos: Node 20+, Python 3.12 (a imagem Docker usa `python:3.12-slim`),
Docker.

### 1. Banco

```bash
cd backend
docker compose up -d db
docker exec unicare_postgres pg_isready -U unicare_user -d unicare_db
```

> O Postgres publica a porta **5433** no host — a 5432 desta máquina é ocupada
> por um PostgreSQL nativo.

### 2. Backend

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic upgrade head     # obrigatório
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

A API responde em `http://localhost:8000`, com Swagger em `/docs` e health em
`/health`.

Crie `backend/.env` a partir de `backend/.env.example`. Ele **não** é
versionado e precisa ter `DATABASE_URL` apontando para `localhost:5433`.

### 3. Frontend

Na raiz:

```bash
npm install
npm run dev     # http://localhost:5173 (ou 5174 se a porta estiver ocupada)
```

O cliente HTTP usa `VITE_API_URL` quando definida e, sem ela,
`http://localhost:8000/api/v1`. Se você servir o front por outra origem ou atrás
de proxy, crie um `.env` na raiz com essa variável — ela não é versionada. O
`/health` é resolvido a partir da origem da API, não do prefixo `v1`.

---

## Verificação

```bash
# frontend (raiz)
npm run build        # tsc -b && vite build — gate de tipos
npm run lint         # eslint . — tem problemas preexistentes, não bloqueia

# backend (de backend/)
.\.venv\Scripts\python.exe -m pytest -q          # roda contra unicare_test
.\.venv\Scripts\python.exe -m alembic check      # "No new upgrade operations"
```

Números do último snapshot: [`STATUS.md`](./STATUS.md).

---

## Documentação

| Documento | Responde |
|---|---|
| [`PRD.md`](./PRD.md) | Produto, perfis RBAC, RF-001..009, regras de negócio, credenciais de seed |
| [`SPEC.md`](./SPEC.md) | 54 endpoints, schemas, validações, ENUMs, 14 tabelas, invariantes e configuração de ambiente |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Mapa de módulos e acoplamento, extraído do grafo |
| [`DESIGN.md`](./DESIGN.md) | Cores, fontes, ícones e padrões de tela como estão |
| [`MEMORY.md`](./MEMORY.md) | ADRs, armadilhas verificadas e histórico cronológico |
| [`STATUS.md`](./STATUS.md) | Estado atual verificado e pendências abertas |
| [`AGENTS.md`](./AGENTS.md) | Orientações para agentes de IA neste repositório |
| [`backend/README.md`](./backend/README.md) | Detalhes de Alembic, ENUMs, testes e Docker |
| [`apresentacao/README.md`](./apresentacao/README.md) | Deck de 10 slides, PDF, previews e como regerar |
| [`apresentacao/roteiro-demo.md`](./apresentacao/roteiro-demo.md) | Roteiro cronometrado da demonstração ao vivo |
| [`diagramas/README.md`](./diagramas/README.md) | Diagramas de arquitetura e ERD, com origem e atualização |

Para entrar no sistema, use uma das contas de demonstração do seed — a lista
completa, com matrícula e perfil, está em [`PRD.md`](./PRD.md#6-credenciais-de-demonstração-seed).
Todas usam a senha `unicare123`.

### Apresentação e diagramas

- **`apresentacao/`** — deck `UniCare_MVP.pptx`, export `UniCare_MVP.pdf`, 10
  previews em PNG, o gerador `gerar_slides.py` e o roteiro da demo. O passo a
  passo está em [`apresentacao/README.md`](./apresentacao/README.md).
- **`diagramas/`** — dois HTML autocontidos para abrir no navegador:
  `arquitetura-unicare.html` e `modelagem-banco.html`. Contexto e processo de
  atualização em [`diagramas/README.md`](./diagramas/README.md).

---

## Estrutura

```text
src/              SPA React (features, components, services, shared) — raiz = frontend
public/           assets estáticos servidos pelo Vite
backend/          API FastAPI, modelos SQLModel, migrações Alembic, testes
apresentacao/     slides, roteiro de demo, PDFs e previews (versionados)
diagramas/        arquitetura e ERD em HTML autocontido (versionados)
graphify-out/     grafo arquitetural (gerado localmente, ignorado pelo git)
.archify/         diretório de trabalho do gerador de diagramas (ignorado)
```
