# STATUS — UniCare

**Snapshot:** 20/11/2026 · branch `augusto` · commit `d6a751b` (20/11/2026)
**Alembic:** `c7e91d4a2b08` (head) · 24 revisões
**Documentação irmã:** [`README.md`](./README.md) · [`AGENTS.md`](./AGENTS.md) ·
[`PRD.md`](./PRD.md) · [`SPEC.md`](./SPEC.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) ·
[`DESIGN.md`](./DESIGN.md) · [`MEMORY.md`](./MEMORY.md) ·
[`apresentacao/README.md`](./apresentacao/README.md) ·
[`diagramas/README.md`](./diagramas/README.md)

Este arquivo responde só a "onde o projeto está agora". O histórico de blocos,
decisões e armadilhas vive em [`MEMORY.md`](./MEMORY.md).

---

## Estado verificado

Medido nesta máquina em 20/11/2026, com os containers `unicare_postgres` e
`unicare_api` saudáveis:

| Verificação | Resultado |
|---|---|
| `pytest -q` (de `backend/`) | **150 passed, 1 deselected**, 7 warnings — 5m34s |
| `alembic current` | `c7e91d4a2b08 (head)` |
| `alembic check` | `No new upgrade operations detected.` |
| `npm run build` | **verde** (10,3 s) |
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
  - 404 de modelo inexistente **continua** a cadeia (não encerra com 502 na
    primeira tentativa); se nenhum modelo configurado existir para a conta, a
    resposta é 502 dizendo isso.
  - O drawer consulta `GET /ia/status` ao abrir: sem `GEMINI_API_KEY`, mostra
    banner âmbar e bloqueia atalhos, texto, microfone e envio.
  - Envio em duplicidade no mesmo tick é cortado por `ref`, não por estado —
    duas chamadas ao Gemini custam dinheiro.
- Auditoria `RF-007` em login, cadastro, submissão, homologação, troca de senha e
  ciclo de vida de usuário.

### Entrega do MVP

- **Apresentação:** deck de 10 slides (`apresentacao/UniCare_MVP.pptx`), export
  `UniCare_MVP.pdf`, 10 previews PNG, gerador `gerar_slides.py` e roteiro
  cronometrado da demo (`apresentacao/roteiro-demo.md`). Inventário e regeração
  em [`apresentacao/README.md`](./apresentacao/README.md).
- **Diagramas:** `diagramas/arquitetura-unicare.html` (2 views: jornada e
  saídas condicionais) e `diagramas/modelagem-banco.html` (14 entidades, 10
  FKs, 3 views). HTML autocontido, abre offline. Origem e atualização em
  [`diagramas/README.md`](./diagramas/README.md).
- **Documentação:** `PRD`, `SPEC`, `ARCHITECTURE`, `DESIGN`, `MEMORY`, `STATUS`,
  `backend/README` e os dois READMEs de entregável — mais a configuração de
  ambiente consolidadas em `SPEC.md` §7.

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
7. **`backend/.env` com `GEMINI_API_KEY` configurada e verificada.** As três
   rotas `/ia/*` respondem: `/status` devolve `configurado: true`,
   `/assistente` respondeu em 4,2 s pelo `gemini-3.5-flash-lite` e `/transcrever`
   transcreveu áudio pt-BR pelo `gemini-2.5-flash`. Trocar a chave continua
   exigindo `docker compose up -d api` — `restart` não relê o `env_file`.
8. **O export do deck não é automatizado.** `gerar_slides.py` escreve só o
   `.pptx`; o PDF e os 10 previews saíram de export externo ao PowerPoint.
   Mudou o gerador, reexporte os dois ou os artefatos ficam com conteúdo
   diferente do deck.

---

## O que mudou desde o snapshot de 18/11/2026

**Produto e robustez**

- **404 de modelo inexistente virou item da cadeia de fallback** da IA: o
  `GEMINI_MODEL_PRIMARY` desatualizado não derruba mais a rota, e quando
  nenhum modelo configurado existe para a conta a resposta é 502 dizendo isso.
- **O drawer do assistente consulta `GET /ia/status` ao abrir**: sem chave,
  banner âmbar e envio bloqueado — o 503 deixou de ser a primeira pista.
- **Duplo envio no mesmo tick deixou de gastar duas chamadas**: o corte é por
  `ref`, não por estado de render.
- Novo teste cobre o fallback 404: a suíte vai de 149 para **150 passed**.

**Entregáveis**

- **Apresentação versionada** em `apresentacao/`: deck de 10 slides, export em
  PDF, previews PNG, gerador e roteiro da demo.
- **Diagramas versionados** em `diagramas/`: arquitetura (2 views) e ERD
  (14 entidades, 10 FKs, 3 views), com os recibos de validação.

**Documentação**

- **Configuração de ambiente consolidada** em `SPEC.md` §7: 20 variáveis do
  backend com padrão e efeito, as três de teste/Compose e `VITE_API_URL` do
  frontend — que não aparecia em documento nenhum.
- **Rotas do SPA documentadas** em `ARCHITECTURE.md` §4.4 e §4.5: as 15 telas
  com perfil e clínica, e o mapa do destino pós-login.
- **`backend/README.md` corrigido**: `RN-004` era "homologação docente" na
  seção de segurança e "menor de idade" na tabela logo abaixo; `RNF-004` não
  existe (o identificador é `RF-007`); `RF-008` aparecia como "parcial" e
  `RF-003` como "dados reais pendentes" — ambos fora do que o código faz.
- **Dois ADRs novos** em `MEMORY.md` (apresentação e diagramas) e três
  armadilhas novas de IA.
- **`graphify-out/` e `.archify/` passaram a estar no `.gitignore`**, como a
  documentação já afirmava.

**Reorganização anterior (mantida)**

O `STATUS.md` de 18/11 tinha 2.510 linhas de diário. O conteúdo foi
reorganizado em:

- **Histórico de blocos 1–14, decisões e ~50 armadilhas** → [`MEMORY.md`](./MEMORY.md),
  em 28 ADRs temáticos mais apêndice cronológico.
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
