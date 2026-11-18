# DESIGN — UniCare

Interface **como está**. Este documento descreve o que o código renderiza hoje;
não propõe redesign, não avalia e não sugere padrão novo. Todo valor citado tem
origem em `src/index.css`, `tailwind.config.js`, `index.html` ou nos componentes.

- **Não há design system formal:** não existe pacote de componentes, biblioteca
  de ícones, arquivo de tokens semânticos nem Storybook.
- **Não há `ui-ux-pro-max`, shadcn ou Radix.** Os componentes são escritos à mão
  com classes utilitárias.
- **`tailwind.config.js` está vazio** (`theme.extend: {}`, `plugins: []`). O tema
  vive no CSS, no bloco `@theme` de `src/index.css` (Tailwind v4, CSS-first).

---

## 1. Tipografia

Declarada em `src/index.css` (`@theme`) e carregada do Google Fonts em
`index.html`:

| Token | Família | Pesos carregados | Uso |
|---|---|---|---|
| `--font-sans` | Plus Jakarta Sans, depois `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI` | 400, 500, 600, 700, 800 | Corpo, títulos, botões, navegação — é o padrão de `html, body` |
| `--font-mono` | JetBrains Mono, depois `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas` | 400, 500, 600, 700 | Matrícula, CPF, IDs, horários e códigos — 208 ocorrências de `font-mono` |

Padrões de texto observados:

- Títulos de tela em `text-xl`/`text-2xl` com `font-bold` e `tracking-tight`.
- Rótulos de seção e de tabela em `text-[10px]`/`text-xs`, `font-bold`,
  `uppercase` e `tracking-wide` (167 ocorrências de `tracking-wide`).
- Texto auxiliar em `text-slate-400`/`text-slate-500` (443 e 411 ocorrências —
  são as duas classes mais usadas do projeto).
- Números e identificadores sempre em monoespaçada; nunca há fonte decorativa.

O `document.title` e o favicon (`/uninassau-crest.png`) vêm de `index.html`; o
`lang` é `pt-BR`.

---

## 2. Cores

### 2.1 Base neutra

A interface é construída quase inteiramente sobre a escala `slate` do Tailwind.

| Papel | Claro | Escuro |
|---|---|---|
| Fundo da aplicação | `#f1f5f9` (`body`) / `bg-slate-100` no shell | `#070d19` (`#070D19` no shell) |
| Texto principal | `#0f172a` (`slate-900`) | `#f1f5f9` (`slate-100`) |
| Superfície de cartão | `bg-white`, borda `border-slate-200` | `bg-[#0D1628]` ou `bg-slate-800/900`, borda `border-slate-700`/`800` |
| Texto secundário | `slate-400` / `slate-500` | `slate-400` / `slate-500` |

Classes de cor mais frequentes (contagem no código): `text-slate-400` (443),
`text-slate-500` (411), `border-slate-200` (400), `text-slate-900` (338),
`bg-slate-900` (312), `border-slate-800` (290), `border-slate-700` (244),
`text-slate-300` (229), `bg-slate-50` (227).

### 2.2 Cores institucionais e de estado

Hexadecimais com uso recorrente:

| Cor | Ocorrências | Onde |
|---|---|---|
| `#0E1729` | 111 | Superfície escura de cartões e cabeçalhos em quase todos os módulos |
| `#002B49` | 56 | Azul institucional UNINASSAU — selo da marca, tema ativo da RT |
| `#881337` | 30 | Vinho/granada da odontologia — tema ativo, `badgeType="granada"` |
| `#FFD100` | 26 | Amarelo institucional — ponto do selo UNINASSAU |
| `#D7DEDD` | 19 | Cinza-esverdeado de apoio |
| `#001D33` | 14 | Borda do selo institucional |
| `#0D1628` | 6 | Superfície escura de cartão de login |

O azul de ação é `blue-600` (`bg-blue-600` 53 ocorrências, `text-blue-700` 55).
Estados usam a paleta padrão do Tailwind: `emerald` (sucesso/homologado),
`amber` (pendente/devolvido), `rose`/`red` (erro/recusa), `slate`
(neutro/elaboração).

### 2.3 Cor por clínica e por perfil

O item ativo do sidebar troca de cor conforme quem está logado
(`src/components/layout/AppSidebar.tsx`):

| Contexto | Classe do item ativo |
|---|---|
| Estagiário/supervisor de psicologia | `bg-blue-700 text-white` |
| Estagiário/supervisor de odontologia | `bg-[#881337] text-white` |
| Recepção | `bg-[#B45309] text-white` (âmbar escuro) |
| RT | `bg-[#002B49] dark:bg-blue-700 text-white` |
| Coordenação | `bg-blue-800 text-white` |

O `AppLayout` expõe `badgeType` com seis variantes: `blue` (padrão), `emerald`,
`indigo` (texto `#002B49`), `amber` (texto `amber-900`), `slate` e `granada`
(texto `#881337`). Cada uma tem par claro/escuro completo (`bg-*-50` /
`dark:bg-*-950/50`, borda `*-200/80` / `dark:border-*-800/70`).

---

## 3. Forma, sombra e densidade

| Recurso | Uso dominante |
|---|---|
| `rounded-xl` | 352 ocorrências — raio padrão de botão, campo, item de menu e cartão pequeno |
| `rounded-lg` | 140 — controles internos e chips |
| `rounded-2xl` | 103 — cartões e painéis |
| `rounded-full` | 54 — avatares, pílulas de status, pontos |
| `rounded-md` / `rounded-sm` | 50 / 8 — selos e detalhes |
| `rounded-3xl` | 1 — cartão de login |
| `shadow-sm` | 23 — elevação padrão de cartão |
| `shadow-2xl` | 20 — modais, drawer e cartão de login |
| `shadow-xl` / `shadow-lg` | 5 / 3 — painéis flutuantes |

Densidade: `px-3 py-2.5` em itens de navegação, `p-4`/`p-5` em cartões,
`gap-3`/`gap-4` em grades, `text-xs`/`text-sm` na maior parte do conteúdo.
Bordas de 1 px são a regra; não há uso de borda grossa decorativa.

---

## 4. Ícones

Não há dependência de ícones (`lucide`, `heroicons` etc.).

- `src/components/icons/CorporateIcons.tsx` — **41 ícones** exportados como
  funções `XIcon`, todos SVG de traço, com `IconProps` (`className`, tamanho
  herdado por `currentColor`).
- `src/components/icons/CourseSymbols.tsx` — **3 emblemas** de curso, usados como
  símbolo, não como ícone de ação.

Tamanhos observados: `w-4 h-4` em navegação e botões, `w-5 h-5` em cabeçalhos,
`w-6 h-6`/`w-8 h-8` em estados vazios e ilustrações. A cor vem sempre de
`currentColor` — nenhum ícone tem cor fixa no SVG.

---

## 5. Shell da aplicação

`src/components/layout/AppLayout.tsx` + `AppSidebar.tsx`:

- Contêiner `flex h-screen overflow-hidden` com fundo `bg-slate-100` /
  `dark:bg-[#070D19]` e transição de cor de 200 ms.
- **Sidebar retrátil**, com estado em `localStorage`
  (`unicare_sidebar_collapsed`); no mobile vira drawer sobre um backdrop
  `bg-slate-950/60 backdrop-blur-xs`, fechado por clique ou `XMarkIcon`.
- Sidebar exibe sigla de contexto (`SPA`, `ODO`, `RT`, `REC`, `COORD`), nome
  ("UniCare Psicologia", "UniCare Odonto") e, na odontologia, um selo
  `bg-rose-50 text-[#881337]`.
- **Cabeçalho** com `bg-white/90 dark:bg-[#0B1220]/90 backdrop-blur-md`,
  borda inferior, `title`, `subtitle`, `info` (via `InfoTooltip`), `badge`
  opcional e slot `actions`.
- `ThemeToggle` fica no cabeçalho. O menu é montado por perfil **e** por clínica;
  item sem permissão não é renderizado.
- A navegação usa `NavLink` com `isActive`; o item ativo recebe a cor do contexto
  (seção 2.3) e `shadow-sm`.

### 5.1 Telas de autenticação

`LoginForm` é o padrão visual das telas públicas:

- Fundo em gradiente `from-slate-100 via-slate-50 to-blue-50/40`
  (`dark:from-[#060B16] dark:via-[#081020] dark:to-[#0A162B]`).
- Cartão central `max-w-5xl`, `rounded-3xl`, `shadow-2xl`, borda
  `border-slate-200/80`, dividido em duas colunas a partir de `lg`
  (`flex-col lg:flex-row`), com `min-h-[640px]`.
- `AuthHeader` fixa no topo: `bg-white/90` com `backdrop-blur-md`, brasão,
  selo `bg-[#002B49]` com ponto `#FFD100`, versão e rótulo em `text-[9px]`
  `font-bold uppercase tracking-wider`.

As demais telas de acesso (`/cadastro`, `/recuperar-senha`, `/nao-autorizado`,
`/alterar-senha`) repetem essa moldura.

---

## 6. Padrões de tela

- **Dashboard/painel:** grade de cartões `rounded-2xl` com borda, um número
  grande em `font-bold`, rótulo em `uppercase tracking-wide` e, quando não há
  dado, `—` com texto de apoio.
- **Lista/tabela:** cabeçalho `text-[10px] uppercase tracking-wide`, linhas com
  borda `border-slate-100`/`dark:border-slate-800`, status em pílula
  `rounded-full` com par de cores por estado.
- **Modal:** painel central `rounded-2xl shadow-2xl`, backdrop escuro, cabeçalho
  com título e `XMarkIcon`, rodapé com ação primária `bg-blue-600` e secundária
  neutra. `ClinicalAssistantDrawer` usa o mesmo vocabulário, ancorado à direita.
- **Estado vazio:** ícone em `w-8 h-8`, frase curta e, quando aplicável, botão
  de ação. Nunca há número, nome ou texto clínico inventado no lugar do dado.
- **Formulário clínico:** seções em cartões com título, campos `rounded-xl` com
  borda `border-slate-200`, foco em `focus:border-blue-600` (37 ocorrências) ou
  `focus:border-blue-500` (25), com `focus:ring-blue-500` como reforço em 10
  casos; rótulo acima do campo e ajuda em `text-xs text-slate-500`. Erros
  aparecem em `text-red-700` (36 ocorrências) ou `text-red-600` junto ao campo,
  ou em banner no topo do modal.
- **Seletor de paciente (ficha odonto e prontuário SPA):** o gatilho repete a
  casca do `<select>` que substituiu (`rounded-xl`, `bg-slate-50` /
  `dark:bg-slate-900`, `text-xs font-semibold`) com `ChevronDownIcon` que gira
  ao abrir. O painel é `absolute` sob o campo, com busca no topo, lista
  `max-h-64 overflow-y-auto` e rodapé de contagem. Busca local por nome (sem
  acento e sem caixa) ou por CPF; teclado `↑` `↓` `Enter` `Esc`; item ativo em
  `bg-blue-50 dark:bg-blue-950/50`, selecionado com `CheckIcon`. Na odontologia
  o gatilho mostra `nome (CPF)`; na psicologia mostra só o nome e deixa o CPF na
  lista.
- **Ficha odontológica:** navegação por abas (`ClinicalTabNav`), odontograma e
  periograma em SVG, cores clínicas próprias (`#0E7C7B` para teal clínico,
  `#B45309` para alerta) e legenda sempre visível.

---

## 7. Tema claro e escuro

- `src/context/ThemeContext.tsx` + `themeState.ts`; modos `light`, `dark` e
  `system`, persistidos em `localStorage` na chave `unicare_theme`.
- Um script inline no `index.html` roda **antes** do React e aplica
  `document.documentElement.classList.add('dark')` conforme a preferência salva
  ou `prefers-color-scheme`; evita o flash de tema claro.
- O variant `dark` é customizado em `src/index.css`:
  `@custom-variant dark (&:where(.dark, .dark *):not(:where(.relatorio-doc, .relatorio-doc *, #rt-print, #rt-print *)))`.
  Ou seja, documento impresso e prévia PDF **nunca** entram no tema escuro.
- `html.dark` fixa fundo `#070d19` e texto `#f1f5f9`; `.relatorio-doc` e
  `#rt-print` fixam `color-scheme: light`.
- Scrollbars: `scrollbar-width: thin`, polegar
  `rgba(148,163,184,0.45)` no claro e `rgba(71,85,105,0.7)` no escuro.

---

## 8. Movimento

Sete keyframes em `src/index.css`, com utilitários `.animate-*`:

| Keyframe | Utilitário | Efeito |
|---|---|---|
| `floatOrb` | `animate-float-orb`, `animate-float-orb-delayed` | Orbe flutuando 24 px com leve escala |
| `pulseGlow` | `animate-pulse-glow` | Opacidade 0,35 → 0,75 com escala 1,15 |
| `slowSpin` | `animate-slow-spin`, `animate-slow-spin-reverse` | Rotação completa contínua |
| `auroraBreathe` | `animate-aurora-breathe` | Deriva de 14 px com opacidade 0,45 → 0,85 |
| `sparkleTwinkle` | `animate-sparkle-twinkle` | Brilho com escala e rotação de 22° |
| `sparkleMote` | `animate-sparkle-mote` | Partícula com deslocamento e opacidade |
| `lightSweep` | `animate-light-sweep` | Faixa de luz atravessando o elemento |

`@media (prefers-reduced-motion: reduce)` desliga todos os nove utilitários com
`animation: none !important`. O uso é decorativo e concentrado (login e
cabeçalhos); a maior parte da interface não anima além das transições de cor de
150–200 ms.

---

## 9. Impressão e PDF

Dois documentos, mesma moldura:

- `src/shared/impressao/RelatorioImpressao.tsx` + `relatorio.css` — ficha
  odontológica, relatório executivo da RT e dossiê de custódia.
- `#rt-print` em `index.css` — bloco de impressão do painel da RT.

Regras efetivas:

- `@page { size: A4; margin: 12mm; }`.
- O documento é renderizado num **portal** em `document.body`, fora do `#root`.
- Na impressão, `#root { display: none !important }` e o documento ocupa a
  página; `#rt-print` só existe no modo `body.rt-print-mode`.
- Impressão sempre em papel claro: `background: #ffffff`, texto `#0f172a`,
  `print-color-adjust: exact`.
- `.print-section` e `.relatorio-doc` usam `break-inside: avoid`; títulos usam
  `break-after: avoid`.
- Botões são escondidos no papel, **exceto** os marcados como dado clínico
  (`.documento-dado`) — no odontograma, periograma e mapa de higiene o botão é o
  próprio dado (número do dente, "Aus"/"Imp", faces).
- `#rt-print button { display: none }` vale só para o bloco da RT.

---

## 10. Acessibilidade e responsividade (como está)

- Layout responsivo por breakpoints padrão do Tailwind (`sm`, `lg`, `xl`);
  sidebar colapsa em drawer abaixo de `lg`.
- Ícones de ação têm `title`/`aria-label` no botão; ícones decorativos usam
  `aria-hidden`.
- Backdrop de menu mobile tem `aria-hidden="true"`.
- `SeletorComBusca` usa `aria-haspopup="listbox"` no gatilho, `role="listbox"`
  na lista e `role="combobox"` + `aria-activedescendant` na busca; as opções
  levam `aria-selected`.
- Foco visível é o `focus:border-*`/`focus:ring-*` do Tailwind (azul na maioria
  dos campos, `slate-800` em controles escuros).
- Não há auditoria de contraste documentada no repositório; a paleta `slate`
  sobre `#f1f5f9`/`#070d19` é o que está implementado.

---

## 11. O que não existe

Para evitar invenção ao editar telas:

- Biblioteca de componentes, tokens semânticos (`--color-primary` etc.) ou
  variantes tipadas.
- Arquivo de configuração de tema no `tailwind.config.js`.
- Pacote de ícones ou fonte de ícones.
- Animações em biblioteca (`framer-motion`, GSAP etc.).
- Modo de alto contraste, densidade compacta ou `prefers-contrast`.
- Tema por clínica além da cor do item ativo e do selo do sidebar.
- Testes visuais ou de snapshot de interface.
