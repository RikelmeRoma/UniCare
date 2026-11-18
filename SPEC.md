# SPEC — UniCare

Contratos técnicos **as-is**: rotas, schemas, validações, ENUMs e invariantes que
o código aplica hoje. O que está aqui tem lastro em `backend/app/` — nenhuma regra
é aspiracional.

- **Requisitos e regras de negócio:** [`PRD.md`](./PRD.md)
- **Mapa de módulos:** [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Decisões e armadilhas:** [`MEMORY.md`](./MEMORY.md)

---

## 1. Convenções da API

| Item | Valor |
|---|---|
| Base | `/api/v1` (`settings.API_V1_STR`) |
| Framework | FastAPI, Pydantic v2, SQLModel |
| Formato | JSON, `snake_case` no wire |
| Auth | JWT `HS256`, `Authorization: Bearer <token>` |
| Expiração | 480 min (`ACCESS_TOKEN_EXPIRE_MINUTES`) |
| Docs | `GET /docs` (Swagger), `GET /redoc` |
| Health | `GET /health` — público, sem nome de banco |
| Root | `GET /` — status, versão e normas citadas |

Rotas com e sem barra final são registradas em pares (`""` e `"/"`); a variante
com barra fica fora do schema OpenAPI (`include_in_schema=False`). A contagem
abaixo considera a rota canônica, sem o alias.

### 1.1 Guards

| Guard | Efeito |
|---|---|
| `get_current_user` | Exige JWT válido e conta `ativo`; 401 caso contrário |
| `require_roles([...])` | Exige perfil na lista; RT e coordenação têm bypass de papel |
| `require_curso(curso, base=...)` | Exige que o curso da conta seja o da clínica; 403. `base` roda **antes** |
| `exigir_perfil(user, roles)` | Versão chamada dentro da função, quando a clínica só é conhecida após ler o corpo |
| `validar_curso_do_registro(user, curso)` | 403 quando o registro é de outra clínica; `permitir_compartilhado` cobre `ambos` |
| `autorizado_clinico` | `estagiario`, `supervisor`, `rt` (recepção fora — RN-001) |
| `autorizado_gestao` | `rt`, `supervisor`, `coordenacao` |
| `autorizado_auditoria` | `rt`, `supervisor` |
| `autorizado_homologacao` | `supervisor`, `rt` (odontologia) |
| `autorizado_homologacao_psico` | `supervisor`, `rt`, `coordenacao` (psicologia) |
| `autorizado_recepcao` | `recepcao`, `rt` |
| `autorizado_ler_ocorrencias` | `recepcao`, `supervisor`, `estagiario` |
| `autorizado_registrar_ocorrencia` | `recepcao` |
| `_exigir_gestao` (solicitações) | `rt`, `coordenacao` |

**Bypass de papel ≠ permissão de clínica.** `exigir_perfil` libera RT e
coordenação pelo perfil, mas `require_curso` continua valendo e não tem exceção.
A coordenação, além disso, só gerencia perfis operacionais (`_pode_gerenciar`).

**Ordem dos guards.** Quando o `detail` é normativo, o papel vem antes do curso:
a recepção recebe `RN-001`, não "clínica restrita".

### 1.2 Formato de erro

`HTTPException` com `detail` textual. Os identificadores normativos aparecem no
texto quando a regra é normativa (`RN-001`, `RN-002`, `RN-003`, `RN-004`,
`RF-007`). Códigos usados:

| Código | Uso |
|---|---|
| 400 | Regra de negócio violada (duplicidade, curso inválido, alvo inválido) |
| 401 | Credencial inválida, token expirado, senha atual errada |
| 403 | Perfil/clínica sem permissão, vínculo inexistente, dupla alheia |
| 404 | Registro não encontrado |
| 409 | Conflito de estado (solicitação já decidida, dupla ativa, vínculo existente) |
| 422 | Validação de schema, campo obrigatório, motivo de falta fora de `FALTOU` |
| 503 | Envio de e-mail indisponível (SMTP não configurado ou falhou) |

### 1.3 Endpoints utilitários (fora do prefixo v1)

| Método | Caminho | Guard | Retorno |
|---|---|---|---|
| GET | `/` | público | status, sistema, versão, link da doc, normas |
| GET | `/health` | público | `status`, `dialect`, `driver`, `server_version`, `conectado` |

---

## 2. Rotas

**12 roteadores · 54 endpoints.**

### 2.1 `auth` — `/auth` (5)

| Método | Caminho | Guard | Corpo | Resposta |
|---|---|---|---|---|
| POST | `/login` | público | `LoginRequest` | `Token` |
| GET | `/me` | `get_current_user` | — | `UsuarioRead` |
| PATCH | `/senha` | `get_current_user` | `TrocaSenhaRequest` | 200 sem corpo |
| POST | `/senha/recuperar/solicitar` | público | `RecuperacaoSolicitada` | mensagem genérica |
| POST | `/senha/recuperar/redeem` | público | `RecuperacaoResgate` | mensagem genérica |

Regras:

- Login aceita e-mail **ou** matrícula em `email_ou_matricula`; conta desativada
  recebe 401.
- `Token` traz `access_token`, `token_type`, `perfil`, `curso`, `nome`,
  `matricula`.
- `PATCH /senha` exige `senha_atual`; senha errada é 401 e não altera o hash;
  nova senha fora de 6–72 é 422. Registra `SENHA_ALTERADA`.
- `solicitar`: identificador sem `@` **e** com ponto → 422; resposta idêntica para
  conta existente e inexistente; conta desativada não recebe token; intervalo
  mínimo entre pedidos; sem SMTP → 503.
- `redeem`: uma única mensagem para código errado, expirado, já usado ou conta
  inexistente; novo pedido invalida os anteriores.

### 2.2 `usuarios` — `/usuarios` (7)

| Método | Caminho | Guard | Corpo/Query | Resposta |
|---|---|---|---|---|
| GET | `` | `autorizado_gestao` | `?curso=` | `[UsuarioRead]` |
| GET | `/estagiarios` | `get_current_user` | — | `[EstagiarioRead]` |
| GET | `/estagiarios/disponiveis` | `get_current_user` + `exigir_perfil` | `?curso=` | `[EstagiarioDisponivelRead]` |
| POST | `` | `autorizado_gestao` | `UsuarioCreate` | `UsuarioRead` (201) |
| POST | `/{id}/vincular-supervisor` | `get_current_user` | `VincularSupervisorRequest` | `UsuarioRead` |
| PATCH | `/{id}` | `autorizado_gestao` | `UsuarioUpdate` | `UsuarioRead` |
| DELETE | `/{id}` | `autorizado_gestao` | — | `UsuarioRead` (`ativo=false`) |

Regras:

- O **curso nunca vem do corpo**: é o de quem executa. Coordenação é exclusiva
  da psicologia; RT precisa ter curso clínico.
- `_pode_gerenciar`: RT gerencia qualquer perfil da própria clínica; coordenação
  gerencia supervisor, estagiário e recepção; supervisor gerencia apenas
  estagiário da própria clínica.
- Gestão não edita o próprio cadastro por esta rota (400).
- E-mail ou matrícula duplicados → 400 (não 500).
- `DELETE` desativa e grava `DESATIVACAO_USUARIO`; `PATCH {"ativo": true}` grava
  `REATIVACAO_USUARIO`. Mudar matrícula/supervisor ou desativar encerra as duplas
  afetadas.
- `vincular-supervisor`: só estagiário recebe supervisor; o supervisor precisa ser
  da mesma clínica, perfil `supervisor` e estar ativo.

### 2.3 `pacientes` — `/pacientes` (4)

| Método | Caminho | Guard | Corpo/Query | Resposta |
|---|---|---|---|---|
| GET | `` | `get_current_user` | `?curso=` | `[PacienteRead]` |
| POST | `` | `get_current_user` + `exigir_perfil` + `validar_curso_do_registro` | `PacienteCreate` | `PacienteRead` (201) |
| GET | `/{id}/anamnese` | `autorizado_clinico` + `_paciente_visivel` | — | `[AnamneseRead]` |
| POST | `/{id}/anamnese` | `autorizado_clinico` + `_paciente_visivel` | `AnamneseCreate` | `AnamneseRead` (201) |

Regras:

- Listagem filtrada por `cursos_visiveis()`; `ambos` aparece nas duas clínicas.
- CPF duplicado → 400.
- Menor de idade exige `nome_responsavel` e `contato_responsavel` (RN-004), no
  router.
- Anamnese: a recepção é barrada pela RN-001; a autoria vem do token; o paciente
  `ambos` tem **uma** anamnese visível pelas duas clínicas.

### 2.4 `agendamentos` — `/agendamentos` (4)

| Método | Caminho | Guard | Corpo/Query | Resposta |
|---|---|---|---|---|
| GET | `/salas-psico` | `require_curso("psicologia")` | `?data_sessao=&horario=` | lista de salas e ocupação |
| GET | `` | `get_current_user` | `?curso=&status_filtro=` | `[AgendamentoRead]` |
| POST | `` | `get_current_user` + `validar_curso_do_registro` + `exigir_perfil` | `AgendamentoCreate` | `AgendamentoRead` (201) |
| PATCH | `/{id}/status` | `get_current_user` + `validar_curso_do_registro` | `AgendamentoUpdateStatus` | `AgendamentoRead` |

Regras:

- Criar em psicologia: `recepcao`, `rt`. Criar em odontologia: `recepcao`,
  `supervisor`, `rt`.
- `permitir_compartilhado=False`: agendamento não aceita paciente `ambos`.
- Em psicologia, enviar `auxiliar_matricula` → 422 (recusa **depois** do guard,
  para o 403 do RN-001 não ser mascarado).
- O servidor resolve matrícula → nome; matrícula inexistente, de outra clínica ou
  de conta desativada é recusada.
- PATCH de status: supervisor só altera agendamento de dupla que supervisiona
  (RF-005); `motivo_falta` com status diferente de `FALTOU` → 422; sair de
  `FALTOU` limpa o campo; texto em branco vira `NULL`.
- 6 consultórios SPA fixos (`Consultório SPA-01`..`SPA-06`) com checagem de
  conflito por data/horário.

### 2.5 `atribuicoes` — `/atribuicoes` (4)

| Método | Caminho | Guard | Corpo | Resposta |
|---|---|---|---|---|
| GET | `/psico` | `require_curso("psicologia")` | — | `[AtribuicaoRead]` |
| POST | `/psico` | `require_curso("psicologia", base=autorizado_recepcao)` | `AtribuicaoCreate` | `AtribuicaoRead` (201) |
| PATCH | `/psico/{id}/transferir` | idem | `TransferenciaRequest` | `AtribuicaoRead` |
| GET | `/psico/minha` | `get_current_user` | — | `[AtribuicaoRead]` |

Regras:

- Só psicologia (`require_curso`).
- Estagiário precisa existir, ser da clínica e estar ativo.
- Um responsável ativo por paciente e curso — índice único parcial no banco.
- Transferência encerra a linha como `SUBSTITUIDA`, com motivo obrigatório, e
  cria a nova `ATIVA`.
- `minha` devolve o que o próprio estagiário atende; supervisor e RT usam `/psico`.

### 2.6 `prontuarios` — `/prontuarios` (15)

| Método | Caminho | Guard | Corpo/Query | Resposta |
|---|---|---|---|---|
| GET | `/psico` | `require_curso("psicologia", base=autorizado_clinico)` | — | `[ProntuarioPsicoRead]` |
| POST | `/psico` | idem | `ProntuarioPsicoCreate` | `ProntuarioPsicoRead` (201) |
| PATCH | `/psico/{id}/homologar` | `require_curso("psicologia", base=autorizado_homologacao_psico)` | `HomologacaoRequest` | `ProntuarioPsicoRead` |
| GET | `/odonto` | `require_curso("odontologia", base=autorizado_clinico)` | — | `[FichaOdontoRead]` |
| POST | `/odonto` | idem | `FichaOdontoCreate` | `FichaOdontoRead` (201) |
| PATCH | `/odonto/{id}/homologar` | `require_curso("odontologia", base=autorizado_homologacao)` | `HomologacaoRequest` | `FichaOdontoRead` |
| GET | `/odonto/documentos` | `require_curso("odontologia", base=autorizado_clinico)` | `?paciente_id=&status_filtro=` | `[DocumentoFichaOdontoRead]` |
| GET | `/odonto/documentos/paciente/{paciente_id}` | idem | — | `DocumentoFichaOdontoDetalhe` |
| GET | `/odonto/documentos/{id}` | idem | — | `DocumentoFichaOdontoDetalhe` |
| POST | `/odonto/documentos` | idem | `DocumentoFichaOdontoCreate` | `DocumentoFichaOdontoDetalhe` (201) |
| PATCH | `/odonto/documentos/{id}` | idem | `DocumentoFichaOdontoUpdate` | `DocumentoFichaOdontoDetalhe` |
| PATCH | `/odonto/documentos/{id}/homologar` | `require_curso("odontologia", base=autorizado_homologacao)` | `HomologacaoRequest` | `DocumentoFichaOdontoDetalhe` |
| GET | `/odonto/radiografias` | `require_curso("odontologia", base=autorizado_clinico)` | `?paciente_id=` (obrigatório) | `[RadiografiaOdontoRead]` |
| POST | `/odonto/radiografias` | idem | `RadiografiaOdontoCreate` | `RadiografiaOdontoRead` (201) |
| DELETE | `/odonto/radiografias/{id}` | idem | — | 200 sem corpo |

Regras de psicologia:

- **Escrita exclusiva do estagiário:** `POST /psico` recusa supervisor, RT e
  coordenação com 403.
- Vínculo obrigatório: o paciente precisa estar `ATIVA` em nome de quem escreve;
  paciente de outro estagiário **ou sem responsável** → 403.
- `RN-002` aplicada no schema: sem aspas (`"`, `“`, `”`, `«`, `»`) em nenhum campo
  narrativo; `SESSAO` exige redação não vazia; `DEMANDA` exige os três campos;
  `ENCERRAMENTO` exige avaliação final.
- Homologação só aceita `VALIDADO` ou `DEVOLVIDO_PARA_AJUSTE`, com parecer não
  vazio; grava `supervisor_nome` e `parecer_supervisor`.
- Leitura: estagiário vê o próprio; supervisor, RT e coordenação veem a clínica.
  A recepção é barrada (RN-001).

Regras de odontologia:

- `FichaOdonto` é o registro por procedimento; `DocumentoFichaOdonto` guarda a
  ficha completa em JSON versionado.
- Documento: `POST` cria em `AGUARDANDO_VALIDACAO`; `PATCH` só reabre
  `EM_ELABORACAO`/`DEVOLVIDO_PARA_AJUSTE` e devolve à fila com `versao += 1`;
  homologação só aceita `AGUARDANDO_VALIDACAO`.
- Autoria vem da dupla; supervisor só acessa documentos das duplas vinculadas a
  ele (403 para dupla alheia).
- Radiografia: `imagem_data` deve ser data URL `data:image/...`; limite de
  8.000.000 caracteres (~5 MB); `status` nasce `REGISTRADO`; não há homologação
  de imagem.

### 2.7 `duplas` — `/duplas-odonto` (4)

| Método | Caminho | Guard | Corpo | Resposta |
|---|---|---|---|---|
| GET | `` | `get_current_user` | — | `[DuplaOdontoRead]` |
| GET | `/minha` | `get_current_user` | — | `DuplaOdontoRead` ou `null` |
| POST | `` | `get_current_user` | `DuplaOdontoCreate` | `DuplaOdontoRead` (201) |
| DELETE | `/{id}` | `get_current_user` | — | `DuplaOdontoRead` |

Regras:

- Supervisor monta e enxerga apenas as próprias duplas; RT de odontologia vê todas
  e pode encerrar, mas não monta em nome de outro supervisor. Estagiário e
  recepção recebem 403.
- `/minha` é do próprio estagiário; supervisor e RT recebem 403 explícito.
- Operador e auxiliar precisam ser diferentes, existir, ser da odontologia e
  estar ativos.
- Um aluno só pode estar em **uma dupla ativa** (409).
- `DELETE` desativa logicamente e preserva a linha.

### 2.8 `solicitacoes` — `/solicitacoes-cadastro` (4)

| Método | Caminho | Guard | Corpo/Query | Resposta |
|---|---|---|---|---|
| POST | `` | **público** | `SolicitacaoCreate` | `SolicitacaoRead` (201) |
| GET | `` | `_exigir_gestao` | `?situacao=` (padrão `PENDENTE`), `?curso=` | `[SolicitacaoRead]` |
| POST | `/{id}/aprovar` | `_exigir_gestao` | `AprovacaoSolicitacao` | `SolicitacaoRead` |
| POST | `/{id}/recusar` | `_exigir_gestao` | `RecusaSolicitacao` | `SolicitacaoRead` |

Regras:

- Pedido público não revela se a conta existe; e-mail fora dos domínios
  institucionais é recusado, salvo `PERMITIR_EMAILS_EXTERNOS=true`.
- E-mail com pendência aberta → 409.
- Fila escopada por clínica: RT vê a própria; coordenação vê psicologia.
- Aprovação cria a conta no mesmo ato via `criar_usuario_para_gestor`; se e-mail
  ou matrícula existirem, 400 e o pedido continua `PENDENTE`.
- **Senha no corpo é 422** em qualquer clínica; o servidor gera com
  `gerar_senha_inicial()` e envia por e-mail. Se o SMTP falhar, a conta **não** é
  criada e a resposta é 503.
- Recusa exige motivo (3–1000 caracteres).

### 2.9 `auditoria` — `/auditoria` (1)

| Método | Caminho | Guard | Query | Resposta |
|---|---|---|---|---|
| GET | `` | `autorizado_auditoria` | `?limite=` (padrão 50, máx 200), `?curso=` | `[LogAuditoriaRead]` |

Trilha append-only, escopada por clínica. Nenhuma rota escreve, altera ou apaga
`logs_auditoria` fora de `registrar_log()`.

### 2.10 `relatorios` — `/relatorios` (1)

| Método | Caminho | Guard | Query | Resposta |
|---|---|---|---|---|
| GET | `/estatisticas` | `autorizado_gestao` | `?curso=` | indicadores da clínica |

Indicadores calculados sobre dados reais; sem valor padrão inventado.

### 2.11 `ocorrencias` — `/ocorrencias` (2)

| Método | Caminho | Guard | Corpo | Resposta |
|---|---|---|---|---|
| GET | `/psico` | `require_curso("psicologia", base=autorizado_ler_ocorrencias)` | — | `[OcorrenciaEstagiarioRead]` |
| POST | `/psico` | `require_curso("psicologia", base=autorizado_registrar_ocorrencia)` | `OcorrenciaEstagiarioCreate` | `OcorrenciaEstagiarioRead` (201) |

Leitura escopada por papel: estagiário vê as próprias; supervisor, as dos seus
orientandos; recepção e RT, a clínica.

### 2.12 `ia` — `/ia` (3)

| Método | Caminho | Guard | Entrada | Resposta |
|---|---|---|---|---|
| GET | `/status` | `autorizado_clinico` | — | `IaStatusResponse` |
| POST | `/assistente` | `autorizado_clinico` | multipart (`Form`/`File`) | `AssistenteResponse` |
| POST | `/transcrever` | `autorizado_clinico` | multipart (áudio + campos) | `TranscricaoResponse` |

- Sem `GEMINI_API_KEY`, `configurado: false` e as rotas de geração respondem 503.
- `POST /assistente` recebe `paciente_id`, `curso`, `modo`, `aba_atual`,
  `mensagem`, `rascunho_atual`, `historico_json`, `ficha_resumo_json` e `audio`
  opcional. O contexto clínico é montado pelo backend.
- `POST /transcrever` recebe `curso`, `campo_alvo`, `paciente_id` opcional e
  `audio`. A transcrição usa modelo próprio (`gemini-2.5-flash`), não a cadeia de
  texto.
- Toda chamada registra auditoria; o ditado grava `DITADO_VOZ_IA`.

---

## 3. Schemas

### 3.1 Autenticação

```text
LoginRequest          { email_ou_matricula: str, senha: str }
TrocaSenhaRequest     { senha_atual: str(1..72), nova_senha: str(6..72) }
RecuperacaoSolicitada { email_ou_matricula: str(3..254) }
RecuperacaoResgate    { identificador: str(3..254), codigo: str(4..12),
                        nova_senha: str(6..72) }
Token                 { access_token, token_type, perfil, curso, nome, matricula }
```

### 3.2 Usuários

```text
UsuarioCreate  { nome: str(2..200), email: EmailStr, senha: str(6..72),
                 perfil: PerfilUsuario, matricula: str(2..32),
                 registro_profissional?: str(..64),
                 supervisor_matricula?: str(..32), curso?: CursoUsuario }

UsuarioUpdate  { nome?, email?, matricula?, registro_profissional?,
                 ativo?: bool, senha?: str(6..72), supervisor_matricula? }
                 # perfil e curso NÃO são editáveis

UsuarioRead    { id, nome, email, perfil, curso, matricula,
                 registro_profissional?, ativo, supervisor_matricula? }

VincularSupervisorRequest { supervisor_matricula?: str(..32) }
```

`EmailStr` exige `email-validator` no `requirements.txt`; sem ele a aplicação
inteira não importa.

### 3.3 Paciente e anamnese

```text
PacienteCreate { nome, cpf_rg, data_nascimento: str, telefone,
                 endereco?: str(..200), numero?: str(..20),
                 complemento?: str(..100), eh_menor: bool = false,
                 nome_responsavel?, contato_responsavel?,
                 curso: str = "odontologia" }

AnamneseCreate { pressao_arterial?: str(..7),     # ^\d{2,3}/\d{2,3}$
                 glicemia_capilar?: int(20..600),
                 frequencia_cardiaca?: int(20..250),
                 temperatura?: float(30.0..45.0),
                 alergias?: str(..2000), condicoes_cronicas?: str(..2000),
                 medicacoes_em_uso?: str(..2000) }
```

Validações de paciente:

- `curso='psicologia'`: CPF normalizado para 11 dígitos e formatado
  `000.000.000-00`; endereço e número obrigatórios (após `strip`).
- Menor de idade: responsável e contato obrigatórios — checado no router.

### 3.4 Agendamento

```text
AgendamentoCreate { paciente_id, paciente_nome, estagiario_nome,
                    estagiario_matricula, auxiliar_matricula?,
                    curso, data_sessao: date, horario, turno = "tarde",
                    sala_ou_cadeira, tipo_consulta,
                    observacao_logistica? }

AgendamentoUpdateStatus { status: StatusAgendamento,
                          motivo_falta?: str(..500) }
```

- Matrículas normalizadas (`strip().upper()`); a do responsável não pode ser
  vazia.
- `curso='odontologia'`: auxiliar obrigatório e diferente do operador.
- `curso='psicologia'`: auxiliar recusado no router (422).

### 3.5 Vínculo e duplas

```text
AtribuicaoCreate      { paciente_id, estagiario_nome, estagiario_matricula }
TransferenciaRequest  { estagiario_nome, estagiario_matricula, motivo }
AtribuicaoRead        { id, paciente_id, paciente_nome, curso, estagiario_nome,
                        estagiario_matricula, situacao, motivo?,
                        atribuido_por_nome, atribuido_por_matricula,
                        data_atribuicao, data_encerramento? }

DuplaOdontoCreate { operador_matricula: str(2..32),
                    auxiliar_matricula: str(2..32) }   # distintos
DuplaOdontoRead   { id, operador_matricula, operador_nome, auxiliar_matricula,
                    auxiliar_nome, supervisor_matricula, supervisor_nome?,
                    ativo, criado_em, desativado_em? }
```

### 3.6 Prontuário de psicologia

```text
ProntuarioPsicoCreate {
  paciente_id, paciente_nome, estagiario_nome, estagiario_matricula,
  supervisor_nome?, data_sessao: str, numero_sessao: str,
  tipo_registro: "SESSAO" | "DEMANDA" | "ENCERRAMENTO" = "SESSAO",
  redacao_texto: str = "",
  avaliacao_demanda?, objetivos_intervencao?, hipotese_diagnostica?,
  avaliacao_final?, motivos_encerramento?: list[str], informacoes_adicionais?
}

HomologacaoRequest { decisao: StatusProntuario, parecer: str }
```

Validações:

- Nenhum campo narrativo aceita `"`, `“`, `”`, `«`, `»` (RN-002).
- `SESSAO`: `redacao_texto.strip()` obrigatório.
- `DEMANDA`: queixa, objetivos e hipótese obrigatórios; `numero_sessao` vazio vira
  `"Avaliação da Demanda"`.
- `ENCERRAMENTO`: avaliação final e informações conforme o schema; motivos são
  lista.
- `parecer` sofre `strip()` e não pode ser vazio.

### 3.7 Ficha e documento odontológico

```text
FichaOdontoCreate { paciente_id, operador_matricula, auxiliar_matricula,
                    dente_regiao, procedimento_realizado, materiais_utilizados,
                    anestesico?, alerta_alergia? }
                    # matrículas não vazias; dupla distinta;
                    # conteúdo clínico não vazio

DocumentoFichaOdontoCreate { paciente_id, operador_matricula,
                             auxiliar_matricula, tipo: str,
                             conteudo: dict }
DocumentoFichaOdontoUpdate { conteudo: dict }

RadiografiaOdontoCreate { paciente_id, dupla_id, tipo, laudo,
                          imagem_nome?, imagem_mime?, imagem_data? }
```

`imagem_data`: precisa começar com `data:image/`, máximo 8.000.000 caracteres.

### 3.8 Solicitação de credencial

```text
SolicitacaoCreate { nome: str(3..200), email: EmailStr,
                    matricula: str(2..32), telefone?: str(..32),
                    curso_declarado: str(..20),
                    perfil_declarado: PerfilUsuario }

AprovacaoSolicitacao { perfil: PerfilUsuario,
                       registro_profissional?: str(..64),
                       senha?: str(6..72) }   # enviar senha → 422

RecusaSolicitacao { motivo: str(3..1000) }
```

`perfil_declarado` e `curso_declarado` são declaração do solicitante. O perfil
final é o da aprovação; o curso vem do token de quem aprova.

### 3.9 IA

```text
IaStatusResponse   { configurado, modelo_padrao, modelos_fallback[],
                     modelo_transcricao }
AssistenteResponse { transcricao?, resposta, campos_sugeridos: dict[str,str],
                     alertas_clinicos[], avisos_conformidade[],
                     modelo_utilizado }
TranscricaoResponse{ texto, modelo_utilizado, avisos_conformidade[] }
```

Saídas estruturadas por curso: `SaidaPsicologiaLLM` e `SaidaOdontologiaLLM`, com
campos específicos de cada ficha e `alertas_clinicos`.

---

## 4. ENUMs

Tipos nativos do PostgreSQL; gravam o valor em maiúsculas quando o membro é
maiúsculo.

| Tipo | Valores |
|---|---|
| `perfilusuario` | `estagiario`, `supervisor`, `recepcao`, `rt`, `coordenacao` |
| `cursousuario` | `psicologia`, `odontologia`, `geral` |
| `statusagendamento` | `AGENDADO`, `PRESENTE`, `EM_ATENDIMENTO`, `CONCLUIDO`, `FALTOU`, `CANCELADO` |
| `statusprontuario` | `EM_ELABORACAO`, `AGUARDANDO_VALIDACAO`, `VALIDADO`, `DEVOLVIDO_PARA_AJUSTE` |
| `situacaosolicitacao` | `PENDENTE`, `APROVADA`, `RECUSADA` |

`SituacaoAtribuicao` e o tipo de ocorrência são `Literal`/texto no schema:
`ATIVA`/`SUBSTITUIDA` e `ATRASO`, `FALTA`, `CONDUTA`, `ATENDIMENTO`,
`ADMINISTRATIVO`, `OUTRO`.

`cursousuario = 'geral'` existe por compatibilidade e **nenhum cadastro o usa**:
a recepção é uma conta por clínica.

---

## 5. Modelo de dados

14 tabelas de negócio. Apenas **4 foreign keys**, todas de `paciente_id` para
`pacientes.id` (três de prontuário/agenda e uma da anamnese).

| Tabela | Papel | Chaves e índices relevantes |
|---|---|---|
| `usuarios` | Contas e RBAC | `email` único, `matricula` única, `senha_hash`, `ativo` |
| `pacientes` | Cadastro | `cpf_rg` único, `curso` (`psicologia`/`odontologia`/`ambos`), `prontuario_ativo`, `criado_em` |
| `agendamentos` | Agenda | FK `paciente_id`; `estagiario_matricula`, `auxiliar_matricula` |
| `atribuicoes_clinicas` | Vínculo psi | FK `paciente_id`; índice único parcial `(paciente_id, curso) WHERE situacao='ATIVA'` |
| `prontuarios_psico` | Evolução psi | FK `paciente_id`; `tipo_registro`, `redacao_texto`, `status` |
| `fichas_odonto` | Procedimento odonto | FK `paciente_id`; dupla, dente, procedimento |
| `documentos_ficha_odonto` | Ficha completa | FK `paciente_id`; `conteudo` JSON, `versao`, `status` |
| `radiografias_odonto` | Imagem | FK `paciente_id`; `dupla_id`, `imagem_data`, `status` |
| `anamneses` | Sinais vitais | FK `paciente_id`; `afetido_em` (timestamptz) |
| `duplas_odonto` | Duplas | matrículas lógicas (sem FK); `ativo` |
| `ocorrencias_estagiarios` | Ocorrências | `estagiario_matricula`, `curso`, `tipo` |
| `solicitacoes_cadastro` | Pedidos | `situacao`, `usuario_criado_id` lógico |
| `tokens_recuperacao_senha` | Reset | `codigo_hash` (SHA-256), `expira_em` |
| `logs_auditoria` | Trilha | `usuario_id` lógico, `usuario_nome` copiado, `endpoint`/IP |

`logs_auditoria` não tem FK para `usuarios` de propósito: a autoria sobrevive à
desativação.

---

## 6. Invariantes e transições

### 6.1 Transições de status

**Agendamento** — todos os estados são aceitos pelo `PATCH`, sem máquina de
estados rígida. Regras:

- `motivo_falta` só existe em `FALTOU`; qualquer outro status com o campo → 422.
- Sair de `FALTOU` limpa `motivo_falta`.

**Prontuário (psi e odonto)** — fluxo nominal:

```text
EM_ELABORACAO ──POST/PATCH──> AGUARDANDO_VALIDACAO
AGUARDANDO_VALIDACAO ──homologar VALIDADO──> VALIDADO
AGUARDANDO_VALIDACAO ──homologar DEVOLVIDO──> DEVOLVIDO_PARA_AJUSTE
DEVOLVIDO_PARA_AJUSTE ──PATCH (reenvio)──> AGUARDANDO_VALIDACAO (versao+1)
```

- Documento odontológico: `POST` nasce em `AGUARDANDO_VALIDACAO`; `PATCH` só
  reabre `EM_ELABORACAO` ou `DEVOLVIDO_PARA_AJUSTE`; homologação só aceita
  `AGUARDANDO_VALIDACAO`.

**Solicitação** — `PENDENTE` → `APROVADA` (cria conta) ou `RECUSADA` (exige
motivo). Não há estado "aprovada sem usuário".

### 6.2 Invariantes

1. Um responsável `ATIVA` por `(paciente_id, curso)` — banco.
2. Um aluno por dupla odontológica ativa — serviço.
3. Dupla odontológica com dois estagiários distintos — schema.
4. Um estagiário por sessão de psicologia — schema + router.
5. `cpf_rg` único — banco.
6. `email` e `matricula` únicos em `usuarios` — banco.
7. Toda escrita por id valida o curso do registro — `validar_curso_do_registro`.
8. Homologação exige parecer não vazio — schema, nas duas clínicas.
9. Texto clínico psi sem aspas — schema.
10. Autoria clínica vem do token, não do corpo.
11. Senha inicial gerada no servidor, em qualquer clínica.
12. Trilha de auditoria append-only.

---

## 7. O que não existe no contrato

Rotas ausentes de propósito (não invente):

- `POST /auth/seed` — removida na Fase 4.
- `GET/PATCH /demandas` — a fila de demandas de estágio foi removida em 16/10/2026.
- Revogação de token (`POST /auth/logout` não existe; o cliente descarta o JWT).
- Reenvio de senha inicial pela tela.
- Hash de integridade ou assinatura digital de prontuário.
- Homologação de radiografia.
- Cadastro de consultórios: os 6 do SPA são constantes de domínio.
