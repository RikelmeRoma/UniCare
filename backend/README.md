# UniCare — Backend API (FastAPI + PostgreSQL + Docker)

Backend RESTful desenvolvido para o sistema **UniCare** da Clínica-Escola (Psicologia e Odontologia) da **UNINASSAU Aracaju**, conforme os requisitos especificados em `DOC-EST-03` e a modelagem UML de `DOC-EST-09`.

---

## 🛠️ Stack Tecnológica
* **Framework:** FastAPI (Python 3.12)
* **ORM:** SQLModel (SQLAlchemy 2.0 core)
* **Migrações:** Alembic (versionamento de schema)
* **Banco de Dados:** PostgreSQL 16 (dockerizado)
* **Autenticação:** JWT (OAuth2 Password Bearer) com RBAC
* **Containerização:** Docker e Docker Compose

---

## 🚀 Como Executar

O banco de desenvolvimento é o **PostgreSQL dockerizado**, em `localhost:5433`.

> **Por que 5433 e não 5432?** Esta máquina tem o serviço nativo `postgresql-x64-15`
> ocupando a porta `5432`. Se o container publicar na `5432`, as conexões vindas de
> `localhost` serão absorvidas pelo PostgreSQL nativo e falharão com
> `password authentication failed`, mesmo com a senha correta. O container
> continua escutando em `5432` **internamente**; apenas a publicação no host é 5433.
> Em uma máquina sem PostgreSQL nativo, basta alterar `ports` no `docker-compose.yml`
> e `DATABASE_URL` no `.env` de volta para `5432`.

### 1. Subir apenas o banco
```bash
cd backend
docker compose up -d db
docker exec unicare_postgres pg_isready -U unicare_user -d unicare_db
```

### 2. Configurar o ambiente
```powershell
copy .env.example .env
```
Edite `SECRET_KEY` no `.env` (gere com
`python -c "import secrets; print(secrets.token_urlsafe(48))"`). O arquivo `.env`
não é versionado.

> `DATABASE_URL` é **obrigatório**: não existe valor padrão no código. Sem ele no
> ambiente ou no `.env`, a aplicação falha na importação com
> `ValidationError: DATABASE_URL — Field required`. Isso é proposital — antes havia
> um fallback para um arquivo local que criava um banco paralelo, silencioso,
> sempre que o `.env` não era encontrado. O único banco suportado é o PostgreSQL
> dockerizado do serviço `db`.

> `CORS_ORIGINS` lista as origens liberadas, separadas por vírgula. **Não use
> `"*"`**: junto de `allow_credentials=True` o Starlette reflete qualquer origin e
> a lista vira código morto. Para liberar uma origem nova (front servido por nginx,
> outra porta do Vite), acrescente no `.env` e reinicie a API. O default já cobre
> 5173 e 5174.

> **Senhas usam bcrypt** (`rounds=12`), com salt novo a cada hash. O seed é
> idempotente por tabela: se trocar o `.env` de senha demo ou o algoritmo, trunque
> `usuarios` e deixe o lifespan semear de novo.
>
> ```sql
> TRUNCATE logs_auditoria, prontuarios_psico, fichas_odonto, agendamentos,
>          demandas_estagio, pacientes, usuarios RESTART IDENTITY CASCADE;
> ```
> Depois reinicie a API. O login passa a custar ~450 ms.

### 3. Instalar dependências
```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 4. Rodar as migrações e a API

O schema é gerenciado pela **Alembic**, não por `create_all`. Antes de iniciar a
aplicação, aplique as migrações:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
API: `http://localhost:8000` · Swagger: `http://localhost:8000/docs`

### 5. Confirmar qual banco está em uso
```powershell
curl http://localhost:8000/health
```
```json
{
  "status": "healthy",
  "dialect": "postgresql",
  "driver": "psycopg2",
  "server_version": "PostgreSQL 16.15 on x86_64-pc-linux-musl ...",
  "conectado": true
}
```
O endpoint `/health` executa um `SELECT 1` real: se o banco estiver inacessível,
ele retorna `status: "degraded"` e a mensagem de erro em vez de um `"healthy"` falso.

### API + banco juntos (ambiente completo em container)
```bash
docker compose up -d
```
O container executa `alembic upgrade head` no boot (`docker/entrypoint.sh`), então
o banco sempre sobe no esquema esperado.

### Testes
```powershell
.\.venv\Scripts\python.exe -m pytest tests/ -q
```
A suíte roda contra o banco **`unicare_test`**, nunca no `unicare_db` de
desenvolvimento: `tests/conftest.py` deriva o nome do banco a partir da URL
configurada e roda as migláções com `downgrade base` + `upgrade head` a cada
execução, garantindo estado limpo. O banco é criado automaticamente pelo script
`docker/initdb/01-create-test-db.sql`. Para usar outro banco, defina
`TEST_DATABASE_URL` antes de rodar.

---

## 🗂️ Migrações (Alembic)

O schema vive em `migrations/versions/`. O `create_all()` foi **removido**: ele
sempre falhava em silenciar mudanças de coluna em bancos já existentes.

```bash
# Situação atual vs. models
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check      # "No new upgrade operations detected."

# Gerar revisão após alterar um model
.\.venv\Scripts\python.exe -m alembic revision --autogenerate -m "descrição"

# Aplicar / reverter
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic downgrade -1
```

### ⚠️ Enums no PostgreSQL exigem migração manual

Os campos `perfil`, `curso`, `status` e `status` das fichas são tipos **ENUM
nativos** do PostgreSQL, e gravam os **nomes** do Python em caixa alta
(`ESTAGIARIO`, `AGUARDANDO_VALIDACAO`). Incluir um novo membro — por exemplo um
novo `StatusAgendamento` — **não** é detectado pelo `--autogenerate`. É preciso
escrever a migração à mão:

```python
def upgrade() -> None:
    op.execute("ALTER TYPE statusagendamento ADD VALUE 'REMARCADO'")

def downgrade() -> None:
    # PostgreSQL nao permite remover valores de ENUM; seria necessario
    # recriar o tipo e converter a coluna.
    pass
```

Vale lembrar que `op.drop_table()` **não** remove os tipos ENUM. Por isso o
`downgrade` da revisão inicial os derruba explicitamente com `checkfirst=True` —
sem isso, um ciclo `downgrade` → `upgrade` falha com `type ... already exists`.

---

## 🔌 Endpoints principais

Prefixo global `/api/v1`. Perfis: `estagiario`, `supervisor`, `recepcao`, `rt`.

Cada clínica é uma fatia vertical isolada: `estagiario`, `supervisor`, `recepcao` e
`rt` só veem e gravam dados do **curso do próprio cadastro**. O RT tem visão
panorâmica da sua clínica, não das duas; a recepção também é uma conta por
clínica (`REC-001` odontologia, `REC-002` psicologia), porque concili agenda das
duas em um login só não é separação. Paciente com `curso = ambos` aparece nas
duas clínicas. `CursoUsuario.GERAL` existe no ENUM por compatibilidade mas
**nenhum cadastro o usa**, e ele não abre atalho em nenhum guard.

| Recurso | Rotas | Acesso |
|---|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` | público / autenticado |
| Pacientes | `GET /pacientes`, `POST /pacientes` | autenticado, escopado ao curso |
| Agendamentos | `GET /agendamentos`, `POST /agendamentos`, `PATCH /agendamentos/{id}/status` | autenticado, escopado ao curso |
| Prontuáriofinder | `GET/POST /prontuarios/psico`, `PATCH /prontuarios/psico/{id}/homologar` | clínico, restrito ao curso |
| Ficha odonto | `GET/POST /prontuarios/odonto`, `PATCH /prontuarios/odonto/{id}/homologar` | clínico, restrito ao curso |
| **Demandas (RF-009)** | `GET /demandas`, `POST /demandas`, `PATCH /demandas/{id}/status` | autenticado, escopado ao curso |
| Auditoria | `GET /auditoria` | rt, supervisor — filtrada por curso |
| Relatórios | `GET /relatorios/estatisticas` | rt, supervisor — filtrado pelo curso |

As demandas **não** têm bloqueio RN-001: é uma fila de trabalho pedagógico, e a
recepção precisa enxergá-la para poder conciliá-la com a agenda — mas só a fila
da própria clínica.

O filtro de listagem não protege a escrita: `PATCH` por id confere o curso do
registro. Sem isso, esconder a agenda da outra clínica era só conveniência de
tela.

---

## 🔒 Controles de Segurança & Conformidade Normativa
* **RN-001 (Bloqueio de Recepção):** O endpoint `/api/v1/prontuarios` intercepta e proíbe qualquer requisição feita com token de perfil `recepcao` (HTTP 403 Forbidden).
* **RN-002 (Vedação de Aspas CFP):** O schema `ProntuarioPsicoCreate` analisa via regex `["“”«»]` e recusa a gravação de falas literais (HTTP 422 Unprocessable Entity).
* **RN-003 (Salvaguarda Institucional):** Usuários com perfil `RT` possuem salvaguarda institucional, mas **não escapa da própria clínica** — a segregação por curso vale inclusive para a RT.
* **RN-004 (Homologação Docente):** Apenas supervisores e RT podem alterar o status de prontuários para `VALIDADO`, e só nas fichas da clínica deles.
* **RNF-004 (Logs de Auditoria):** Cada login, cadastro de paciente e visto é registrado na tabela `logs_auditoria`, com o **IP real da requisição** (`request.client.host`, nunca um valor fixo) e o **curso** de quem praticou o ato.
* **Senhas:** bcrypt com `rounds=12`. `verify_password` só aceita `bcrypt.checkpw` — não existe fallback que compare texto puro.
