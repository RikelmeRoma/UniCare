# MEMORY — UniCare

Memória técnica do projeto: decisões arquiteturais (ADRs), armadilhas verificadas
e histórico de entrega. **Não descreve o produto** — para requisitos e regras de
negócio ver [`PRD.md`](./PRD.md); para contratos técnicos ver [`SPEC.md`](./SPEC.md);
para o mapa de código ver [`ARCHITECTURE.md`](./ARCHITECTURE.md).

O [`STATUS.md`](./STATUS.md) guarda apenas o estado atual. Tudo o que era
histórico acumulado (mais de 2.500 linhas de diário de blocos) foi reorganizado
aqui por tema.

**Snapshot desta memória:** branch `augusto`, commit `d5dd584`, 18/11/2026.
O texto original completo continua recuperável em `git show b1c8bf0:STATUS.md`
(2.510 linhas), `git show b1c8bf0:AGENTS.md` e
`git show b1c8bf0:RELATORIO_CONSOLIDADO_PROJETO.md` (574 linhas, com o diagrama
ER em Mermaid).

---

## Como usar

- **ADR-xx** = decisão com contexto, escolha e consequência. Se você for mexer
  no assunto, leia o ADR antes.
- **Armadilha** = fato do ambiente ou do código que quebra trabalho em silêncio.
  Todas foram verificadas em execução; nenhuma é suposição.
- **Apêndice cronológico** = bloco, data, revisão Alembic e resumo de uma linha.
  Serve para localizar "quando isso entrou", não para entender o porquê.

---

## 1. Banco, schema e Alembic

### ADR-01 — PostgreSQL é a única fonte de verdade; Alembic versiona o schema

**Contexto.** O projeto nasceu com SQLite como fallback silencioso e
`SQLModel.metadata.create_all()` no startup. O banco de desenvolvimento e o de
teste divergiam sem erro visível: coluna nova em model não aparecia em tabela
existente, e a suíte passava contra um schema que não era o de produção.

**Decisão.** `DATABASE_URL` é obrigatório e a ausência falha alto na importação
(`ValidationError: DATABASE_URL — Field required`). Não há valor padrão `sqlite`.
O schema é aplicado exclusivamente por `alembic upgrade head`; `create_all()` foi
removido de propósito. A suíte roda contra `unicare_test`, derivado
automaticamente pelo `conftest.py`.

**Consequência.** Subir a API sem migração falha na primeira consulta, e não
"funciona pela metade". Em compensação, todo model novo exige revisão escrita à
mão em `migrations/versions/`.

**Armadilhas associadas**

- **A porta do Postgres é 5433, não 5432.** Um PostgreSQL nativo
  (`postgresql-x64-15`) ocupa a 5432 nesta máquina; conectar em
  `localhost:5432` com a senha certa falha com `password authentication failed`
  porque quem atende é o serviço nativo. O container escuta 5432 internamente e
  publica 5433 no host.
- **Nunca reverter para `create_all()`.** Ele só cria tabelas e ignora mudança
  de coluna em banco existente.
- **`op.drop_table()` não remove tipos ENUM.** Um `downgrade` que cria coluna
  enum precisa derrubar os tipos explicitamente com `checkfirst=True`, senão o
  `upgrade` seguinte falha com `type ... already exists`.
- **Novo membro de ENUM exige migração manual.** Os tipos nativos gravam os
  *nomes Python* em caixa alta (`ESTAGIARIO`, `AGUARDANDO_VALIDACAO`) e o
  `--autogenerate` não detecta `ALTER TYPE ... ADD VALUE`. O downgrade também
  não remove o valor: recrie o tipo, converta as colunas para `VARCHAR` e
  devolva-as ao enum, senão o `downgrade base` do `conftest.py` falha.
- **O `--autogenerate` não detecta `max_length`.** Ele só emite `ALTER` quando o
  *tipo* muda (`VARCHAR` → `Text`). Os 35 `ALTER ... TYPE VARCHAR(n)` da revisão
  `6699e657b519` são manuais. Sempre leia o arquivo gerado antes de aplicar.
- **`sa.Column(Text)` sem `nullable` explícito gera `nullable=True`.** O model
  fica mais permissivo que o banco e o `alembic check` acusa `modify_nullable`.
  Use `Column(Text, nullable=False)`.
- **`op.create_table` sem `PrimaryKeyConstraint('id')` não cria SERIAL.**
  `sa.Column('id', sa.Integer(), nullable=False)` sozinho vira `integer` sem
  default; o primeiro insert falha com `null value in column "id"` e o
  `alembic check` continua limpo, porque o comparador só olha o tipo.
- **`sa.Enum(...)` inline em `op.create_table` tenta `CREATE TYPE`.** Reaproveitar
  um ENUM existente, como `perfilusuario`, morre com `type perfilusuario already
  exists`. Solução: `postgresql.ENUM('ESTAGIARIO', ..., name='perfilusuario',
  create_type=False)`. O `create_type=False` do `sa.Enum` genérico não resolve.
- **O nome do ENUM precisa bater com o que o SQLModel deriva da classe.**
  `SituacaoSolicitacao` vira `situacaosolicitacao`; escrever
  `statussolicitacao` faz o `alembic check` pedir `modify_type` para sempre.
- **`sa.DateTime()` na migração precisa de `timezone=True`.** O SQLModel mapeia
  `datetime` para `timestamptz`; sem o argumento a coluna nasce sem fuso e o
  `alembic check` acusa `modify_type`.
- **Medir antes de restringir.** `VARCHAR(n)` é ignorado pelo SQLite e aplicado
  pelo Postgres. Antes de propor limite, rode
  `SELECT max(length(col)) FROM tabela`; todo `n` deve ser maior que o valor real.
- **`usuarios.senha_hash` tem 97 caracteres** (salt 32 + `:` + sha256 64).
  Qualquer `max_length` abaixo disso quebra todo login.

**Estado verificado.** `alembic check` responde "No new upgrade operations
detected." — esse é o estado esperado, não um detalhe.

### ADR-02 — Modelo denormalizado de propósito

**Contexto.** A trilha de auditoria precisa sobreviver à desativação do usuário,
e o prontuário precisa preservar quem era o responsável no momento da escrita.

**Decisão.** Apenas **4 foreign keys** existem no schema, três de `paciente_id`
para `pacientes.id` e uma da anamnese. Matrículas, nomes de supervisor e autorias
são campos denormalizados. `logs_auditoria` não tem FK para `usuarios`.

**Consequência.** Desativar (`ativo = false`) continua sendo o único "delete"
possível. A trilha é append-only: nenhuma rota faz `UPDATE` ou `DELETE` em
`logs_auditoria`.

### ADR-03 — Colunas de data novas são `DateTime`, não `str`

**Contexto.** `pacientes.data_nascimento` e `prontuarios_psico.data_sessao` são
`str` e por isso não ordenam nem comparam. A correção exige migração com
reformatação de dados existentes e continua aberta.

**Decisão.** `anamneses.afetido_em` nasceu `DateTime` para não repetir o defeito,
e `agendamentos.data_sessao` já é `date`. Campos novos de data devem seguir esse
caminho.

---

## 2. Autenticação, RBAC e escopo de clínica

### ADR-04 — A segregação por clínica é de aplicação, não de banco

**Contexto.** `usuarios.curso` e `pacientes.curso` não têm vínculo no schema, e a
mesma pessoa pode atender paciente `ambos`.

**Decisão.** A regra "só enxergo minha clínica" é aplicada por `cursos_visiveis()`
e `validar_curso_do_registro()` em `app/services/auth_service.py`, em leitura **e**
em escrita. `pacientes.curso = 'ambos'` é o valor que torna o paciente
compartilhado; listagens filtram por `curso IN (próprio, 'ambos')`.

**Consequência.** Filtrar a listagem não protege a escrita. Toda rota que escreve
por `id` precisa conferir o curso do registro. Paciente `ambos` é a exceção
legítima; agendamento não é, porque tem cadeira fixa.

**Armadilhas associadas**

- **A RT não é global.** `cursos_visiveis(RT)` devolve `[curso, "ambos"]` e
  `require_curso` não tem bypass para RT. RT-001 responde pela odontologia,
  RT-002 pela psicologia. Pedir a clínica alheia é 403.
- **A ordem dos guards importa quando o `detail` é normativo.** `require_curso`
  aceita o guard de papel em `base=`, avaliado **antes** do curso. Sem isso a
  recepção recebia 403 de "clínica restrita" no lugar do `RN-001` — mesmo status,
  `detail` errado, e os testes de conformidade afirmam pelo identificador da
  regra. Não registre as duas dependências separadas no endpoint: o FastAPI não
  garante qual resolve primeiro.
- **Bypass de `exigir_perfil` não é permissão de gestão.** A coordenação passa
  pelo guard como a RT, mas `_pode_gerenciar` limita os alvos: supervisor,
  estagiário e recepção. Criar, editar, desativar, aprovar ou recusar pedido de
  RT/coordenação continua sendo ato exclusivo da RT.
- **`require_roles([ESTAGIARIO])` não restringe a escrita ao estagiário.**
  `exigir_perfil` deixa RT e coordenação passarem por bypass, então
  `POST /prontuarios/psico` confere `current_user.perfil != ESTAGIARIO`
  diretamente. Esconder o formulário no `PsyRecordPage` não basta.

### ADR-05 — bcrypt direto, sem passlib e sem fallback

**Contexto.** A senha era SHA-256 e `verify_password` terminava em
`return plain_password == hashed_password` — qualquer hash malformado, inclusive
a senha em claro, autenticava.

**Decisão.** `crypto_service` chama `bcrypt.hashpw`/`bcrypt.checkpw` direto, com
`rounds=12`. `passlib` saiu do `requirements.txt`: o passlib 1.7.4 lê
`bcrypt.__about__`, removido no bcrypt 4+, e falha com `error reading bcrypt
version`. `requirements.txt` declara `bcrypt>=4.1.0`.

**Consequência.** O login ficou visivelmente mais lento (436 ms por verificação e
556 ms por hash medidos nesta máquina; a suíte foi de 6,5 s para ~31 s por causa
dos logins). É o preço de resistir a força bruta.

**Armadilhas associadas**

- **Senha acima de 72 bytes** é recusada pelo bcrypt. `get_password_hash` lança
  `SenhaLongaError` e `verify_password` devolve `False`, para o login responder
  401 em vez de 500.
- **`verify_password` não tem caminho alternativo.** Não reintroduza nenhuma
  comparação que não seja `bcrypt.checkpw`.
- **Hash de senha só muda com reseed.** `seed_usuarios` é idempotente por tabela
  e não reescreve hash existente. Ao trocar o algoritmo, trunque `usuarios` e
  deixe o lifespan semear de novo.

### ADR-06 — Desativar não é apagar

**Contexto.** A auditoria referencia a linha do usuário; apagar quebraria a trilha
probatória.

**Decisão.** `DELETE /usuarios/{id}` marca `ativo = false`. Reativar é
`PATCH {"ativo": true}`, e a tela alterna lixeira ↔ `ArrowPathIcon` por
`usuario.ativo`. Desativar encerra as duplas odontológicas afetadas; reativar
**não** recria a dupla — o estagiário volta a logar e precisa se vincular de novo.

**Armadilhas associadas**

- **A rota de login precisa checar `ativo`.** `get_current_user` já checava, mas o
  login não: conta desativada recebia token com 200. Cheque `ativo` em qualquer
  lugar que emita credencial.
- **Supervisor gerencia estagiário, não colega.** `routers/usuarios.py` limita o
  supervisor a `perfil=estagiario` na própria clínica; promover alguém a
  supervisor ou RT é ato da RT.
- **Campo que o `PATCH` não aceita não pode ser `<select>` na tela.** O modal de
  edição oferecia "Tipo de Perfil RBAC", mas `UsuarioUpdate` não tem `perfil`.
  Trocar perfil é ato próprio, com regra e auditoria; na edição cadastral ele é
  leitura, como a clínica.

### ADR-07 — A autoria de registro clínico vem do token

**Contexto.** Qualquer cliente poderia registrar aferição ou evolução em nome de
outra pessoa se o corpo aceitasse o responsável.

**Decisão.** `POST /pacientes/{id}/anamnese` e `POST /prontuarios/psico` não têm
campo de responsável: o backend preenche com `current_user`. O carimbo
`supervisor_nome` é gravado no ato da homologação, com o nome de quem homologou.

**Consequência.** O prontuário antigo não é reescrito quando o paciente é
transferido: o registro continua identificando quem era o responsável na época.

### ADR-08 — Rota pós-login é uma função só

**Contexto.** `LoginFields` decidia o destino pós-login e `UnauthorizedPage` tinha
o botão de saída; as duas cópias divergiram. O caso `recepcao` existia só no ramo
`odontologia`, então o REC-002 caía em `/psi/prontuario` e levava 403 — e o botão
de saída mandava qualquer recepção para a tela de odontologia, prendendo a de
psicologia em laço de negação.

**Decisão.** `getDestinationRoute` vive em `src/features/auth/routes.ts` e é
importada pelos dois lados.

**Consequência.** Ao acrescentar perfil ou clínica, mude a função, não as cópias
(não há mais cópias: é esse o ponto).

**Armadilha associada.** **O sidebar não oferece página que o `ProtectedRoute` vai
recusar.** As rotas declaram `allowedCourses` e o `ProtectedRoute` não dá bypass
de curso para a RT. O seletor "Filtrar Módulo Clínico" no menu da RT de
odontologia só produzia links para `/nao-autorizado` e saiu. Um "RT global" de
verdade exigiria modelo novo — perfil ou flag que o `require_curso` conheça —, não
um botão no menu.

---

## 3. E-mail, senha e recuperação de conta

### ADR-09 — Recuperação sem canal de entrega não existe

**Contexto.** A tela `/recuperar-senha` prometia "Emissão de Token Criptográfico"
e envio em 15 minutos, mas não havia biblioteca de e-mail, SMTP nem rota. A
segurança de um reset vem inteiramente de provar que *você* recebeu o token.

**Decisão.** Construir o fluxo completo: `services/email_service.py` com `smtplib`
e `email` da stdlib (nenhuma dependência nova), tabela
`tokens_recuperacao_senha` (12ª entidade), duas rotas públicas em `auth.py` e a
tela em duas etapas. Guarda-se apenas o **SHA-256** do código; o código tem 6
caracteres de um alfabeto sem `0/O/1/l/I`, porque vai ser lido em voz alta.

**Consequência.** Sem SMTP configurado, a rota responde 503 honesto e **não gera
token**. Emitir novo pedido invalida os anteriores da mesma pessoa.

**Armadilhas associadas**

- **Rota pública de recuperação não pode responder "não existe".** As duas
  respostas são genéricas de propósito: se o pedido diferir entre conta existente
  e inexistente, vira oráculo de enumeração; se o resgate diferir entre código
  errado, expirado e já usado, vira oráculo de códigos. O teste de conformidade
  dessas igualdades é o que impede alguém de "melhorar a mensagem".
- **Resposta genérica sem saída vira silêncio.** Quem digitou endereço fora do
  cadastro ficava esperando um código que nunca viria. O passo do código tem um
  bloco "Não recebi o código" que explica que o destino é o e-mail do cadastro,
  lembra do spam e oferece reenvio. Não troque isso por mostrar o e-mail
  mascarado: revelar o endereço só quando a conta existe recria o oráculo.
- **Identificador sem `@` não é matrícula — recuse o formato antes de prometer
  envio.** `_identificador_incompleto()` recusa (422) identificador sem `@` **e**
  com ponto. A checagem é sintática e não consulta o banco. Não normalize o `@`
  automaticamente: corrigir a digitação por conta própria esconde o erro.
- **A rota de pedido é pública e precisa de intervalo mínimo.**
  `TOKEN_RECUPERACAO_INTERVALO_SEGUNDOS` limita por conta; a resposta continua a
  mesma e a tela conta os segundos. Na suíte o intervalo é desligado no
  `conftest.py`, porque um teste pede o código duas vezes seguidas.
- **`DateTime` do model sem fuso é UTC, não hora local.** Use `como_utc()` de
  `app/models/token_recuperacao.py` antes de comparar data vinda do banco. Em
  Brasília, um código vencido há cinco minutos continuava trocando senha.
- **"Enviamos o e-mail" sem e-mail enviado é a pior falha possível.** O
  `email_service` separa `NAO_CONFIGURADO` de `FALHOU`: os dois impedem o envio,
  mas a pessoa precisa saber qual é. Não simplifique para `if not enviou: raise
  500`.
- **`PERMITIR_EMAILS_EXTERNOS` é `false` por padrão, e teste não pode ler a flag
  do ambiente.** Fixe os dois estados com `monkeypatch.setattr(settings, ...)`.
  Ligar a flag abre a rota pública para qualquer endereço; a aprovação da gestão
  continua sendo o gate, mas a fila vira alvo de spam.

### ADR-10 — Troca de senha pelo próprio usuário exige a senha atual

**Contexto.** Recuperação por e-mail e troca autenticada são casos diferentes:
quem esqueceu a senha não consegue entrar para trocar.

**Decisão.** `PATCH /auth/senha` é autenticado e exige `senha_atual`. Sem ela,
qualquer sessão aberta trocaria a senha de quem estivesse logado. A troca entra na
trilha como `SENHA_ALTERADA`, com IP real; nem a senha nem o hash aparecem na
resposta ou no log.

**Consequência.** A sessão continua ativa: revogar o token exigiria tabela de
invalidação, que o projeto não tem. A tela diz isso.

### ADR-11 — Pedido de credencial com autorização da RT

**Contexto.** `/cadastro` era um `alert` dizendo "enviada" sem envio nenhum.
`POST /usuarios` exige gestão, e não havia fila de solicitações.

**Decisão.** Rota pública `POST /solicitacoes-cadastro/` (resposta que não revela
se o e-mail já tem conta), fila escopada por clínica na RT e aprovação que **cria
a conta no mesmo ato**. A regra de criação foi extraída para
`criar_usuario_para_gestor`, compartilhada com `POST /usuarios`.

**Consequência.** Não existe estado "aprovada sem usuário": se e-mail ou matrícula
já existirem, a criação recusa com 400 e o pedido continua `PENDENTE`. Recusa
exige motivo.

**Armadilhas associadas**

- **Senha inicial é gerada no servidor, em qualquer clínica.** RT e coordenação
  **não enviam senha** (422 se enviarem); o servidor gera com
  `gerar_senha_inicial()` (12 caracteres, `secrets`). `AprovacaoSolicitacao.senha`
  continua no schema só para a rota detectar e recusar o campo — ignorá-lo em
  silêncio faria a gestão acreditar que definiu uma senha nunca usada.
- **A resolução da senha fica depois de `_pode_gerenciar` e antes do e-mail.**
  Inverter isso faz o 403 de alçada virar 422, ou dispara mensagem com senha de
  conta que não será criada. A guarda do perfil **final** vem antes de
  `email_service.enviar`.
- **Os testes leem a senha gerada do corpo do e-mail simulado**
  (`_EnvioAprovacao.senha_do_ultimo()`); não há senha fixa para logar.

### ADR-12 — SMTP é configuração, não código

**Contexto.** A credencial do Gmail falhou com `535 5.7.3` e a conclusão fácil foi
"a credencial morreu".

**Decisão.** Manter todo o envio atrás de `email_service`, com as chaves em
`settings`. `smtplib` aceita Gmail, Outlook e servidor institucional com senha
comum — trocar de provedor é só `.env`.

**Consequência.** A causa real do 535 era o **formato** da senha de app: o Google
exibe em quatro grupos de quatro, mas o segredo são os 16 caracteres colados.
`settings.mail_senha` normaliza essa forma compacta; uma senha institucional com
espaço no meio continua sendo usada como é.

**Armadilhas associadas**

- **O Gmail institucional é o remetente, não uma conta de acesso.**
  `MAIL_USER` (`unicare616@gmail.com`) envia; a recuperação procura o
  identificador em `usuarios.email` / `usuarios.matricula`. Pedir código para o
  endereço do remetente responde a mensagem genérica e não envia nada.
- **Os e-mails do seed são fabricados.** `@uninassau.edu.br` responde `550` no
  RCPT; `@sempreuninassau.com.br` responde `250` para qualquer endereço. "Enviado"
  não prova entrega.
- **`seed_usuarios` não reescreve linha existente — o banco de dev pode divergir
  do `seed.py`.** Compare `select email from usuarios` antes de acusar o código.
- **Não imprima a senha do SMTP para diagnosticar.** Confira comprimento e
  espaços nas pontas; o hex dos bytes revela a senha no histórico da conversa.
- **`password_hash` do SMTP só entra do `.env`**, que está no `.gitignore` **e**
  no `.dockerignore`.
- **Office 365 com autenticação básica desabilitada exigiria OAuth2** — aí passa a
  ser código, não configuração.

### ADR-13 — Segredos: remover do índice não invalida o histórico

**Contexto.** O commit `37f0a38` publicou `backend/.env` num repositório público
com a senha de app do Gmail, a `SECRET_KEY` e a senha do Postgres.

**Decisão.** Revogar e trocar a senha de app, rotacionar a `SECRET_KEY` (64
caracteres), `git rm --cached backend/.env` em commit isolado (`cd7e0db`) e trocar
a credencial real por `abcd efgh ijkl mnop` nos quatro lugares onde ela aparecia
como "exemplo": `.env.example`, `backend/README.md`, docstring de `config.py` e
`STATUS.md`. O histórico **não** foi reescrito (exigiria force-push).

**Consequência.** Os tokens emitidos antes da rotação deixaram de valer.

**Armadilhas associadas**

- **`.gitignore` não protege arquivo já rastreado.** `git check-ignore -v
  backend/.env` não acusa arquivo rastreado (só com `--no-index`); a checagem que
  vale é `git ls-files backend/.env` — saída vazia é o esperado.
- **Nunca use a senha de app real como exemplo em comentário ou documentação.**
- **Não remova `.env` do `.dockerignore`:** sem ele, `COPY . .` assa a
  `SECRET_KEY` e a senha do banco numa camada da imagem. `.gitignore` não tem
  efeito no Docker.

---

## 4. Inteligência artificial (Gemini)

### ADR-14 — A chave fica no backend; o modelo do ditado não é o do texto

**Contexto.** As rotas `/ia/*` chamam o Gemini pelo backend. A chave
`GEMINI_API_KEY` no frontend exporia a credencial a qualquer usuário.

**Decisão.** A chave entra **só** no `backend/.env`, lida pelo container via
`env_file` do compose. Sem a chave, as rotas respondem 503 com orientação de
configuração; `GET /ia/status` devolve `configurado: false`.

**Consequência.** **`docker compose restart` NÃO relê o `env_file`** — é preciso
`docker compose up -d api`, que recria o container.

**Armadilhas associadas**

- **`gemini-3.5-transcribe` não existe** (404 "Model is not found") e
  `gemini-3.5-flash-lite` responde com texto **vazio** quando o pedido leva áudio.
  Quem transcreve de verdade é `gemini-2.5-flash`.
- **Resposta vazia precisa acionar o fallback.** `_executar_interaction_com_fallback`
  só continuava a cadeia em erro transitório (503, 429, timeout), mas "resposta
  vazia" com áudio também não é motivo para desistir. `_eh_resposta_vazia()`
  trata o caso.
- **O Google responde 503 "high demand" sem aviso.** A cadeia de fallback existe
  por isso, e "a IA falhou" não é imediatamente "a chave está errada" — cheque
  `GET /ia/status` primeiro.
- **Silêncio no ditado vira texto clínico inventado.** Com um áudio de silêncio, o
  `gemini-2.5-flash` devolveu uma anamnese completa e coerente. O texto precisa
  passar pela conferência do profissional antes de ir ao prontuário, e o registro
  de `DITADO_VOZ_IA` na trilha é o que permite auditar o que foi ditado.

### ADR-15 — Contexto clínico da IA é montado pelo backend

**Contexto.** O assistente precisa ler anamnese, ficha e histórico sem confiar no
que o cliente envia.

**Decisão.** `validar_e_construir_contexto_paciente()` lê o model `Anamnese`
diretamente e monta o contexto; o cliente envia apenas pergunta, rascunho e
histórico. As saídas são validadas por `SaidaPsicologiaLLM` /
`SaidaOdontologiaLLM`, com campos sugeridos e alertas clínicos separados.

**Consequência.** O grafo registra essa ligação como "conexão inesperada"
(`gemini_service` → `Anamnese` sem passar por schema/roteador) — é intencional:
o serviço precisa do dado, não do contrato HTTP.

---

## 5. Impressão, PDF e custódia

### ADR-16 — Documento impresso não é print de tela

**Contexto.** O "Exportar PDF" usava `window.print()` do viewport, com
`body.ficha-print-mode` e `setTimeout`: saíam sidebar, abas e só o pedaço visível
do formulário.

**Decisão.** `RelatorioImpressao` (em `src/shared/impressao/`) renderiza num portal
em `document.body`, e o `@media print` do `relatorio.css` esconde o `#root`. A
prévia A4 abre antes; o `window.print()` fica no botão "Imprimir / Salvar em PDF".
A mesma moldura serve ficha odonto adulta/infantil, relatório executivo da RT e
dossiê de custódia.

**Consequência.** `RelatorioImpressao` e `relatorio.css` saíram de
`features/supervision/report/`: a ficha odontológica não depende do módulo de
supervisão.

**Armadilhas associadas**

- **Ao achatar formulário no papel, não esconda todo `<button>`.** Em gráfico
  clínico o botão *é* o dado — número do dente no odontograma, "Aus"/"Imp" do
  periograma, numeração do mapa de higiene. A exceção é a classe
  `.documento-dado`; `[role='button']` fica de fora da regra porque as faces do
  mapa de higiene são `<polygon role="button">` e desapareceriam junto.
- **O cabeçalho institucional é único.** `FichaOdontoAdultoPrint` /
  `FichaOdontoInfantilPrint` aceitam `comCabecalho` e `containerId`;
  `DossiePacientePrint` passa `comCabecalho={false}` porque já tem o próprio.
- **O dossiê de custódia recebe só os planos do paciente selecionado.** Já
  recebeu `planosTratamento` inteiro — procedimentos de todos os pacientes num PDF
  de guarda legal.

---

## 6. Frontend: estado, honestidade de dado e escrita

### ADR-17 — Escrita espera o servidor e devolve resultado

**Contexto.** O padrão `id = Date.now()` + troca no `.then()` e `console.warn` no
`.catch()` perdia dado e anunciava sucesso antes da resposta.

**Decisão.** Toda função de escrita do `ClinicContext` e do `AuthContext` é
`async`, retorna `{ success, message }` e só altera o estado após a confirmação.
`api.ts` faz o mapeamento `snake_case` ↔ `camelCase` na fronteira.

**Consequência.**

- **Nunca use id temporário num registro que outro depende por FK.** Na janela
  entre o insert local e a resposta do banco, um agendamento recebia 500 engolido.
- **Falha de escrita não pode ser engolida.** O modal que dispara a ação precisa
  renderizar a falha. "Nada acontece quando eu desativo" era exatamente isto:
  `setUserErrorMsg` gravava a mensagem num estado que só os modais de criar e
  editar renderizavam.
- **Tela de gestão relê do servidor depois de escrever.** O merge local do
  `AuthContext` não é fonte de verdade; chame `carregarUsuarios()` (e
  `carregarDados()` quando a tela lista duplas).
- **`Promise.allSettled` nunca rejeita.** Um `catch` externo depois dele é código
  morto, e absorver 401/403/500 sem log torna a falha invisível.

### ADR-18 — Nada de fallback numérico ou clínico inventado

**Contexto.** Várias telas afirmavam dado que não existia: evolução clínica
pré-preenchida gravada no banco, parecer de supervisor pré-redigido, "85% de
ocupação de cadeiras", `SHA-256: 8f4b2e...c901a` fixo, alergia "Penicilina" e
sinais vitais `120/80` iguais para todo paciente, radiografia do Unsplash
apresentada como de paciente.

**Decisão.** Onde não há dado, a tela mostra `—` ou "Não registrado", com estado
de erro visível. A regra também vale no servidor: `HomologacaoRequest.parecer`
recusa texto vazio com 422 nas duas clínicas.

**Consequência.** Dado clínico inventado é pior que campo vazio. Os painéis
passaram a derivar contagem de `agendamentos`/evoluções reais, e os rótulos
"Hoje", "do Dia" e "na Semana" saíram enquanto `Agendamento` não tiver campo de
data.

**Armadilhas associadas**

- **O logout precisa limpar todo dado clínico.** Faltavam `fichasOdonto` e
  `anamnesesPorPaciente`; numa máquina de consulta compartilhada, quem logasse em
  seguida via prontuário de outra pessoa até a sincronização terminar.
- **`ClinicContext` sincroniza depois do login.** O `useEffect` depende de
  `user.matricula` via `sincronizar` (`useCallback`). `deps: []` disparava a carga
  antes do token existir e deixava a tela em mocks até um F5.
- **`JOIN` não popula relationship onde o model não declara `Relationship`.**
  `select(ProntuarioPsico).join(Paciente, ...)` monta a query certa e
  `prontuario.paciente` estoura `AttributeError`. Monte um mapa `id → curso`.

### ADR-19 — Regra de tela precisa existir no servidor

**Contexto.** Exigir parecer, senha ou qualquer campo só no frontend deixa a
regra como conveniência: qualquer cliente chama a rota direto.

**Decisão.** Toda regra normativa é validada no schema/rota. Exemplos:
`redacao_texto` recusa branco e aspas (RN-002); `HomologacaoRequest.parecer` recusa
vazio; `POST /prontuarios/psico` confere o vínculo paciente↔estagiário a partir do
token; endereço é obrigatório no servidor para `curso='psicologia'`.

**Consequência.** O frontend pode repetir a validação para feedback rápido, mas
nunca é a única barreira.

**Armadilha associada.** **Endereço obrigatório em psicologia não vale para
`ambos` no servidor.** O modal compartilhado só mostra endereço/número quando
`defaultCurso='psicologia'`, mas `ambos` também é criado pela recepção de
odontologia. O backend exige apenas para `curso='psicologia'`; o formulário de
psicologia exige também para `ambos`.

### ADR-20 — Vínculo paciente↔estagiário é histórico, não só estado

**Contexto.** A recepção precisa saber quem atende cada paciente, e o prontuário
precisa saber quem atendia na época.

**Decisão.** `atribuicoes_clinicas` guarda a linha encerrada como `SUBSTITUIDA`,
com motivo e data. Um índice único parcial em `(paciente_id, curso) WHERE
situacao='ATIVA'` garante no banco um responsável ativo por paciente.

**Consequência.** Paciente de outro estagiário **e** paciente sem ninguém dão 403
na escrita; o segundo é deliberado, para o aluno não escrever sem estar sob
ninguém. A homologação continua com supervisor/RT/coordenação via `PATCH`.

---

## 7. Testes

### ADR-21 — A suíte roda contra `unicare_test` e não vaza estado

**Contexto.** Testes que mexiam em cadastro alheio deixavam conta desativada ou
senha trocada para o resto da suíte, e a falha aparecia no teste seguinte, que não
tinha relação com a causa.

**Decisão.** O `conftest.py` deriva `unicare_test` automaticamente e roda o ciclo
de migração. Todo teste que mexe em cadastro de outro teste restaura no `finally`.
Feature nova cria os próprios dados; consumir o seed além de ler produz dependência
de ordem.

**Consequência.** `/health` mostra `dialect: postgresql`, e `pytest -q` é o gate
real do backend. `npm run build` (`tsc -b && vite build`) é o único gate de tipos
do frontend — o lint tem problemas preexistentes e não bloqueia.

**Armadilhas associadas**

- **Um fixture no módulo de teste sobrescreve o do `conftest.py`.** Não repita
  nomes de fixture entre `tests/*.py` e `tests/conftest.py`: o do módulo vence e o
  ciclo de migração deixa de rodar sem erro visível.
- **Não aponte `DATABASE_URL` para o banco de desenvolvimento ao rodar testes.**
- **Importar `app.config` fixa `settings` com a URL de desenvolvimento.** Para
  redirecionar antes do primeiro import, leia o `.env` sem importar o módulo (ver
  `tests/conftest.py:_base_database_url`).
- **O seed depende da ordem dos `paciente_id`.** `commit()` + `refresh()` dos
  pacientes precisa acontecer antes de agendamentos e prontuários.
- **Adicionar paciente ao seed quebra o desempacotamento fixo.** Três funções
  fazem `p1, p2, p3, p4 = pacientes`, e `seed_pacientes` devolve **5** (a quinta é
  menor de idade, `curso="ambos"`). Sem `pacientes[:4]`, o `ValueError` sobe pelo
  lifespan e a suíte vira **69 erros de setup** — sem uma única asserção que
  aponte o seed. A contagem desigual por clínica também é assumida pelo teste de
  `distribuicao_cursos`.
- **Teste que consome pendência do seed vira dependente de ordem.** Crie o
  registro dentro do próprio teste.
- **O RF do relatório manda no identificador.** `RF-007` é trilha de auditoria e
  `RF-009` é gerenciamento RBAC. Já usamos esses números para outras coisas e os
  testes passaram a mentir. Para algo fora da lista, cite por descrição.
- **Não cite identificador que o relatório não tem.** Ele define `RF-001` a
  `RF-009` e, no texto, apenas `RN-002`; o cabeçalho anuncia `RN-001` a `RN-006`,
  mas não há definição de `RN-005`/`RN-006` nem de nenhum `RNF-*`. O código cita
  `RN-001` a `RN-004`. Para algo fora da lista, cite por descrição.

### ADR-22 — Dublê prova que o código chama; só a rede prova entrega

**Contexto.** Onze testes cobriam a recuperação de senha com `email_service`
substituído. Isso não prova que o Gmail aceita a credencial.

**Decisão.** `backend/tests/test_email_rede.py` e
`backend/scripts/verificar_smtp.py` fazem o handshake real (conexão, banner,
mecanismos `AUTH`, STARTTLS/TLS implícito, login e envio). O teste de rede tem
marcador `rede`, e `pytest.ini` traz `addopts = -m "not rede"`: a suíte padrão
**não** toca a rede. Ele só roda com `UNICARE_TESTE_SMTP=1` e `-m rede`.

**Consequência.** O handshake real está diagnosticado, não suposto — e o script
nunca imprime a senha, só comprimento e forma compacta.

---

## 8. Ambiente, Docker e build

### ADR-23 — Container lê `.env` na criação, não no restart

**Contexto.** Alterar `backend/.env` e rodar `docker compose restart api` não
aplicava a mudança; a aplicação continuava com o valor antigo sem erro.

**Decisão.** Recriar o container com `docker compose up -d api`. O código entra
por volume com `RELOAD=1`; só as variáveis de ambiente exigem recriação.

**Armadilhas associadas**

- **Script de shell com CRLF quebra o container em loop.** `core.autocrlf=true`
  reescreve os `.sh` com CRLF e o shebang vira `#!/bin/sh\r`: o container morre
  com `exec ./docker/entrypoint.sh: no such file or directory`, reiniciando para
  sempre e sem log de aplicação. O `.gitattributes` tem `*.sh text eol=lf`; o
  `Dockerfile` roda `sed -i 's/\r$//'` como segunda defesa. Se o entrypoint já
  funcionava e começou a falhar, **olhe as quebras de linha, não o código**.
- **CORS não aceita `"*"` junto de `allow_credentials`.**
  `allow_credentials=True` com `"*"` faz o Starlette refletir qualquer origin. As
  origens vêm de `CORS_ORIGINS` no `.env` e são parseadas em
  `settings.cors_origins_list`; inclui 5174 porque o Vite cai para essa porta.
- **Não edite `migrations/versions/*` já aplicada; gere revisão nova.**
- **Não publique a porta 5432 do Postgres no host nesta máquina.**
- **Não exponha o nome do banco em `/health`; o endpoint é público.**
- **Não reintroduza `build-essential`/`libpq-dev` sem motivo** —
  `psycopg2-binary` traz wheel pronto.

### ADR-24 — Skill de agente não é versionada no repositório

**Contexto.** O commit `7adc5fb` (24/10/2026, "atualização psicol") trouxe
`.agents/skills/gemini-api-dev/` — dois `.md` (36 KB) com um guia genérico da API
Gemini, no formato `SKILL.md` que ferramentas de agente descobrem e carregam sob
demanda. O diretório não era importado pelo app, não entrava no build nem na
imagem Docker, não aparecia em nenhum `tsconfig`/`vite.config` e não era citado
em `.gitignore`, `AGENTS.md` ou `README.md`.

**Decisão.** Remover do índice (`git rm -r .agents`). Skill de ferramenta fica na
máquina de quem usa, não no repositório do produto. O conteúdo continua
recuperável em `git show 7adc5fb:.agents/skills/gemini-api-dev/SKILL.md`.

**Consequência.** Quem clona o UniCare não recebe instrução de terceiro que não
tem relação com o sistema. A skill `gemini-api-dev` deixa de ser oferecida pelos
agentes que leem `.agents/skills/`.

**Armadilhas associadas**

- **Skill genérica pode contradizer o fato verificado.** O `SKILL.md` listava
  `gemini-3.5-transcribe` como modelo de transcrição e tratava `gemini-2.5-*`
  como legado; no projeto, quem transcreve de verdade é `gemini-2.5-flash` e o
  `gemini-3.5-transcribe` respondeu 404 (ADR-14). Instrução de ferramenta nunca
  vence o que foi medido no ambiente — `MEMORY.md` manda mais que `SKILL.md`.
- **Arquivo de ferramenta não é documentação do produto.** Não coloque skill de
  agente na raiz de um repositório de aplicação sem registrar por que ela existe;
  sem justificativa, ela vira ruído e envelhece sem ninguém notar.

---

## 9. Funcionalidades retiradas da interface

### ADR-25 — A cópia JSON da ficha odontológica saiu da tela; a função ficou

**Contexto.** A ficha odontológica (adulto e infantil) tinha, ao lado de
"Exportar PDF", um botão **"Baixar cópia"**. Ele não gerava documento: chamava
`exportarJson` / `exportarJsonInfantil`, que montam um `.json` de conferência
(`{ documento, versao, exportadoEm, paciente, anamnese }`) e disparam download via
`Blob` + `URL.createObjectURL`. Como o PDF ao lado já é o documento de guarda, o
botão virou uma segunda saída com aparência de oficial — confundia mais do que
ajudava.

**Decisão.** Remover o botão e tudo o que só existia para ele:

| Arquivo | Removido |
|---|---|
| `anamnese/AnamneseHeader.tsx` | o `<button>` "Baixar cópia", a prop `onExportar` e o destructuring |
| `workspaces/AdultRecordWorkspace.tsx` | `const exportar`, `onExportar={exportar}`, import de `exportarJson`, `setMensagem` do destructuring |
| `workspaces/ChildRecordWorkspace.tsx` | o mesmo para `exportarJsonInfantil` |

**As funções `exportarJson` (`anamnese/estado.ts`) e `exportarJsonInfantil`
(`anamnese-infantil/estado.ts`) foram mantidas de propósito, sem chamador.** Elas
são o formato canônico da ficha em JSON e o ponto de partida natural para
persistir a ficha num banco (por exemplo, enviando o objeto para uma rota em vez
de baixar um `Blob`). O TypeScript não acusa export não usado, então isso não
custa build.

**Consequência.** A linha de ações da ficha fica `Assistente IA · Ocultar ficha ·
Salvar progresso · Exportar PDF · Limpar`. Nenhuma rota, schema ou model mudou: o
envio à supervisão continua por `montarConteudo` → `DocumentoFichaBar`, que é
caminho independente do JSON de conferência.

**Armadilhas associadas**

- **`noUnusedLocals` obriga a remover o conjunto inteiro.** Apagar só o
  `<button>` deixa a prop `onExportar` sem uso, o `const exportar` sem uso e o
  import sem uso — três erros de `tsc -b`. Botão, prop, handler e import saem
  juntos.
- **`setMensagem` era usado só pelo handler de exportação.** Ao removê-lo, o
  destructuring do hook passou a ter variável não lida; `mensagem` (sem o setter)
  continua sendo renderizada pelo `AnamneseHeader` e deve permanecer.
- **Para reativar:** recrie o botão, a prop e o handler e chame
  `exportarJson(...)`. Se o objetivo for gravar em banco, troque o `Blob` por um
  `POST` — o payload já está montado em `montarConteudo()`.

---

## 10. Documentação e ferramental

### ADR-26 — O grafo é reconstruído com `update --force`; os números derivados andam junto

**Contexto.** `graphify-out/` não é versionado, e `ARCHITECTURE.md`/`AGENTS.md`
citam números que saem dele (nós, arestas, comunidades, corpus). Depois dos
commits `d9b45f1` (busca de paciente) e `d5dd584` (docs/limpeza), o grafo ainda
apontava para `built_at_commit = b1c8bf0`: `SeletorComBusca` não existia no mapa e
as arestas dos workspaces para `exportarJson` continuavam lá.

**Decisão.** Reconstruir com `graphify update . --force` e atualizar os números
citados. Resultado: **2.021 nós, 5.974 arestas, 82 comunidades**, corpus de 201
arquivos, `built_at_commit = d5dd5841`. `SeletorComBusca` passou a aparecer com 11
arestas — importado por `PsyRecordPage` e `DentalRecordPage`.

**Armadilhas associadas**

- **Sem `--force`, o `update` recusa o rebuild.** Ele compara com o grafo salvo e
  aborta quando o novo tem menos nós — exatamente o caso de um refactor que
  remove chamadas. A saída é `--force` (ou `GRAPHIFY_FORCE=1`).
- **`update` reextrai código, não rerrotula.** Os 78 rótulos salvos foram
  reaplicados por id; como o agrupamento virou 82 comunidades, quatro nasceram sem
  nome e várias ficaram com o nome do arquivo (`solicitacoes.py`,
  `RTStatsDashboard.tsx`). `cluster-only` renomearia, mas exige backend de LLM —
  com `GEMINI_API_KEY` vazia o resultado seria placeholder pior. Não vale a pena
  pelo rótulo.
- **`ARCHITECTURE.md` não se atualiza sozinho.** Todo rebuild pede revisão de
  §1 (contagens), §5 (comunidades e nós), §6 (god nodes) e das lacunas em §8.
  `AGENTS.md` repete os três números.
- **`tree_sitter_sql` ausente** deixa o `.sql` do corpus fora do grafo; o warning
  é esperado e não bloqueia.

---

## Apêndice cronológico

Datas conforme registradas no `STATUS.md` original. "Revisão" é a cabeça Alembic
citada no bloco, quando havia.

| Data | Bloco / marco | Revisão | Resumo |
|---|---|---|---|
| — | Fase 1 | — | Postgres como fonte de verdade; SQLite deixa de existir |
| — | Fase 2 | — | Alembic autoritativa; `create_all()` removido |
| — | Fase 3 | `6699e657b519` | Constraints: `max_length` + `Text` nos narrativos |
| — | Fase 4 | — | Testes rodando contra Postgres; `POST /auth/seed` removido |
| — | Fase 5 | — | Higiene de Compose/Docker |
| — | Frontend Camada 1 | — | `ClinicContext` sincroniza após login |
| — | Vertical Slice 0 | — | Segregação por curso |
| — | Bloco 1 | — | Demandas de estágio (RF-009) — depois removidas |
| — | Bloco 2 | — | Homologação odontológica e bugs que perdiam dado |
| — | Bloco 3 | — | Segurança: bcrypt, CORS allowlist, IP real, `ativo` no login |
| — | Bloco 4 | — | RF-009 gerenciamento RBAC + `getMe()` |
| — | Bloco 5 | — | Parecer obrigatório e painel sem dado inventado |
| — | Bloco 6 | — | Anamnese e sinais vitais (tabela `anamneses`) |
| — | Bloco 7 | — | Conciliação de demandas + carimbo docente — demandas removidas em 16/10 |
| — | Bloco 8 A–D | — | Ficha psi sem texto pré-preenchido; fila com rótulo correto; painéis sem número inventado; gestão honesta |
| — | F(b) | — | Senha fixa em `AuthContext` era código morto; removida |
| 2026-10-16 | Emenda RF-001 | — | Vínculo paciente↔estagiário; `DEMANDAS_ESTAGIO` removida |
| 2026-10-18 | Commit `5faea90` | — | Marco de sincronização |
| 2026-10-19 | RF-005 + 5 defeitos psi | — | Duplas e correções de psicologia |
| 2026-10-23 | Coordenação de psicologia | `443963bc61cb` | Perfil `coordenacao`, escopado à psicologia |
| 2026-10-23 | CLI-FOR-45 (só frontend) | — | Ficha odontológica por instrumento |
| 2026-10-24 | Senha inicial automática (psi) | — | Servidor gera e envia por e-mail |
| 2026-10-24 | Incidente de credenciais | — | `.env` sai do índice (`cd7e0db`); rotação |
| 2026-10-24 | Motivo da falta | `e9750b3073ed` | `motivo_falta` só com status `FALTOU` |
| 2026-10-24 | E-mail externo no cadastro | — | `PERMITIR_EMAILS_EXTERNOS` |
| 2026-10-25 | Agenda em dupla | — | `auxiliar_matricula` nas duas clínicas (depois restrito à odonto) |
| 2026-10-25 | Ficha odontológica por domínio | — | Schema da ficha |
| 2026-10-27 | Duplas persistidas | `68603f2ce70a` | `duplas_odonto`; "Vincular Aluno" |
| 2026-10-27 | Documento completo da ficha | `7276903013a1` | `documentos_ficha_odonto` em JSON |
| 2026-10-28 | Merge psi + odonto | `525d8633fd0e` | Branch `teste`; 12 conflitos à mão |
| 2026-10-28 | RT escopada por curso | — | RT-001/RT-002; sem visão global |
| 2026-10-28 | Ficha: dupla real e PDF | — | `GET /duplas-odonto/minha` |
| 2026-10-28 | Exames de imagem e dossiê | `a3955e2873a6` | `radiografias_odonto`; PDFs da RT |
| 2026-10-28 | Um estagiário por sessão (psi) | — | `auxiliar_matricula` recusado em psicologia |
| 2026-10-28 | Endereço/CPF da psicologia | `fed886164882` | `endereco`, `numero`, `complemento` |
| 2026-10-29 | Menu da RT | — | Sem "Controladoria" e sem seletor de clínica |
| 2026-10-29 | Senha automática nas duas | — | Odontologia também recebe senha gerada |
| 2026-11-01 | Recuperação de senha | — | Identificador sem `@`; intervalo; fuso UTC |
| 2026-11-01 | Desativar/reativar | — | Erro renderizado; `REATIVACAO_USUARIO` |
| 2026-11-01 | PDF da ficha odonto | — | `RelatorioImpressao` em `shared/impressao` |
| 2026-11-11 | Extensões do SPA psi | — | Demanda, encerramento, assinaturas, 6 consultórios, ocorrências |
| 2026-11-12 | Pull do `teste` + CRLF | — | Container quebrado por CRLF no entrypoint |
| 2026-11-12 | Gemini + ditado | — | `gemini-2.5-flash` para áudio; 503 honesto |
| 2026-11-16 | Vínculo paciente↔estagiário | — | `atribuicoes_clinicas` + índice único parcial |
| — | Bloco 10 | — | Logout limpa ficha odonto e anamneses |
| — | Bloco 11 | — | Telas de acesso param de prometer o que não existe |
| — | Bloco 12 | — | `PATCH /auth/senha`; painel da RT corrigido |
| — | Bloco 13 | — | Pedido de credencial com autorização da RT |
| — | Bloco 14 | — | Recuperação por token no e-mail (57 → 69 testes) |
| — | Pós-14 | — | SMTP real, porta 465, e-mail já enviado; 100 testes |
| — | Vínculo + ajustes | — | 83 → 141 testes ao longo da linha |
| 2026-11-18 | Snapshot documental | `c7e91d4a2b08` | **149 passed, 1 deselected**; build verde; 7 problemas de lint |
| 2026-11-18 | Remoção de `.agents/` | — | Skill `gemini-api-dev` sai do índice (ADR-24); repo fica só com o produto |
| 2026-11-18 | Remoção do "Baixar cópia" | — | Ficha odonto perde o export JSON; `exportarJson*` preservadas (ADR-25) |

> O `STATUS.md` antigo citava `68603f2ce70a` como head e "114 passed" no bloco
> "Estado verificado" — os dois estavam defasados. O valor real medido em
> 18/11/2026 é `c7e91d4a2b08` (24 revisões) e 149 testes.

