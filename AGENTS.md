# AGENTS.md

Orientações para agentes de IA neste repositório. Curto de propósito: só entra o
que **não** é dedutível lendo o código, e o detalhe fica nos documentos irmãos.

## Índice da documentação

| Documento | Responde |
|---|---|
| [`PRD.md`](./PRD.md) | O que o produto é, perfis RBAC, RF-001..009, regras de negócio |
| [`SPEC.md`](./SPEC.md) | Contratos de rota, schemas, validações, ENUMs, invariantes |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Mapa de módulos e acoplamento, extraído de `graphify-out/` |
| [`DESIGN.md`](./DESIGN.md) | Interface **como está**: cores, fontes, ícones, padrões de tela |
| [`MEMORY.md`](./MEMORY.md) | ADRs, armadilhas verificadas e histórico cronológico |
| [`STATUS.md`](./STATUS.md) | Estado atual, números verificados e pendências |
| [`backend/README.md`](./backend/README.md) | Rodar backend, Alembic, ENUMs, testes |
| [`README.md`](./README.md) | Porta de entrada e subida rápida |

## Stack

React 19 + TypeScript + Vite 8 + Tailwind v4 + React Router 7 (frontend);
FastAPI + SQLModel + Alembic + PostgreSQL 16 (backend).

**Layout:** a raiz do repositório é o frontend; `backend/` é a API. Não existe
pasta `frontend/` — `package.json`, `src/`, `public/`, `index.html` e os
`tsconfig`/`vite.config` ficam na raiz. Comandos `npm` rodam na raiz; comandos de
API, Alembic e pytest rodam em `backend/`.

## Comandos

Rode os comandos do backend a partir de `backend/`.

### Frontend (raiz)

```bash
npm run dev        # Vite em :5173 (ou :5174 se a 5173 estiver ocupada)
npm run build      # tsc -b && vite build — único gate de tipos
npm run lint       # eslint . — tem problemas preexistentes, não bloqueia
```

### Backend

```bash
# banco
docker compose up -d db
docker exec unicare_postgres pg_isready -U unicare_user -d unicare_db

# dependências
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# schema — obrigatório antes de iniciar a API
.\.venv\Scripts\python.exe -m alembic upgrade head

# API
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# testes — roda contra unicare_test, nunca no banco de desenvolvimento
.\.venv\Scripts\python.exe -m pytest -q
```

### Verificação de estado

```bash
.\.venv\Scripts\python.exe -m alembic current   # revisão aplicada
.\.venv\Scripts\python.exe -m alembic check     # "No new upgrade operations detected."
curl http://localhost:8000/health               # dialect e conectividade reais
```

Números do último snapshot em [`STATUS.md`](./STATUS.md).

## Regras invioláveis

Estas seis quebram o sistema em silêncio. As demais armadilhas estão em
[`MEMORY.md`](./MEMORY.md), seção por tema.

1. **Nunca reverter para `create_all()`.** O schema é versionado por Alembic;
   `create_all` ignora mudança de coluna em banco existente.
2. **A porta do Postgres é 5433, não 5432.** Um PostgreSQL nativo ocupa a 5432
   nesta máquina; conectar nela falha com `password authentication failed`.
3. **`backend/.env` nunca é versionado nem copiado para a imagem.** A checagem que
   vale é `git ls-files backend/.env` (saída vazia) e o arquivo precisa continuar
   no `.dockerignore`.
4. **Membro novo de ENUM exige migração escrita à mão**, com downgrade que recria
   o tipo. `--autogenerate` não detecta `ALTER TYPE ... ADD VALUE`.
5. **Regra de tela precisa existir no servidor.** Exigir parecer, senha ou vínculo
   só no frontend deixa a regra como conveniência: qualquer cliente chama a rota.
6. **Falha de escrita precisa ser renderizada.** Toda função de escrita é `async`,
   retorna `{ success, message }` e o erro aparece no modal ou em banner — nunca
   num `console.warn`.

## graphify

O mapa arquitetural vem do grafo persistido em `graphify-out/`:

- `graphify-out/graph.json` — 2014 nós, 5955 arestas, 78 comunidades.
- `graphify-out/GRAPH_REPORT.md` — god nodes, comunidades, conexões inesperadas.
- `graphify-out/graph.html` — visualização interativa.

`ARCHITECTURE.md` é derivado desse diretório **sem reescanear o código**. O corpus
é code-only (200 arquivos; `.md`, PDFs, apresentações e imagens ficaram fora).
`graphify-out/` não é versionado — se precisar dele, reconstrua com o CLI
`graphify`. Para consultar: `graphify query "<pergunta>"` e
`graphify explain "<nó>"`.

## Convenções

- **Idioma:** identificadores, comentários e strings de UI em **português do
  Brasil**. Mantenha o padrão ao editar código existente.
- **Fronteira da API:** o wire é `snake_case` (espelha o Python); o domínio do
  frontend é `camelCase`, mapeado em `src/services/api.ts`.
- **Tipos:** `interface` para formas de objeto, união de literais para enums.
- **Erro no backend:** `HTTPException` com o identificador da regra (`RN-001`,
  `RF-007`) no `detail` — os testes de conformidade afirmam por ele.
- **Identificadores normativos:** use apenas os que existem em
  [`PRD.md`](./PRD.md). Para algo fora da lista, cite por descrição.
- **Backend sem lint/format configurado:** siga o estilo do arquivo adjacente.
- **Documentação é as-is:** `DESIGN.md` e `ARCHITECTURE.md` descrevem o que
  existe, sem propor redesign ou refactor.
