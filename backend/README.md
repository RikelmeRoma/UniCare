# UniCare — Backend API (FastAPI + PostgreSQL + Docker)

Backend RESTful desenvolvido para o sistema **UniCare** da Clínica-Escola (Psicologia e Odontologia) da **UNINASSAU Aracaju**, conforme os requisitos especificados em `DOC-EST-03` e a modelagem UML de `DOC-EST-09`.

---

## 🛠️ Stack Tecnológica
* **Framework:** FastAPI (Python 3.12)
* **ORM:** SQLModel (SQLAlchemy 2.0 core)
* **Migrações:** Alembic (versionamento de schema)
* **Banco de Dados:** PostgreSQL 16 (dockerizado)
* **Autenticação:** JWT `HS256` com Bearer (login JSON em `POST /auth/login`) e RBAC
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
>          pacientes, usuarios RESTART IDENTITY CASCADE;
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

## 📧 Envio de e-mail (recuperação de senha e senha inicial de credencial)

A recuperação de senha só funciona se o e-mail sair. Sem SMTP configurado, a
rota `POST /auth/senha/recuperar/solicitar` responde **503** e a tela orienta
procurar a coordenação — ela não finge que enviou.

### Configurar

| Variável | Exemplo | Observação |
|---|---|---|
| `MAIL_HOST` | `smtp.gmail.com` | `smtp-mail.outlook.com` no Outlook |
| `MAIL_PORT` | `587` | `465` é TLS implícito (o código usa `SMTP_SSL`) |
| `MAIL_USER` | `conta@dominio` | a conta que se autentica |
| `MAIL_PASSWORD` | senha de app | **16 caracteres, sem espaços** |
| `MAIL_FROM` | `conta@dominio` | vazio = a própria `MAIL_USER` |
| `MAIL_TLS` | `true` | só relevante na porta 587 (STARTTLS) |
| `MAIL_TIMEOUT_SEGUNDOS` | `10` | timeout do socket SMTP — a recuperação é síncrona na request |

A validade e o intervalo do código de recuperação também são configuráveis:

| Variável | Padrão | Observação |
|---|---|---|
| `TOKEN_RECUPERACAO_MINUTOS` | `15` | validade do código |
| `TOKEN_RECUPERACAO_INTERVALO_SEGUNDOS` | `60` | intervalo mínimo entre pedidos para a mesma conta (rota pública) |

**A senha é de *app*, não da conta.** No Gmail: *Conta do Google → Segurança →
Verificação em duas etapas → Senhas de app*. O Google mostra a senha em quatro
grupos de quatro (`abcd efgh ijkl mnop`), mas o segredo são os **16 caracteres
colados** — com os espaços ou com a senha da conta, o servidor responde `535`
e o e-mail não sai. O código também normaliza essa forma colada, mas o `.env`
é o lugar certo para os 16 caracteres.

`MAIL_FROM` vazio é de propósito: Gmail e Yahoo exigem que o `From:` seja a
conta autenticada, e um remetente diferente é reescrito ou recusado.

### Assistente clínico (Gemini)

| Variável | Padrão | Observação |
|---|---|---|
| `GEMINI_API_KEY` | vazio | sem chave, `/ia/status` devolve `configurado: false` e as rotas `/ia/*` respondem 503 |
| `GEMINI_MODEL_PRIMARY` | `gemini-3.5-flash-lite` | primeiro modelo da cadeia |
| `GEMINI_MODEL_FALLBACK` | `gemini-3.5-flash,gemini-3.8-flash` | separados por vírgula |
| `GEMINI_MODEL_TRANSCRIBE` | `gemini-2.5-flash` | modelo do ditado — **não** é o da cadeia de texto |
| `GEMINI_TIMEOUT_SEGUNDOS` | `20` | timeout da chamada |

A chave fica **só** no backend: no frontend ela exporia a credencial a qualquer
usuário da tela. Trocar a chave exige `docker compose up -d api` — `restart`
não relê o `env_file`. A lista completa de variáveis, com padrão e efeito de
cada uma, está em [`SPEC.md`](../SPEC.md) §7.

### E-mail externo no pedido de credencial

O `/cadastro` é público e, por padrão, só aceita os três domínios
institucionais (`@uninassau.edu.br`, `@prof.uninassau.edu.br` e
`@sempreuninassau.com.br`). Com `PERMITIR_EMAILS_EXTERNOS=true`, qualquer
endereço válido entra na fila — é o que permite enviar a senha inicial para um
Gmail quando a pessoa não tem caixa institucional. A aprovação da RT ou da
coordenação continua sendo o gate: nada é criado sem ela.

### Diagnosticar antes de acreditar

```powershell
.\.venv\Scripts\python.exe scripts\verificar_smtp.py
```

O script percorre o caminho real — conexão, banner, mecanismos `AUTH`
anunciados, `STARTTLS`, login e envio de um e-mail de teste para a própria
conta. Ele **nunca imprime a senha**: só o comprimento, se tem espaços internos
e o comprimento da forma compacta. Diagnóstico que imprime a senha põe a
credencial no histórico do terminal.

### Teste de rede

```powershell
$env:UNICARE_TESTE_SMTP = "1"
.\.venv\Scripts\python.exe -m pytest -m rede -q
```

A suíte padrão **não** toca a rede: `pytest.ini` traz `addopts = -m "not rede"`.
O teste de rede é o que fecha a pendência "verificar o envio real contra um
SMTP de verdade" — dublê prova que o código chama o serviço, não que o
serviço aceita a credencial.

### Teste de ponta a ponta (pela tela)

1. Abra `http://localhost:5173/recuperar-senha`.
2. **Enviar código** com o e-mail ou a matrícula de uma conta **ativa**. A
   resposta é genérica de propósito — ela não diz se a conta existe, para a
   rota não servir de oráculo de enumeração do cadastro.
3. O código chega no **e-mail cadastrado da conta** (não no remetente). Vale
   15 minutos, funciona uma vez, e pedir outro invalida o anterior.
4. **Trocar senha** com o código e a senha nova. Depois, entrar em `/login`
   com a senha nova.
5. Se aparecer a **caixa âmbar "O envio por e-mail está indisponível"**, o
   SMTP falhou — o `verificar_smtp.py` diz o motivo. Não é problema do
   identificador digitado, e a mensagem da tela distingue os dois casos.

Para conferir no banco (o código em claro não existe em lugar nenhum — só o
SHA-256):

```sql
SELECT id, usuario_id, expira_em, usado_em FROM tokens_recuperacao_senha;
SELECT acao, endereco_ip FROM logs_auditoria WHERE acao LIKE 'RECUPERACAO%';
```

> O e-mail chega no endereço cadastrado. Se a conta usa um endereço que não
> tem caixa de entrada real, o SMTP **aceita** a mensagem e ela morre depois
> — é a realidade do domínio, não defeito do sistema.

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

Prefixo global `/api/v1`. Perfis: `estagiario`, `supervisor`, `recepcao`, `rt`,
`coordenacao`.

Cada clínica é uma fatia vertical isolada: `estagiario`, `supervisor`, `recepcao`,
`rt` e `coordenacao` só veem e gravam dados do **curso do próprio cadastro**. O RT
tem visão panorâmica da sua clínica, não das duas; a coordenação existe apenas na
psicologia, tem a mesma visão operacional da RT, mas não gerencia RT nem outra
coordenação. A recepção também é uma conta por clínica (`REC-001` odontologia,
`REC-002` psicologia), porque conciliar agenda das duas em um login só não é
separação. Paciente com `curso = ambos` aparece nas duas clínicas.
`CursoUsuario.GERAL` existe no ENUM por compatibilidade mas **nenhum cadastro o
usa**, e ele não abre atalho em nenhum guard.

| Recurso | Rotas | Acesso |
|---|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` | público / autenticado |
| Senha | `PATCH /auth/senha`, `POST /auth/senha/recuperar/solicitar`, `POST /auth/senha/recuperar/redeem` | autenticado / público |
| Pacientes | `GET /pacientes`, `POST /pacientes` | autenticado, escopado ao curso |
| **Anamnese / sinais vitais** | `GET /pacientes/{id}/anamnese`, `POST /pacientes/{id}/anamnese` | clínico (RN-001 bloqueia recepção), escopado ao curso |
| Agendamentos | `GET /agendamentos`, `POST /agendamentos`, `PATCH /agendamentos/{id}/status` | autenticado, escopado ao curso |
| Prontuário psi | `GET/POST /prontuarios/psico`, `PATCH /prontuarios/psico/{id}/homologar` | GET: clínico, restrito ao curso · POST: só estagiário · PATCH: supervisor, RT e coordenação |
| Ficha odonto | `GET/POST /prontuarios/odonto`, `PATCH /prontuarios/odonto/{id}/homologar` | clínico, restrito ao curso |
| Documento da ficha odonto | `GET/POST /prontuarios/odonto/documentos`, `PATCH .../{id}`, `PATCH .../{id}/homologar` | clínico; supervisor só nas duplas que supervisiona |
| Radiografias | `GET/POST /prontuarios/odonto/radiografias`, `DELETE .../{id}` | clínico, restrito ao curso |
| **Vinculo paciente-estagiario (RF-001)** | `GET/POST /atribuicoes/psico`, `PATCH /atribuicoes/psico/{id}/transferir`, `GET /atribuicoes/psico/minha` | recepcao, rt e coordenação (escrita), clinico (leitura) |
| Duplas odonto | `GET/POST /duplas-odonto`, `GET /duplas-odonto/minha`, `DELETE /duplas-odonto/{id}` | supervisor e rt (odontologia) |
| Solicitações de credencial | `POST /solicitacoes-cadastro`, `GET /solicitacoes-cadastro`, `POST .../{id}/aprovar`, `POST .../{id}/recusar` | fila: rt e coordenação · pedido: público |
| Ocorrências | `GET/POST /ocorrencias/psico` | leitura: recepção, supervisor, estagiário · escrita: recepção |
| Assistente IA | `GET /ia/status`, `POST /ia/assistente`, `POST /ia/transcrever` | clínico (estagiário, supervisor, rt) |
| Auditoria | `GET /auditoria` | rt, coordenação, supervisor — filtrada por curso |
| **Usuários (RF-009)** | `GET /usuarios`, `POST /usuarios`, `PATCH /usuarios/{id}`, `DELETE /usuarios/{id}` | rt (clínica inteira) · coordenação (operação da clínica, sem RT/coordenação) · supervisor (só estagiários da clínica) |
| Relatórios | `GET /relatorios/estatisticas` | rt, coordenação, supervisor — filtrado pelo curso |

A lista canônica dos **54 endpoints**, com corpo, resposta e guard de cada um,
está em [`SPEC.md`](../SPEC.md) §2. Esta tabela aqui é um resumo por recurso.

O vinculo de paciente **nao** tem bloqueio RN-001: e fila de trabalho da recepcao, e ela precisa enxergar a clinica inteira para atribuir. O estagiario, ao escrever prontuario, so alcanca paciente ativo em seu nome.

O cadastro de psicologia exige endereco, numero e CPF com 11 digitos; a
odontologia mantem o contrato anterior. Como `ambos` tambem pode ser criado pela
recepcao de odontologia, o servidor exige os campos apenas para
`curso = psicologia`; o formulario de psicologia exige tambem quando o destino e
`ambos`.

A escrita de evolução psicológica é exclusiva do estagiário. Supervisor, RT e
coordenação usam `/psi/prontuario` apenas para consultar a linha do tempo e
homologar; `POST /prontuarios/psico` recusa esses perfis com 403. A restrição
vale no servidor, não só no formulário.

O filtro de listagem não protege a escrita: `PATCH` por id confere o curso do
registro. Sem isso, esconder a agenda da outra clínica era só conveniência de
tela.

---

## 🔒 Controles de Segurança & Conformidade Normativa
* **RN-001 (Bloqueio de Recepção):** a recepção não acessa dado clínico — prontuário, ficha, anamnese nem usuários clínicos. O guard `autorizado_clinico` devolve **403 Forbidden** com `RN-001` no `detail`.
* **RN-002 (Vedação de Aspas CFP):** O schema `ProntuarioPsicoCreate` analisa via regex `["“”«»]` e recusa a gravação de falas literais (HTTP 422 Unprocessable Entity).
* **RN-003 (Salvaguarda Institucional):** RT e supervisores podem auditar (`GET /auditoria`) e a RT tem salvaguarda institucional — mas **ninguém escapa da própria clínica**: a segregação por curso vale inclusive para eles, e o `require_curso` não tem bypass.
* **RN-004 (Menor de Idade):** o cadastro de paciente menor exige nome e contato do responsável legal (HTTP 400), checado no router de pacientes.
* **RF-004 (Homologação Docente):** apenas supervisores, RT e a coordenação de psicologia podem alterar o status de prontuários para `VALIDADO`, e só nas fichas da clínica deles; o parecer é obrigatório (422 quando vazio) e a autoria vem do token.
* **RF-007 (Trilha de Auditoria):** cada login, cadastro de paciente e visto é registrado na tabela `logs_auditoria`, com o **IP real da requisição** (`request.client.host`, nunca um valor fixo) e o **curso** de quem praticou o ato. A tabela é append-only: nenhuma rota faz `UPDATE` ou `DELETE`.
* **Senhas:** bcrypt com `rounds=12`. `verify_password` só aceita `bcrypt.checkpw` — não existe fallback que compare texto puro.

---

## Normas (RN) e Requisitos (RF)

Os identificadores `RF-001` a `RF-009` e as regras `RN` estão definidos em
[`PRD.md`](../PRD.md), que é a fonte normativa. O relatório original
(`RELATORIO_CONSOLIDADO_PROJETO.md`) foi incorporado ao `PRD.md`/`SPEC.md` em
18/11/2026 e continua recuperável em
`git show b1c8bf0:RELATORIO_CONSOLIDADO_PROJETO.md`.

| RN | Regra | Onde é imposta |
|---|---|---|
| RN-001 | Perfil `recepcao` é bloqueado no prontuário e em todo dado clínico | `require_roles`/`autorizado_clinico`; o guard de papel roda **antes** do de curso para preservar o `detail` |
| RN-002 | Vedação de falas literais (CFP 06/2019) | validador de aspas no `ProntuarioPsicoCreate` (422) |
| RN-003 | Salvaguarda institucional da RT e da coordenação | `require_roles` — mas **não** atravessa a clínica; `require_curso` não tem bypass |
| RN-004 | Menor de idade exige nome e contato do responsável legal | `cadastrar_paciente` (400) |

`RN-005` e `RN-006` não estão definidas em nenhuma fonte; não invente número para
regra nova. A trilha de auditoria com IP real e curso é `RF-007`, descrita em
[`PRD.md`](../PRD.md).

**Atenção:** o relatório usa RF-007 para *Trilha de Auditoria* e RF-009 para
*Gerenciamento RBAC*. O bloqueio de CPF duplicado não tem número no relatório e é
citado por descrição, para não criar colisão.

| RF | Recurso | Onde |
|---|---|---|
| RF-001 | Gestão de recepção e triagem + vínculo paciente↔estagiário | `routers/pacientes.py`, `routers/agendamentos.py`, `routers/atribuicoes.py` |
| RF-002 | Prontuário eletrônico de psicologia | `routers/prontuarios.py` |
| RF-003 | Odontograma e periograma interativo | `DentalRecordPage`; ficha completa persistida em `documentos_ficha_odonto` |
| RF-004 | Fila de homologação docente | `PATCH /prontuarios/{psico,odonto}/{id}/homologar` |
| RF-005 | Gestão de duplas clínicas | `ClinicalPairs.tsx`, `PsySupervisionPage.tsx` |
| RF-006 | Painel executivo da RT | `routers/relatorios.py` |
| RF-007 | Trilha de auditoria imutável | `routers/auditoria.py` |
| RF-008 | Troca rápida de perfil com imposição de senha | **não implementado como presets** — o login é por credencial (`POST /auth/login`) e o destino pós-login vem de `getDestinationRoute` |
| RF-009 | Gerenciamento RBAC | `routers/usuarios.py` |
