# PRD — UniCare

Documento de produto **as-is**: descreve o que o sistema é e quais regras ele
aplica hoje. Onde o relatório normativo original e o código divergem, este
documento registra a divergência em vez de escolher uma versão.

- **Contratos técnicos:** [`SPEC.md`](./SPEC.md)
- **Decisões e armadilhas:** [`MEMORY.md`](./MEMORY.md)
- **Fonte original:** `RELATORIO_CONSOLIDADO_PROJETO.md` (574 linhas, incorporado
  a este documento e ao `SPEC.md` em 18/11/2026)

---

## 1. Visão do produto

O **UniCare** é uma plataforma ambulatorial para as Clínicas-Escola da
**UNINASSAU Aracaju**, integrando dois cursos em um único sistema:

- **Psicologia — Serviço de Psicologia Aplicada (SPA):** prontuário eletrônico
  conforme a Resolução CFP nº 06/2019, com evolução clínica, homologação docente
  e custódia.
- **Odontologia — Clínica Odontológica Integrada:** ficha clínica completa com
  odontograma, periograma, índices gengivais, duplas de alunos e anamnese.

O sistema cobre a jornada inteira: a recepção cadastra o paciente e agenda; o
estagiário atende e registra; o supervisor homologa com parecer; a Referência
Técnica (RT) acompanha indicadores, audita e administra contas.

**Princípios que o código segue na prática:**

1. **Segregação por clínica.** Cada conta pertence a `psicologia`, `odontologia`
   ou `geral`. Ninguém enxerga a clínica alheia — nem a RT.
2. **Autoria vem do token.** O corpo da requisição não escolhe quem assinou.
3. **Dado ausente é ausente.** Nenhuma tela preenche clínico, contagem ou
   indicador com valor inventado.
4. **A regra vive no servidor.** A tela pode repetir a validação; nunca é a única
   barreira.
5. **Trilha append-only.** Toda ação crítica é registrada e não pode ser alterada.

---

## 2. Perfis RBAC

Enum `PerfilUsuario`, gravado no tipo nativo `perfilusuario`:

| Valor | Papel | Escopo |
|---|---|---|
| `estagiario` | Aluno em atendimento | Própria clínica; escreve apenas no que é seu |
| `supervisor` | Docente orientador | Própria clínica; homologa e gerencia estagiários |
| `recepcao` | Recepção/triagem | Uma conta por clínica; sem acesso a dado clínico |
| `rt` | Referência Técnica | **Somente a própria clínica**; governança máxima |
| `coordenacao` | Coordenação do SPA | Somente psicologia; governança operacional |

Enum `CursoUsuario`: `psicologia`, `odontologia`, `geral`.

### 2.1 O que cada perfil pode

**Estagiário**

- Vê a própria agenda; na odontologia vê as sessões em que é operador **ou**
  auxiliar.
- Escreve evolução de psicologia somente de paciente ativo atribuído a ele
  (`POST /prontuarios/psico` recusa os demais perfis com 403).
- Preenche e submete a ficha odontológica da própria dupla.
- Não gerencia usuários nem duplas.

**Supervisor**

- Vê a fila de homologação e homologa/devolve com parecer obrigatório.
- Odontologia: monta duplas apenas com alunos vinculados a ele e enxerga apenas
  as próprias duplas; homologa documentos dessas duplas.
- Gerencia **estagiários** da própria clínica (criar, editar, desativar,
  reativar). Promover alguém a supervisor ou RT é ato da RT.
- Não cadastra RT nem coordenação.

**Recepção**

- Cadastra paciente, agenda sessão, registra falta com motivo (psicologia),
  vincula paciente a estagiário (psicologia) e registra ocorrências de
  estagiários (psicologia).
- **Não acessa prontuário, ficha ou anamnese** — é a `RN-001`.
- Uma conta por clínica: `REC-001` (odontologia) e `REC-002` (psicologia).

**RT (Referência Técnica)**

- Responde pela própria clínica: `RT-001` odontologia, `RT-002` psicologia.
- Administra todas as contas da clínica, inclusive supervisor, recepção e
  coordenação (a coordenação só existe na psicologia).
- Aprova ou recusa pedidos de credencial da própria clínica.
- Homologa prontuários da clínica, consulta relatórios e a trilha de auditoria.
- Recebe 403 ao pedir a clínica alheia em qualquer rota, inclusive leitura.

**Coordenação (somente psicologia)**

- Governança operacional do SPA: vê a clínica inteira, aprova pedidos de
  supervisor/estagiário/recepção e vincula supervisor.
- Homologa prontuários de psicologia.
- **Não** cria, edita, desativa, aprova nem recusa RT ou outra coordenação.
- Não existe em odontologia: a RT de odontologia recebe 400 ao tentar criar.

### 2.2 Regra de precedência dos guards

Quando uma rota tem restrição de papel **e** de clínica, o guard de papel resolve
primeiro. Isso preserva o `detail` normativo: a recepção recebe `RN-001`
("sem acesso clínico"), não "clínica restrita".

---

## 3. Requisitos funcionais

Os identificadores `RF-*` são os do relatório normativo. O texto abaixo descreve
o comportamento **implementado**, incluindo emendas posteriores.

### RF-001 — Gestão de Recepção e Triagem

- Cadastro de paciente com nome, CPF/RG, data de nascimento, telefone e curso.
  CPF é único; duplicata responde 400, não 500.
- **Psicologia:** endereço e número são obrigatórios; complemento é opcional. O
  CPF aceita 11 dígitos com máscara `000.000.000-00`.
- **Menor de idade:** `nome_responsavel` e `contato_responsavel` são
  obrigatórios (`RN-004`).
- Agendamento por curso, com `data_sessao` (date), `horario`, `turno`,
  `sala_ou_cadeira` e `tipo_consulta`.
- Status: `AGENDADO`, `PRESENTE`, `EM_ATENDIMENTO`, `CONCLUIDO`, `FALTOU`,
  `CANCELADO`.
- **Motivo da falta** existe apenas enquanto o status é `FALTOU`; enviá-lo com
  outro status é 422, e sair de `FALTOU` limpa o campo. É separado de
  `observacao_logistica` de propósito.
- **Vínculo paciente↔estagiário (psicologia).** A recepção atribui cada paciente
  a um estagiário; a transferência encerra a linha anterior como `SUBSTITUIDA`,
  com motivo e data. O aluno só escreve de paciente ativo em seu nome; paciente
  de outro aluno **ou sem responsável** dá 403. O prontuário anterior não é
  reescrito.
- **Dupla de estagiários:** obrigatória na odontologia (dois distintos);
  proibida na psicologia (um por sessão, 422 se enviar auxiliar).
- Métricas de absenteísmo e cancelamento derivadas dos agendamentos reais.

### RF-002 — Prontuário Eletrônico de Psicologia (SPA)

- Conformidade com a Resolução CFP nº 06/2019.
- Registro em três tipos: `SESSAO`, `DEMANDA`, `ENCERRAMENTO`, na mesma linha do
  tempo cronológica.
- Síntese clínica em uma coluna única `redacao_texto` — parágrafos, não três
  fases separadas. Campos específicos de Demanda e Encerramento vão em
  `conteudo_estruturado` (JSON).
- **Proibição de aspas e falas literais** em todo campo narrativo (`RN-002`).
  Texto em branco também é recusado.
- Fluxo: `EM_ELABORACAO` → `AGUARDANDO_VALIDACAO` → `VALIDADO` ou
  `DEVOLVIDO_PARA_AJUSTE`.
- Homologação exige parecer não vazio (422 nas duas clínicas) e grava
  `supervisor_nome` com quem homologou, no ato.
- PDF de dossiê com cabeçalho institucional e assinaturas.

### RF-003 — Odontograma e Periodograma Interativo

- Odontograma adulto (32 dentes permanentes) e infantil, com faces vestibular,
  lingual, mesial, distal e oclusal.
- Marcação de patologias com codificação por cores (cárie, restauração,
  endodontia, prótese, extração indicada).
- Periograma com profundidade de sondagem, sangramento e recessão.
- Índices gengivais e mapa de higiene.
- A ficha completa (anamnese, odontograma, periograma, índices) é persistida em
  `documentos_ficha_odonto`, em JSON versionado, submetida pela dupla e
  homologada/devolvida pelo supervisor. `FichaOdonto` continua existindo para o
  procedimento isolado.
- Anamnese e sinais vitais em `anamneses`: PA por regex, glicemia 20–600 mg/dL,
  FC 20–250 bpm, temperatura 30–45 °C.
- Radiografias em `radiografias_odonto` (data URL até 5 MB), sem homologação de
  imagem.

### RF-004 — Fila de Homologação Docente & Devolutiva Pedagógica

- O supervisor vê a fila de prontuários e documentos pendentes.
- **Aprovar** grava decisão, parecer e carimbo de quem homologou.
- **Devolver** exige parecer e devolve o registro para `DEVOLVIDO_PARA_AJUSTE`.
- O rótulo vem do `status` de cada item: homologado (verde), devolvido (âmbar),
  em elaboração (cinza). Um item devolvido nunca aparece como homologado.
- O selo anti-aspas da fila testa os textos antes de exibir conformidade.
- Odontologia aplica checklist CFO de 4 itens no parecer; psicologia usa texto
  livre (ver pendência no `STATUS.md`).

**Divergência registrada.** O relatório fala em "segregação de estagiários por
turma e orientação docente". Não existe vínculo estagiário↔turma↔supervisor no
schema: a segregação real é **por curso**, e a supervisão odontológica enxerga as
duplas que montou. A tela já não afirma o vínculo inexistente.

### RF-005 — Gestão de Duplas Clínicas e Carga Horária

- `duplas_odonto` guarda operador, auxiliar, supervisor, autoria e desativação
  lógica.
- **Um aluno só pode estar em uma dupla ativa.** A regra é validada no serviço e
  coberta por teste.
- Supervisor monta e enxerga apenas as próprias duplas. RT de odontologia vê
  todas e pode encerrar, mas não monta em nome de outro supervisor. Estagiário e
  recepção recebem 403.
- Desfazer a dupla libera os dois alunos; a linha encerrada é preservada.
- Desativar o aluno ou o supervisor encerra as duplas afetadas.
- Contabilização de procedimentos vem das fichas/documentos reais — não há meta
  semestral configurada no schema.

### RF-006 — Painel Executivo da RT & Custódia Legal

- Indicadores apenas da própria clínica: comparecimento, prontuários, fichas
  homologadas, procedimentos, distribuição por curso. Paciente `ambos` aparece
  nos indicadores das duas.
- Nenhum indicador usa fallback numérico: onde não há dado, aparece `—` com
  estado de erro.
- Exportação de **Indicadores em PDF** e **Dossiê do Paciente em PDF**, ambos a
  partir dos dados já carregados. O dossiê odontológico busca documento e
  radiografias antes de abrir a impressão; se a busca falhar, não imprime parcial.
- Custódia de 20 anos e LGPD Art. 11 são declaração de política; **não há hash de
  integridade implementado** e a tela diz isso.

### RF-007 — Trilha de Auditoria Imutável

- `logs_auditoria` é append-only: nenhuma rota faz `UPDATE` ou `DELETE`.
- Registra: timestamp, usuário (id + nome copiado), ação, tabela afetada,
  registro, curso e endereço IP.
- **O IP vem de `request.client.host`.** `X-Forwarded-For` não é lido: o header é
  controlado por quem faz a requisição.
- Ações registradas incluem login, cadastro de paciente, agendamento, mudança de
  status, submissão e homologação de prontuário/ficha, troca e recuperação de
  senha, criação/edição/desativação/reativação de usuário, aprovação e recusa de
  solicitação, atribuição e transferência de paciente, duplas, ocorrências e uso
  da IA (`DITADO_VOZ_IA`).
- Consulta restrita a RT e supervisor (`RN-003`), escopada por clínica.

### RF-008 — Troca Rápida de Perfil com Imposição de Senha

**Não implementado como presets.** O relatório descreve atalhos para os 5 perfis
com confirmação de senha. O código atual não tem seletor de perfil: o login é por
matrícula/e-mail + senha, e o caminho antigo de troca rápida
(`switchUser` → `login` → `syncBackendToken`, com senha fixa) foi removido por ser
código morto e risco de credencial embutida.

O que existe no lugar:

- Login por credencial (`POST /auth/login`) com emissão de JWT.
- `GET /auth/me` revalida o token e traz o registro real (id, nome,
  `registro_profissional`, `ativo`).
- Destino pós-login calculado por `getDestinationRoute` conforme perfil e curso.

### RF-009 — Gerenciamento RBAC com Ciclo de Vida Completo

- RT cadastra, edita e desativa usuários **apenas na própria clínica**. O curso
  nunca vem do corpo: é o de quem executa.
- Coordenação gerencia supervisor, estagiário e recepção da psicologia; criar ou
  alterar RT/coordenação é ato exclusivo da RT.
- Supervisor gerencia estagiários da própria clínica.
- `DELETE` **desativa** (`ativo = false`); reativar é `PATCH {"ativo": true}`.
  Desativar corta o login imediatamente.
- Trocar perfil não é edição cadastral: `UsuarioUpdate` não tem esse campo.
- **Pedido de credencial:** rota pública recebe a solicitação sem senha; a RT
  aprova e o **servidor gera** a senha inicial, enviando por e-mail. Enviar senha
  no corpo é 422. Recusa exige motivo.

**Divergência registrada.** O relatório cita "sincronização reativa com o
`localStorage`". O código atual lê do servidor e relê após cada escrita; o
`localStorage` é usado apenas como cache do `ClinicContext`, e a fonte de verdade
é o banco.

---

## 4. Regras de negócio

O relatório anuncia `RN-001` a `RN-006`, mas **define em texto apenas `RN-002`**.
O código cita `RN-001` a `RN-004`. Os significados abaixo são os que o código
aplica e os testes de conformidade afirmam:

| Regra | Conteúdo | Onde aparece |
|---|---|---|
| `RN-001` | Recepção não acessa dado clínico (prontuário, ficha, anamnese, usuários clínicos) | `auth_service`, guards de prontuário/pacientes/duplas/usuários |
| `RN-002` | Prontuário psicológico não contém aspas nem falas literais (CFP 06/2019) | `schemas/prontuario.py`, fila de homologação |
| `RN-003` | RT e supervisores podem auditar; RT tem salvaguarda institucional ampla | `routers/auditoria.py`, `auth_service` |
| `RN-004` | Menor de idade exige nome e contato do responsável legal | `routers/pacientes.py` |
| `RN-005` | **Não definida** em nenhuma fonte | — |
| `RN-006` | **Não definida** em nenhuma fonte | — |

> O `AGENTS.md` anterior afirmava que o relatório definia `RN-001`, `RN-002` e
> `RN-006`. A leitura do arquivo mostra que só `RN-002` aparece com conteúdo. Para
> qualquer regra fora da tabela acima, cite por descrição — não invente número.

### 4.1 Invariantes de negócio

1. **Um responsável ativo por paciente e curso** — garantido por índice único
   parcial no banco, não só na aplicação.
2. **Um aluno por dupla odontológica ativa** — garantido no serviço.
3. **Um estagiário por sessão de psicologia** — garantido no schema e na rota.
4. **Dupla odontológica com dois estagiários distintos** — validada no schema.
5. **CPF único** — restrição de banco; duplicata responde 400.
6. **Curso do registro manda na escrita** — `validar_curso_do_registro` em toda
   rota que escreve por id.
7. **Parecer não vazio na homologação** — validado no servidor, nas duas clínicas.
8. **Senha inicial gerada no servidor** — em qualquer clínica; gestão não a
   define.
9. **Sem aspas em texto clínico psi** — validado no servidor, não só na tela.

---

## 5. Fora de escopo (declarado)

O que **não** existe hoje, e as telas já não prometem:

- Hash de integridade de prontuário / assinatura digital certificada.
- Vínculo formal estagiário↔turma↔supervisor.
- Checklist CFP estruturado na homologação de psicologia.
- Recorte "hoje"/"na semana" nos painéis (falta campo de data em agendamentos).
- Cadastro de consultórios além dos 6 fixos do SPA.
- Meta semestral de procedimentos configurável.
- Revogação de token após troca de senha.
- Reenvio de senha inicial pela tela.
- **Criptografia de dado pessoal em repouso.** CPF/RG, endereço, telefone e
  contatos de paciente estão em claro no banco. Para dado real de saúde isso não
  atenderia à LGPD; o sistema hoje opera com dados de demonstração.

---

## 6. Credenciais de demonstração (seed)

Todas as contas abaixo usam a senha **`unicare123`** (bcrypt `rounds=12`).

| Perfil | Nome | Matrícula | E-mail | Curso |
|---|---|---|---|---|
| RT | Dra. Camila (RT Odontologia) | `RT-001` | `camila.rt@uninassau.edu.br` | Odontologia |
| RT | Dr. Renato (RT Psicologia) | `RT-002` | `renato.rt@uninassau.edu.br` | Psicologia |
| Coordenação | Coordenação do Serviço de Psicologia Aplicada | `COORD-001` | `coordenacao.psi@uninassau.edu.br` | Psicologia |
| Supervisor | Prof. Dr. Robert Santos do Carmo | `DOC-8821` | `robert.carmo@uninassau.edu.br` | Psicologia |
| Supervisor | Profa. Dra. Bianca Nubia | `DOC-9122` | `bianca.silva@uninassau.edu.br` | Odontologia |
| Estagiário | Rikelme Roma Santos | `16032935` | `rikelmeroma13@gmail.com` | Psicologia |
| Estagiário | Letícia Barbosa Monteiro | `16051234` | `leticia.barbosa@prof.uninassau.edu.br` | Psicologia |
| Estagiário | Augusto Cesar Farias Carvalho | `16024402` | `augustocsar97@gmail.com` | Odontologia |
| Estagiário | Gabriela Prado | `16024404` | `gabriela.prado@uninassau.edu.br` | Odontologia |
| Recepção | Recepção Integrada Odontologia | `REC-001` | `recepcao@uninassau.edu.br` | Odontologia |
| Recepção | Recepção do Serviço de Psicologia Aplicada | `REC-002` | `recepcao.psi@uninassau.edu.br` | Psicologia |

Notas:

- `REC-2026-01` continua funcionando como apelido de `REC-001`.
- O seed é **idempotente por tabela**: não reescreve linha existente. Banco
  populado antes de uma mudança de seed pode divergir do `seed.py`.
- Os e-mails `@uninassau.edu.br` do seed são fictícios; o Outlook os recusa com
  `550`. Os `@sempreuninassau.com.br` e os Gmail são aceitos.
- A senha é hash bcrypt; ninguém, nem a coordenação, consegue consultá-la.

---

## 7. Referências normativas

- Resolução CFP nº 06/2019 — elaboração de documentos psicológicos.
- CFO — instrumento PDR-05 (dupla clínica odontológica) e codificação de
  odontograma.
- LGPD, Lei nº 13.709/2018, Art. 11 — dado pessoal sensível de saúde.
- Guarda de prontuário por 20 anos (política declarada; sem implementação técnica
  de hash ou carimbo de tempo).
