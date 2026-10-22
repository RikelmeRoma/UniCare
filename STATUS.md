# STATUS — UniCare
```
npm run lint     → 10 erros preexistentes (o "11" desta linha estava desatualizado:
                    o commit d7716d5 removeu um deles; nenhum erro novo)

### ✉️ E-mail do Bloco 14 — o envio real passou

O código da recuperação já existia e estava coberto por 11 testes com dublê. O
que faltava era o **handshake**: nenhuma mensagem real tinha saído, porque o
`backend/.env` não tinha **nenhuma** variável `MAIL_*` e a rota respondia
**503**. Agora o envio sai de verdade, contra o Gmail.

- **A causa do `535 5.7.3` anterior era o formato da senha, não a credencial.**
  A senha de app do Google aparece em quatro grupos de quatro
  (`raxa oyuh rppn soet`), mas o segredo são os **16 caracteres colados** — o
  servidor recusa com 535 quando os espaços vão junto. `settings.mail_senha`
  normaliza essa forma colada (só a compacta de 16 caracteres; uma senha
  institucional com espaço no meio continua sendo usada como é), e o `.env`
  agora guarda os 16.
- **O handshake está diagnosticado, não suposto.**
  `backend/scripts/verificar_smtp.py` percorre o caminho real — conexão, banner,
  mecanismos `AUTH` anunciados, `STARTTLS`, login e envio de um e-mail de teste
  para a própria conta. **Nunca imprime a senha**: só o comprimento, os espaços
  internos e o comprimento da forma compacta.
- **A porta 465 passou a funcionar** (pendência aberta do Bloco 14): 465 é TLS
  implícito (`SMTP_SSL`) e 587 é STARTTLS. A porta decide porque é ela que o
  provedor publica.
- **`MAIL_FROM` deixou de ser obrigatório.** Vazio = o e-mail sai da conta
  autenticada, que é o que Gmail e Yahoo exigem: um `From:` diferente da conta
  autenticada é reescrito ou recusado pelo servidor. `mail_configurado` agora
  exige host, usuário e senha — o remetente tem valor padrão.
- **O corpo sai em base64.** O texto tem acento ("recuperação", "você") e, sem
  forçar a codificação, sairia como 8-bit — o que depende de o servidor
  aceitar `BODY=8BITMIME`. Base64 é 7-bit puro e qualquer servidor aceita.
- **O token órfão saiu.** O token era gravado *antes* do envio, então uma
  falha de SMTP deixava um token válido e órfão no banco: existia, ninguém
  sabia o código e sobrevivia até expirar. Agora ele é apagado no caminho de
  falha, e o estado volta ao de antes do pedido.
- **O teste de rede virou parte do projeto** (`backend/tests/test_email_rede.py`,
  marcador `rede`). A suíte padrão **não** toca a rede: `pytest.ini` traz
  `addopts = -m "not rede"`, e o teste só roda com `UNICARE_TESTE_SMTP=1` e
  `-m rede`. É o que fecha a pendência "verificar o envio real": dublê prova que
  o código chama o serviço, não que o serviço aceita a credencial.

**Verificado:** `pytest` **100 passed** (1 deselected — o de rede; os 100 são os
do RF-005 do commit `4502dfc`, mais o meu de rede); `npm run build` verde;
`alembic check` limpo; head `d8a2f0b3c194`; container `unicare_api` recriado
para receber as `MAIL_*` do `.env` (o `env_file` só é lido na criação do
container, e o código vem por volume com `RELOAD=1`); pedido de código
respondeu 200 com a mensagem genérica, token gravado **só como SHA-256** e
trilha com `RECUPERACAO_SOLICITADA` e IP real.

### ✏️ Emenda normativa nesta rodada

- **A síntese clínica virou uma caixa só.** `prontuarios_psico` tinha
  `inicio_sessao_texto`, `meio_sessao_texto` e `fim_sessao_texto` — três colunas
  porque a tela obrigava o estagiário a separar por fase. A restrição era de
  interface, não de prontuário: quem redige conhece a ordem em que as coisas
  aconteceram e escreve em parágrafos. Agora é `redacao_texto`, coluna única.
  **O relatório normativo foi emendado** (`PRONTUARIOS_PSICO`, o diagrama e a
  lista de colunas), porque ele era a fonte que descrevia as três.
- A migração `a4e1b7c3d902` concatena o conteúdo já gravado com linha em branco
  entre as partes, e **não se perde registro nenhum**. O `downgrade` recria as três
  colunas mas não consegue reconstituir onde uma fase terminava: volta o texto
  inteiro em `inicio_sessao_texto` e as outras duas vazias. Perde granularidade,
  mantém o conteúdo — e isso está comentado dentro da própria revisão.
- **Saiu o rótulo `RNF-003 · Síntese Técnica Conceitual`.** O relatório não tem
  **nenhum** identificador `RNF-*` — só `RF-*` e `RN-001`, `RN-002` e `RN-006`. A
  tela citava uma regra que não existe em fonte nenhuma, o que o `AGENTS.md` proíbe.
  A regra continua valendo, agora dita por descrição.
- O teste `test_redacao_clinica_recusa_campo_em_branco` exercita 3 formatos de
  branco em vez de 3 × 3: o risco coberto é o mesmo (o caminho de escrita), a
  contagem é que encolheu junto com o campo.

### 🐛 Defeito encontrado nesta rodada

- **A recepção de psicologia entrava em laço de acesso negado.** Este é o defeito
  que o REC-002 vinha Ahmedabadando, e era de roteamento, não de tela faltando:
  `/psi/recepcao` existe e está completa (agenda, demandas, cadastrar paciente,
  agendar sessão).
  - `LoginFields.tsx` decidia o destino pós-login e o caso `recepcao` só existia no
    ramo `odontologia`. No ramo `psicologia` a recepção caía no ternário
    "não é supervisor, então vai para o prontuário" — e `/psi/prontuario` libera
    só `estagiario | supervisor | rt` (RN-001). Resultado: 403 ao entrar.
  - `UnauthorizedPage.tsx` tinha o defeito espelhado: o botão "Voltar ao Meu Módulo
    Autorizado" mandava qualquer `recepcao` para `/recepcao`, que é a tela de
    odontologia. O REC-002 clicava e levava 403 de novo, sem botão que a tirasse.
  - **As duas cópias da regra já tinham divergido.** A decisão agora vive em
    `src/features/auth/routes.ts`, importada pelos dois lados. Unificar não é
    cosmeticidade: a duplicação é o que produziu o defeito.

- **O menu da recepção oferecia link que sempre dava 403.** O bloco "Central de
  Recepção" renderizava as duas clínicas sem filtrar por `user.curso`: REC-001 via
  403 em `/psi/recepcao` e REC-002 via 403 em `/recepcao`. A RT na visão Global caía
  no mesmo furo. Agora cada link só aparece para o curso da conta.
- O 403 da **recepção em `/psi/prontuario` continua correto** e é o esperado: a
  rota libera `estagiario`, `supervisor` e `rt`, e a RN-001 é normativa, com teste
  affirmando o 403. O módulo da recepção é a agenda e a triagem, não o prontuário.
```
## Atualização — 2026-10-18 (commit 5faea90)

**Agenda de psicologia ganhou data, estagiário no modal e tela do aluno.**
- `agendamentos.data_sessao` (sa.Date, nullable no banco, obrigatório na API) + migration `b3e8f1a94c25`. Seed com 8 sessões em datas relativas; Juliana passou a ser da Letícia (16051234).
- `GET /agendamentos` segrega o estagiário por matrícula (o prontuário já fazia). Recepção e RT continuam vendo a clínica.
- `GET /usuarios/estagiarios`: lista de estagiários ativos da clínica (nome + matrícula), sem ser gestão de usuário.
- `POST /agendamentos` em psicologia valida paciente, matrícula e cria/transfere o vínculo na mesma transação (motivo "Agendamento criado pela recepção").
- Regras de vínculo extraídas para `app/services/vinculo_service.py`.
- `ClinicContext` escolhe `/minha` ou `/psico` por perfil (recepção via 0 antes).
- Modal de agendar: select de estagiários, pré-seleciona o responsável, aviso de troca, campo de data nativo (uncontrolled — React não reescreve o campo ao digitar).
- `AppointmentTable`: coluna data/horário, ordena por data+hora, badge extraído para `src/shared/statusAgendamento.ts`.
- `PsyAppointmentsPage`: agenda do estagiário, agrupada por paciente, data, link para prontuário via state.
- **96 testes** (era 84). Head: `b3e8f1a94c25`. `alembic check` limpo.
- Pendência "Data em agendamentos" (STATUS.md:118) resolvida.

## Atualização — 2026-10-19 (RF-005 e os 5 defeitos de psicologia)

**Supervisor ↔ estagiário (RF-005).** O supervisor via **todos** os estagiários da clínica, porque não existia vínculo formal entre os dois — `registro_profissional` guardava texto livre ("Turma Terça Tarde") e o front filtrava só por curso.
- `usuarios.supervisor_matricula` (nullable, index) + migration `d8a2f0b3c194`.
- `GET /usuarios`: supervisor filtra por `supervisor_matricula`; RT vê a clínica inteira.
- `PATCH /usuarios/{id}`: supervisor só edita/desativa estagiário vinculado a ele. Atribuir supervisor é ato da RT, com validação (supervisor ativo da mesma clínica).
- **`GET /usuarios/estagiarios/disponiveis`**: ativos da clínica **sem** supervisor, filtro no servidor — devolver todos e filtrar no browser entregaria ao supervisor o nome de todos os colegas.
- **`POST /usuarios/{id}/vincular-supervisor`**: rota própria (vincular é decisão, não edição de campo — ação `VINCULO_SUPERVISOR` na trilha). Supervisor vincula a si mesmo, pela matrícula do token; RT escolhe a quem. Só estagiário, da mesma clínica, e **apenas se ainda não tiver supervisor** — estagiário com dono não é roubado por outro supervisor.
- Supervisor que cadastra estagiário vincula automaticamente.
- Frontend: `PsySupervisionPage` filtra por vínculo; modal ganhou **"Vincular estagiário já cadastrado"** (select + botão) e o **período do curso com as 10 opções** (antes eram 2, com o 9º marcado por padrão — palpite do código). Estado vazio da lista deixou de dizer "nenhum estagiário cadastrado" quando existem alunos sem supervisor.
- Seed: estagiários ligados aos supervisores da clínica.

**Os 5 defeitos de psicologia (commit d7716d5):** destino do paciente invertido no `NewPatientModal` (oferecia Odontologia em vez de Psicologia); painel de atribuição da recepção usando `allUsers` (que nunca carrega para recepção) em vez de `GET /usuarios/estagiarios`; linha do tempo do prontuário sem ordenação e com citação de RF-008/RN-005 inexistentes; supervisor fictício "Prof. Dr. Robert Santos do Carmo (CRP 19/0844)" em campo read-only; rótulos "Excluir Estagiário", "E-mail (Opcional)" e a afirmação sobre a tela de login.

**100 testes** (era 96). Head `d8a2f0b3c194`. `alembic check` limpo.

**Ainda aberto:** desvincular (o supervisor não devolve o aluno) — fora de escopo por decisão. E os 3 furos de segurança que sobraram em psicologia: `GET /atribuicoes/psico` sem guard de papel (o estagiário lê a clínica inteira), `POST /pacientes` e `PATCH /agendamentos/{id}/status` sem guard de papel.

---


**Última atualização:** 2026-10-15 (Blocos 1 a 14 concluídos — recuperação de senha com envio real ainda pendente · rodada de paridade de psicologia fechada)
**Branch:** `augusto` · **Remote:** `github.com/RikelmeRoma/UniCare`

Registro de progresso do projeto. Para orientações de trabalho, ver [`AGENTS.md`](./AGENTS.md).
Para os requisitos funcionais e normativos (RF/RN), ver [`RELATORIO_CONSOLIDADO_PROJETO.md`](./RELATORIO_CONSOLIDADO_PROJETO.md).

> **As pendências estão em [Pendências Abertas](#pendências-abertas)**, logo abaixo
> da situação atual. As listas antigas que ficavam dentro do Bloco 5 foram removidas:
> estavam vazias e enterradas no meio de um relato de 80 linhas, que é exatamente
> o jeito de uma pendência passar despercebida.

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
| — | Trilha de segurança | ✅ **concluída nos Blocos 3 e 8** |

---

## Pendências Abertas

Nada aqui está em prise de correção. A ordem sugerida é a numeração dos itens.

### 🔴 Crítico

**Nenhuma aberta.** A trilha de segurança do backend foi fechada no Bloco 3
(bcrypt sem fallback, CORS com allowlist, IP real, `ativo` no login) e os últimos
furos de dado falso — evolução clínica pré-preenchida, badge que mostrava evolução
devolvida como homologada, e-mail fabricado, logout sem limpar — saíram entre os
Blocos 8 a 14.

### 🟠 Importante

**E-mail do Bloco 14 — fechado nesta rodada.** As três pendências do envio
real foram resolvidas; o bloco "✉️ E-mail do Bloco 14" no topo do arquivo
conta o que mudou.

1. ~~**Verificar o envio real contra um SMTP de verdade.**~~ **Resolvido:** o
   envio real passa, contra o Gmail. A causa do `535 5.7.3` anterior era o
   **formato** da senha de app (os grupos de quatro que o Google exibe), não a
   credencial. O handshake ficou diagnosticado em
   `backend/scripts/verificar_smtp.py` e repetível em `pytest -m rede`.
2. ~~**`email_service` não cobre a porta 465.**~~ **Resolvido:** 465 é TLS
   implícito (`SMTP_SSL`), 587 é STARTTLS. A porta decide.
3. ~~**`MAIL_FROM` diferente de `MAIL_USER`.**~~ **Resolvido:** o remetente
   vazio cai para a conta autenticada, que é o que Gmail e Yahoo exigem.

**Dados e ordenação** — mesma raiz, dá para render uma migration só

4. `data_nascimento` e `data_sessao` são `str`, não `DATE`: impedem ordenar e
   comparar.
5. **Data em `agendamentos`.** Três painéis pedem "Hoje" ou "na Semana" e hoje os
   rótails evitam afirmar período porque `Agendamento` não tem campo de data. É o
   item que mais se repete em revisão de tela.

**Modelo e domínio**

6. **Vínculo estagiário ↔ turma ↔ supervisor** (RF-005). Tabela nova. O Bloco 8
   removeu da tela de psicologia a afirmação de que essa segregação existia; agora
   ela está honestamente declarada como não implementada, e o relatório a descreve.
7. **Erro do `GET /usuarios` exposto no `AuthContext`.** `carregarUsuarios` engole
   a falha e deixa `allUsers` vazio, então não dá para distinguir "clínica sem
   estagiário" de "chamada que não voltou". É o que fez o cartão de estagiários
   mostrar `—` em vez de `0`.

**Paridade de psicologia**

8. **Checklist CFP estruturado na homologação psi.** Odontologia tem checklist CFO
   de 4 itens que entra no parecer e bloqueia a decisão; psicologia homologa com
   texto livre. **Não implementado de propósito:** redigir os itens exigiria
   inventar conteúdo normativo do CFP, que não está em nenhuma fonte do projeto.
9. **Levar de volta para odontologia** o que psicologia já tem: carimbo de autoria
   docente na homologação, validação de conteúdo clínico no servidor e
   segregação da listagem por estagiário.

### 🟡 Menor

- **11 pendências de lint**, todas preexistentes e em código que não tocamos:
  `react-refresh` (3), `setState` dentro de effect (2, no `ClinicContext`),
  `no-useless-assignment` (2, no `PeriogramaViewer`), `'_' is defined but never
  used` (3) e `no-explicit-any` (1). O baseline **caiu de 13 para 11** sozinho,
  porque os erros estavam presos a código morto removido.


### 🧩 Vinculo paciente-estagiario (RF-001, psicologia)

Feature pedida para a clinica de psicologia: a recepcao vincula cada paciente ao
estagiario responsavel, e o aluno so escreve de paciente ativo em seu nome.

- **Tabela `atribuicoes_clinicas`.** A linha encerrada nao e apagada: vira
  `SUBSTITUIDA` com o motivo e a data, e e ela que responde "quem esteve com
  este paciente". Por isso a tabela e ao mesmo tempo o vinculo e o historico.
- **Indice unico parcial em `(paciente_id, curso) WHERE situacao='ATIVA'`.** A
  invariante e um responsavel ativo por paciente, e ela esta no banco: se a
  aplicacao errar, o banco recusa o segundo INSERT.
- **A regra vale na escrita, nao so na tela.** `POST /prontuarios/psico` confere
  o vinculo a partir do token. Filtrar so no `<select>` deixaria qualquer cliente
  chamar a rota direto e registrar sintese em nome de quem nao e o responsavel.
- **Bloqueia nos dois sentidos.** Paciente de outro estagiario e paciente sem
  ninguem dao 403. O segundo e deliberado: abrir ali deixaria o aluno escrever
  sem estar sob ninguem.
- **Supervisor e RT nao sao bloqueados.** A regra e de responsabilidade do aluno;
  os dois abrem o prontuario para consultar e nenhum dos dois tem paciente
  vinculado. Aplicar a eles trancaria a supervisao. Ha teste para isso.
- **O prontuario antigo nao e reescrito.** `prontuario_psico` guarda o autor no
  momento da escrita, entao apos a transferencia o registro anterior continua
  identificando quem era o responsavel na epoca. E o que foi pedido, e ha teste.
- **Escolha do estagiario sai da lista, nao de digitacao.** O modal de agendamento
  aceita matricula fixa por clinica (`'16032935'` ou `'01498231'`) junto com o
  nome digitado pelo usuario — o que gravava "Joao" com a matricula do colega.
  Aqui a matricula real vem do cadastro, e o servidor recusa matricula
  inexistente, de outra clinica ou de conta desativada.
- **A tela da recepcao mostra quem nao tem responsavel.** Estagiario sem vinculo
  recebe 403 com a orientacao de procurar a recepcao, e o proprio prontuario
  repete a instrucao em vez de mostrar um `<select>` vazio sem explicacao.

**Emenda normativa:** o RF-001 falava so em cadastro, agendamento e metricas.
A regra do vinculo foi acrescentada ao RF-001, com a data da emenda, e a tabela
entrou no bloco de schema do relatorio. Nenhum RF descrevia atribuir paciente a
estagiario.

**Dois testes antigos vazavam estado e foram corrigidos.** `test_conta_desativada_nao_recebe_codigo`
deixava o `16032935` desativado ate o fim da suite, e `test_novo_pedido_invalida_o_codigo_anterior`
deixava a senha do `REC-001` trocada. Os dois passaram a restaurar o que mudam.
O bloco novo nao depende do seed: cria os proprios pacientes e estagiarios.

**Verificado:** `pytest` **83 passed** (era 69); `npm run build` verde; `alembic
check` limpo.

### ✅ Menor resolvido (rodada do dia)

- **Taxa de absenteísmo na recepção de psicologia.** Cartão novo com
  `faltas / (PRESENTE + EM_ATENDIMENTO + CONCLUIDO + FALTOU)`, a mesma conta de
  `routers/relatorios.py:57-59`. Conferido cruzando o cartão com a rota real do
  relatório: **33.3% nos dois lados**. Fica ao lado de Cancelamentos em vez de
  substituí-lo — falta é sessão que existiu e o paciente não veio;
  cancelamento é vaga liberada para remanejar. A recepção precisa das duas.
- **O seed psi ganhou uma sessão `FALTOU`.** Sem ela o cartão abriria em `0.0%` —
  número verdadeiro, mas que não demonstrava nada. Odontologia já tinha.
- **Histórico de decisões virou tabela** em `PsyApprovalQueue`. Antes cada
  decisão empilhava em lista e o nome do paciente ficava acima da decisão, obrigando
  o olho a ir e voltar para comparar quem foi aprovado e quem foi devolvido. O
  parecer continua expansível, agora numa linha de largura total.
- **Badge de origem e falha na recepção psi.** Cinco estados, como a
  odontologia já mostrava. A falha **não é despejada crua**: para uma conta de
  recepção os 403 em prontuários e fichas são a RN-001 funcionando, e
  mostrar o erro faria a recepção de psicologia achar todo dia que algo quebrou
  sem nada estar quebrado. Quando as únicas falhas são essas, o texto fica em
  prosa. Qualquer outra continua aparecendo crua: esconder um 403 de clínica errada
  seria o erro oposto.

### ✅ Menor — resolvidos nesta rodada

- **Busca por nome/matrícula entre os estagiários supervisionados.** O mesmo
  controle que `ClinicalPairs` já tinha, agora em `PsySupervisionPage`. O contador
  passou a mostrar "N de M" quando há filtro, e o estado vazio distingue "nenhum
  cadastrado" de "nenhum corresponde à busca".
- **Botão de recarregar a fila de homologação.** `PsyApprovalQueue` agora chama
  `sincronizar()` do `ClinicContext`. Antes a fila só mudava no login: uma
  evolução submetida em outra aba deixava o supervisor vendo "0 pendentes" sem
  nenhuma explicação.
- **Sinalização de paciente menor na ficha de psicologia.** Badge em `PsyRecordPage`
  usando o `eh_menor`/`nome_responsavel` que o backend já expunha (RF-007, RN-004)
  e nenhuma tela consumia. O seed ganhou `Ana Beatriz Nogueira`, menor e
  `curso="ambos"`, porque o único menor do seed era de odontologia.

### 🔧 Paridade de psicologia — fechado nesta rodada

- **A aba Custódia da RT desenhava as duas clínicas sem condição.**
  `RTStatsDashboard` renderizava "Evoluções Clínicas do Serviço de Psicologia
  Aplicada" e "Registro de Procedimentos Odontológicos" sempre, para qualquer RT:
  a RT de psicologia via uma seção de odontologia permanentemente vazia, e a de
  odontologia via a de psicologia quase vazia. Agora cada seção é condicionada a
  `cursoPainel`, que já era derivado de `user.curso`.
- **Seed de psicologia incompleto.** Entrou um prontuário `DEVOLVIDO_PARA_AJUSTE`,
  e os estagiários `16031730` e `16032601` — que não existem em `seed_usuarios` —
  foram corrigidos para `16032935` e `16024402`. Os dois desempacotamentos fixos
  (`p1, p2, p3, p4 = pacientes`) precisaram virar `pacientes[:4]`: o seed passou a
  devolver 5 pacientes e o `ValueError` derrubava o lifespan inteiro, o que
  apareceu como 69 testes em erro.
- **Agendamentos `FALTOU`/`CANCELADO`/`CONCLUIDO` no seed.** Sem eles os cartões de
  absenteísmo e de cancelamentos abriam em zero vindo do banco.
- **Dois dados fabricados no prontuário psi.** "Protocolo SPA #SPA-2026-0104" era
  literal no JSX — mesmo número para todo paciente, sempre — e "Docente Vinculado:
  Prof. Dr. Robert Santos" também. O primeiro virou a contagem real de evoluções;
  o segundo, o nome de quem está autenticado, que vem do token.

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

> **REMOVIDO em 16/10/2026.** A fila de demandas de estágio foi apagada (revisão
> `f4a7c2d9e053`: o botão "Conciliar" só escrevia a palavra `Agendado` sem
> agendar, sem atribuir paciente a ninguém e sem criar vínculo. Com o vínculo
> paciente-estagiário do RF-001, as duas telas ficavam lado a lado quase fazendo a
> mesma coisa, uma delas sem executar nada. Este bloco fica como registro do que
> existia e de por que saiu. O carimbo de autoria docente, que nasceu no mesmo
> bloco, continua no prontuário psi e não foi afetado.

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

### Resolvidos aqui (rastro, não pendência)

Os "3 bloqueadores do frontend" e o SHA-256 saíram de cena; ficam registrados para
não se perder a origem:

1. ~~`ClinicContext` sincroniza com `deps: []`~~ — **corrigido** na Camada 1: a
   carga passou a depender da matrícula autenticada.
2. ~~`api.getMe()` sem consumidor~~ — **corrigido no Bloco 4**: o login busca o
   registro real depois de autenticar. `user.id` é o id do banco (não mais
   `Date.now()`) e `registro_profissional` chega às telas.
3. ~~Ids temporários `Date.now()`~~ — **corrigido** na Camada 3: toda escrita
   espera o id real do banco.
4. ~~SHA-256 na senha~~ — **corrigido no Bloco 3**: bcrypt direto, sem caminho
   alternativo que comparasse texto claro.

A lista de pendências em aberto não fica mais aqui: ver
[Pendências Abertas](#pendências-abertas).

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

> **REMOVIDO em 16/10/2026.** A fila de demandas de estágio foi apagada (revisão
> `f4a7c2d9e053`: o botão "Conciliar" só escrevia a palavra `Agendado` sem
> agendar, sem atribuir paciente a ninguém e sem criar vínculo. Com o vínculo
> paciente-estagiário do RF-001, as duas telas ficavam lado a lado quase fazendo a
> mesma coisa, uma delas sem executar nada. Este bloco fica como registro do que
> existia e de por que saiu. O carimbo de autoria docente, que nasceu no mesmo
> bloco, continua no prontuário psi e não foi afetado.
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

## ✅↩️ Bloco 9 — Anamnese na psicologia (REVERTIDO)

> **Este bloco foi desfeito por decisão do produto:** anamnese e sinais vitais são
> **só da ficha odontológica**. A narrativa original dizia que a feature faltava em
> psicologia e propunha construí-la — a conclusão oposta veio depois. O registro
> fica porque a inversão já foi feita e desfeita uma vez, e porque o que
> aproveitamos daqui continua valendo na odontologia.

**O que o Bloco 9 estabeleceu e continua valendo:**

- A rota `GET/POST /pacientes/{id}/anamnese` é guardada por `_paciente_visivel`, que
  compara o curso do paciente com `cursos_visiveis` do token. Ela **não distingue
  clínica** — a segregação é de quem vê, não do dado. Conferido ao vivo: o
  paciente de psicologia é barrado para o token de odontologia.
- `AnamneseModal` é clínico e serve à odontologia sem alteração.
- O paciente de curso `ambos` tem **uma** anamnese, visível pelas duas clínicas.
  Isso continua correto e já é coberto por teste.
- **Seed:** `anamneses` estava vazio e a aba de odontologia abria com "Não
  registrado" em tudo. Entraram aferições para o paciente de odontologia e duas para
  o `ambos`, para a ficha mostrar histórico e não só a última. Idempotente.

**O que foi revertido:** a terceira aba de `PsyRecordPage`, o painel, o
`AnamneseModal` reimportado de `dental-record`, o `useEffect` que carregava o
histórico por paciente, a caixa de diretriz CFP e a aferição do paciente de
psicologia no seed — existia só para alimentar a aba que saiu, e ele não é visível
pela odontologia, então ficaria órfã sem tela que a mostrasse.

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

## ✅ Bloco 13 — Pedido de credencial com autorização da RT

`/cadastro` não era fachada por conceito: era um pedido **sem a etapa que
autoriza**. O Bloco 11 tirou a mentira do `alert`, mas a conclusão de que a
página inteira era o problema estava errada. O fluxo real é: alguém pede, a RT
autoriza, a conta nasce. Faltava o meio.

**O que não mudou no servidor:** o RF-009 do relatório descreve o ciclo de vida
do usuário **já cadastrado** e não menciona este pedido. Por isso nada aqui é
numerado como RF — conforme a regra de citar por descrição.

### Decisões de projeto

- **A senha não viaja na solicitação.** A RT define no ato de aprovar. Guardar
  credencial de quem nem tem conta, em tabela alcançável por qualquer chamada
  anônima, é superfície que não vale abrir.
- **Quem pede declara; a RT decide.** `perfil_declarado` e `curso_declarado` são
  o que o solicitante afirma, e a tela avisa isso. O perfil enviado na aprovação é
  o **final**, e o curso nunca vem do pedido: sai do token da RT.
- **Só e-mail institucional.** Sem esse filtro a rota pública viraria alvo de
  spam, já que qualquer um criaria linhas na fila da RT.

### Rota pública

`POST /solicitacoes-cadastro/` sem token. A resposta **não diz** se o e-mail já
tem conta: uma rota anônima que responde "existe" serve de oráculo para enumerar
o cadastro. O conflito é descoberto pela RT, que é quem pode agir sobre ele. A
409 para e-mail com pendência aberta também substitui um rate limiter que o
projeto não tem.

### Fila da RT

Escopada por clínica: a RT de psicologia não vê nem aprova pedido de
odontologia. Aprovação **cria a conta no mesmo ato**, então não existe estado
"aprovada sem usuário"; se o e-mail ou a matrícula já existirem, a criação recusa
com 400 e o pedido continua PENDENTE. Recusa exige motivo.

A regra de criação foi **extraída** para `criar_usuario_para_gestor` e agora é
compartilhada entre `POST /usuarios` e a aprovação. Duas cópias divergiriam na
primeira mudança, e a que divergiria seria a do pedido.

### O formulário

Envia de verdade, e perdeu o que era falso: o badge **"Forte"** fixo que
aparecia sobre campo vazio, o **"Mínimo 8 caracteres"** quando a regra real é 6, o
**"Validação automática de conferência"** que não conferia, e o seletor de
**"Docente Supervisor Responsável: Profa. Dra. Juliana Moura Feitosa (CRO/SE
412)"** — nome ausente do seed e com conselho de odontologia num campo que aceita
psicologia. Os termos de sigilo passaram a ser exigidos de verdade. Os quatro
componentes decorativos (`ProfileSelector`, `PersonalInfoFields`,
`CredentialsFields`, `TermsCheckboxes`) foram removidos: não tinham estado.

A confirmação devolve o **número do protocolo**. Sem canal de e-mail, é a única
forma de a pessoa identificar o pedido depois — e a tela diz isso, em vez de
prometer retorno que não existe.

### Painel da RT

Nova seção na aba de usuários: pedidos pendentes, **Aprovar** (perfil, registro e
senha) e **Recusar** (motivo). Passa pelo `AuthContext`, que espera o servidor e
recarrega a fila em vez de manter estado local que diverge do banco.

### Duas armadilhas encontradas no caminho

1. **`sa.Enum(...)` inline em `create_table` tenta `CREATE TYPE`.** Reaproveitar
   o `perfilusuario` da migration inicial matou a migration com
   `type perfilusuario already exists`. A solução é o tipo do dialeto com
   `create_type=False` (`postgresql.ENUM(..., create_type=False)`).
2. **`Usuario` é SQLModel, portanto Pydantic.** Uma dependênciahelper anotada
   `def _exigir_rt(current_user: Usuario)` sem `Depends` fez o FastAPI tratar
   `Usuario` como tipo de **corpo** da requisição, e toda decisão respondia 422
   pedindo campos do usuário.

E o nome do ENUM precisa bater com o que o SQLModel deriva da classe: `SituacaoSolicitacao`
vira `situacaosolicitacao`, e a migration escrever `statussolicitacao` fazia o
`alembic check` pedir alteração de tipo.

**Verificado:** `pytest` **46 → 57**; `npm run build` verde; `alembic check`
limpo; lint nos 11 de baseline. Conferido ao vivo: pedido anônimo aceito, e-mail
externo recusado, RT de psicologia vê e a de odontologia não, supervisor leva 403,
aprovação cria a conta e o login funciona com a senha que a RT definiu.

## ✅ Bloco 14 — Recuperação de senha por token no e-mail

Fecha o buraco que o Bloco 13 deixou aberto: **quem tem conta e esquece a senha
não tinha para onde ir**. A auto-troca do Bloco 12 (`/conta/senha`) exige sessão,
e quem esqueceu a senha não consegue entrar para trocar — os dois casos são
diferentes e a tela antiga só tratava o segundo fingindo resolver o primeiro.

### O problema real: sem canal de entrega, sem auto-recuperação

Recuperação segura **sem canal de entrega não existe**, e não é limitação de
implementação. A segurança de um reset vem inteiramente de provar que *você*
recebeu o token. Se o sistema libera a troca para quem digita o e-mail da conta,
qualquer colega que saiba a matrícula assume o acesso. Por isso todo reset do
mundo pede e-mail ou telefone: o segredo não é o código, é quem consegue lê-lo.

O projeto não tinha **nenhuma** biblioteca de envio: `email-validator` valida
formato e não envia, não havia SMTP no `.env`, e não há rota de recuperação. Com
a conta pessoal de e-mail do autor, o fluxo ficou completo e o dia de ter e-mail
institucional é só troca de configuração.

### O que foi construído

**Configuração** — `config.py` ganhou `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`,
`MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_TLS`, `MAIL_TIMEOUT_SEGUNDOS` e
`TOKEN_RECUPERACAO_MINUTOS`. **Todas opcionais, com padrão vazio** — o
contrário de `DATABASE_URL`, que tem que falhar alto para não nascer banco
paralelo. Aqui a ausência só significa "recuperação indisponível", e a tela
diz.

**`services/email_service.py`** — `smtplib` e `email`, **da biblioteca padrão**:
nenhuma dependência nova no `requirements.txt`. A distinção que o módulo existe
para fazer é entre **não configurado** e **configurado e quebrado**; as duas
impedem o envio, mas a pessoa precisa saber qual é.

**Migration** (12ª entidade) `tokens_recuperacao_senha`. Guarda-se apenas o
**SHA-256** do código: um dump da tabela não entrega nada que sirva para trocar
senha. Código de 6 caracteres de alfabeto sem `0/O/1/l/I`, porque vai ser lido em
voz alta.

**Duas rotas públicas** em `auth.py`:

- `POST /auth/senha/recuperar/solicitar` — sem SMTP configurado, devolve **503
  honesto** e não gera token. SMTP quebrado, idem, e o motivo vai para o log.
  SMTP funcionando, resposta **genérica e idêntica** para conta existente e
  inexistente, para a rota não servir de oráculo de enumeração. Conta desativada
  não recebe token, e a resposta continua genérica.
- `POST /auth/senha/recuperar/redeem` — **uma única mensagem de erro** para
  código errado, expirado, já usado ou conta inexistente. Se divergissem, quem
  tentasse códigos saberia quantos eram válidos.

Emitir um novo pedido **invalida os anteriores** da mesma pessoa, senão dava para
acumular códigos válidos por conta.

**A tela `/recuperar-senha`** deixou de ser a página que informava que não havia
recuperação e virou o formulário real, em duas etapas, tratando três estados que
não podem virar um só: envio ok (resposta genérica, que é o comportamento certo),
SMTP indisponível (a tela **diz**) e código errado.

### Testes (57 → 69)

Nenhum teste toca a rede: `email_service.enviar` é substituído por um dublê. Cobrem
o envio com o código correto, o resgate trocando a senha e invalidando o código,
a resposta idêntica entre conta existente e inexistente, código errado vs. conta
inexistente, novo pedido invalidando o antigo, token expirado, SMTP desligado e
SMTP quebrado dando 503, conta desativada sem token, e a trilha de auditoria
guardando **que** houve reset e **não** o código.

### Um furo encontrado pelo próprio teste

Meu teste esperava "indisponível" para o SMTP desligado e recebeu o texto genérico
de "não foi possível enviar". O caminho tinha um buraco: a guarda
`settings.mail_configurado` dispara 503 antes do serviço, mas se o serviço devolvesse
`NAO_CONFIGURADO`, o código caía no erro genérico — mandando a pessoa para a
orientação errada. Corrigido para os dois casos dizerem a coisa certa.

### Estado do envio real

**O SMTP do Outlook pessoal está recusando a autenticação (`535 5.7.3`).** O
servidor anuncia `AUTH LOGIN XOAUTH2`, então aceita senha comum e **não** é
bloqueio de verificação em duas etapas — é credencial. Conferi o `.env` byte a
byte: endereço e senha estão sem caractere oculto e sem aspa. O código está
correto e funciona assim que a credencial for; o único teste que falta é contra o
servidor real.

**Verificado:** `pytest` **69 passed**; `npm run build` verde; `alembic check`
limpo; lint nos 11 de baseline.

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
pytest           → 100 passed, 1 deselected (de backend/ e da raiz)
alembic check    → No new upgrade operations detected
alembic current  → d8a2f0b3c194 (head)
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
npm run lint     → 10 erros preexistentes (o "11" estava desatualizado desde d7716d5; nenhum novo)
SMTP real        → smtp.gmail.com:587, STARTTLS, login OK, e-mail de teste entregue
scripts/verificar_smtp.py → conexão, banner, AUTH anunciados, TLS, login e envio
pytest -m rede   → teste de SMTP real (pulado por padrão; exige UNICARE_TESTE_SMTP=1)
```
