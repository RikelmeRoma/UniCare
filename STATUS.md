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

## ✅ Bloco 5 — Parecer honesto e tela institucional sem dado inventado

Fecha o último ponto que **gravava** dado falso em prontuário e limpa o painel
gerencial de número sem origem.

**O parecer do supervisor era pré-preenchido.** `PsyApprovalQueue.tsx:20` abria o
textarea com um texto já redigido ("Evolução estruturada com rigor técnico…") e
era esse texto que ia no `PATCH /homologar`, gravado no prontuário como se fosse
autoria docente. Pior: `HomologacaoRequest.parecer` era um `str` sem restrição, e
`homologarEvolucaoPsico` retornava `void` — então a tela anunciava "APROVADA com
Visto Eletrônico" sem esperar resposta, e uma recusa sumia num `console.error`.

Agora a exigência vale **no servidor**: `HomologacaoRequest` recusa parecer vazio
ou só com espaços (422) nas duas clínicas, com dois testes que também verificam
que a recusa não gravou nada. O campo começa vazio, os botões só decidem com texto
e o `homologarEvolucaoPsico` devolve `{ success, message }` como o
`homologarFichaOdonto`. O fallback que mostrava "Parecer padrão: Homologado com
conformidade integral." em prontuário sem parecer virou "Sem parecer registrado".

**Dado falso removido do painel da RT:**
- selo "Autenticidade Verificada (LGPD)" com `SHA-256: 8f4b2e...c901a` fixo, que
  não existe em lugar nenhum do sistema — trocado por identificação verificável
  (`paciente_id` + LGPD Art. 11) e a declaração explícita de que o hash de
  integridade não está implementado;
- "Taxa de Ocupação de Cadeiras: 85%" — o relatório não tem campo nenhum de
  ocupação, cadeiras ou AMD. Card removido e substituído por "Fichas
  Odontológicas Homologadas", que tem dado real;
- barras `60%`/`40%`/`100%` literais ao lado de números reais: a largura agora é
  a participação do item no total da clínica, e a dos menores é a proporção real
  de conformidade (a barra fixa afirmava 100% quando o relatório conta só os que
  têm responsável);
- `?? 1` em "menores com responsável" virou `—`, e a falha do relatório ficou
  sinalizada em vez de mascarada por número inventado.

**`INITIAL_PLANOS` eliminado.** Eram quatro planos de tratamento fictícios em
código, contados como "Procedimentos Registrados" no painel da RT e usados pela
`TreatmentPlanTab`. Agora são derivados das fichas odontológicas reais, que já
trazem dente, procedimento, dupla e status.

**Ficha odontológica sem clínico inventado:** alergia "Penicilina e derivados",
HAS "Losartana 50mg" e sinais vitais `120/80`, `98 mg/dL`, `74 bpm` eram os mesmos
para qualquer paciente selecionado. Agora é "Não registrado" / "Anamnese não
registrada" — o estado honesto até a tabela de sinais vitais entrar.

**Radiografia sem imagem de terceiro:** as duas entradas apontavam para fotos do
Unsplash apresentadas como radiografia de paciente, com laudo fictício e visto
docente fixo, e o `handleSalvar` caía no mesmo fallback quando não havia upload.
Agora a lista nasce vazia, `imagemUrl` é opcional, a mensagem de sucesso avisa que
o registro é só da sessão (não existe tabela de radiografia no backend) e há
estado vazio explícito.

**Verificado:** `pytest` **34 passed** (era 32); `npm run build` verde; `alembic
check` limpo (nenhuma migração); lint estável em 13 erros preexistentes.

**Nota de teste:** os dois testes de parecer obrigatório criam o próprio registro
em vez de consumir uma pendência do seed. Depender do seed os tornava sensíveis à
ordem — os testes de homologação anteriores já consomem as duas fichas pendentes e
o teste falhava na suíte, passando isolado.

### 🔴 Crítico

### 🟠 Importante

**Os "3 bloqueadores do frontend" e o SHA-256 foram resolvidos.** Registrados
aqui para rastrear a origem, com o estado atual:

1. ~~`ClinicContext` sincroniza com `deps: []`~~ — **corrigido** na Camada 1: a
   carga passou a depender da matrícula autenticada.
2. ~~`api.getMe()` sem consumidor~~ — **corrigido no Bloco 4**: o login busca o
   registro real depois de autenticar. `user.id` é o id do banco (não mais
   `Date.now()`) e `registro_profissional` chega às telas.
3. ~~Ids temporários `Date.now()`~~ — **corrigido** na Camada 3: toda escrita
   espera o id real do banco.

### 🟡 Menor

- `data_nascimento` e `data_sessao` são `str`, não `DATE` — impedem ordenação

---

## ✅ Bloco 6 — Anamnese e sinais vitais do paciente

Fecha os dois painéis que ainda afirmavam clínico sem dado: a ficha odontológica
mostrava "Anamnese não registrada" e "Não registrado" em PA, glicemia e FC.

**Nova tabela `anamneses`** — uma linha por aferição, com o paciente e a data.
`afetido_em` é `DateTime` e não `str` de propósito: `data_nascimento` e
`data_sessao` são `str` e por isso não ordenam nem comparam, e a nova tabela não
deveria repetir o problema. É a **4ª foreign key** do schema.

**Validação de faixa, não decoração.** PA por regex `sistólica/diastólica`,
glicemia 20–600 mg/dL, frequência 20–250 bpm e temperatura 30–45 °C. Dado
impossível numa ficha é pior do que ficha sem dado: uma glicemia de 980 quase
sempre é "98" digitado em campo de três dígitos.

**Rotas `GET/POST /pacientes/{id}/anamnese`**, dentro de `pacientes.py` porque é
dado do paciente. Reaproveita `cursos_visiveis()` na leitura e confere a clínica
na escrita, onde o filtro de listagem não protege. Dado clínico: a recepção fica
de fora pelo RN-001, e a autoria vem do token — o corpo do POST não tem campo de
responsável, então nenhum cliente registra aferição em nome de outra pessoa.

**`autorizado_clinico` saiu de dentro do `prontuarios.py` para
`auth_service.py`.** As rotas de anamnese precisam da mesma lista de perfis e duas
listas divergem em silêncio.

**Frontend** — `api.ts` com `getAnamneses`/`criarAnamnese`, estado no
`ClinicContext` por id de paciente com escrita retornando `{ success, message }`,
e o modal de aferição alimentando os três campos e o painel de alergias. A ficha
mostra a última aferição com autor e hora, e quantas existem no histórico. O 403
da recepção é absorvido sem virar erro de sistema.

**Verificado:** `pytest` **39 passed** (era 34); `npm run build` verde; `alembic
check` limpo; ciclo `downgrade -1` → `upgrade head` limpo; lint estável em 13.

**Armadilha encontrada na migração:** `op.create_table` com
`sa.Column('id', sa.Integer())` e **sem** `sa.PrimaryKeyConstraint('id')` não vira
`SERIAL` no PostgreSQL — a coluna fica `integer` sem default e todo insert falha
com `null value in column "id"`. As tabelas existentes declaram a constraint
explícita, e o sintoma só aparece no primeiro insert, não no `alembic check`.

## ✅ Bloco 7 — Conciliação da fila de demandas + carimbo de autoria docente
Fecha a única feature já entregue que não era usável de ponta a ponta, e cria a
fonte real de "quem viu" o prontuário.
**A recepção via a fila do RF-009 e não conseguia agir nela.**
`PATCH /demandas/{id}/status` existia no backend e tinha método no cliente, mas
**nenhum componente o chamava** — zero chamadores em todo o `src/`. Agora o
`StudentDemandPanel` tem o botão **Conciliar** nas linhas pendentes, com estado por
linha para que só o botão clicado mostre "Conciliando…". O componente é
compartilhado pelas duas recepções (`ReceptionDashboard.tsx:52` com
`cursoFiltro="odontologia"` e `PsyReceptionDashboard.tsx:54` com `"psicologia"`),
então a mudança serve as duas clínicas de uma vez.
**`atualizarStatusDemanda` passou a devolver resultado.** Era `void`, com update
otimista e rollback engolido em `console.error` — o mesmo defeito já corrigido em
`homologarEvolucaoPsico`. Agora é `async` com `{ success, message }`, e a falha
aparece na linha em vez de sumir.
**O supervisor passa a ser carimbado pelo servidor.** A coluna
`prontuario.supervisor_nome` existia desde o schema inicial, mas só era
preenchida na criação, com o que o cliente mandava — que desde o Bloco 4 é string
vazia. Não existe vínculo estagiário↔supervisor no schema, então a homologação
agora grava `current_user.nome`: o próprio homologador, no momento do ato, com o
mesmo nome que já vai para a trilha de auditoria. É o que permite à ficha dizer
"visto por X" com dado verificável em vez do literal "Prof. Dr. Robert Santos do
Carmo (CRP 19/0844)".
**Pendência deliberada:** o vínculo formal estagiário ↔ turma ↔ supervisor, que o
relatório menciona ("supervisores de psicologia podem gerenciar acadêmicos
vinculados à sua turma de SPA"), exige tabela nova e pertence ao RF-005.
**Verificado:** `pytest` **40 passed** (era 39); `npm run build` verde; `alembic
check` limpo (**nenhuma migração**); lint estável em 13 erros preexistentes. O
PATCH de conciliação já tinha cobertura de teste; a novidade de backend é o teste
do carimbo, que confere as três etapas — vazio na criação, preenchido na
homologação, persistente na releitura.

## ✅ Bloco 8 (Fatia A) — A ficha clínica não nasce preenchida

O item mais grave da paridade de psicologia: **evolução clínica inventada,
gravada no banco**.

`PsyRecordPage` abria com os três campos da síntese tripartite já preenchidos por
uma redação fixa — "paciente relata manutenção do quadro de sobrecarga em período
de avaliações acadêmicas", "sem indicadores de risco autolesivo" — e
`handleSalvarEnviar` gravava exatamente esse texto. O estagiário não precisava
escrever nada para que um supervisor homologasse uma sessão que ele não
conductiu, com avaliação de risco que ninguém fez. Não era placeholder: era
`useState` com valor inicial, num `value={}` controlado.

Agora os três nascem vazios e o registro é de quem redige. O aviso é explícito
sobre **qual** fase falta, porque travar o botão sem dizer o quê obriga o estagiário
a caçar o campo.

**A regra precisou ir para o servidor no mesmo passo.** `validar_vedacao_aspas`
só recusava aspas e aceitava string vazia — esvaziar os defaults sem isso abriria
caminho para ficha em branco chegar na fila de homologação, por qualquer cliente
que chamasse a rota direto. Virou `validar_texto_clinico` e agora recusa também o
branco, citando `RNF-003`. `RN-002` continua sendo só o das aspas: reaproveitar o
identificador errado faria os testes de conformidade affirmarem por uma regra que
não é a que foi violada.

O teste confere os três campos × três formatos de vazio (`""`, `"   "`,
`"\n\t "`), que a fila não cresceu e que o caminho válido continua aceito.

**Verificado:** `pytest` **41 passed** (era 40); `npm run build` verde; `alembic
check` limpo (**nenhuma migração**); lint estável em 13 erros preexistentes.

**Ainda pendente na paridade de psicologia:** 8 contagens literais nos dois painéis
de psicologia, `User.ativo` não mapeado, nome/CRP/turma literais no cabeçalho
docente, e a afirmação falsa de que o estagiário é criado com senha padrão. E o
F(b), a senha fixa em `AuthContext`.

## ✅ Bloco 8 (Fatia B) — A fila de homologação não carimba decisão errada

**Uma evolução devolvida aparecia como homologada.** O badge era fixo em "Homologado
(CRP)" e entrava em tudo que não estava na fila de pendentes — e `historico` é
`status !== 'AGUARDANDO_VALIDACAO'`, que inclui `DEVOLVIDO_PARA_AJUSTE`. Era o item
mais perigoso da tela, porque é a decisão que o supervisor confia: ele vê "Homologado"
numa ficha que ele mesmo devolveu, e um registro devolvido vira documento clínico
validado por leitura de tela.

O rótulo agora vem do `status` de cada item: homologado em verde, devolvido em
âmbar, em elaboração em cinza. O `(CRP)` saiu — prometia assinatura digital sem
registro nenhum — e no lugar aparece `por {supervisorNome}`, o nome que o Bloco 7
grava no ato da homologação.

**O selo de conformidade anti-aspas era decorativo.** O badge verde "Conformidade
Anti-Aspas CFP" aparecia sem rodar teste nenhum; a verificação existia só na
digitação, no `PsyRecordPage`. Agora a fila testa os três textos da síntese e, se
houver aspa, mostra **reprovada no servidor (RN-002)** em vez do selo verde — o
que evita o supervisor aprovar por conferência visual algo que o `POST` recusa.

O teste do regex precisa bater caractere a caractere com o do backend:
`/["“”«»]/`. Na primeira escrita as aspas curvas viraram retas e o selo voltaria a
ser verde justamente na nota que o servidor rejeita. `PsyRecordPage` e
`PsyApprovalQueue` devem ter o mesmo conjunto — `"`, `“`, `”`, `«`, `»`.

**"na Semana" saiu do título**, porque `historico` não filtra por período e
`dataSessao` é texto livre. O título também dizia "Atendimentos Homologados" para
uma lista que não é só de homologados.

**Verificado:** `pytest` 41 passed (sem mudança de backend); `npm run build` verde;
`alembic check` limpo; lint nos 13 de baseline, nenhum deles neste arquivo.

## ✅ Bloco 8 (Fatia C) — Os painéis de psicologia param de exibir número inventado

Oito contagens literais saíram: `28`, `04`, `07`, `02` na recepção e `06`, `24`,
`02`, `10` na supervisão. Nenhuma delas vinha de consulta nenhuma.

**Recepção** (`PsyReceptionStats`): agora derivam de `agendamentos` filtrado por
`curso === 'psicologia'`, por `status`. O pior era o rodapé do terceiro cartão,
**"7 de 10 consultórios em uso"** — não existe cadastro de consultórios no
schema, então o 10 não tinha onde vir. Virou quantas salas distintas estão em
atendimento agora, que é o que dá para saber.

**Supervisão** (`PsySupervisionStats`): três cartões saem do `status` das
evoluções; o quarto conta os estagiários da clínica a partir de `allUsers`, o
mesmo filtro que `PsySupervisionPage` já usava.

**Os rótulos perderam "Hoje", "do Dia" e "na Semana".** `Agendamento` não tem
campo de data — só `horario` e `turno` — e `submetidoEm` guarda data sem hora,
então recorte temporal é incalculável. Dizer "hoje" com o schema atual é afirmar
algo que a tela não pode saber. Volta a ser possível quando houver data de
agendamento, que é migration própria.

Os dois painéis adotam o mesmo `—` com "sem dado da API" que a recepção de
odontologia já usava.

**Um limite que ficou explícito:** o cartão de estagiários mostra `—` quando
`allUsers` está vazia, em vez de `0`. `carregarUsuarios` engole a falha e deixa a
lista vazia no 403, e um supervisor **não aparece na própria lista** — a rota
devolve só `perfil == ESTAGIARIO` — então "vazia" pode ser clínica sem estagiário
ou chamada que não voltou. Sem estado de erro no `AuthContext`, afirmar `0` seria
afirmar que não se sabe. Resolver exige expor o estado da chamada lá.

**Verificado:** `pytest` 41 passed (sem mudança de backend); `npm run build`
verde; `alembic check` limpo; lint nos 13 de baseline, nenhum deles nestes dois
arquivos.

## ✅ Bloco 8 (Fatia D) — A gestão de estagiários para de mentir nas duas clínicas

Os defeitos da Fatia D eram **cópia um do outro** em `PsySupervisionPage` e
`ClinicalPairs`. Corrigir só a psicologia deixaria a mesma mentira na odontologia,
então foram as duas — mesma regra nas duas clínicas, como vale para o parecer de
homologação.

**"Habilitado" aparecia para quem tinha sido desativado.** `ativo` já vinha no
wire e era **descartado** em `mapearUsuario`; o tipo `User` nem declarava o
campo. Desativar alguém não mudava a tela — o badge era texto puro. Agora `ativo`
entra no estado e os dois cards mostram Habilitado/Desativado.

**O e-mail era fabricado e gravado.** Campo em branco virava
`nome.matricula@uninassau.edu.br` e ia para o banco passando pela validação, porque
endereço sintaticamente válido é indistinguível de um real. Virou campo obrigatório
nas duas telas, de cadastro e de edição.

**O texto da senha padrão era falso e divulgava o seed.** As duas telas diziam que
o estagiário "será criado com a senha padrão `unicare123`", num modal que exige a
senha digitada (`:52` valida 6 caracteres). O texto descreve comportamento removido
do código — e expõe a senha do seed para qualquer supervisor que abra o modal.

**A tela afirmava uma segregação que não existe.** O cabeçalho dizia "Estagiários
sob Orientação Docente (Turma Terça Tarde (SPA))" e a linha seguinte afirmava que o
supervisor valida "exclusivamente" prontuários dos acadêmicos **vinculados à sua
turma**. Não existe vínculo estagiário↔turma↔supervisor no schema: a segregação
real é por **curso**, em `GET /usuarios/`. A frase "exclusivamente" descrevia um
controle de acesso inexistente, e a `{turma}` era um `useState` cujo default era
uma string que ninguém escolheu — que ainda ia para `registro_profissional`.

**"Excluir" era desativar, mas a tela dizia excluir.** `DELETE /usuarios/{id}`
marca `ativo = false` e preserva a linha para auditoria; o `deleteUser` devolvia a
mensagem certa e a tela sobrescrevia com "excluído com sucesso". Agora usa a
mensagem do contexto, e título, botão e ícone de lixeira passaram a "Desativar
acesso" — a lixeira era o último ponto do fluxo que ainda prometia exclusão.

**Dois bugs de escrita engolida, encontrados no caminho.** `handleSaveEdit` e
`handleConfirmDelete` disparavam `updateUser`/`deleteUser` e anunciavam sucesso na
sequência, **sem `await`**: a tela confirmava alteração que o servidor podia ter
recusado. É a armadilha de `AGENTS.md` ("falha de escrita não pode ser engolida").
Agora esperam o retorno e exibem a falha.

**Limpeza:** o badge "Novo" (condicional a `intern.custom`, que `mapearUsuario`
nunca define) saiu dos dois arquivos, junto com o termo morto
`odontoInterns.filter(([_, u]) => u.custom).length` que, somado em `ClinicalPairs`,
fazia o rótulo "Ativas" prometer uma contagem que nunca incluía ninguém. Os
defaults `turma = 'Turma Terça Tarde (SPA)'` e `cadeira = 'Cadeira 05 • Dupla 09'`
sairam, junto com os fallbacks inventados — que ainda divergiam entre si. E
`PsyTeacherHeader` passou a usar `user.nome`/`user.registro_profissional`; no seed os
literais por acaso conferem com `DOC-8821`, com qualquer outro supervisor a tela
anunciava o nome errado.

**Verificado:** `pytest` 41 passed (**sem mudança de backend** — `ativo` já era
devolvido, confirmado em chamada real); `npm run build` verde; `alembic check`
limpo; **lint caiu de 13 para 12**, porque o filtro `.custom` morto levava um
`'_' is defined but never used` junto.

## ✅ F(b) — A senha fixa no código era código morto

`AuthContext` tinha `syncBackendToken`, que fazia
`api.login(matricula, 'unicare123')` com `catch {}` vazio. À primeira vista parecia
buraco de segurança ativo; não era. O caminho inteiro — `switchUser` → `login` →
`syncBackendToken` — **não tinha chamador nenhum**. `switchUser` aparecia quatro
vezes no código: declaração de tipo, implementação, valor do contexto e uma
menção em comentário no `ClinicContext`. `loginCustom` também não tinha chamador,
e `PRESET_USERS` era um export vazio que ninguém importava.

Sobrava de um "card rápido" de login por usuário que saiu da tela e deixou o
caminho órfão. O `catch {}` quetratava senha trocada como "backend offline" era
problema só do caminho morto: o vivo, `loginWithCredentials`, já separa falha de
rede de erro do servidor. Removidos os quatro, mais o export.

**O campo `custom` saiu do tipo `User`.** Só existia para alimentar badges "Novo"
e "Criado na Sessão", e nunca era definido pelo wire.

**A tabela da RT tinha as mesmas mentiras das outras telas.** "Habilitado (Senha)"
fixo, e a coluna "Origem" — "Criado na Sessão" / "Padrão UNINASSAU" — movida por
`custom`. Como o campo nunca vinha preenchido, **todo mundo aparecia como "Padrão
UNINASSAU"**, inclusive quem a RT tinha acabado de cadastrar. A coluna saiu: `Usuario`
não tem `criado_em`, então não há dado real para substituí-la sem migration. O
`colSpan` da tabela desceu de 8 para 7 junto.

O "(Senha)" também foi embora das três telas: nenhuma delas tem a senha, e não
podem exibi-la.

**Para o futuro:** se um dia houver acesso rápido na tela de login, ele tem que
pedir a senha. Não reconstruir esse caminho.

**Verificado:** `pytest` 41 passed (sem mudança de backend); `npm run build` verde;
`alembic check` limpo; **lint caiu de 12 para 11**. Login por credencial conferido
ao vivo: `16032935` / `unicare123` continua emitindo token.

## ✅ Bloco 9 — Anamnese e sinais vitais na psicologia

O Bloco 6 construiu anamnese e sinais vitais **só para odontologia**, e ficou
assim: o backend era agnóstico de curso, o contexto tinha as três funções, e o
modal era genérico inteiro — mas **`AnamneseModal` só era importado por
`DentalRecordPage`**. `registrarAnamnese`, `carregarAnamneses` e
`anamnesesPorPaciente` não tinham **um único consumidor** em psicologia. A tela
inteira simplesmente não existia para o paciente de psicologia.

O que faltava era um consumidor, e só:

- **Zero backend.** `GET/POST /pacientes/{id}/anamnese` é guardada por
  `_paciente_visivel`, que compara o curso do paciente com `cursos_visiveis` do
  token — não distingue clínica. Conferido ao vivo: `16032935` lê a anamnese do
  paciente 1, e `16024402` é barrado nele.
- **Zero teste novo.** A rota psi já era exercitada por
  `test_anamnese_paciente_compartilhado_veem_as_duas_clinicas`, que grava
  anamnese com token de estagiário de psicologia.
- **Zero alteração no modal.** É clínico, serve às duas clínicas.
- **Zero migration.**

`PsyRecordPage` ganhou a terceira aba "Anamnese e Sinais Vitais", com os alertas
(allergia, condições crônicas, medicações), os quatro sinais da última aferição e
o botão "Registrar aferição". A carga usa `useEffect` com dependência em
`[pacienteSelecionado?.id, carregarAnamneses]` — **não** `deps: []`, que dispara
antes do token existir. Campo sem registro aparece como "Não registrado".

O paciente de curso `ambos` tem **uma** anamnese compartilhada pelas duas
clínicas: é o comportamento correto e já coberto por teste.

**A diretriz é de psicologia, não uma cópia.** Odontologia tem "Diretriz
Regulamentar CFO" (atendimento em cadeira conduzido por dupla sob supervisão
contínua da docente). O relatório não prescreve diretriz de aferição para psi —
diz apenas que o projeto nasce da Resolução CFP nº 06/2019. A caixa nova cita
CFP 06/2019 e a vedação de falas literais (RN-002), que é regra real,
implementada e testada, e descreve o fluxo de homologação docente. Não foi
escrita nenhuma norma em nome do CFP sem fonte no projeto.

**Seed:** `anamneses` estava vazio nas **duas** clínicas, então a aba abria com
"Não registrado" em tudo e parecia quebrada em vez de vazia. Entraram 4
aferições: uma completa para o paciente de psicologia (com alergia e condição
crônica, para as três caixas aparecerem), uma só de sinais para o paciente de
odontologia, e duas para o paciente de curso `ambos`, para a ficha mostrar
histórico e não só a última. Idempotente, sem migration.

**Verificado:** `pytest` 41 passed; `npm run build` verde; `alembic check`
limpo; lint nos 11 de baseline. Conferido ao vivo: paciente 1 com 1 aferição,
paciente 2 com 1, paciente 3 com 2, e o paciente de psicologia continua barrado
para o token de odontologia.

## ✅ Bloco 10 — O logout parou de deixar dado clínico na tela

O efeito de logout em `ClinicContext` limpava `pacientes`, `agendamentos`,
`evolucoesPsico` e `demandas`. **Faltavam `fichasOdonto` e
`anamnesesPorPaciente`** — as duas são dado clínico e nenhuma das duas vai para
o `localStorage`, então o vazamento era só em memória, mas era real: quem
logasse em seguida na mesma sessão via ficha odontológica e anamnese de outra
pessoa até a sincronização terminar. Numa máquina de consulta compartilhada,
isso é exposição de prontuário.

`planosTratamento` é derivado de `fichasOdonto` por `useMemo`, então limpar as
fichas limpa os planos de tratamento junto — nenhuma linha extra foi necessária.

**Correção de uma afirmação errada:** este bloco nasceu da hipótese de que a
fila de demandas sobrevivia ao logout porque a chave `demandas` era gravada e
nunca removida do `localStorage`. Era falso — `setDemandas([])` já existia e
dispara o efeito de persistência, que reescreve `[]`. O buraco era só de
`fichasOdonto` e `anamnesesPorPaciente`. O `removeItem('demandas')` entrou
mesmo assim, para a lista de chaves não ficar com um buraco silencioso, mas
**não é a correção** — a correção são os dois `set` que faltavam.

`sync` não precisou de ajuste: `sincronizar` já reseta para `aguardando-login`
quando não há sessão (`:518-526`), então o badge "Dados da API" não sobrevive ao
logout.

**Verificado:** `pytest` 41 passed; `npm run build` verde; `alembic check`
limpo; lint nos 11 de baseline. **Nenhuma mudança de backend.**

## ✅ Bloco 11 — As telas de acesso pararam de prometer o que o servidor não faz

Duas telas linkadas do login eram decorativas, e uma delas prometia um mecanismo
inexistente.

**`/recuperar-senha`** — a página tinha 194 linhas, campo de e-mail ou CPF,
seletor de perfil e botão, e **nenhum `<form>`, nenhum handler e nenhuma chamada
de API**. Campo que aceita digitação e não faz nada é pior que campo ausente. O
rodapé do formulário afirmava **"Emissão de Token Criptográfico"** e que um código
de 15 minutos "será gerado e enviado ao e-mail institucional registrado sob
conformidade com a LGPD". Não existe geração de token, não existe envio (a
aplicação não tem biblioteca de e-mail nem SMTP configurado) e não existe rota de
recuperação — a única rota pública do backend é `POST /auth/login`.

Alegar conformidade LGPD para um mecanismo que não existe é o tipo de afirmação
que não pode ficar numa tela que trata dado de saúde. A tela agora diz o que é
verdade: não há recuperação automática, e o caminho é a coordenação da
clínica-escola. O rodapé de conformidade do layout continua, porque o
tratamento de dado sensível existe de fato — só não o mecanismo de recuperação.

**`/cadastro`** — `RegisterForm` fazia
`alert('Solicitação de credenciamento enviada para validação da Diretoria Técnica!')`.
Um `alert` do navegador dizendo "enviada", sem envio nenhum: `POST /usuarios`
exige `autorizado_gestao`, ou seja, só RT e supervisor cadastram alguém, e não há
rota pública nem fila de solicitações. O formulário continua preenchível — o
processo real, solicitar credencial à coordenação, é legítimo — mas o botão diz
"Revisar dados do pedido" e devolve um aviso âmbar dizendo que nada foi enviado.

**Uma decisão que não tomei sozinho:** a orientação inicial era implementar a
recuperação de verdade. Antes de decidir, verifiquei a infraestrutura e ela não
existe — sem lib de e-mail, sem SMTP, sem tabela de token. Construir metade disso
seria criar uma feature que parece real e não entrega token. Então este bloco
tira a mentira e **não** inventa o fluxo.

Também verifiquei se havia um caminho de reset para onde apontar: o backend
aceita `senha` no `PATCH /usuarios/{id}` (`usuarios.py:163-164`), mas **nenhum
modal de edição tem campo de senha**. Dizer "peça ao supervisor para resetar" só
trocaria uma mentira por outra, então a tela não promete nem isso.

**O que continua pendente, e é decisão de produto:** a troca de senha pelo próprio
usuário — a rota com senha atual + JWT e a tela correspondente. O backend tem tudo
(`verify_password` e `get_current_user`), falta o endpoint e a tela.

**Verificado:** `pytest` 41 passed (**sem mudança de backend**); `npm run build`
verde; `alembic check` limpo; lint nos 11 de baseline. Nenhuma migration.

## ✅ Bloco 12 — Troca de senha pelo próprio usuário + o painel da RT em paz

### A feature que faltava

Não existia troca de senha em nenhuma das duas formas. Agora existe a que o
usuário pediu: **cada pessoa troca a própria senha**, com a senha atual.

`PATCH /auth/senha`, autenticado, exige `senha_atual` — não é enfeite de tela:
sem ela, qualquer sessão aberta trocaria a senha de quem estivesse logado.
`verify_password` não tem caminho alternativo, então hash malformado devolve
`False`, nunca `True`. A nova senha passa por `get_password_hash` (salt novo a
cada troca) e o `SenhaLongaError` é convertido em 422 — o `max_length=72` do
schema já barra, e o `except` é a segunda rede, não a primeira. A troca entra na
trilha como `SENHA_ALTERADA`, com IP real, e nem a senha nem o hash aparecem na
resposta nem no log.

A tela (`/conta/senha`, link no rodapé do `AppSidebar` ao lado do botão de sair)
avisa que **a sessão continua ativa**: o token emitido no login segue válido e
revogá-lo exigiria uma tabela de invalidação que o projeto não tem. A caixa
explica que a senha é guardada só como hash bcrypt e que ninguém, nem a
coordenação, consegue consultá-la.

Cinco testes (41 → 46): senha atual vazia dá 422, senha errada dá 401 e o hash
permanece; a troca correta invalida a antiga e libera a nova; fora de faixa dá
422 e nunca 500; a trilha grava `SENHA_ALTERADA`; e a rota exige sessão.

Um teste meu estava errado e o backend estava certo: eu esperava 401 para senha
atual **vazia**, mas campo obrigatório é 422 na validação — 401 é para senha
*errada*. O teste passou a documentar os dois casos, como o parecer de
homologação já fazia.

### O painel da RT tinha os defeitos que o Bloco 8 deixou passar

O Bloco 8 corrigiu o e-mail fabricado e o badge de status em `PsySupervisionPage`
e `ClinicalPairs`, e **não conferiu `RTStatsDashboard`**, que é a terceira tela de
gestão de usuário. Ela tinha:

- **e-mail `@uninassau.edu.br` fabricado** no cadastro e na edição;
- **seletor de curso inerte** com default `psicologia` — o `curso` era descartado
  no cliente e o servidor usa o da RT, então a RT de odontologia via "Psicologia"
  pré-selecionado com asterisco de obrigatório;
- **"E-mail Institucional (Opcional)"** sendo que `UsuarioCreate.email` é
  `EmailStr` obrigatório: campo vazio dava 422 com a tela dizendo o contrário.

O seletor saiu e no lugar aparece a clínica travada, com o texto de que a RT só
cadastra na própria clínica. O placeholder do registro profissional passou a
derivar de `user.curso`, o que preserva o CRP/CRO correto que o formulário já
acertava. O e-mail virou obrigatório e não é mais fabricado.

**O tipo do `createUser` também estava errado**, e corrigi-lo expôs o problema
nas três telas: `curso` fazia parte do payload aceito pelo TypeScript, sendo que
o servidor nunca o lê. Agora `curso` sai do `Omit<>` — o compilador passou a
rejeitar as três chamadas, e as linhas mortas foram removidas. A regra ficou
escrita no tipo, não só no servidor.

**Verificado:** `pytest` 46 passed; `npm run build` verde; `alembic check` limpo
(**nenhuma migration** — `senha_hash` já existia); lint nos 11 de baseline. O
ciclo completo foi conferido ao vivo e a senha do seed foi **restaurada**:
trocar, relogar com a nova, confirmar que a antiga falha, e voltar para
`unicare123`.

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
pytest           → 41 passed (de backend/ e da raiz)
alembic check    → No new upgrade operations detected
alembic current  → d7f2a9c4e1b8 (head)
/health          → dialect: postgresql, conectado: true
unicare_db       → usuarios=8 pacientes=4 agendamentos=4 prontuarios_psico=2 fichas_odonto=4 anamneses=0
unicare_test     → banco dedicado da suíte, nunca tocado em dev
GET /prontuarios/odonto → 4 fichas do seed (a tabela nascia vazia)
POST /prontuarios/odonto → id real, AGUARDANDO_VALIDACAO
PATCH /prontuarios/odonto/{id}/homologar → VALIDADO com parecer persistido
POST /auth/seed  → 404 (removido na Fase 4)
GET /demandas    → OK (RF-009, Bloco 1)
imagem api       → 418 MB (era 1.06 GB; sem .env e sem .venv)
container api    → healthy; token cruza com o dev local nos dois sentidos
npm run build    → VERDE
npm run lint     → 11 erros preexistentes (13 → 12 na Fatia D, 12 → 11 no F(b); nenhum novo)
```
