# Apresentação — UniCare MVP

Material de demonstração do MVP: o deck, o export em PDF, os previews, o
gerador do `.pptx` e o roteiro da demo ao vivo. Tudo aqui é **entregável do
projeto**, versionado junto do código.

- **Produto e regras:** [`../PRD.md`](../PRD.md) · [`../SPEC.md`](../SPEC.md)
- **Estado atual e números:** [`../STATUS.md`](../STATUS.md)
- **Diagramas:** [`../diagramas/README.md`](../diagramas/README.md)

---

## O que tem aqui

| Arquivo | Papel |
|---|---|
| `UniCare_MVP.pptx` | deck de 10 slides, gerado por `gerar_slides.py` |
| `UniCare_MVP.pdf` | export do deck para distribuição (16:9) |
| `preview/Slide1..10.PNG` | previews dos slides, um por slide |
| `gerar_slides.py` | gerador do `.pptx` (depende de `python-pptx`) |
| `roteiro-demo.md` | roteiro cronometrado: pré-voo, contas, ordem dos cliques, plano B |
| `RELATORIO_ALTERACOES_PSICOLOGIA.pdf` | material de apoio já versionado; **não** é saída do gerador |

O deck usa a paleta institucional do produto: azul `#002B49`, amarelo
`#FFD100`, fundo `#071426`, cartões `#0C2038` e verde de destaque `#2BD4A8`.
O brasão vem de `public/uninassau-crest.png`.

## Estrutura dos 10 slides

| # | Slide | Título |
|---|---|---|
| 1 | Capa | UniCare — Sistema Integrado de Saúde e Clínicas-Escola |
| 2 | O contexto | Clínica-escola sem sistema é retrabalho em três frentes |
| 3 | A solução | Uma plataforma, duas clínicas, cinco perfis (+ os nove RF do relatório) |
| 4 | Como funciona | A jornada acontece em quatro papéis |
| 5 | Psicologia | O prontuário como linha do tempo |
| 6 | Odontologia | Ficha clínica completa, por domínio |
| 7 | Governança | Quem faz, quem aprova e o que fica registrado |
| 8 | Arquitetura e qualidade | Stack moderna, migrações versionadas e testes |
| 9 | Demonstração | Demo ao vivo: cinco estações, quatro minutos |
| 10 | Fechamento | Um MVP pronto para o piloto |

Cada slide traz **notas do apresentador** com o bloco de tempo
(`notas(s, "…")` no gerador). O roteiro cronometrado completo, com o
cronômetro de 9min50s e a versão de 5 minutos, está em
[`roteiro-demo.md`](./roteiro-demo.md).

## Como abrir

- **Apresentar:** `UniCare_MVP.pptx` (PowerPoint, Impress ou Google Slides).
- **Distribuir:** `UniCare_MVP.pdf` — abre em qualquer navegador, sem
  dependência de Office.
- **Pré-visualizar:** os PNG de `preview/`, um por slide.

## Como regerar o deck

O gerador escreve **apenas** o `.pptx`:

```powershell
# dependência: python-pptx (não faz parte do requirements.txt do produto —
# a API não usa PPTX; instale só se for regerar o deck)
backend\.venv\Scripts\python.exe -m pip install python-pptx

# a partir da raiz do repositório
backend\.venv\Scripts\python.exe apresentacao\gerar_slides.py
```

Saída: `apresentacao/UniCare_MVP.pptx` (10 slides, 13,333 × 7,5 pol = 16:9).

**O PDF e os previews não são gerados pelo script.** Eles saíram de export
externo ao PowerPoint. Se você mudar o gerador, reexporte os dois — senão o
deck, o PDF e os previews passam a contar histórias diferentes.

## Ressalvas ao apresentar

- **O slide 3 lista os nove `RF-*` do relatório normativo, e `RF-008` não está
  implementado como presets** — o login é por credencial
  (`POST /auth/login`). Cite-o como requisito do relatório, não como
  funcionalidade entregue. O detalhe está em [`../PRD.md`](../PRD.md), RF-008.
- **O deck é snapshot.** Ele descreve o produto numa data; o sistema é a
  fonte. Confira os números contra [`../STATUS.md`](../STATUS.md) antes de
  apresentar.
- **A demo ao vivo não mostra recuperação de senha** (depende de SMTP e da
  caixa de e-mail), configuração de `.env` nem a senha de app do SMTP: a
  mensagem de sucesso de envio não prova entrega. O roteiro traz o plano B
  para cada falha previsível.
- **Contas da demo:** todas com a senha `unicare123`; a tabela completa está
  em [`../PRD.md`](../PRD.md#6-credenciais-de-demonstração-seed).

## Por que está versionado

A apresentação é parte do entregável do MVP: é o primeiro contato de quem
avalia o projeto. Deixá-la só na máquina de quem gerou significa que o
material some no primeiro `git clean` e que ninguém consegue conferir o que
foi afirmado. As decisões e armadilhas dessa pasta estão em
[`../MEMORY.md`](../MEMORY.md), ADR-27.
