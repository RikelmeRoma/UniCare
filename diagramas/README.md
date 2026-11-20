# Diagramas — UniCare

Dois diagramas entregáveis em HTML autocontido, prontos para abrir no
navegador: a **arquitetura** do sistema e o **modelo de dados** (ERD). Não
servem nada da aplicação — são snapshot para leitura e impressão.

- **Fonte de verdade do contrato:** [`../SPEC.md`](../SPEC.md) §2 (rotas) e
  §5 (modelo de dados)
- **Mapa de código e acoplamento:** [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- **Decisões e armadilhas:** [`../MEMORY.md`](../MEMORY.md), ADR-28

---

## O que tem aqui

| Arquivo | Tipo | O que mostra |
|---|---|---|
| `arquitetura-unicare.html` | arquitetura | Duas views: **jornada** (navegador → Vite → API FastAPI → PostgreSQL) e **saídas** (SMTP e Gemini, com as saídas condicionais). Componentes, portas, limites e notas sobre CORS, schema e o que não existe no MVP. |
| `modelagem-banco.html` | ERD | As **14 entidades** de negócio com atributos, PK/UK/FK e cardinalidade, e as **10 foreign keys** do schema, em três views: **acesso**, **paciente** e **clínica**. |
| `*.delivery.json` | recibo | Hash e caminho do artefato entregue, com o `receiptId`. |
| `*.finalize-summary.json` | recibo | Resultado dos gates (`validate`, `deliver`, `check`, `browser-check`), versão do gerador e duração. |
| `*.finalize.json`, `*.browser-check.json` | recibo | Evidência detalhada de cada gate. |

Os dois HTMLs **abrem direto no navegador**, sem servidor e sem rede: todo o
JavaScript e o CSS estão embutidos no arquivo.

## Origem

| Item | Valor |
|---|---|
| Gerador | Archify 3.2.0 |
| Revisão de origem | `2a608bc` (18/11/2026) |
| Gerado em | 19/11/2026 |
| Gates | `validate`, `deliver`, `check`, `browser-check` — todos `pass` |
| Qualidade | `showcase` (arquitetura) · `standard` (ERD) |

Os diagramas foram gerados a partir de um *candidate* (a especificação-fonte
em JSON), não a partir do código: o gerador não lê o repositório. O rascunho
(`candidate.json`, scripts de tradução e revisões) fica em `.archify/`, que é
**ignorado pelo git** porque carrega caminhos absolutos da máquina.

## Reconciliação com o `SPEC.md`

O ERD foi conferido contra o schema e bate:

- **14 entidades** — as mesmas de `SPEC.md` §5.
- **10 foreign keys** — sete `paciente_id` → `pacientes.id`, mais
  `radiografias_odonto.dupla_id`, `solicitacoes_cadastro.usuario_criado_id` e
  `tokens_recuperacao_senha.usuario_id`.
- **`logs_auditoria` e `ocorrencias_estagiarios` aparecem sem aresta para
  `usuarios`** — a relação é lógica, não-identificante. A nota no próprio
  diagrama explica o porquê (ver ADR-02 em [`../MEMORY.md`](../MEMORY.md)):

  > `logs_auditoria.usuario_id` não tem FK, de propósito: a trilha sobrevive à
  > exclusão do usuário.

**O diagrama ilustra; o `SPEC.md` decide.** Em caso de divergência, o
`SPEC.md` vale — e o diagrama está desatualizado.

## Como atualizar

1. Mude o schema, as rotas ou o desenho de camadas no código.
2. Regenere o *candidate* da especificação do diagrama.
3. Rode o Archify (`deliver` e depois `finalize`) e confira os gates.
4. Atualize os números citados aqui, em [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
   §10 e em [`../SPEC.md`](../SPEC.md) §5.

## Armadilhas

- **Archify não é graphify.** O Archify gera estes diagramas de entrega; o
  `graphify` gera o grafo de dependências do código, que é a base do
  `ARCHITECTURE.md` e vive em `graphify-out/` (também ignorado). Os números
  dos dois não se cruzam.
- **Os recibos JSON guardam caminhos absolutos** da máquina que rodou o
  gerador (`C:\Users\...\UniCare\...`). Servem como evidência do que foi
  validado, não como referência de caminho portátil.
- **A pasta versionada é `diagramas/`, com `d` minúsculo.** Os recibos gravam
  `Diagramas/` com D maiúsculo — no Windows não há diferença, mas em outro
  sistema o caminho do recibo não resolve.
- **O `candidate.json` é a especificação-fonte.** Sem ele, o HTML não é
  regenerável: ele não sai do código, sai do candidato.
