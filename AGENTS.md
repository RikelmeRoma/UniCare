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


**Adicionar paciente ao seed quebra o desempacotamento fixo.** Três funções fazem
`p1, p2, p3, p4 = pacientes`, e `seed_pacientes` passou a devolver **5** (a quinta
é a menor de idade, `curso="ambos"`). Sem `pacientes[:4]`, o `ValueError` sobe
pelo lifespan do FastAPI e a suíte inteira vira **69 erros de setup** — sem uma
única asserção que aponte o seed. A contagem de pacientes por clínica também é
assumida desigual pelo teste de `distribuicao_cursos`, e é por isso que o paciente
novo é `ambos` e não `psicologia`.


**Teste que vaza estado quebra a suíte inteira depois.** Dois exemplos que já
aconteceram aqui: um teste desativava o `16032935` e não o reativava, e outro
trocava a senha do `REC-001` por um resgate — os dois deixavam a conta no
estado errado para todo o resto. Quem roda depois falha por motivo que não tem
nada a ver com o que está testando, e o erro aponta para a regra nova, não para
o vazamento. **Teste que mexe em cadastro de outro teste restaura no `finally`.**
(`delete` é desativar, não apagar: para devolver a conta ao estado anterior, o
`PATCH` precisa aceitar `ativo`.)

**Uma feature nova cria os próprios dados de teste.** O bloco de vínculo
paciente↔estagiário não usa nenhum usuário nem paciente do seed: ele cria os
estagiários por `POST /usuarios` e os pacientes por `POST /pacientes`. Consumir o
seed além de ler é o que produz dependência de ordem — um teste que transfere o
paciente X quebra o seguinte que espera encontrá-lo com o aluno A.
**`op.drop_table()` não remove tipos ENUM no PostgreSQL.** Um `downgrade` que
cria colunas enum precisa derrubar os tipos explicitamente com `checkfirst=True`,
senão o `upgrade` seguinte falha com `type ... already exists`.

**Novo membro de ENUM exige migração escrita à mão.** Os tipos nativos gravam os
*nomes* Python em caixa alta (`ESTAGIARIO`). O `--autogenerate` não detecta
`ALTER TYPE ... ADD VALUE`. O downgrade também não remove o valor: recrie o tipo,
converta as colunas para `VARCHAR` e devolva-as ao enum — senão o
`alembic downgrade base` do `conftest.py` falha.

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

**O motivo da falta é do agendamento, não da observação logística.** `motivo_falta`
existe só enquanto `status='FALTOU'`; enviá-lo com outro status é 422 e sair de
`FALTOU` limpa o campo. Ele é separado de `observacao_logistica` de propósito —
usar a observação como justificativa apagaria a nota logística que a recepção já
tinha escrito. O modal de captura é habilitado por
`AppointmentTable.permitirMotivoFalta`, ligado **só** em `PsyReceptionDashboard`
(recepção, RT e coordenação); odontologia marca falta direto.

**A ordem dos guards importa quando o `detail` é normativo.** `require_curso` foi
feito para aceitar o guard de papel em `base=`, avaliado **antes** do curso. Sem
isso a recepção recebia 403 de "clínica restrita" no lugar do `RN-001` — mesmo
status, `detail` errado, e os testes de conformidade affinei pelo identificador
da regra. Não desfaça isso registrando as duas dependências separadas no
endpoint: o FastAPI não garante qual resolve primeiro.

**Bypass de `exigir_perfil` não é permissão de gestão.** A coordenação passa pelo
guard como a RT, mas `_pode_gerenciar` limita os alvos: supervisor, estagiário e
recepção. Criar, editar, desativar, aprovar ou recusar pedido de RT/coordenação
continua sendo ato exclusivo da RT. Em `solicitacoes.py`, a guarda do perfil
**final** vem antes de `email_service.enviar`; sem isso a pessoa recebe a senha
de uma conta que o servidor recusou criar.

**Senha inicial é gerada no servidor, em qualquer clínica.**
Nenhuma gestão escolhe a credencial: RT e coordenação **não enviam senha**
(422 se enviarem), e o servidor gera com `gerar_senha_inicial()` — a mesma regra
para psicologia e odontologia. `AprovacaoSolicitacao.senha` continua no schema
só para a rota **detectar e recusar** o campo; ignorá-lo em silêncio faria a
gestão acreditar que definiu uma senha que nunca foi usada. A resolução fica
depois de `_pode_gerenciar` e antes do e-mail — inverter isso faz o 403 de
alçada virar 422, ou dispara mensagem com senha de conta que não será criada.
Os testes leem a senha gerada do corpo do e-mail simulado
(`_EnvioAprovacao.senha_do_ultimo()`); não há senha fixa para logar. Não
reintroduza o campo editável em `SolicitacoesCadastro`.

**`require_roles([ESTAGIARIO])` não restringe a escrita ao estagiário.**
`exigir_perfil` deixa RT e coordenação passarem por bypass, então a rota de
criação de evolução psi confere `current_user.perfil != ESTAGIARIO` diretamente.
Esconder o formulário no `PsyRecordPage` não basta: o `POST /prontuarios/psico`
precisa recusar supervisor, RT e coordenação com 403.

**Rota pós-login é uma função só, e `recepcao` se decide por curso.** `getDestinationRoute`
vive em `src/features/auth/routes.ts`, e tanto `LoginFields` (login) quanto
`UnauthorizedPage` (botão "Voltar ao Meu Módulo Autorizado") importam dela. Houve duas
cópias e elas divergiram: o caso `recepcao` existia só no ramo `odontologia`, então o
REC-002 caía em `/psi/prontuario` e levava 403 ao entrar — e o botão de saída mandava
qualquer recepção para a tela de odontologia, prendendo a de psicologia em laço de
negação. **Ao acrescentar um perfil ou clínica, mude a função, não as cópias** (não há mais
cópias: é esse o ponto).

**O sidebar não oferece página que o `ProtectedRoute` vai recusar.** As rotas de
cada clínica declaram `allowedCourses`, e o `ProtectedRoute` **não dá bypass de
curso para a RT** — o comentário lá é explícito: cada RT responde pela própria
clínica. O menu da RT de odontologia tinha um seletor "Filtrar Módulo Clínico"
(Global/Psico/Odonto) que, fora de Odonto, só produzia links para
`/nao-autorizado`. O seletor saiu e cada RT vê apenas a seção do próprio curso
(psicologia nunca viu o seletor). Um "RT global" de verdade exigiria modelo novo
— perfil ou flag que o `require_curso` conheça —, não um botão no menu.

**Filtrar a listagem não protege a escrita.** O `?curso=` do cliente é opcional
e omitível, e `PATCH /{id}/status` age por id, não por lista. Toda rota que
escreve precisa conferir o curso do registro com `validar_curso_do_registro` —
paciente `ambos` é a exceção legítima, agendamento não é (tem cadeira fixa).

**O RF do relatório manda no identificador.** `RELATORIO_CONSOLIDADO_PROJETO.md` é a
fonte normativa de RF-001 a RF-009: RF-007 é trilha de auditoria e RF-009 é
gerenciamento RBAC. Já usamos esses dois números para outras coisas e os testes
passaram a mentir. Para algo fora da lista do relatório (demandas de estágio,
CPF duplicado), cite por descrição — não invente número.

**Não cite identificador que o relatório não tem.** `RELATORIO_CONSOLIDADO_PROJETO.md`
define `RF-001` a `RF-009` e `RN-001`, `RN-002` e `RN-006` — **nenhum `RNF-*`**. A tela
de prontuário psi rotulava o bloco "RNF-003 · Síntese Técnica Conceitual" e o validador
citava `RNF-003` na mensagem de erro. Para algo fora da lista, cite por descrição.

**Trocar uma coluna do prontuário psi é emenda normativa, não refactor.** As colunas de
`PRONTUARIOS_PSICO` estão descritas no relatório em três lugares — o bloco de schema, o
diagrama ASCII e a lista de colunas. Reduzi-las de três para uma (`redacao_texto`) e os
três precisam mudar junto; deixar o relatório descrevendo colunas que não existem é
documento mentindo sobre o banco.

**`sa.Enum(...)` inline em `op.create_table` tenta `CREATE TYPE`.** Reaproveitar um
ENUM que já existe — como `perfilusuario`, da migration inicial — morre com `type
perfilusuario already exists`. A solução é o tipo do dialeto com
`create_type=False`: `postgresql.ENUM('ESTAGIARIO', ..., name='perfilusuario',
create_type=False)`. O `create_type=False` no `sa.Enum` genérico **não resolve**.

**O nome do ENUM precisa bater com o que o SQLModel deriva da classe.** Classe
`SituacaoSolicitacao` vira `situacaosolicitacao`; escrever `statussolicitacao` na
migration faz o `alembic check` pedir alteração de tipo para sempre. Se o `check`
acusar `modify_type` em uma coluna enum logo após criar a tabela, é o nome.

**Rota pública de recuperação não pode responder "não existe".**
`POST /auth/senha/recuperar/solicitar` e `.../redeem` são o caminho de quem
esqueceu a senha. Se a resposta do pedido diferir entre conta existente e
inexistente, a rota serve de oráculo para enumerar o cadastro; se a do resgate
diferir entre código errado, expirado e já usado, serve de oráculo para testar
códigos. As duas respostas são genéricas de propósito — e o teste de conformidade
exatamente dessas igualdades é o que impede alguém de "melhorar a mensagem".

**Recuperação sem canal de entrega não é auto-recuperação.** A segurança de um
reset vem de provar que *você* recebeu o token. Sem SMTP, não há como. O que dá
para fazer sem depender de ninguém é o inverso: `PATCH /auth/senha` com a senha
atual (Bloco 12) e `/cadastro` passando pela RT (Bloco 13).

**"Enviamos o e-mail" sem e-mail enviado é a pior falha possível.** Se o SMTP está
desligado ou quebrado, a resposta é 503 dizendo que o envio está indisponível, e
a tela orienta procurar a coordenação. O `email_service` separa `NAO_CONFIGURADO`
de `FALHOU` porque os dois impedem o envio mas a pessoa precisa saber qual é. Não
simplifique isso para um `if not enviou: raise 500`.

**Trocar de provedor de e-mail é só `.env`.** `smtplib` e `email` são da stdlib, e
todo o envio está atrás de `email_service`, com as chaves em `settings`. Gmail,
Outlook e servidor institucional com senha comum são a mesma configuração. **A
exceção:** Office 365 com autenticação básica desabilitada exigiria OAuth2, e aí
passa a ser código — peça esse detalhe no requerimento à instituição.

**Não imprima a senha do SMTP para diagnosticar.** Para checar caractere oculto,
confira comprimento e o teste de espaços nas pontas; o hex dos bytes revela a senha
na própria sessão, e ela fica no histórico da conversa.

**`password_hash` do SMTP só entra do `.env`.** Está no `.gitignore` **e** no
`.dockerignore`, e nenhum commit toca `backend/.env`.

**`.gitignore` não protege arquivo já rastreado.** O `backend/.env` esteve no
índice e foi publicado no repositório público com a senha de app do Gmail, a
`SECRET_KEY` e a senha do Postgres. `git check-ignore -v backend/.env` **não
acusa** arquivo rastreado (só com `--no-index`), então a checagem que vale é
`git ls-files backend/.env` — saída vazia é o esperado. Depois de um vazamento,
rotacionar é obrigatório: remover do índice não invalida o valor que ficou no
histórico.

**Nunca use a senha de app real como exemplo em comentário ou documentação.**
Ela estava no `.env.example`, no `README.md`, no docstring do `config.py` e no
`STATUS.md` como "exemplo" de quatro grupos — e era a credencial de verdade.
Exemplo é `abcd efgh ijkl mnop`.

**`PERMITIR_EMAILS_EXTERNOS` é `false` por padrão, e teste não pode ler a flag
do ambiente.** O `.env` local pode estar com `true` para o teste manual com
Gmail; um teste que depende disso passa isolado e falha em outra máquina. Fixe
os dois estados com `monkeypatch.setattr(settings, "PERMITIR_EMAILS_EXTERNOS",
True/False)`. Ligar a flag abre a rota pública para qualquer endereço — a
aprovação da gestão continua sendo o gate, mas a fila vira alvo de spam.

**`EmailStr` exige `email-validator`.** O pydantic importa o pacote sob demanda;
sem ele no `requirements.txt`, a aplicação inteira quebra na importação, mesmo
que o campo apareça num schema que quase ninguém usa.

**Desativar usuário não é apagar.** `DELETE /usuarios/{id}` marca `ativo = false`.
O login já checava `ativo` em `get_current_user`, mas **a rota de login não
checava** — conta desativada recebia token com 200. Cheque `ativo` em qualquer
lugar que emite credencial.

**Supervisor gerencia estagiário, não colega.** `routers/usuarios.py` limita o
supervisor a `perfil=estagiario` na própria clínica; promover alguém a supervisor
ou a RT é ato da RT. As telas `ClinicalPairs` e `PsySupervisionPage` são de
supervisor: se o endpoint não permitir, o compilador não avisa — a tela só passa
a dar erro em runtime.

**`op.create_table` sem `PrimaryKeyConstraint('id')` não cria SERIAL.**
`sa.Column('id', sa.Integer(), nullable=False)` sozinho vira `integer` sem default
e o primeiro insert falha com `null value in column "id"` — o `alembic check`
continua limpo, porque o comparador só olha o tipo. Sempre declare
`sa.PrimaryKeyConstraint('id')`, como nas migrações anteriores.

**Nova coluna de data: use DateTime, não `str`.** `data_nascimento` e
`data_sessao` são `str` e por isso não ordenam nem comparam — a pendência de
corrigir isso ainda está aberta. `anamneses.afetido_em` foi criada como DateTime
para não repetir o defeito.

**A autoria de registro clínico vem do token, não do corpo.** O POST de anamnese
não tem campo de responsável: o backend preenche com `current_user`. Se o corpo
aceitasse o responsável, qualquer cliente registraria aferição em nome de outra
pessoa.

**Regra de tela precisa existir no servidor.** Exigir parecer, senha ou qualquer
campo só no frontend deixa a regra como conveniência: qualquer cliente chama a
rota direto. `HomologacaoRequest.parecer` recusa texto vazio com 422 nas duas
clínicas, e dois testes garantem que a recusa não grava nada.

**Endereço obrigatório em psicologia não vale para `ambos` no servidor.** O
modal compartilhado só mostra endereço/número quando `defaultCurso='psicologia'`,
mas `ambos` também é criado pela recepção de odontologia. O backend exige os
campos apenas para `curso='psicologia'`; o formulário de psicologia exige também
quando o destino é `ambos`. Não mova a exigência para `ambos` sem dar à
odontologia os mesmos campos.

**Teste que consome pendência do seed vira dependente de ordem.** Os testes de
homologação anteriores já consomem as duas fichas pendentes do seed, então um
teste que procure "a próxima pendente" passa isolado e falha na suíte. Crie o
registro dentro do próprio teste em vez de depender do estado deixado por outros.

**Nada de fallback numérico em tela institucional.** O painel da RT usava `?? 1`
e barras com largura fixa: se a chamada falhasse, exibia número inventado sem
aviso. Prefira `—` mais um estado de erro visível. Dado clínico inventado
(sinal vital, alergia, radiografia de banco de imagens) é pior que campo vazio.

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
`.value`. Já aconteceu em `usuarios.py` e nas duas rotas de homologação.

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
