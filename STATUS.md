# STATUS — UniCare

**Última atualização:** 2026-10-04 (Fases 1 a 5 concluídas — plano de banco finalizado)
**Branch:** `augusto` · **Remote:** `github.com/RikelmeRoma/UniCare`

Registro de progresso do projeto. Para orientações de trabalho, ver [`AGENTS.md`](./AGENTS.md).
Para os requisitos funcionais e normativos (RF/RN), ver [`RELATORIO_CONSOLIDADO_PROJETO.md`](./RELATORIO_CONSOLIDADO_PROJETO.md).

---

## Situação atual

Infraestrutura de banco consolidada. O PostgreSQL dockerizado é a única fonte de
verdade e o schema é gerenciado por Alembic. Restam pendências de segurança,
constraints de coluna e integração do frontend com a API.

| Fase | Escopo | Status |
|---|---|---|
| 0 | Pré-requisito (Docker Desktop) | ✅ |
| 1 | Acabar com a divergência silenciosa SQLite/Postgres | ✅ |
| 2 | Alembic como fonte autoritativa do schema | ✅ |
| 3 | Constraints: `max_length` + `Text` nos campos narrativos | ✅ **concluída** |
| 4 | Testes rodando contra Postgres | ✅ **concluída** |
| 5 | Higiene de Compose/Docker | ✅ **concluída** |
| — | Trilha de segurança | ⬜ não iniciada |

---

## ✅ Fase 1 — Postgres como fonte de verdade

O banco de desenvolvimento é o container `unicare_postgres` (postgres:16-alpine).
Não há mais fallback para SQLite: `DATABASE_URL` é obrigatório e sua ausência falha
na importação com `ValidationError: DATABASE_URL — Field required`.

| Entrega | Onde |
|---|---|
| `.env.example` commitado + `.env` local com `SECRET_KEY` aleatória (64 chars) | `backend/.env.example`, `backend/.env` |
| `class Config` (v1, deprecado) → `SettingsConfigDict` | `backend/app/config.py:6` |
| `env_file` em tupla, para funcionar da raiz do repo ou de `backend/` | `backend/app/config.py:8` |
| `pool_pre_ping`, `pool_size`, `pool_recycle` | `backend/app/database.py:9` |
| `/health` executando `SELECT 1` real | `backend/app/main.py:248` |
| Porta pública 5433 (ver armadilha abaixo) | `backend/docker-compose.yml:20` |

**Verificado:** `/health` → `dialect: postgresql`; login real `RT-001` → `perfil=rt`;
`.env` resolvido a partir de `backend/` e da raiz; sem `DATABASE_URL` a falha é explícita.

## ✅ Fase 2 — Alembic autoritativa

`create_all()` foi removido. Ele só criava tabelas e silenciosamente ignorava
qualquer mudança de coluna em banco existente.

| Entrega | Onde |
|---|---|
| `alembic.ini` com `sqlalchemy.url` vazio (URL vem do `settings`) | `backend/alembic.ini:92` |
| `env.py` com `SQLModel.metadata` + `compare_type=True` | `backend/migrations/env.py:26` |
| `import sqlmodel` no template de revisões | `backend/migrations/script.py.mako` |
| Revisão inicial | `backend/migrations/versions/6962282d3bc9_schema_inicial_unicare.py` |
| `create_all`/`init_db` removidos | `backend/app/main.py`, `backend/app/database.py` |
| `alembic upgrade head` no boot do container | `backend/docker/entrypoint.sh`, `Dockerfile:24` |
| Banco `unicare_test` criado declarativamente | `backend/docker/initdb/01-create-test-db.sql` |
| `conftest.py` migrando `unicare_test` a cada execução | `backend/tests/conftest.py:56` |

**Verificado:** `alembic check` → *No new upgrade operations detected*; ciclo
coluna nova → detectada → `upgrade` → `downgrade` → revertida; `downgrade base` →
`upgrade head` recriando os 4 tipos ENUM; **pytest 8 passed** repetidamente a
partir de banco vazio, com o banco de desenvolvimento permanecendo intacto.

---

## ✅ Fase 3 — Constraints de coluna

42 colunas eram `VARCHAR` **sem limite** no Postgres. Agora há 36 `VARCHAR(n)` e
7 `TEXT`. Zero colunas de texto sem constraint.

Todos os limites são **expansivos**: o maior valor real foi medido no banco antes
de propor qualquer número, e todo `n` é maior que o correspondente. Nenhum
`ALTER` restringe dado existente.

| Grupo | Quantidade | Exemplo |
|---|---|---|
| `max_length` explícito | 36 colunas | `usuarios.nome VARCHAR(200)`, `usuarios.email VARCHAR(254)` |
| `Text` (narrativas clínicas) | 7 colunas | `prontuarios_psico.inicio/meio/fim_sessao_texto` |
| Sem limite | **0** | — |

Os 7 campos em `Text` são narrativas de entrada livre, onde um limite seria
arbitrário e truncar registro de prontuário significaria perda documental sob
LGPD/CFP — não apenas um erro de validação.

**Verificado:** `alembic check` limpo; `pytest` 8 passed; catálogo confirma
36 `VARCHAR(n)` e 7 `TEXT` nos dois bancos; login intacto com `senha_hash` de 97
chars em `VARCHAR(128)`; e um `nome` de 300 chars agora é **rejeitado** com
`value too long for type character varying(200)` — o limite que o SQLite ignorava
em silêncio. `unicare_db` permaneceu intacto.

## ✅ Fase 4 — Testes e seed

A suíte roda contra o banco dedicado `unicare_test`, nunca no `unicare_db`. O
`conftest.py` deriva o nome a partir da URL configurada e roda `downgrade base` +
`upgrade head` a cada execução — o que valida as migrações além dos models.

O seed foi extraído do lifespan para módulo próprio, eliminando 53 linhas de
duplicação e um endpoint público sem autenticação.

| Entrega | Antes → Depois |
|---|---|
| `app/seed.py` | novo — `run_seed` + 4 funções idempotentes por tabela |
| `app/main.py` | 266 → 66 linhas |
| `app/routers/auth.py` | 113 → 47 linhas (endpoint `/seed` removido) |
| `tests/test_compliance.py` | `prontuario_id = 1` hardcoded → id do prontuário criado |
| `backend/pytest.ini` | novo — `pytest` roda de `backend/` e da raiz |

**Verificado:** 8 passed de `backend/` e da raiz do repo; seed idempotente em 3
execuções seguidas (6/4/4/2); seed do zero sobre banco recém-migrado produz
6/4/4/2 com as FKs íntegras; `POST /api/v1/auth/seed` responde 404; apenas
`/auth/login` e `/auth/me` restaram.

## ✅ Fase 5 — Higiene de Compose/Docker

A imagem da API **nunca tinha sido construída** antes desta fase, então tudo aqui
foi verificado por execução real, não por inspeção.

| Entrega | Efeito |
|---|---|
| `backend/.dockerignore` (novo) | `.env` e `.venv/` fora da imagem |
| Remoção de `build-essential` + `libpq-dev` | imagem muito menor |
| `env_file: .env` no serviço `api` | `SECRET_KEY` alinhado com o dev |
| Remoção de `version: '3.8'` | Compose não avisa mais |
| Healthcheck no serviço `api` | reusa o `/health` que já faz probe real |
| `RELOAD` condicional no entrypoint | `--reload` só em desenvolvimento |

**Imagem: 1.06 GB → 418 MB** (redução de 61%). Antes, `COPY . .` assava o `.env`
— com a chave real e a senha do banco — e 132 MB de `.venv` numa camada da imagem.

**Verificado:** token emitido pelo container é aceito pelo dev local **e vice-versa**
(a divergência de `SECRET_KEY` está resolvida); container `healthy`; `alembic
upgrade head` roda no boot; `docker compose config` sem warning; `pytest` 8 passed;
`alembic check` limpo.

## 🔧 Frontend — Camada 1: sincronização do ClinicContext (corrigida)

### ✅ Camada 1 — o que estava quebrado

`ClinicContext` sincronizava num `useEffect` com `deps: []`, que dispara **antes**
do login. Sem token, as 3 chamadas levavam 401, o `Promise.allSettled` absorvia e a
tela ficava nos mocks até um F5. Como o `catch` externo nunca era alcançado
(`allSettled` não rejeita), a falha não produzia nenhum log.

**Correções em `src/features/clinic/context/ClinicContext.tsx`:**

| Mudança | Efeito |
|---|---|
| `sincronizar` em `useCallback`, dependente de `user.matricula` | sincroniza **depois** do login; re-sincroniza em troca de usuário |
| `catch` morto removido; falha registrada por endpoint | 401/500 passam a aparecer no console |
| 403 de prontuários tratado como aviso, não erro | RN-001 não vira falha de sistema |
| `sync` exposto (`estado`, `origem`, `falhas`, `ultimoEm`) | a UI distingue dado real de mock |
| limpeza no logout | dados do usuário anterior não ficam na tela |

**Verificado** contra a API real: `16024402` (estagiário) → 4 pacientes,
4 agendamentos, 0 prontuários; `REC-001` (recepção) → 4 pacientes, 4 agendamentos e
403 em prontuários tratado como aviso RN-001.

Corrigidos também os 3 erros `TS6133` preexistentes — **`npm run build` está verde
pela primeira vez** (`✓ built in 3.62s`).

### ✅ Camada 1 — validada no navegador

Confirmado pelo usuário no console: **nenhum 401**, e o aviso
`[UniCare] Sincronização parcial: ['prontuários: ... (RN-001)']` aparecendo — ou
seja, o 403 é capturado e classificado pelo nome da regra em vez de engolido.
A duplicação dos logs é o `React.StrictMode` executando efeitos duas vezes em dev.

### ✅ Camada 2 — ReceptionStats ligado aos dados reais

`ReceptionStats.tsx` era **100% estático** (42 / 6 / 12 / 3 e "7.1%" hardcoded) e
nem importava `useClinic`. Agora deriva de `agendamentos` e `pacientes`, com a
mesma fórmula de absenteísmo de `routers/relatorios.py` para não divergir do
relatório gerencial.

Valores que a tela deve mostrar, conferidos no Postgres: `total=4`, `pacientes=4`,
`PRESENTE=1`, `EM_ATENDIMENTO=1`, `FALTAS=0`, `CONCLUIDO=0`.

`AppointmentTable` **já** consumia `useClinic()` — por isso exibia "4 registros
ativos" reais enquanto os cartões ao lado mostravam números inventados.

### ✅ Camada 3 — caminho de escrita (ids temporários × FKs)

`cadastrarPaciente` criava o registro local com `id = Date.now()` e só trocava
pelo id real num `.then()`. Como agendamentos referenciam `paciente_id` por uma FK
real, um agendamento criado nessa janela recebia **HTTP 500** e era engolido por
`console.warn` — aparecia na tela e sumia ao recarregar. No SQLite isso passava
em silêncio, porque as FKs não são aplicadas por padrão.

**Bug reproduzido antes da correção:** paciente com id real `5` + agendamento com
`paciente_id = 1759620000000` → `HTTP 500 Internal Server Error`.

| Mudança | Efeito |
|---|---|
| `cadastrarPaciente` e `adicionarAgendamento` agora são `async` | o item só entra na tela depois que o banco confirma, com o id real |
| `console.warn` → `console.error` + retorno de erro | falha vira mensagem visível, não sumido no console |
| `NewAppointmentModal` só fecha em caso de sucesso | antes fechava sem verificar nada |
| `atualizarStatusAgendamento` e `homologarEvolucaoPsico` com rollback | se o backend recusar (404/403), o estado local volta ao anterior |
| mappers `mapearPaciente`/`mapearAgendamento`/`mapearEvolucao` extraídos | elimina a duplicação entre sincronização e criação |

**Verificado:** paciente → agendamento imediato funcionou com FK válida
(`agendamento id=5, paciente_id=6`). Dados de teste removidos; banco de
desenvolvimento voltou a `6/4/4/2`.

## ✅ Bloco 1 — Demandas de estágio (RF-009)

`demandas` era o **único** dado da `ClinicContext` que não vinha da API: as
3 demandas do `INITIAL_DEMANDAS` viviam só em `localStorage` e não tinham tabela.

| Entrega | Arquivo |
|---|---|
| Model `DemandaEstagio` + `StatusDemanda` + `PrioridadeDemanda` | `backend/app/models/demanda.py` |
| Migração com queda explícita dos tipos ENUM no `downgrade` | `migrations/versions/779eeac7703e_…py` |
| Schemas `DemandaCreate` / `DemandaUpdateStatus` / `DemandaRead` | `backend/app/schemas/demanda.py` |
| `GET` + `POST` + `PATCH /{id}/status`, todos com `registrar_log` | `backend/app/routers/demandas.py` |
| 3 demandas no seed | `backend/app/seed.py` |
| `getDemandas` / `createDemanda` / `updateDemandaStatus` | `src/services/api.ts` |
| Demandas entram no `sincronizar`; `adicionarDemanda` agora `async` | `src/features/clinic/context/ClinicContext.tsx` |
| Form aguarda resposta; matricula vem de `user.matricula` | `src/features/reception/components/StudentDemandPanel.tsx` |
| Teste de conformidade RF-009 | `backend/tests/test_compliance.py` |

**Bugs corrigidos no caminho:**
- `StudentDemandPanel.tsx` enviava `alunoMatricula: '16032935'` fixo — o matriculado
  errado em toda demanda criada. Agora usa `user.matricula` (quem está criando).
- O painel fechava o formulário sem verificar a resposta da API.
- `STATUS_DEMANDA_StatusDemanda.AGENDADO` no log de auditoria: o f-string pegava a
  classe Enum em vez do valor. Corrigido para `body.status.value`.

**Verificado:** `pytest` **9 passed** (era 8); `alembic check` limpo; head em
`779eeac7703e`; ciclo `downgrade -1` → `upgrade head` sem deixar ENUM órfão;
CRUD completo contra a API real; `unicare_db` em `6/4/4/2/3`.

## ✅ Vertical Slice 0 — Segregação por curso

Cada clínica é uma fatia vertical isolada. Um estagiário, supervisor ou RT **só
acessa dados da clínica do próprio cadastro**, tanto na leitura quanto na
escrita. A visão panorâmica do RT deixa de ser global e passa a ser por curso.

**Usuários** (`app/seed.py`) — 2 RTs e 2 recepções, um par por clínica:

| Matrícula | Perfil | Curso |
|---|---|---|
| `RT-001` | RT | ODONTOLOGIA |
| `RT-002` | RT | PSICOLOGIA |
| `DOC-9122` | SUPERVISOR | ODONTOLOGIA |
| `DOC-8821` | SUPERVISOR | PSICOLOGIA |
| `16024402` | ESTAGIARIO | ODONTOLOGIA |
| `16032935` | ESTAGIARIO | PSICOLOGIA |
| `REC-001` | RECEPCAO | ODONTOLOGIA |
| `REC-002` | RECEPCAO | PSICOLOGIA |

A recepção deixou de ser um login institucional de triagem: agora é uma conta
por clínica. `CursoUsuario.GERAL` continua no ENUM por compatibilidade, mas
**nenhum cadastro o usa** e ele não abre atalho em lugar nenhum — sem isso, um
usuário `geral` passaria pelos dois guards de clínica.

`GERAL` sobrou só para a recepção. O seed não altera tabela já populada — para
ver os 8 usuários é preciso truncar e reseedar.

**`app/services/auth_service.py`:** `require_curso(clinica)` vira dependência
FastAPI. `GERAL` **não** ganha acesso às clínicas — ela continua sendo barrada
pelo `RN-001` (papel), preservando o `detail` normativo. O guard de papel entra
em `require_curso` via `base=` justamente para ser avaliado **antes** do curso:
sem isso a recepção recebia "clínica restrita" no lugar do RN-001, que é o
`detail` que os testes de conformidade afirmam. Entram também `cursos_visiveis`
(filtro de listagem, com `ambos` sempre visível) e `validar_curso_do_registro`
(403 em escrita e em PATCH por id).

**`app/routers/prontuarios.py`:** as duas leituras passam a depender do curso e a
contar pelo paciente (a tabela clínica não guarda o curso — vem por FK).
Cada escrita valida o curso do paciente antes de gravar: paciente de outra
clínica é 403, paciente `ambos` é aceito nas duas.

**Base da pirâmide — `pacientes`, `agendamentos`, `demandas`:** antes não tinham
escopo nenhum; o `?curso=` vinha do cliente e o `ClinicContext` chamava sem ele,
então qualquer autenticado via as duas clínicas e o `PATCH` de status aceitava
qualquer id. Agora a listagem filtra por `cursos_visiveis`, a escrita valida o
curso e o PATCH confere o curso do registro. Agendamento não aceita `ambos`:
tem cadeira e consultório fixos.

**`app/routers/auditoria.py`:** o log também é filtrado por clínica — é dado
pessoal (LGPD Art. 11), e a trilha da RT de odontologia não é da de psicologia.
O filtro entra **antes** do `LIMITE`, senão uma clínica que não audita enche a
página com log alheio e esconde o próprio. Isso exigiu a coluna `curso` em
`logs_auditoria` (revisão `c81d4e7a9b02`): a tabela não guarda o registro
afetado, então o curso do autor é a única fonte — e como toda escrita valida o
curso de quem executa, os dois coincidem. Linhas legadas ficaram `geral`, ou
seja invisíveis para quem tem clínica: preferível a vazar para a clínica errada.

**`app/routers/relatorios.py`:** `RF-006` filtra pacientes, agendamentos,
prontuários e fichas pela clínica do solicitante. `distribuicao_cursos` passa a
trazer **só a chave da clínica do solicitante** (antes mandava as duas).

**Frontend:**
- `AuthContext` preserva `curso: 'geral'` — antes ele virava `'odontologia'`, o
  que fazia recepção e RT aparecerem como odontologia;
- `ProtectedRoute` tirou o `&& user.perfil !== 'rt'`: RT não escapa mais de
  outra clínica (a salvaguarda institucional do RN-003 vale para auditoria e
  relatórios, não para dado clínico alheio);
- `/recepcao` e `/psi/recepcao` ganharam `allowedCourses` — sem isso a separação
  era só filtro de tela, já que os componentes de recepção (`AppointmentTable`,
  `ReceptionStats`) leem o array inteiro do `ClinicContext`;
- os modais de novo paciente e novo agendamento pararam de oferecer a outra
  clínica, que o servidor recusaria com 403 na hora de salvar;
- `RTStatsDashboard` lê `distribuicao_cursos[cursoDoRT]` por trás de `num()`.
  As leituras fixas `.psicologia`/`.odontologia` caíam em fallbacks inventados
  (`?? 1`, `?? 2`, `?? 3`) — números falsos em tela institucional.

**Verificado:** `pytest` **16 passed** (era 9); `npm run build` verde;
`alembic check` limpo; lint sem erro novo. Contra a API real: cada supervisor e
cada RT lê a própria clínica e toma 403 na outra; supervisor de odontologia é
403 também no POST de prontuário psicológico; RT-001 recebe só a chave
`odontologia` (3 pacientes) e RT-002 só `psicologia` (2 pacientes); REC-001
enxerga `odontologia, ambos` em pacientes e só `odontologia` em agendamentos e
demandas, REC-002 o inverso; REC-002 leva 403 com `detail` de RN-001 no
prontuário e 403 de curso ao tentar cadastrar paciente odontológico.

**Armadilha encontrada:** os models clínicos não declaram `Relationship`, então
`select(X).join(Paciente, ...)` **não** popula `x.paciente` — vira
`AttributeError: 'ProntuarioPsico' object has no attribute 'paciente'`. O filtro
precisa vir de um mapa `id → curso` montado a partir de `Paciente`.

## ✅ Bloco 2 — Homologação odontológica + bugs que perdiam dado

**Perda silenciosa de prontuário.** `PsyRecordPage` chamava
`adicionarEvolucaoPsico` sem `await`, descartava o `{success, message}` e abria o
modal de sucesso **antes** da resposta do servidor. Se a API recusasse, a clínica
perdia a síntese e o estagiário acreditava que gravou. Passou a esperar, mostra a
`message` quando falha e mantém o rascunho na tela. O "protocolo"
`PRT-${Date.now()}` — número que não existe em lugar nenhum — virou o **id real
devolvido pelo banco**.

**Nome de supervisor gravado como literal.** `supervisorNome` vinha fixo
("Prof. Dr. Robert Santos do Carmo") e era gravado no prontuário. Não existe
vínculo estagiário↔supervisor no schema, então agora vai vazio até esse vínculo
existir.

**`POST /prontuarios/odonto` não tinha cliente.** A homologação odontológica era
**feature morta**: `POST` existia no backend sem método no `api.ts`, a fila da
supervisão tinha fichas inteiras em JSX literal, e os botões "Homologar com Visto
Digital"/"Emitir Parecer" não tinham handler. Agora:

- `PATCH /prontuarios/odonto/{id}/homologar` espelha a clínica de psicologia
  (guard de papel via `base=`, guard de curso, conferência do paciente). Sem
  migração: `FichaOdonto` já tinha `status` e `parecer_supervisor`;
- `api.ts`: `getFichasOdonto`, `createFichaOdonto`, `homologarFichaOdonto`;
- `ClinicContext`: `fichasOdonto` no `sincronizar` (403 da recepção tratado como
  esperado, igual ao psicos) e as escritas devolvendo `{success, message}`, sem id
  temporário;
- **`seed_fichas_odonto`**: a tabela nascia **vazia** — o seed só criava prontuários
  de psicologia, então `GET /prontuarios/odonto` devolvia zero e a fila não tinha o
  que mostrar. Agora são 4 fichas: pendente, homologada, devolvida e uma do
  paciente `ambos`.

**`DentalEvolutionTab` gravava em `useState`** com `id: Date.now()` e `data: '15/09/2026'`
fixa, e anunciava "submetida para homologação docente" sem chamar a API. Passa a
gravar no Postgres; a linha do tempo vem das fichas reais.

**Contadores e telas da supervisão odontológica sem dado:** `SupervisionStats`
tinha `05`/`18`/`02`/`12` literais e badge "100% Ativas"; `ApprovalQueue` mostrava
"5 pendentes" e fichas fictícias; `FeedbackPanel` tinha quatro checkboxes
`defaultChecked` que não persistiam e dois botões sem handler; `TeacherHeader`
carimbava "CRO-SE 4821" fixo; `PedagogicalHistory` tinha três linhas literais e
"Total mês: 42"; `ClinicalPairs` listava oito duplas fictícias com "14 / 20"
procedimentos. Todos passam a derivar das fichas e do usuário logado. Onde ainda
não há dado (CRO de verdade, estagiários vinculados), o campo fica **vazio em vez
de mentiroso**.

**Outros:** `AppointmentTable` renderizava `observacaoLogistica` sem guarda e o
campo é opcional no schema — qualquer agendamento sem observação quebrava a linha
da recepção. `PsyRecordPage` e `DentalRecordPage` inicializavam o paciente com
`|| 1` e `|| 2`, id fixo que deixa o `<select>` sem opção quando a lista real
chega com outros ids.

**Bug de f-string de enum na auditoria:** as duas rotas de homologação gravavam
`HOMOLOGACAO_STATUS_StatusProntuario.VALIDADO` em vez de `VALIDADO` — o f-string
pegava a classe, não o valor. Era o mesmo defeito já corrigido em `demandas.py`.

**Verificado:** `pytest` **20 passed** (era 16); `npm run build` verde; `alembic
check` limpo; lint 14 → 13 erros (preexistentes). Contra a API real: o estagiário
grava ficha e recebe o id real; o supervisor de odontologia homologa e persiste o
parecer; supervisor de psicologia e o próprio estagiário tomam 403; a trilha de
auditoria registra `SUBMISSAO_FICHA_ODONTO` e `HOMOLOGACAO_STATUS_VALIDADO` no
curso certo.

## ✅ Bloco 3 — Segurança do backend

Os três itens marcados como 🔴 Crítico e o de senha do 🟠 estão resolvidos.

**Senha: SHA-256 → bcrypt.** `crypto_service.py` usa a biblioteca `bcrypt` direta,
`rounds=12`. Medido nesta máquina: **436 ms por verificação** e 556 ms por hash —
o login ficou visivelmente mais lento, e a suíte de 6,5s para ~31s por causa dos
25 logins. É o preço de resists a força bruta; `rounds=10` custaria ~4× menos, se
for preciso.

**O fallback cleartext era o pior ponto** e está coberto por teste de regressão:
`verify_password` terminava em `return plain_password == hashed_password`, então
qualquer `senha_hash` malformado — inclusive a senha em claro — autenticava.

**Descoberta: `passlib` não funciona aqui.** O `passlib[bcrypt]` que estava no
`requirements.txt` lê a versão do bcrypt de `bcrypt.__about__`, atributo removido
no bcrypt 4+; com passlib 1.7.4 + bcrypt 5.0.0 ele falha com
`error reading bcrypt version`. Trocado por `bcrypt>=4.1.0` direto, e o
`passlib` saiu do `requirements.txt`.

**Senha acima de 72 bytes** é recusada pelo bcrypt, tanto no hash quanto na
verificação. Sem tratamento, um login com senha longa respondia 500 e entregava
stack trace; agora `get_password_hash` lança `SenhaLongaError` e
`verify_password` devolve `False` — o login responde 401.

**`endereco_ip` real.** O default `"127.0.0.1"` saiu: agora é `None`, para nenhum
call site mentir por omissão. `ip_do_cliente(request)` devolve `request.client.host`
e os **10 call sites** em `auth`, `pacientes`, `agendamentos`, `demandas` e
`prontuarios` passam o `Request`. `X-Forwarded-For` **não** é lido de propósito:
o header é controlado por quem faz a requisição, e aceitá-lo transformaria a
coluna em campo livre. No `auth.py` o corpo do login deixou de se chamar `request`
para não colidir com o `Request` do FastAPI.

**CORS com allowlist.** `"*"` removido. `CORS_ORIGINS` no `.env` (o container
recebe via `env_file`), com `settings.cors_origins_list` fazendo o parse e
`allow_methods`/`allow_headers` restritos. Inclui **5174** porque o `AGENTS.md`
registra que o Vite cai para essa porta quando a 5173 está ocupada — sem isso a
tela quebraria num cenário normal.

**Bug de f-string de enum:** `agendamentos.py` gravava
`STATUS_ALTERADO_PARA_StatusAgendamento.PRESENTE` na trilha. Corrigido com
`.value`, como nas demais rotas.

**Verificado:** `pytest` **25 passed** (era 20); `alembic check` limpo (nenhuma
migração — o hash de 60 caracteres cabe nos `VARCHAR(128)`). Contra a API real:
login OK em 986 ms, senha errada 401, senha de 100 bytes 401 (não 500), e a
auditoria registra `endereco_ip='172.19.0.1'` no lugar do loopback. Preflight de
`localhost:5173`/`5174` é servido; de `site-malicioso.example` e
`localhost:9999` é recusado. Banco de dev reseedado: 8 usuários com `$2b$12$`.

## ✅ Bloco 4 — RF-009 Gerenciamento RBAC + `getMe()`

**A gestão de usuários não existia no servidor.** `createUser`, `updateUser` e
`deleteUser` só escreviam em `localStorage`: a aba "Usuários RBAC" do painel da
RT nascia vazia, as listas de estagiários das duas supervisões idem, e a tela
prometia uma senha `unicare123` que o banco nunca recebia.

**Novo `routers/usuarios.py`** com quatro rotas: `GET`, `POST`, `PATCH /{id}` e
`DELETE /{id}`. O curso **nunca vem do corpo** — é o de quem está executando, o
que torna impossível cadastrar usuário em clínica alheia por requisição.

**Supervisor administra estagiário; promover é ato da RT.** O relatório diz que
"supervisores de odontologia podem gerenciar acadêmicos vinculados à Clínica
Integrada", então `GET` dele devolve só estagiários da própria clínica e
`POST`/`PATCH`/`DELETE` recusam qualquer outro perfil com 403. A primeira versão
desta rota só aceitava RT e o compilador apontou a falha quando `ClinicalPairs` e
`PsySupervisionPage` — telas de supervisor — passaram a precisar dela.

**`DELETE` desativa, não apaga.** O login já checava `ativo` em
`get_current_user`, mas a rota de login em si não checava: **usuário desativado
conseguia fazer login e recebia token**. O teste pegou isso, e o corte de acesso
passou a acontecer na porta de entrada.

**`api.getMe()` finalmente tem consumidor.** O login agora busca o registro real
depois de autenticar: `user.id` deixa de ser `Date.now()`, `registro_profissional`
chega ao frontend — o que preenche o CRO que antes aparecia como "—" no
`TeacherHeader` e no `FeedbackPanel` — e o token é revalidado contra o servidor
em vez de só aceito.

**Modais ganharam campo de senha.** Os três formulários de cadastro pediam nome,
matrícula e e-mail e nenhum tinha senha; com o backend exigindo, todos passaram a
ter, e todos os `createUser`/`updateUser`/`deleteUser` viraram `async` com
tratamento de falha — os três anunciavam sucesso antes da resposta do servidor,
o mesmo defeito corrigido no `PsyRecordPage` no Bloco 2.

**Correção de identificadores RF.** O relatório define RF-007 como *Trilha de
Auditoria* e RF-009 como *Gerenciamento RBAC*, e nossos testes usavam os dois
números para outras coisas. Renomeados: `test_rf007_impedimento_cpf_duplicado`
→ `test_cadastro_impede_cpf_duplicado`, e
`test_rf009_fila_demandas_de_estagio` → `test_bloco1_fila_demandas_de_estagio`.
Liberar o RF-007 permitiu promover os dois testes de auditoria a cobertura real
dele. Os `RN` gainedam tabela de definição no `backend/README.md`, porque o
relatório os menciona no cabeçalho mas não define nenhum.

**Dependência nova:** `email-validator`, exigida pelo `EmailStr` do pydantic. Sem
ela a aplicação inteira não importa.

**Verificado:** `pytest` **32 passed** (era 25); `npm run build` verde. Cobertura
nova: cadastro na clínica correta com hash bcrypt e sem `senha_hash` na resposta,
travessia entre clínicas, supervisor só gerenciando estagiário, estagiário e
recepção barrados, duplicata dando 400 em vez de 500, desativação cortando o login
com o registro preservado, e auto-edição bloqueada.

### 🔴 Crítico

### 🟠 Importante

**Os "3 bloqueadores do frontend" e o SHA-256 foram resolvidos.** Registrados
aqui para rastrear a origem, com o estado atual:

1. ~~`ClinicContext` sincroniza com `deps: []`~~ — **corrigido** na Camada 1: a
   carga passou a depender da matrícula autenticada.
2. ~~`api.getMe()` sem consumidor~~ — **ainda aberto**. O token não é revalidado
   em nenhuma tela, `user.id` continua `Date.now()` e `registro_profissional` nunca
   chega ao frontend. Sai junto com o RF-008.
3. ~~Ids temporários `Date.now()`~~ — **corrigido** na Camada 3: toda escrita
   espera o id real do banco.

### 🟡 Menor

- `data_nascimento` e `data_sessao` são `str`, não `DATE` — impedem ordenação

---

## Decisões e armadilhas

Conhecimentos que não são dedutíveis do código e que custaram tempo diagnóstico:

1. **A porta pública é 5433, não 5432.** Esta máquina tem o serviço nativo
   `postgresql-x64-15` ocupando a 5432. O Docker anuncia o mapeamento, mas quem
   atende é o serviço nativo, produzindo `password authentication failed` mesmo
   com a senha correta. Em máquina sem PG nativo, voltar para 5432 em
   `docker-compose.yml` e no `.env`.

2. **Um fixture definido no módulo de teste sobrescreve o do `conftest.py`.**
   `test_compliance.py` já tinha um `initialize_database` próprio que desligava a
   Alembic na suíte sem nenhum erro visível. Não declarar fixture com nome
   repetido entre módulo e conftest.

3. **`op.drop_table()` não remove tipos ENUM no PostgreSQL.** O `downgrade` da
   revisão inicial os derruba explicitamente com `checkfirst=True`; sem isso, um
   ciclo `downgrade` → `upgrade` falha com `type ... already exists`.

4. **Importar `app.config` fixa `settings` com a URL de desenvolvimento.**
   Para redirecionar os testes, o `conftest.py` lê o `.env` sem importar o módulo.

5. **`Promise.allSettled` nunca rejeita.** O `catch` externo em
   `ClinicContext.tsx:416` é código morto, e os guards `status === 'fulfilled'`
   absorvem qualquer 401/403/500 sem registrar nada.

6. **Incluir um novo membro de ENUM exige migração manual.** Os 4 tipos nativos
   gravam os *nomes* Python em caixa alta (`ESTAGIARIO`, `AGUARDANDO_VALIDACAO`) e
   o `--autogenerate` não detecta `ALTER TYPE ... ADD VALUE`.

7. **O `--autogenerate` não detecta `max_length`.** Ele só emite `ALTER` quando o
   *tipo* muda (`VARCHAR` → `Text`). Uma coluna que continua `VARCHAR` e apenas
   ganha um comprimento é invisível para o comparador, porque o tipo segue sendo
   `String`. Os 35 `ALTER ... TYPE VARCHAR(n)` da revisão `6699e657b519` foram
   escritos à mão. Sempre revise o arquivo gerado antes de aplicar.

8. **`sa.Column(Text)` sem `nullable` explícito gera `nullable=True`.** Ao
   migrar um campo obrigatório para `Text` via `sa_column=Column(Text)`, o model
   fica mais permissivo que o banco. O sintoma é o `alembic check` acusar
   `modify_nullable` mesmo com o banco correto. Usar `Column(Text, nullable=False)`.

---

## Estado verificado

```
pytest           → 32 passed (de backend/ e da raiz)
alembic check    → No new upgrade operations detected
alembic current  → c81d4e7a9b02 (head)
/health          → dialect: postgresql, conectado: true
unicare_db       → usuarios=8 pacientes=4 agendamentos=4 prontuarios_psico=2 fichas_odonto=4
unicare_test     → banco dedicado da suíte, nunca tocado em dev
GET /prontuarios/odonto → 4 fichas do seed (a tabela nascia vazia)
POST /prontuarios/odonto → id real, AGUARDANDO_VALIDACAO
PATCH /prontuarios/odonto/{id}/homologar → VALIDADO com parecer persistido
POST /auth/seed  → 404 (removido na Fase 4)
GET /demandas    → OK (RF-009, Bloco 1)
imagem api       → 418 MB (era 1.06 GB; sem .env e sem .venv)
container api    → healthy; token cruza com o dev local nos dois sentidos
npm run build    → VERDE
npm run lint     → 13 erros preexistentes (era 14; nenhum novo)
```