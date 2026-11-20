# Roteiro da demo — UniCare MVP

Apresentação de 5 a 10 minutos. Os slides consomem de 4 a 5 minutos e a demo
ao vivo, no máximo 4 minutos. Este roteiro cobre o pré-voo, as contas e a ordem
dos cliques.

## 1. Pré-voo (fazer 15 minutos antes)

Backend, a partir de `backend/`:

```powershell
docker compose up -d db
docker exec unicare_postgres pg_isready -U unicare_user -d unicare_db
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Frontend, na raiz:

```powershell
npm run dev
```

Conferências:

```powershell
curl http://localhost:8000/health
```

- [ ] `/health` responde 200.
- [ ] `http://localhost:5173/login` abre sem erro de console.
- [ ] Login com `REC-002` / `unicare123` entra em `/psi/recepcao`.
- [ ] A agenda de psicologia tem pelo menos um agendamento.
- [ ] A fila de homologação tem pelo menos um item pendente.
- [ ] O navegador está em 100% de zoom e sem extensão bloqueando pop-up.

> A porta do Postgres é **5433** no host. `localhost:5432` é outro serviço
> instalado na máquina e falha com erro de autenticação.

> `seed_usuarios` não reescreve linha existente. Se a senha não entrar, o banco
> de dev divergiu do `seed.py`; não tente consertar ao vivo.

## 2. Contas usadas na demo

Senha de todas: `unicare123`.

| Papel | Conta | Onde cai no login | Uso na demo |
|---|---|---|---|
| Recepção psicologia | `REC-002` | `/psi/recepcao` | Agenda, falta e ocorrências |
| Estagiário psicologia | `16032935` | `/psi/prontuario` | Linha do tempo e PDF |
| Supervisor psicologia | `DOC-8821` | `/psi/supervisao` | Fila de homologação |
| RT psicologia | `RT-002` | `/rt/relatorios` | Painel, indicadores e dossiê |
| RT odontologia (opcional) | `RT-001` | `/rt/relatorios` | Ficha odontológica |

Coordenação de psicologia, se precisar: `COORD-001`.
Supervisor de odontologia: `DOC-9122`.

## 3. Demo em quatro minutos

### 3.1 Recepção — `REC-002` (45 s)

1. Entrar em `/psi/recepcao`.
2. Mostrar o cartão dos **6 consultórios SPA** e a ocupação do dia.
3. Na tabela de agendamentos, marcar um como **FALTOU**: o modal pede o motivo.
4. Preencher um motivo curto e confirmar.
5. Rolar até **Ocorrências Operacionais de Estagiários** e registrar uma
   ocorrência de exemplo.

Fala: "a recepção não preenche prontuário; ela organiza o dia e deixa o motivo
da falta registrado para o aluno e o supervisor."

### 3.2 Estagiário — `16032935` (1 min 15 s)

1. Sair e entrar com `16032935`.
2. Em `/psi/prontuario`, selecionar o paciente na lista.
3. Abrir a aba **Linha do Tempo Cronológica**: demanda, sessões e encerramento
   aparecem na mesma ordem.
4. Abrir a aba **Registrar Nova Sessão Clínica**, preencher a síntese e salvar
   (a régua da RN-002 recusa aspas literais).
5. Clicar em **Exportar PDF** e mostrar a prévia A4 com as assinaturas.

Fala: "o registro nasce com autoria do token, entra na linha do tempo e vai para
a fila do supervisor."

### 3.3 Supervisor — `DOC-8821` (45 s)

1. Entrar em `/psi/supervisao`.
2. Abrir a **Fila de Homologação de Prontuários SPA** e selecionar o registro
   recém-enviado.
3. Escrever um parecer curto.
4. Mostrar os dois botões: **Homologar com Visto Eletrônico** e
   **Devolver para Ajuste do Aluno**.
5. Se houver tempo, homologar o registro criado na estação anterior.

Fala: "sem parecer, a homologação não acontece: a regra existe na tela e no
servidor."

### 3.4 RT — `RT-002` (45 s)

1. Entrar em `/rt/relatorios`.
2. Mostrar **Indicadores**: totais, conformidade legal e distribuição por curso.
3. Abrir a aba **Custódia**, escolher o paciente e mostrar o dossiê.
4. Abrir a aba **Auditoria** e localizar a ação feita na demo.

Fala: "a RT enxerga a própria clínica e consegue provar quem fez o quê."

### 3.5 Odontologia — `RT-001` (opcional, 30 s)

1. Entrar em `/rt/relatorios` e navegar pelo menu até **Ficha Odontológica**
   de um paciente de odontologia.
2. Mostrar o odontograma, o periograma e a aba de radiografias.
3. Se o tempo estourar, apenas cite: "a mesma governança vale para a ficha
   odontológica versionada".

## 4. Plano B

| Problema | O que fazer |
|---|---|
| Login recusado | Conferir a conta; não reseedar o banco ao vivo. Usar outra conta do bloco 3. |
| Agenda vazia | Ir direto à linha do tempo com `16032935`; não cadastrar paciente durante a demo. |
| Fila de homologação vazia | Enviar o registro na estação 2 e voltar como supervisora; se falhar, mostrar o histórico. |
| PDF abrir em branco | Usar **Imprimir / Salvar em PDF** da prévia; verificar zoom 100%. |
| API fora do ar | Pular a demo e usar os slides 5 a 8; retomar a demo apenas se `/health` voltar. |

**Não mostrar na demo:** recuperação de senha (depende de SMTP e da caixa de
e-mail), configuração de `.env`, nem a senha de app do Gmail. A mensagem de
sucesso de envio não prova entrega.

## 5. Cronômetro

| Bloco | Tempo | Acumulado |
|---|---|---|
| Slides 1 a 4 | 3:00 | 3:00 |
| Slide 5 (psicologia) | 0:45 | 3:45 |
| Slide 6 (odontologia) | 0:45 | 4:30 |
| Slide 7 (governança) | 0:40 | 5:10 |
| Slide 8 (arquitetura) | 0:40 | 5:50 |
| Demo ao vivo | 3:30 | 9:20 |
| Slide 10 (fechamento) | 0:30 | 9:50 |

Versão de 5 minutos: slides 1, 2, 3, 5, 9 e 10; demo apenas estações 3.2 e 3.3.

## 6. Perguntas prováveis

- **"Serve para as duas clínicas?"** Sim, com escopo por curso no servidor, não
  só no menu.
- **"Como garante que o aluno não edita depois de homologado?"** A escrita é
  recusada fora dos estados permitidos e a autoria vem do token, não do corpo.
- **"E a LGPD?"** Acesso por perfil e por clínica, senha com bcrypt, trilha de
  auditoria imutável e dossiê de custódia.
- **"O que falta para produção?"** Piloto, SMTP institucional e relatórios
  consolidados; o MVP já está seguro para aprender com uso real.
