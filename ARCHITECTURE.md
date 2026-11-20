# ARCHITECTURE — UniCare

Mapa de módulos e acoplamento extraído do grafo persistido em `graphify-out/`,
gerado em **18/11/2026**. Este documento **não** foi produzido relendo o código:
a fonte é `GRAPH_REPORT.md` + `graph.json`. Ele descreve o que existe, sem propor
refactor.

---

## 1. Como o grafo foi gerado

| Item | Valor |
|---|---|
| Corpus | code-only — 201 arquivos, ~152.248 palavras |
| Fora do corpus | `.md`, PDFs, apresentações, imagens |
| Nós | **2.021** |
| Arestas | **5.974** |
| Comunidades | **82** (57 mostradas, 25 thin omitidas) |
| Extração | 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS |
| Arestas inferidas | 321 (confiança média 0,94) |
| Custo de tokens | 0 input · 0 output |
| Não classificados | 12 arquivos (5 sem tipo, 3 `.css`, 2 `.ini`) |
| Commit de origem | `d5dd5841` |

Artefatos em `graphify-out/`:

- `graph.json` — grafo completo (a chave de arestas é `links`).
- `GRAPH_REPORT.md` — god nodes, comunidades, conexões inesperadas, lacunas.
- `graph.html` — visualização interativa.
- `manifest.json`, `cost.json`, `cache/`.

`graphify-out/` **não é versionado** (está no `.gitignore`). Para reconstruir: CLI
`graphify`. Para consultar sem reescanear:

```bash
graphify query "<pergunta>"
graphify explain "<nó>"
```

**O grafo é um snapshot do commit `d5dd584`.** Desde lá houve `2a608bc` (só
documentação) e `d6a751b` (ajuste de robustez da IA: `_eh_modelo_indisponivel`
e o banner de `/ia/status`). O primeiro não muda o mapa; o segundo **não
aparece nele**, porque o grafo é anterior ao ajuste — o grafo não é a fonte
para o estado do assistente. `graphify-out/2026-11-18/` guarda a cópia anterior
do grafo, gerada no mesmo ciclo.

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
| `src/components` | — | `layout/`, `ui/` (inclui `SeletorComBusca`), `icons/` |
| `src/services` | — | `api.ts` (`ApiService`) |
| `src/context` | — | `ThemeContext` |

### 4.2 God nodes do frontend

| Nó | Arestas | Leitura |
|---|---|---|
| `react` | 74 | Bridge entre quase todas as comunidades de UI |
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

### 4.4 Rotas do SPA

`src/App.tsx` declara **15 telas** mais dois redirecionamentos (`/` e `*`, ambos
para `/login`). As quatro primeiras telas são públicas; as demais passam por
`ProtectedRoute`, que exige perfil **e** clínica — o item sem permissão não é
renderizado no menu (ADR-08).

| Rota | Perfis | Clínica | Tela |
|---|---|---|---|
| `/` | — | — | redireciona para `/login` |
| `/login` | — | — | `LoginPage` |
| `/cadastro` | — | — | `RegisterPage` (pedido público de credencial) |
| `/recuperar-senha` | — | — | `ForgotPasswordPage` (2 etapas) |
| `/nao-autorizado` | — | — | `UnauthorizedPage` |
| `/recepcao` | `recepcao`, `supervisor`, `rt` | odontologia | `ReceptionDashboard` |
| `/ficha-odonto` | `estagiario`, `supervisor`, `rt` | odontologia | `DentalRecordPage` |
| `/odonto/agendamentos` | `estagiario`, `supervisor`, `rt` | odontologia | `OdontoAppointmentsPage` |
| `/supervisao` | `supervisor`, `rt` | odontologia | `SupervisionPage` |
| `/psi/recepcao` | `recepcao`, `rt`, `coordenacao` | psicologia | `PsyReceptionDashboard` |
| `/psi/agendamentos` | `estagiario` | psicologia | `PsyAppointmentsPage` |
| `/psi/prontuario` | `estagiario`, `supervisor`, `rt`, `coordenacao` | psicologia | `PsyRecordPage` |
| `/psi/supervisao` | `supervisor`, `rt`, `coordenacao` | psicologia | `PsySupervisionPage` |
| `/psi/coordenacao` | `coordenacao`, `rt` | psicologia | `CoordinationManagementPage` |
| `/rt/relatorios` | `rt`, `supervisor` | qualquer | `RTManagementPage` |
| `/conta/senha` | qualquer autenticado | qualquer | `AlterarSenhaPage` |
| `*` | — | — | redireciona para `/login` |

Duas rotas não filtram por clínica de propósito: `/rt/relatorios` (o servidor
devolve o escopo do curso do token) e `/conta/senha` (trocar a própria senha é
direito de qualquer perfil logado; o servidor exige a senha atual).

### 4.5 Destino pós-login

`getDestinationRoute` (`src/features/auth/routes.ts`) é a função única que
decide para onde a conta vai depois de autenticar — o `LoginFields` e o
`UnauthorizedPage` importam a mesma, para a divergência do ADR-08 não voltar.

| Perfil / curso | Destino |
|---|---|
| `rt` (qualquer clínica) | `/rt/relatorios` |
| `coordenacao` | `/psi/coordenacao` |
| psicologia · `recepcao` | `/psi/recepcao` |
| psicologia · `supervisor` | `/psi/supervisao` |
| psicologia · `estagiario` | `/psi/prontuario` |
| odontologia · `recepcao` | `/recepcao` |
| odontologia · `supervisor` | `/supervisao` |
| odontologia · `estagiario` | `/ficha-odonto` |
| curso `geral` ou ausente | `/psi/recepcao` (fallback) |

---

## 5. Comunidades do grafo

As 82 comunidades se agrupam em quatro famílias. Os nomes são os do relatório;
comunidade que o `update` criou sem rótulo aparece com o nome do arquivo de
origem (`arquivo`), porque o agrupamento mudou e o rótulo salvo não se aplicava.

### Backend — domínio

| Comunidade | Nós | Conteúdo |
|---|---|---|
| Prontuários e Homologação | 25 | `DocumentoFichaOdonto`, `RadiografiaOdonto`, criação e homologação |
| Duplas Clínicas de Odontologia | 23 | `DuplaOdonto`, criação/desativação |
| Recuperação de Senha por Token | 22 | código, hash, validade |
| Assistente Clínico Gemini | 20 | saídas estruturadas, status |
| `usuarios.py` (arquivo) | 18 | cadastro, edição, RBAC de gestão |
| `solicitacoes.py` (arquivo) | 16 | aprovação, recusa, fila de pedidos |
| Núcleo FastAPI e Banco | 15 | app, health, sessão, JWT |
| Vínculo Paciente-Estagiário | 15 | `AtribuicaoClinica`, `SituacaoAtribuicao`, transferência |
| Agendamentos: Modelo e Rotas | 13 | `Agendamento`, `StatusAgendamento`, salas, status |
| Schemas de Prontuário | 13 | validação CFP/CFO |
| Seed de Demonstração | 12 | pacientes, agenda, fichas, duplas |
| Rotas de Pacientes | 11 | cadastro, anamnese, visibilidade |
| Ocorrências: Modelo e Rota | 5 | `OcorrenciaEstagiario` |
| `models/__init__.py` (arquivo) | 5 | reexportação dos models |
| Serviço de E-mail SMTP | 4 | conexão, montagem, envio |
| Rotas da IA (Áudio/Texto) | 4 | assistente e transcrição |
| Configuração e Settings | thin | `Settings` |

### Frontend — features

| Comunidade | Nós | Conteúdo |
|---|---|---|
| Abas do Prontuário Odonto | 59 | abas, cartões clínicos, drawer |
| Contexto Clínico Global | 49 | `ClinicContext`, `ClinicProvider`, classificação |
| Agenda de Odontologia (UI) | 48 | agenda, turnos, status |
| `CorporateIcons.tsx` (arquivo) | 47 | 41 ícones + variantes |
| Formulários Base de Anamnese | 44 | campos, seções, ajuda |
| Dependências do Frontend | 44 | `package.json` |
| Odontograma Adulto SVG | 38 | dentes, condições, ferramentas |
| `anamnese-infantil/estado.ts` (arquivo) | 36 | dentições, faces, alternâncias |
| `FormularioBase.tsx` (arquivo) | 33 | campos, grupos, assinaturas |
| Estado do Odontograma Infantil | 32 | dentições, cores, faces |
| Ícones Corporativos (Ações) | 31 | subconjunto de ações |
| `RTStatsDashboard.tsx` (arquivo) | 26 | gráficos, impressão, busca de paciente (`SeletorComBusca`) |
| Drawer do Assistente IA | 25 | drawer, atalhos, microfone |
| Índices Gengivais Locais | 24 | cálculo e persistência local |
| Periograma Periodontal | 21 | sítios, faces, NIC |
| Anamnese Infantil: Higiene | 20 | mapa de higiene |
| Rascunho de Anamnese | 20 | rascunho local de aferições |
| `react` | 20 | dependências React e `App` |
| Config TypeScript App | 19 | `tsconfig.app.json` |
| Config TypeScript Node | 16 | `tsconfig.node.json` |
| `RelatorioExecutivo.tsx` (arquivo) | 15 | relatório impresso da RT |
| `PsyRecordPage.tsx` (arquivo) | 13 | prontuário de psicologia, impressão |
| `ExclamationTriangleIcon` | 13 | ícones de aviso, `ForgotPasswordPage` |
| `DossiePacientePrint.tsx` (arquivo) | 11 | dossiê impresso |
| Tema Claro e Escuro | 9 | `ThemeProvider`, storage, sistema |
| `AppSidebar.tsx` (arquivo) | 8 | navegação lateral |
| Cliente HTTP ApiService | thin | `api.ts` |
| Config TypeScript Raiz | thin | `tsconfig.json` |
| Entrypoint do Container | thin | `docker-entrypoint.sh` |

### Testes

| Comunidade | Nós |
|---|---|
| Testes: Vínculo Paciente-Estagiário | 43 |
| Testes: Homologação e RBAC | 38 |
| Testes: Duplas e Ficha Odonto | 36 |
| Testes: Solicitações e E-mail | 20 |
| Testes: Recuperação de Senha | 15 |
| Testes de Extensões Psi | 6 |
| Testes: Supervisão de Alunos | 4 |
| Testes: Agenda de Duplas | 3 |
| Fixtures de Teste (conftest) | 3 |
| Dublê de E-mail em Testes | thin |
| Testes: Desativação de Aluno · Testes: RF-009 Cadastro RT · Teste: Lista Psi da Recepção · Teste: Segregação por Curso | thin |

### Migrações e infraestrutura

| Comunidade | Nós |
|---|---|
| Infraestrutura Docker | 34 |
| Migrações: Schema Inicial | 10 |
| Migrações: Ficha e Tokens | 4 |
| Migrações: RBAC e Radiografia | 3 |
| 11 migrações nomeadas (Constraints de Tamanho, Duplas Odonto, Demanda e Ocorrências, Autoria da Ficha, Senha por E-mail, Vínculo Paciente, Curso na Auditoria, Anamnese e Sinais, Vínculo Supervisor, Motivo da Falta, Endereço do Paciente) | thin |
| Script de Diagnóstico SMTP | 4 |

---

## 6. God nodes (ranking global)

| # | Nó | Arestas | Onde |
|---|---|---|---|
| 1 | `get_auth_token()` | 118 | `backend/tests/test_compliance.py` |
| 2 | `Usuario` | 111 | `models/usuario.py` |
| 3 | `react` | 74 | dependência |
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
- **4 comunidades sem rótulo.** O `update` preservou 78 rótulos, mas o novo
  agrupamento gerou 82 comunidades; as quatro que nasceram sem nome são thin e
  por isso não aparecem no relatório nem na §5.
- **321 arestas inferidas** (5% do total) com confiança média 0,94. As que
  envolvem `Usuario` (85) são as que mais merecem verificação manual quando o
  comportamento não bater com o mapa.
- O grafo não mede qualidade, cobertura de teste nem dívida técnica — só
  conexão.
- O corpus é code-only e anterior às pastas de entrega: `apresentacao/` e
  `diagramas/` não entram no mapa, e `apresentacao/gerar_slides.py` é código
  que o snapshot não viu.

---

## 9. Perguntas que o grafo responde bem

- Por que `react` liga 23 comunidades de UI — de `AppSidebar.tsx` a
  "Periograma Periodontal"? Centralidade de intermediação 0,061: é a ponte da
  camada de UI.
- As 85 relações inferidas de `Usuario` estão corretas? É a maior fonte de
  incerteza do mapa.
- `solicitacoes.py` deve ser dividido? Coesão 0,099, a mais baixa entre as
  comunidades de domínio do backend — mistura aprovação, recusa e listagem.
  Este documento **não** recomenda a divisão; apenas registra a pergunta.

---

## 10. Diagramas entregues

Além do grafo de dependências, a pasta `diagramas/` traz dois HTMLs
autocontidos, gerados pelo **Archify 3.2.0** a partir do commit `2a608bc` e
publicados em 19/11/2026. Eles são **snapshot**, não gerado em runtime: o
código da aplicação não os usa, e a API não os serve.

| Arquivo | Tipo | O que mostra |
|---|---|---|
| `diagramas/arquitetura-unicare.html` | arquitetura | Duas views: **jornada** (navegador → Vite → API → PostgreSQL) e **saídas** (SMTP e Gemini, com as saídas condicionais). Componentes, portas, limites e notas sobre CORS, schema e o que não existe no MVP. |
| `diagramas/modelagem-banco.html` | ERD | As **14 entidades** de negócio com atributos, PK/UK/FK e cardinalidade, e as **10 foreign keys** do schema, em três views: **acesso**, **paciente** e **clínica**. |

Os dois HTMLs abrem direto no navegador, sem servidor e sem rede. Os recibos
ao lado (`*.delivery.json`, `*.finalize-summary.json`) registram os gates
(`validate`, `deliver`, `check`, `browser-check` — todos `pass`) e os hashes
dos artefatos.

**Reconciliação com o `SPEC.md`.** O ERD mostra 10 FKs porque são 10 FKs: sete
`paciente_id` → `pacientes.id`, `radiografias_odonto.dupla_id`,
`solicitacoes_cadastro.usuario_criado_id` e
`tokens_recuperacao_senha.usuario_id`. `logs_auditoria` e
`ocorrencias_estagiarios` aparecem **sem aresta para `usuarios`** — a relação
é lógica, não-identificante, e está explicada em nota no próprio diagrama
(ADR-02). O diagrama é a ilustração do `SPEC.md` §5; o `SPEC.md` é a fonte.

**Regeneração.** O rascunho do gerador fica em `.archify/`
(`<tipo>-<nome>-<timestamp>/`), com o `candidate.json` e os scripts de
tradução; a pasta é ignorada pelo git porque carrega caminhos absolutos da
máquina. Ao mudar schema, rotas ou desenho de layers, regenere os candidatos,
roda o Archify (`deliver` + `finalize`) e atualize os números citados neste
documento e no `SPEC.md`. Detalhes de operação em
[`diagramas/README.md`](./diagramas/README.md).
