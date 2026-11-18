# STATUS — UniCare

**Snapshot:** 18/11/2026 · branch `augusto` · commit `d5dd584` (18/11/2026)
**Alembic:** `c7e91d4a2b08` (head) · 24 revisões
**Documentação irmã:** [`README.md`](./README.md) · [`AGENTS.md`](./AGENTS.md) ·
[`PRD.md`](./PRD.md) · [`SPEC.md`](./SPEC.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) ·
[`DESIGN.md`](./DESIGN.md) · [`MEMORY.md`](./MEMORY.md)

Este arquivo responde só a "onde o projeto está agora". O histórico de blocos,
decisões e armadilhas vive em [`MEMORY.md`](./MEMORY.md).

---

## Estado verificado

Medido nesta máquina em 18/11/2026, com os containers `unicare_postgres` e
`unicare_api` saudáveis:

| Verificação | Resultado |
|---|---|
| `pytest -q` (de `backend/`) | **149 passed, 1 deselected**, 7 warnings — 4m30s |
| `alembic current` | `c7e91d4a2b08 (head)` |
| `alembic check` | `No new upgrade operations detected.` |
| `npm run build` | **verde** (10,4 s) |
| `npm run lint` | **7 problemas** (7 erros, 0 warnings), todos preexistentes |
| API `/health` | `dialect: postgresql`, `conectado: true` |
| Containers | `unicare_postgres` healthy · `unicare_api` healthy |

O teste `deselected` é o de rede (marcador `rede`), que exige
`UNICARE_TESTE_SMTP=1` e `-m rede`. A suíte padrão não toca a rede.

---

## O que está entregue

### Núcleo

- PostgreSQL 16 como única fonte de verdade; schema versionado por Alembic
  (24 revisões). `create_all()` não existe.
- FastAPI com 12 roteadores e 54 endpoints sob `/api/v1`, CORS com allowlist e
  trilha de auditoria append-only com IP real.
- React 19 + TypeScript + Vite 8 + Tailwind v4 + React Router 7, com
  `ProtectedRoute` por papel **e** por clínica.

### Psicologia (SPA)

- Prontuário CFP 06/2019: síntese clínica em `redacao_texto`, sem aspas literais
  (RN-002), com três tipos de registro — `SESSAO`, `DEMANDA`, `ENCERRAMENTO`.
- Vínculo paciente↔estagiário em `atribuicoes_clinicas`, com índice único parcial
  de um responsável ativo e transferência que preserva histórico.
- Um estagiário por sessão; `auxiliar_matricula` é recusado com 422.
- Fila de homologação com parecer obrigatório, carimbo `supervisor_nome` e
  registro de devolutiva.
- 6 consultórios SPA (`Consultório SPA-01`..`SPA-06`) com checagem de conflito.
- Ocorrências de estagiários registradas pela recepção.
- Relatório executivo, dossiê de custódia e PDF com assinaturas.

### Odontologia

- Odontograma (32 dentes, faces), periograma e índices gengivais, adultos e
  infantil.
- Ficha completa persistida em `documentos_ficha_odonto` (JSON versionado) com
  fluxo `EM_ELABORACAO` → `AGUARDANDO_VALIDACAO` → `VALIDADO` /
  `DEVOLVIDO_PARA_AJUSTE`.
- Duplas clínicas em `duplas_odonto`, com um aluno por dupla ativa.
- Radiografias em `radiografias_odonto` (data URL, 5 MB), sem homologação de
  imagem.
- Anamnese e sinais vitais em `anamneses`, com validação de faixa.
- PDF da ficha no padrão do dossiê de custódia (prévia A4).

### Transversal

- RBAC com 5 perfis e escopo de clínica aplicado em leitura **e** escrita.
- Seletor de paciente com busca por nome ou CPF na ficha odontológica e no
  prontuário SPA (`src/components/ui/SeletorComBusca.tsx`): filtro local, sem
  acento, navegação por teclado e contagem da lista.
- Recuperação de senha por token de 6 caracteres no e-mail (SHA-256 na tabela),
  troca de senha autenticada com senha atual, e pedido de credencial com
  aprovação da RT.
- Assistente clínico com Gemini: chat, sugestão de campos e transcrição de
  ditado, com cadeia de fallback de modelos.
- Auditoria `RF-007` em login, cadastro, submissão, homologação, troca de senha e
  ciclo de vida de usuário.

---

## Pendências abertas

Nada aqui é 🔴 crítico. A ordem é a de execução sugerida.

### Importante

1. **`data_nascimento` e `prontuarios_psico.data_sessao` são `str`, não `DATE`.**
   Impedem ordenar e comparar. Uma migração resolve as duas.
2. **`agendamentos` não tem campo de data/hora separado para recorte temporal.**
   `data_sessao` é `date` e `horario` é texto; três painéis evitam afirmar
   "hoje"/"na semana" por isso.
3. **Vínculo estagiário ↔ turma ↔ supervisor (RF-005).** Exige tabela nova. Hoje
   a segregação real é por curso; a tela já não afirma o vínculo inexistente.
4. **Erro do `GET /usuarios` não é exposto no `AuthContext`.**
   `carregarUsuarios` engole a falha, então "clínica sem estagiário" e "chamada
   que não voltou" são indistinguíveis — o cartão mostra `—`.

### Menor

5. **Checklist CFP estruturado na homologação psi.** Odontologia tem checklist
   CFO de 4 itens; psicologia homologa com texto livre. Não implementado de
   propósito: os itens exigiriam inventar conteúdo normativo do CFP.
6. **7 problemas de lint preexistentes** (`react-refresh` 3, `setState` em effect
   2, `_` não usado 1, `any` 1). O build é o gate de tipos; o lint não bloqueia.
7. **`backend/.env` precisa de `GEMINI_API_KEY` válida** para as rotas `/ia/*`.
   Sem a chave elas respondem 503. Trocar a chave exige
   `docker compose up -d api` — `restart` não relê o `env_file`.

---

## O que mudou desde o último STATUS

O `STATUS.md` anterior tinha 2.510 linhas de diário. O conteúdo foi reorganizado:

- **Histórico de blocos 1–14, decisões e ~50 armadilhas** → [`MEMORY.md`](./MEMORY.md),
  em 26 ADRs temáticos mais apêndice cronológico.
- **RF/RN e perfis** → [`PRD.md`](./PRD.md).
- **Rotas, schemas, validações, ENUMs e invariantes** → [`SPEC.md`](./SPEC.md).
- **Mapa de código e acoplamento** → [`ARCHITECTURE.md`](./ARCHITECTURE.md),
  extraído do grafo em `graphify-out/`.
- **Cores, fontes, ícones e padrões de tela** → [`DESIGN.md`](./DESIGN.md).

O texto original continua recuperável:
`git show b1c8bf0:STATUS.md` e `git show b1c8bf0:AGENTS.md`.

---

## Como subir

```bash
# banco + API
cd backend
docker compose up -d db
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

# frontend (na raiz)
npm run dev
```

Detalhes de ambiente, ENUMs e Alembic estão em
[`backend/README.md`](./backend/README.md) e [`AGENTS.md`](./AGENTS.md).
