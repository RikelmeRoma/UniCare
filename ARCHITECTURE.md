# ARCHITECTURE — UniCare

Mapa de módulos e acoplamento extraído do grafo persistido em `graphify-out/`,
gerado em **18/11/2026**. Este documento **não** foi produzido relendo o código:
a fonte é `GRAPH_REPORT.md` + `graph.json`. Ele descreve o que existe, sem propor
refactor.

---

## 1. Como o grafo foi gerado

| Item | Valor |
|---|---|
| Corpus | code-only — 200 arquivos, ~151.479 palavras |
| Fora do corpus | `.md`, PDFs, apresentações, imagens |
| Nós | **2.014** |
| Arestas | **5.955** |
| Comunidades | **78** (53 mostradas, 25 thin omitidas) |
| Extração | 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS |
| Arestas inferidas | 321 (confiança média 0,94) |
| Custo de tokens | 0 input · 0 output |
| Não classificados | 12 arquivos (5 sem tipo, 3 `.css`, 2 `.ini`) |

Artefatos em `graphify-out/`:

- `graph.json` — grafo completo (a chave de arestas é `links`).
- `GRAPH_REPORT.md` — god nodes, comunidades, conexões inesperadas, lacunas.
- `graph.html` — visualização interativa.
- `manifest.json`, `cost.json`, `cache/`.

`graphify-out/` **não é versionado**. Para reconstruir: CLI `graphify`. Para
consultar sem reescanear:

```bash
graphify query "<pergunta>"
graphify explain "<nó>"
```

---

## 2. Forma geral

Três camadas, com uma fronteira HTTP explícita no meio:

```text
┌───────────────────────────── frontend (Vite/React) ─────────────────────────────┐
│ pages  →  features (context/componentes)  →  services/api.ts  →  fetch           │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │  JSON snake_case + JWT Bearer
┌───────────────────────────────────────▼─────────────────────────────────────────┐
│ routers  →  schemas (validação)  →  services (regra)  →  models (SQLModel)        │
│                                   ↘  database.get_session  →  PostgreSQL          │
└─────────────────────────────────────────────────────────────────────────────────┘
```

- **Sem ciclo de importação** — o relatório responde `None detected`.
- A dependência é sempre de fora para dentro: `routers` conhece `schemas`,
  `services` e `models`; `models` não conhece `routers`.
- O ponto de estrangulamento do backend é `Usuario`; o do frontend é
  `ApiService` + `ClinicContext`.

---

## 3. Backend

### 3.1 Núcleo

| Arquivo | Papel | Arestas no grafo |
|---|---|---|
| `app/main.py` | Cria o FastAPI, CORS com allowlist, `lifespan` que roda o seed, registra 12 roteadores | Comunidade "Núcleo FastAPI e Banco" |
| `app/config.py` | `Settings` (Pydantic Settings): `DATABASE_URL` obrigatório, `SECRET_KEY`, `CORS_ORIGINS`, SMTP, Gemini | Comunidade "Configuração e Settings" |
| `app/database.py` | `engine` + `get_session()` | Núcleo |
| `app/seed.py` | Seed idempotente por tabela; `SENHA_DEMO = "unicare123"` | Comunidade "Seed de Demonstração" |

### 3.2 Roteadores (12 arquivos, 54 endpoints)

| Roteador | Prefixo | Endpoints | Depende de |
|---|---|---|---|
| `auth.py` | `/auth` | 5 | `auth_service`, `crypto_service`, `email_service`, `token_recuperacao` |
| `usuarios.py` | `/usuarios` | 7 | `auth_service._pode_gerenciar`, `dupla_service` |
| `pacientes.py` | `/pacientes` | 4 | `Anamnese`, `vinculo_service` |
| `agendamentos.py` | `/agendamentos` | 4 | `Agendamento`, `vinculo_service`, `cursos_visiveis` |
| `atribuicoes.py` | `/atribuicoes` | 4 | `AtribuicaoClinica`, `vinculo_service` |
| `prontuarios.py` | `/prontuarios` | 15 | `ProntuarioPsico`, `FichaOdonto`, `DocumentoFichaOdonto`, `RadiografiaOdonto`, `dupla_service` |
| `duplas.py` | `/duplas-odonto` | 4 | `DuplaOdonto`, `dupla_service` |
| `solicitacoes.py` | `/solicitacoes-cadastro` | 4 | `SolicitacaoCadastro`, `usuarios.criar_usuario_para_gestor`, `email_service` |
| `auditoria.py` | `/auditoria` | 1 | `LogAuditoria` |
| `relatorios.py` | `/relatorios` | 1 | `Agendamento`, `ProntuarioPsico`, `Paciente` |
| `ocorrencias.py` | `/ocorrencias` | 2 | `OcorrenciaEstagiario` |
| `ia.py` | `/ia` | 3 | `gemini_service` |

`prontuarios.py` é o maior e o mais acoplado: 15 endpoints e 4 models. É o
roteador que concentra o maior fan-out do backend.

### 3.3 Modelos (11 arquivos, 14 tabelas)

| Arquivo | Tabelas |
|---|---|
| `usuario.py` | `usuarios` (+ `PerfilUsuario`, `CursoUsuario`) |
| `paciente.py` | `pacientes` |
| `agendamento.py` | `agendamentos` |
| `atribuicao.py` | `atribuicoes_clinicas` |
| `prontuario.py` | `prontuarios_psico`, `fichas_odonto`, `documentos_ficha_odonto`, `radiografias_odonto` |
| `anamnese.py` | `anamneses` |
| `dupla.py` | `duplas_odonto` |
| `ocorrencia.py` | `ocorrencias_estagiarios` |
| `solicitacao.py` | `solicitacoes_cadastro` |
| `token_recuperacao.py` | `tokens_recuperacao_senha` |
| `auditoria.py` | `logs_auditoria` |

`usuario.py` é o nó de dados central: `Usuario` (111 arestas) e `PerfilUsuario`
(72) aparecem em praticamente todos os roteadores, porque o guard de RBAC e o
escopo de clínica passam por eles.

### 3.4 Serviços (7 arquivos)

| Serviço | Responsabilidade | Consumido por |
|---|---|---|
| `auth_service.py` | JWT, `get_current_user`, guards (`require_roles`, `require_curso`, `exigir_perfil`), `cursos_visiveis`, `validar_curso_do_registro` | Todos os roteadores |
| `auditoria_service.py` | `registrar_log()` e `ip_do_cliente()` | Escritas e login |
| `crypto_service.py` | bcrypt direto (`rounds=12`), `SenhaLongaError` | `auth`, `usuarios`, `solicitacoes` |
| `vinculo_service.py` | Regras de paciente↔estagiário compartilhadas | `atribuicoes`, `agendamentos` |
| `dupla_service.py` | Duplas odontológicas, encerramento por desativação | `duplas`, `usuarios`, `prontuarios` |
| `email_service.py` | SMTP (`smtplib`), `StatusEnvio` (`ENVIADO`/`NAO_CONFIGURADO`/`FALHOU`) | `auth`, `solicitacoes` |
| `gemini_service.py` | Chamadas ao Gemini, fallback de modelos, contexto clínico | `ia` |

`registrar_log()` (47 arestas) e `ip_do_cliente()` (44) são o segundo maior
ponto de acoplamento do backend — toda escrita passa por eles.

### 3.5 Schemas

`backend/app/schemas/` é a camada de validação (Pydantic v2), não de
persistência. Ele é consumido pelos roteadores e **não** importa `models` na
maioria dos casos (exceção: enums compartilhados). Detalhe dos contratos em
[`SPEC.md`](./SPEC.md).

---

## 4. Frontend

### 4.1 Estrutura

| Diretório | Arquivos `.ts`/`.tsx` | Papel |
|---|---|---|
| `src/features/dental-record` | 41 | Ficha odontológica, odontogramas, periograma, anamnese, radiografias, agenda |
| `src/features/auth` | 16 | Login, cadastro, recuperação, troca de senha, contexto e rotas |
| `src/features/psychology` | 14 | Prontuário, agenda, supervisão, recepção SPA |
| `src/features/supervision` | 13 | Painel da RT, gestão RBAC, fila de homologação, relatórios |
| `src/features/reception` | 7 | Agenda e cadastro da recepção |
| `src/features/ai-assistant` | 4 | Drawer do assistente clínico |
| `src/features/coordination` | 1 | Gestão da coordenação |
| `src/features/clinic` | 1 | Contexto de clínica |
| `src/shared/impressao` | — | `RelatorioImpressao` + `relatorio.css` |
| `src/components` | — | `layout/`, `ui/`, `icons/` |
| `src/services` | — | `api.ts` (`ApiService`) |
| `src/context` | — | `ThemeContext` |

### 4.2 God nodes do frontend

| Nó | Arestas | Leitura |
|---|---|---|
| `react` | 73 | Bridge entre quase todas as comunidades de UI |
| `ApiService` | 59 | Único cliente HTTP; toda chamada passa por ele |
| `useClinic()` | 45 | Estado clínico global, consumido por praticamente toda tela |
| `useAuth()` | 43 | Sessão e perfil, usado por guards, sidebar e telas |

`ClinicContext` é o maior nó de estado: concentra pacientes, agendamentos,
prontuários, fichas, anamneses, duplas, ocorrências e atribuições, e sincroniza
após o login. `AuthContext` guarda sessão, usuários e escrita de conta.

### 4.3 Fronteira front ↔ back

- **Wire:** `snake_case` (espelha o Python).
- **Domínio do front:** `camelCase`.
- **Conversão:** concentrada em `src/services/api.ts` (`ApiService`). Nenhuma
  tela converte campo manualmente.
- **Sessão:** JWT em `localStorage`, enviado como `Authorization: Bearer`.
- **Rotas:** declaradas em `src/App.tsx` e protegidas por `ProtectedRoute` com
  `allowedRoles` **e** `allowedCourses`; o destino pós-login vem de
  `src/features/auth/routes.ts` (`getDestinationRoute`).

---

## 5. Comunidades do grafo

As 78 comunidades se agrupam em cinco famílias. Nomes conforme o relatório.

### Backend — domínio

| Comunidade | Nós | Conteúdo |
|---|---|---|
| Usuários e Pedidos de Credencial | 35 | `Usuario`, `PerfilUsuario`, `SolicitacaoCadastro`, aprovação |
| Prontuários e Homologação | 27 | `DocumentoFichaOdonto`, `RadiografiaOdonto`, criação e homologação |
| Agendamentos: Modelo e Rotas | 14 | `Agendamento`, `StatusAgendamento`, salas, status |
| Vínculo Paciente-Estagiário | 15 | `AtribuicaoClinica`, `SituacaoAtribuicao`, transferência |
| Duplas Clínicas de Odontologia | 15 | `DuplaOdonto`, criação/desativação |
| Ocorrências: Modelo e Rota | 4 | `OcorrenciaEstagiario` |
| Rotas de Pacientes | 6 | cadastro, anamnese, visibilidade |
| Schemas de Paciente | 4 | CPF, formatação |
| Schemas de Prontuário | 13 | validação CFP/CFO |
| Núcleo FastAPI e Banco | 22 | app, health, sessão |
| Configuração e Settings | — | `Settings` |
| Serviço de E-mail SMTP | 4 | conexão, montagem, envio |
| Assistente Clínico Gemini | 20 | saídas estruturadas, status |
| Rotas da IA (Áudio/Texto) | 4 | assistente e transcrição |
| Seed de Demonstração | 13 | pacientes, agenda, fichas, duplas |
| Recuperação de Senha por Token | 24 | código, hash, validade |

### Frontend — features

| Comunidade | Nós | Conteúdo |
|---|---|---|
| Shell da Aplicação e Navegação | 46 | `App`, sidebar, ícones de navegação |
| Contexto Clínico Global | 53 | `ClinicContext`, `ClinicProvider`, classificação |
| Relatórios Executivos da RT | 49 | `RTStatsDashboard`, gráficos, impressão |
| Abas do Prontuário Odonto | 31 | abas, cartões clínicos, drawer |
| Impressão da Ficha Odontológica | 48 | formulário base, assinaturas, seções |
| Odontograma Adulto SVG | 38 | dentes, condições, ferramentas |
| Estado do Odontograma Infantil | 55 | dentições, cores, faces |
| Constantes do Odontograma Infantil | 61 | opções e tabelas infantis |
| Periograma Periodontal | 21 | sítios, faces, NIC |
| Índices Gengivais Locais | 23 | cálculo e persistência local |
| Anamnese Infantil: Higiene | 22 | mapa de higiene |
| Mapa de Higiene Infantil | 16 | faces e percentual |
| Formulários Base de Anamnese | 57 | campos, seções, ajuda |
| Rascunho de Anamnese | 24 | rascunho local de aferições |
| Agenda de Odontologia (UI) | 29 | agenda, turnos, status |
| Ocorrências de Estagiários UI | 22 | cartão, consultórios, tipos |
| Supervisão Psicologia UI | 8 | fila, histórico, cabeçalho docente |
| Drawer do Assistente IA | 25 | drawer, atalhos, microfone |
| Ícones Corporativos (Navegação) | 29 | 41 ícones, subconjunto de navegação |
| Ícones Corporativos (Ações) | 31 | subconjunto de ações |
| Emblemas Institucionais | — | símbolos de curso |
| Tema Claro e Escuro | 9 | `ThemeProvider`, storage, sistema |
| Cliente HTTP ApiService | — | `api.ts` |
| Dependências do Frontend | 48 | `package.json` |

### Testes

| Comunidade | Nós |
|---|---|
| Testes: Homologação e RBAC | 38 |
| Testes: Vínculo Paciente-Estagiário | 43 |
| Testes: Duplas e Ficha Odonto | 36 |
| Testes: Solicitações e E-mail | 20 |
| Testes: Recuperação de Senha | 15 |
| Testes: Extensões Psi | 6 |
| Testes: Supervisão de Alunos | 4 |
| Testes: Agenda de Duplas | 3 |
| Fixtures de Teste (conftest) | 3 |
| Dublê de E-mail em Testes | — |

### Migrações e infraestrutura

| Comunidade | Nós |
|---|---|
| Migrações: Schema Inicial | 10 |
| Migrações: RBAC e Radiografia | 3 |
| Migrações: Ficha e Tokens | 4 |
| Migrações: Constraints de Tamanho / Duplas / Demanda / Autoria / Senha / Vínculo / Curso na Auditoria / Anamnese / Vínculo Supervisor / Motivo da Falta / Endereço | 1–4 cada |
| Infraestrutura Docker | 34 |
| Entrypoint do Container | — |
| Script de Diagnóstico SMTP | 4 |
| Config TypeScript App / Node / Raiz | 19 / 16 / — |

---

## 6. God nodes (ranking global)

| # | Nó | Arestas | Onde |
|---|---|---|---|
| 1 | `get_auth_token()` | 118 | `backend/tests/test_compliance.py` |
| 2 | `Usuario` | 111 | `models/usuario.py` |
| 3 | `react` | 73 | dependência |
| 4 | `PerfilUsuario` | 72 | `models/usuario.py` |
| 5 | `ApiService` | 59 | `services/api.ts` |
| 6 | `registrar_log()` | 47 | `services/auditoria_service.py` |
| 7 | `useClinic()` | 45 | `context/ClinicContext.tsx` |
| 8 | `ip_do_cliente()` | 44 | `services/auditoria_service.py` |
| 9 | `useAuth()` | 43 | `features/auth/context/AuthContext.tsx` |
| 10 | `_psi()` | 41 | helper de teste |

Leituras que o ranking permite:

- **O nó mais conectado é um helper de teste.** `get_auth_token()` vive em
  `test_compliance.py` e é importado pelos demais arquivos de teste; o grafo
  registra esse acoplamento entre módulos de teste. `_psi()` (10º) é o mesmo
  caso.
- **`Usuario`/`PerfilUsuario` são o eixo do domínio.** RBAC e escopo de clínica
  são verificados em toda rota, então o model de conta aparece em todos os
  roteadores.
- **`registrar_log()` + `ip_do_cliente()` formam o eixo de escrita.** Não há
  escrita relevante que não passe por eles.
- **`ApiService` + `useClinic()` + `useAuth()` são o eixo do frontend.** Toda
  tela consome pelo menos dois dos três.

---

## 7. Conexões inesperadas (registradas como INFERRED)

| Origem | Destino | Leitura |
|---|---|---|
| `ia_client()` (teste) | `get_session()` | Teste de IA monta sessão de banco pelo mesmo caminho da aplicação |
| `seed_agendamentos()` | `StatusAgendamento` | O seed importa o enum do model de agenda |
| `listar_anamneses()` | `Anamnese` | Rota lê o model diretamente, fora do schema de leitura |
| `validar_e_construir_contexto_paciente()` | `Anamnese` | `gemini_service` lê anamnese sem passar por schema/roteador — intencional |
| `_validar_vinculo_estagiario()` | `SituacaoAtribuicao` | Guard de prontuário consulta o enum de vínculo |

A ligação `gemini_service → Anamnese` é a mais relevante: o serviço de IA monta
o contexto clínico a partir do banco, não do corpo da requisição. Ver
[`MEMORY.md`](./MEMORY.md), ADR-15.

---

## 8. Lacunas do grafo

- **25 comunidades thin (< 3 nós) omitidas** do relatório; para explorá-las,
  `graphify query`.
- **12 arquivos não classificados** — 5 sem tipo, 3 `.css`, 2 `.ini`. Os CSS
  (`index.css`, `relatorio.css`, `App.css`) ficam fora da malha de dependências
  do grafo.
- **321 arestas inferidas** (5% do total) com confiança média 0,94. As que
  envolvem `Usuario` (85) são as que mais merecem verificação manual quando o
  comportamento não bater com o mapa.
- O grafo não mede qualidade, cobertura de teste nem dívida técnica — só
  conexão.

---

## 9. Perguntas que o grafo responde bem

- Por que `react` liga "Ocorrências de Estagiários UI" a 20 outras comunidades?
  Centralidade de intermediação 0,065 — é a ponte da camada de UI.
- As 85 relações inferidas de `Usuario` estão corretas? É a maior fonte de
  incerteza do mapa.
- "Usuários e Pedidos de Credencial" deve ser dividido? É a maior comunidade de
  domínio (35 nós) e mistura cadastro, RBAC e fila de solicitações.
  Este documento **não** recomenda a divisão; apenas registra a pergunta.
