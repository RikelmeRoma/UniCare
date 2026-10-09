# AGENTS.md

Orientações para agentes de IA trabalhando neste repositório. Mantido curto de
propósito: só entra o que **não** é dedutível lendo o código.

## Onde está cada assunto

| Tema | Documento |
|---|---|
| Estado do projeto, pendências, decisões | [`STATUS.md`](./STATUS.md) |
| Como rodar o backend, Alembic, ENUMs | [`backend/README.md`](./backend/README.md) |
| Requisitos funcionais e normativos (RF/RN) | [`RELATORIO_CONSOLIDADO_PROJETO.md`](./RELATORIO_CONSOLIDADO_PROJETO.md) |

## Stack

React 19 + TypeScript + Vite 8 + Tailwind v4 + React Router 7 (frontend);
FastAPI + SQLModel + Alembic + PostgreSQL 16 (backend).

---

## Comandos

Rode os comandos do backend a partir de `backend/`.

### Frontend (raiz)
```bash
npm run dev        # Vite em :5173 (ou :5174 se a 5173 estiver ocupada)
npm run build      # tsc -b && vite build — único gate de tipos
npm run lint       # eslint .
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

---

## Armadilhas

Fatos que quebram trabalho silenciosamente. Todas verificadas.

**A porta do Postgres é 5433, não 5432.** Um PostgreSQL nativo (`postgresql-x64-15`)
ocupa a 5432 nesta máquina. Conectar em `localhost:5432` com a senha correta falha
com `password authentication failed` — o serviço nativo intercepta, não o container.
O container escuta em 5432 internamente; só a publicação no host é 5433.

**Nunca reverter para `create_all()`.** Foi removido de propósito: ele só cria
tabelas e ignora silenciosamente qualquer mudança de coluna em banco existente.
O schema passa a ser versionado por Alembic.

**Um fixture no módulo de teste sobrescreve o do `conftest.py`.** Não repita nomes
de fixture entre `tests/*.py` e `tests/conftest.py` — o do módulo vence, e o
ciclo de migração deixa de rodar sem erro visível.

**Não aponte `DATABASE_URL` para o banco de desenvolvimento ao rodar testes.**
O `conftest.py` deriva `unicare_test` automaticamente. Um override manual para
`unicare_db` contamina o seed.

**O seed depende da ordem dos `paciente_id`.** Agendamentos e prontuários referenciam
uma FK real, então o `commit()` + `refresh()` dos pacientes precisa acontecer antes.
Ver `app/seed.py` — a ordem de `run_seed` não é decorativa.

**`op.drop_table()` não remove tipos ENUM no PostgreSQL.** Um `downgrade` que
cria colunas enum precisa derrubar os tipos explicitamente com `checkfirst=True`,
senão o `upgrade` seguinte falha com `type ... already exists`.

**Novo membro de ENUM exige migração escrita à mão.** Os tipos nativos gravam os
*nomes* Python em caixa alta (`ESTAGIARIO`). O `--autogenerate` não detecta
`ALTER TYPE ... ADD VALUE`.

**O `--autogenerate` não detecta `max_length`.** Ele só emite `ALTER` quando o
*tipo* muda (`VARCHAR` → `Text`). Uma coluna que continua `VARCHAR` e apenas ganha
comprimento é invisível para o comparador. **Sempre leia o arquivo gerado antes de
aplicar** — os `ALTER ... TYPE VARCHAR(n)` da revisão `6699e657b519` são manuais.

**`sa.Column(Text)` sem `nullable` explícito gera `nullable=True`.** Migrando um
campo obrigatório para `Text` via `sa_column=Column(Text)`, o model fica mais
permissivo que o banco. Sintoma: `alembic check` acusa `modify_nullable` mesmo com
o banco correto. Use `Column(Text, nullable=False)`.

**Medir antes de restringir.** `VARCHAR(n)` é ignorado pelo SQLite e aplicado pelo
Postgres. Antes de propor qualquer limite, rode
`SELECT max(length(col)) FROM tabela` — todo `n` deve ser maior que o valor real,
senão a migração falha ou trunca dado.

**Importar `app.config` fixa `settings` com a URL de desenvolvimento.** Para
redirecionar a URL antes do primeiro import, leia o `.env` sem importar o módulo
(ver `tests/conftest.py:_base_database_url`).

**`usuarios.senha_hash` tem 97 caracteres** (salt 32 + `:` + sha256 64). Um
`max_length` abaixo de 97 quebra todo login.

**Não use `passlib` neste projeto — a biblioteca `bcrypt` broke.** O passlib 1.7.4
descobre a versão do bcrypt lendo `bcrypt.__about__`, atributo removido no bcrypt
4+; com bcrypt 5.0.0 ele falha com `error reading bcrypt version`. `crypto_service`
chama `bcrypt.hashpw`/`bcrypt.checkpw` direto, e o `requirements.txt` declara
`bcrypt>=4.1.0`. O bcrypt recusa senha acima de 72 bytes com `ValueError`:
`get_password_hash` lança `SenhaLongaError` e `verify_password` devolve `False`,
para o login responder 401 em vez de estourar 500.

**`verify_password` não tem caminho alternativo.** Houve um tempo em que terminava
em `return plain_password == hashed_password`, o que fazia qualquer `senha_hash`
malformado autenticar com a senha em claro. Não reintroduza nenhuma comparação
que não seja `bcrypt.checkpw`.

**Hash de senha só muda com reseed.** `seed_usuarios` é idempotente por tabela e
não reescreve hash existente. Ao trocar o algoritmo, trunque `usuarios` e deixe o
lifespan semear de novo.

**`endereco_ip` do log não vem de header.** `ip_do_cliente` lê
`request.client.host` e não aceita `X-Forwarded-For`: o header é controlado por
quem faz a requisição. Para cada rota que audita, o parâmetro se chama
`http_request` porque o corpo do login já ocupava `request`.

**CORS não aceita `"*"` junto de `allow_credentials`.** As origens vêm de
`CORS_ORIGINS` no `.env` e são parseadas em `settings.cors_origins_list`. Para
liberar uma origem nova, acrescente no `.env` — não no `main.py`.

**`JOIN` não popula relationship onde o model não declara `Relationship`.**
`select(ProntuarioPsico).join(Paciente, ...)` monta a query certa e mesmo assim
`prontuario.paciente` estoura `AttributeError`. Para filtrar por
`pacientes.curso`, monte um mapa `id → curso` a partir de `Paciente` e use
`pr.paciente_id` — foi o que `app/routers/relatorios.py` precisou fazer.

**A ordem dos guards importa quando o `detail` é normativo.** `require_curso` foi
feito para aceitar o guard de papel em `base=`, avaliado **antes** do curso. Sem
isso a recepção recebia 403 de "clínica restrita" no lugar do `RN-001` — mesmo
status, `detail` errado, e os testes de conformidade affinei pelo identificador
da regra. Não desfaça isso registrando as duas dependências separadas no
endpoint: o FastAPI não garante qual resolve primeiro.

**Filtrar a listagem não protege a escrita.** O `?curso=` do cliente é opcional
e omitível, e `PATCH /{id}/status` age por id, não por lista. Toda rota que
escreve precisa conferir o curso do registro com `validar_curso_do_registro` —
paciente `ambos` é a exceção legítima, agendamento não é (tem cadeira fixa).

**`Promise.allSettled` nunca rejeita.** Um `catch` externo depois dele é código
morto. Ao absorver 401/403/500 sem log, a falha fica invisível.

**O `ClinicContext` sincroniza depois do login.** O `useEffect` depende de
`user.matricula` via `sincronizar` (`useCallback`). Não reintroduza `deps: []`:
isso disparava a carga antes do token existir e deixava a tela nos mocks até um F5.
Use `sync` do contexto (`estado`, `origem`, `falhas`) para distinguir dado real de
mock — nunca assuma que a lista veio do Postgres.

---

## Convenções

- **Idioma:** identificadores, comentários e strings de UI em **português do
  Brasil**. Mantenha o padrão ao editar código existente.
- **Fronteira da API:** o wire é `snake_case` (espelha o Python); o domínio do
  frontend é `camelCase`, mapeado na fronteira em `src/services/api.ts`.
- **Tipos:** `interface` para formas de objeto, união de literais para enums.
- **Erro no backend:** `HTTPException` com o identificador da regra (`RN-001`,
  `RF-007`) no `detail` — os testes de conformidade affirmam por ele.
- **Sem comandos de lint/format no backend.** Não há formatter configurado; siga o
  estilo do arquivo adjacente.

**Nunca use id temporário num registro que outro depende por FK.** O padrão
`id = Date.now()` + troca no `.then()` foi removido do `ClinicContext`: agendamentos
e prontuários referenciam `paciente_id`, e na janela entre o insert local e a
resposta do banco um agendamento recebia 500 e era engolido por `console.warn`.
Crie com `await`, adicione ao estado só após a confirmação e devolva o id real.

**Falha de escrita não pode ser engolida.** `console.warn` no `.catch()` hidava
perda de dados. As funções de escrita do `ClinicContext` retornam
`{ success, message }` e o modal exibe a falha. `PsyRecordPage` chegou a abrir o
modal de sucesso sem `await` e descartar esse retorno — a tela anunciava gravação
que o servidor podia ter recusado.

**O f-string de enum grava a classe, não o valor.** `f"{body.decisao}"` escreve
`HOMOLOGACAO_STATUS_StatusProntuario.VALIDADO` na trilha de auditoria. Use
`.value`. Já aconteceu em `demandas.py` e nas duas rotas de homologação.

## Não faça

- Não adicione `sqlite` como valor padrão de `DATABASE_URL` — a ausência deve
  falhar alto, para não criar um banco paralelo sem aviso
- Não edite `migrations/versions/*` já aplicada; gere uma revisão nova
- Não publique a porta 5432 do Postgres no host nesta máquina
- Não exponha o nome do banco em `/health`; o endpoint é público
- Não remova `.env` do `.dockerignore`: sem ele, `COPY . .` assa a `SECRET_KEY` e a
  senha do banco numa camada da imagem. O `.gitignore` não tem efeito no Docker
- Não reintroduza `build-essential`/`libpq-dev` sem motivo — `psycopg2-binary` traz
  wheel pronto. Só é necessário se trocar por `psycopg2` (versão que compila)