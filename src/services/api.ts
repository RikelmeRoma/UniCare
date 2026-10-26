/**
 * UniCare API Client
 * Integração Frontend React 19 -> Backend FastAPI (SQLModel + JWT)
 * Compatível com arquitetura Antigravity Kit & BMad Method
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Origem da API, sem o caminho. O `/health` mora na RAIZ do servidor
// (`http://localhost:8000/health`) e não sob `/api/v1`, então precisa de
// endereço próprio. `new URL` com a origem da página como base cobre o caso
// de `VITE_API_URL` ser relativo — aí a origem é a própria do front.
const API_ORIGIN = new URL(API_BASE_URL, window.location.origin).origin;

/** Resposta do `/health`: o backend diz se a API responde e se o banco está de pé. */
export interface ApiHealth {
  status: string;
  conectado?: boolean;
  dialect?: string;
  driver?: string;
  server_version?: string;
  erro?: string;
}

export interface AuthLoginResponse {
  access_token: string;
  token_type: string;
  perfil: 'estagiario' | 'supervisor' | 'recepcao' | 'rt';
  curso: 'psicologia' | 'odontologia' | 'geral';
  nome: string;
  matricula: string;
}

export interface ApiUsuario {
  id: number;
  nome: string;
  email: string;
  perfil: 'estagiario' | 'supervisor' | 'recepcao' | 'rt';
  curso: 'psicologia' | 'odontologia' | 'geral';
  matricula: string;
  registro_profissional?: string;
  ativo: boolean;
  supervisor_matricula?: string | null;
}

/** Estagiário disponível para a recepção montar a agenda. Só o que o
 *  agendamento precisa — o `GET /usuarios` é gestão de usuário e exige RT ou
 *  supervisor, então a recepção recebia 403 e acabava digitando o nome à mão. */
export interface ApiEstagiario {
  nome: string;
  matricula: string;
}

/** Estagiário sem supervisor ainda — o que o supervisor pode assumir (RF-005).
 *  Traz o `id` porque a ação de vincular é por id. */
export interface ApiEstagiarioDisponivel {
  id: number;
  nome: string;
  matricula: string;
}

export interface ApiAnamnese {
  id: number;
  paciente_id: number;
  afetido_em: string;
  pressao_arterial?: string;
  glicemia_capilar?: number;
  frequencia_cardiaca?: number;
  temperatura?: number;
  alergias?: string;
  condicoes_cronicas?: string;
  medicacoes_em_uso?: string;
  responsavel_nome: string;
  responsavel_matricula: string;
  criado_em: string;
}

export interface ApiPaciente {
  id: number;
  nome: string;
  cpf_rg: string;
  data_nascimento: string;
  telefone: string;
  eh_menor: boolean;
  nome_responsavel?: string;
  contato_responsavel?: string;
  curso: 'psicologia' | 'odontologia' | 'ambos';
  prontuario_ativo: boolean;
  criado_em: string;
}

export interface ApiAgendamento {
  id: number;
  paciente_id: number;
  paciente_nome: string;
  estagiario_nome: string;
  estagiario_matricula: string;
  /** Segundo estagiário da dupla; nulo nas sessões anteriores à coluna. */
  auxiliar_matricula?: string | null;
  curso: 'psicologia' | 'odontologia';
  /** ISO `YYYY-MM-DD`. O backend tipa como `Date` e devolve string no JSON.
   *  Ausente nas linhas anteriores à coluna — `null`, não string vazia. */
  data_sessao?: string | null;
  horario: string;
  turno: 'manha' | 'tarde' | 'noite';
  sala_ou_cadeira: string;
  tipo_consulta: string;
  status: 'AGENDADO' | 'PRESENTE' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'FALTOU' | 'CANCELADO';
  observacao_logistica?: string;
}

export interface ApiAtribuicao {
  id: number;
  paciente_id: number;
  /** O backend junta; no wire pode vir vazio se o paciente foi removido. */
  paciente_nome: string;
  curso: string;
  estagiario_nome: string;
  estagiario_matricula: string;
  situacao: 'ATIVA' | 'SUBSTITUIDA';
  motivo?: string | null;
  atribuido_por_nome: string;
  atribuido_por_matricula: string;
  data_atribuicao: string;
  data_encerramento?: string | null;
}

export interface ApiProntuarioPsico {
  id: number;
  paciente_id: number;
  paciente_nome: string;
  estagiario_nome: string;
  estagiario_matricula: string;
  supervisor_nome?: string;
  data_sessao: string;
  numero_sessao: string;
  redacao_texto: string;
  parecer_supervisor?: string;
  status: 'EM_ELABORACAO' | 'AGUARDANDO_VALIDACAO' | 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE';
  criado_em: string;
}

export interface ApiFichaOdonto {
  id: number;
  paciente_id: number;
  dupla_estagiarios: string;
  /** Matrículas da dupla (PDR-05). Nulas nas fichas anteriores à coluna. */
  operador_matricula?: string | null;
  auxiliar_matricula?: string | null;
  dente_regiao: string;
  procedimento_realizado: string;
  materiais_utilizados: string;
  anestesico?: string;
  alerta_alergia?: string;
  /** Carimbo de quem homologou, gravado pelo servidor no ato. */
  supervisor_nome?: string | null;
  parecer_supervisor?: string;
  status: 'EM_ELABORACAO' | 'AGUARDANDO_VALIDACAO' | 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE';
  criado_em: string;
}

export interface ApiLogAuditoria {
  id: number;
  usuario_id: number;
  usuario_nome: string;
  acao: string;
  tabela_afetada: string;
  registro_id?: number;
  endereco_ip?: string;
  timestamp: string;
}


/** Pedido feito por quem ainda não tem conta. Rota pública: sem token. */
export interface SolicitacaoCadastro {
  id: number;
  nome: string;
  email: string;
  matricula: string;
  telefone: string | null;
  /** O que o solicitante AFIRMA. Quem decide é a RT. */
  curso_declarado: 'psicologia' | 'odontologia';
  perfil_declarado: 'estagiario' | 'supervisor' | 'recepcao' | 'rt';
  situacao: 'PENDENTE' | 'APROVADA' | 'RECUSADA';
  decidido_por_nome: string | null;
  decidido_por_matricula: string | null;
  decidido_em: string | null;
  motivo_recusa: string | null;
  usuario_criado_id: number | null;
  /** Se a senha inicial foi enviada por e-mail na aprovação. */
  senha_enviada_por_email: boolean | null;
  criado_em: string;
}

export interface SolicitacaoEnviada {
  id: number;
  nome: string;
  email: string;
  matricula: string;
  situacao: 'PENDENTE';
  criado_em: string;
}

/**
 * Tira da mensagem os identificadores de regra (RF-xxx, RN-xxx, UC-xxx).
 *
 * O servidor identifica a regra no `detail` do erro — é o contrato que os
 * testes de conformidade affirmam, e o `AGENTS.md` manda manter. Mas número
 * interno de requisito não orienta ninguém: "RN-002" na tela só polui a
 * leitura, sem dizer o que a pessoa deve fazer. A limpeza é aqui, na
 * fronteira, para que nenhuma tela precise lembrar de filtrar.
 *
 * O texto cru continua em `ApiError.detalhe`, para o código que precisa
 * decidir: é dele que se sabe se o 403 é o bloqueio esperado da RN-001.
 */
export function semIdentificadores(texto: string): string {
  return texto
    // Parêntese que contenha o código: "(RN-001)", "(RF02 / UC-05)".
    .replace(/\s*\([^()]*\b(?:RNF|RF|RN|UC)[-\s]?\d{2,3}\b[^()]*\)/gi, '')
    // Código separado por barra ou bullet: "Salvaguarda RN-001 / Resolução".
    .replace(/\s*[•|/]\s*\b(?:RNF|RF|RN|UC)[-\s]?\d{2,3}\b/gi, '')
    // Código solto: "Inconformidade Técnica • RN-002".
    .replace(/\b(?:RNF|RF|RN|UC)[-\s]?\d{2,3}\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Erro de resposta da API, com o status HTTP junto.
 *
 * Antes o `request()` jogava só a mensagem do servidor no `Error` e
 * descartava o status. Aí a distinção que o `ClinicContext` precisa — "403 de
 * perfil sem acesso (RN-001, esperado)" contra "500, isso quebrou" — virava
 * impossible: o `detail` do 403 é "Acesso negado: Perfil 'recepcao' não tem
 * permissão para este recurso (RN-001)", que não contém "403" em lugar
 * nenhum. O 403 esperado era tratado como falha de sistema e despejado cru
 * na tela da recepção, todo login.
 */
export class ApiError extends Error {
  readonly status: number;

  /** `detail` cru do servidor, com o identificador da regra. */
  readonly detalhe: string;

  constructor(mensagem: string, status: number) {
    // O que a tela mostra não leva identificador de regra; o que o código
    // decide continua no `detalhe`.
    super(semIdentificadores(mensagem));
    this.name = 'ApiError';
    this.status = status;
    this.detalhe = mensagem;
  }
}

class ApiService {

  private getToken(): string | null {
    return localStorage.getItem('unicare_token');
  }

  private setToken(token: string) {
    localStorage.setItem('unicare_token', token);
  }

  public clearToken() {
    localStorage.removeItem('unicare_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorDetail = 'Erro na requisição ao servidor.';
      try {
        const data = await response.json();
        if (data.detail) {
          errorDetail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        }
      } catch {
        errorDetail = `Erro HTTP ${response.status}: ${response.statusText}`;
      }
      // O status vai junto: sem ele, o chamador não distingue 403 de 500.
      throw new ApiError(errorDetail, response.status);
    }

    return response.json();
  }

  // --- Infraestrutura ---

  /**
   * Consulta o `/health` do backend.
   *
   * Não usa o `request()` porque ele sempre prefixa `API_BASE_URL`, e o
   * `/health` está na raiz. O timeout é curto de propósito: a consulta é
   * síncrona na tela de login, e um servidor travado não pode segurar a
   * interface esperando.
   */
  async health(): Promise<ApiHealth> {
    const controller = new AbortController();
    const temporizador = setTimeout(() => controller.abort(), 5000);
    try {
      const resposta = await fetch(`${API_ORIGIN}/health`, {
        signal: controller.signal,
      });
      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}`);
      }
      return (await resposta.json()) as ApiHealth;
    } finally {
      clearTimeout(temporizador);
    }
  }

  // --- Autenticação ---
  async login(emailOuMatricula: string, senha: string): Promise<AuthLoginResponse> {
    const res = await this.request<AuthLoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email_ou_matricula: emailOuMatricula, senha }),
    });
    this.setToken(res.access_token);
    return res;
  }

  /**
   * Troca a senha de quem está autenticado.
   *
   * A senha atual vai junto porque o servidor exige: sem ela, qualquer sessão
   * aberta trocaria a senha do dono. O token continua válido depois da troca —
   * não há blacklist no projeto, então revogar exigiria outra tabela.
   */
  async trocarSenha(senhaAtual: string, novaSenha: string) {
    return this.request<{ message: string }>('/auth/senha', {
      method: 'PATCH',
      body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha }),
    });
  }

  /**
   * Recuperação de senha por token no e-mail.
   *
   * A resposta é genérica de propósito: o backend não diz se a conta existe,
   * para a rota pública não servir de oráculo para enumerar o cadastro. O 503
   * é o estado honesto — SMTP desligado ou quebrado — e a tela mostra isso em
   * vez de fingir que enviou.
   */
  async solicitarRecuperacaoSenha(identificador: string) {
    return this.request<{ message: string }>('/auth/senha/recuperar/solicitar', {
      method: 'POST',
      body: JSON.stringify({ email_ou_matricula: identificador }),
    });
  }

  async resgatarRecuperacaoSenha(
    identificador: string,
    codigo: string,
    novaSenha: string
  ) {
    return this.request<{ message: string }>('/auth/senha/recuperar/redeem', {
      method: 'POST',
      body: JSON.stringify({ identificador, codigo, nova_senha: novaSenha }),
    });
  }

  async getMe() {
    return this.request<{
      id: number;
      nome: string;
      email: string;
      perfil: string;
      curso: string;
      matricula: string;
      registro_profissional?: string;
      ativo: boolean;
    }>('/auth/me');
  }

  // --- Usuários (RF-009) ---
// `senha_hash` não existe em nenhum desses tipos: o backend nunca o serializa.
async getUsuarios(): Promise<ApiUsuario[]> {
    return this.request<ApiUsuario[]>('/usuarios');
  }

  async getEstagiarios(): Promise<ApiEstagiario[]> {
    return this.request<ApiEstagiario[]>('/usuarios/estagiarios');
  }

  /** Estagiários ativos da clínica que ainda não têm supervisor — os que o
   *  supervisor pode assumir (RF-005). */
  async getEstagiariosDisponiveis(): Promise<ApiEstagiarioDisponivel[]> {
    return this.request<ApiEstagiarioDisponivel[]>('/usuarios/estagiarios/disponiveis');
  }

  async vincularSupervisor(
    id: number,
    supervisorMatricula?: string
  ): Promise<ApiUsuario> {
    return this.request<ApiUsuario>(`/usuarios/${id}/vincular-supervisor`, {
      method: 'POST',
      body: JSON.stringify({ supervisor_matricula: supervisorMatricula ?? null }),
    });
  }

  async createUsuario(dados: {
    nome: string;
    email: string;
    senha: string;
    perfil: 'estagiario' | 'supervisor' | 'recepcao' | 'rt';
    matricula: string;
    registro_profissional?: string;
    supervisor_matricula?: string;
  }): Promise<ApiUsuario> {
    return this.request<ApiUsuario>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async updateUsuario(
    id: number,
    dados: {
      nome?: string;
      email?: string;
      matricula?: string;
      registro_profissional?: string;
      ativo?: boolean;
      senha?: string;
      supervisor_matricula?: string | null;
    }
  ): Promise<ApiUsuario> {
    return this.request<ApiUsuario>(`/usuarios/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    });
  }

  /** Desativa, não apaga: o histórico de auditoria preserva a autoria. */
  async desativarUsuario(id: number): Promise<ApiUsuario> {
    return this.request<ApiUsuario>(`/usuarios/${id}`, { method: 'DELETE' });
  }

// --- Solicitação de credencial ---


  /**
   * Rota pública: o servidor exige e-mail institucional. Sem token porque é o
   * pedido de quem ainda não tem conta — é justamente esse o problema.
   */
  async solicitarCredencial(dados: {
    nome: string;
    email: string;
    matricula: string;
    telefone?: string;
    curso_declarado: string;
    perfil_declarado: string;
  }): Promise<SolicitacaoEnviada> {
    return this.request<SolicitacaoEnviada>('/solicitacoes-cadastro/', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async getSolicitacoes(situacao?: 'PENDENTE' | 'APROVADA' | 'RECUSADA'): Promise<SolicitacaoCadastro[]> {
    const filtro = situacao ? `?situacao=${situacao}` : '';
    return this.request<SolicitacaoCadastro[]>(`/solicitacoes-cadastro/${filtro}`);
  }

  /** Aprova e cria a conta no mesmo ato. A senha é a que a RT define. */
  async aprovarSolicitacao(
    id: number,
    dados: { perfil: string; registro_profissional?: string; senha: string }
  ): Promise<SolicitacaoCadastro> {
    return this.request<SolicitacaoCadastro>(`/solicitacoes-cadastro/${id}/aprovar`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async recusarSolicitacao(id: number, motivo: string): Promise<SolicitacaoCadastro> {
    return this.request<SolicitacaoCadastro>(`/solicitacoes-cadastro/${id}/recusar`, {
      method: 'POST',
      body: JSON.stringify({ motivo }),
    });
  }

  // --- Pacientes ---
  async getPacientes(curso?: string): Promise<ApiPaciente[]> {
    const param = curso ? `?curso=${encodeURIComponent(curso)}` : '';
    return this.request<ApiPaciente[]>(`/pacientes${param}`);
  }

  async createPaciente(paciente: {
    nome: string;
    cpf_rg: string;
    data_nascimento: string;
    telefone: string;
    eh_menor: boolean;
    nome_responsavel?: string;
    contato_responsavel?: string;
    curso: string;
  }): Promise<ApiPaciente> {
    return this.request<ApiPaciente>('/pacientes', {
      method: 'POST',
      body: JSON.stringify(paciente),
    });
  }

  // --- Anamnese e sinais vitais (dado clínico, escopo por clínica) ---
  /** Histórico do mais recente para o mais antigo. */
  async getAnamneses(pacienteId: number): Promise<ApiAnamnese[]> {
    return this.request<ApiAnamnese[]>(`/pacientes/${pacienteId}/anamnese`);
  }

  async criarAnamnese(
    pacienteId: number,
    dados: {
      pressao_arterial?: string;
      glicemia_capilar?: number;
      frequencia_cardiaca?: number;
      temperatura?: number;
      alergias?: string;
      condicoes_cronicas?: string;
      medicacoes_em_uso?: string;
    }
  ): Promise<ApiAnamnese> {
    return this.request<ApiAnamnese>(`/pacientes/${pacienteId}/anamnese`, {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  // --- Agendamentos ---
  async getAgendamentos(curso?: string, status?: string): Promise<ApiAgendamento[]> {
    const params = new URLSearchParams();
    if (curso) params.append('curso', curso);
    if (status) params.append('status_filtro', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<ApiAgendamento[]>(`/agendamentos${qs}`);
  }

  async createAgendamento(agendamento: {
    paciente_id: number;
    paciente_nome: string;
    estagiario_nome: string;
    estagiario_matricula: string;
    auxiliar_matricula?: string | null;
    curso: string;
    data_sessao: string;
    horario: string;
    turno: string;
    sala_ou_cadeira: string;
    tipo_consulta: string;
    observacao_logistica?: string;
  }): Promise<ApiAgendamento> {
    return this.request<ApiAgendamento>('/agendamentos', {
      method: 'POST',
      body: JSON.stringify(agendamento),
    });
  }

  async updateAgendamentoStatus(id: number, status: string): Promise<ApiAgendamento> {
    return this.request<ApiAgendamento>(`/agendamentos/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // --- Prontuários Psicológicos ---
  async getProntuariosPsico(): Promise<ApiProntuarioPsico[]> {
    return this.request<ApiProntuarioPsico[]>('/prontuarios/psico');
  }

  async createProntuarioPsico(dados: {
    paciente_id: number;
    paciente_nome: string;
    estagiario_nome: string;
    estagiario_matricula: string;
    supervisor_nome?: string;
    data_sessao: string;
    numero_sessao: string;
    redacao_texto: string;
  }): Promise<ApiProntuarioPsico> {
    return this.request<ApiProntuarioPsico>('/prontuarios/psico', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async homologarProntuarioPsico(
    id: number,
    decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE',
    parecer: string
  ): Promise<ApiProntuarioPsico> {
    return this.request<ApiProntuarioPsico>(`/prontuarios/psico/${id}/homologar`, {
      method: 'PATCH',
      body: JSON.stringify({ decisao, parecer }),
    });
  }

  // --- Vínculo paciente ↔ estagiário (RF-001, clínica de psicologia) ---

  async getAtribuicoesPsico(): Promise<ApiAtribuicao[]> {
    return this.request<ApiAtribuicao[]>('/atribuicoes/psico');
  }

  async getMinhasAtribuicoesPsico(): Promise<ApiAtribuicao[]> {
    return this.request<ApiAtribuicao[]>('/atribuicoes/psico/minha');
  }

  async atribuirPaciente(dados: {
    paciente_id: number;
    estagiario_nome: string;
    estagiario_matricula: string;
  }): Promise<ApiAtribuicao> {
    return this.request<ApiAtribuicao>('/atribuicoes/psico', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async transferirPaciente(
    id: number,
    dados: {
      estagiario_nome: string;
      estagiario_matricula: string;
      motivo: string;
    }
  ): Promise<ApiAtribuicao> {
    return this.request<ApiAtribuicao>(`/atribuicoes/psico/${id}/transferir`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    });
  }

  // --- Fichas Odontológicas (RF-004, paridade com a clínica de psicologia) ---
  async getFichasOdonto(): Promise<ApiFichaOdonto[]> {
    return this.request<ApiFichaOdonto[]>('/prontuarios/odonto');
  }

  async createFichaOdonto(dados: {
    paciente_id: number;
    operador_matricula: string;
    auxiliar_matricula: string;
    dente_regiao: string;
    procedimento_realizado: string;
    materiais_utilizados: string;
    anestesico?: string;
    alerta_alergia?: string;
  }): Promise<ApiFichaOdonto> {
    return this.request<ApiFichaOdonto>('/prontuarios/odonto', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
  }

  async homologarFichaOdonto(
    id: number,
    decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE',
    parecer: string
  ): Promise<ApiFichaOdonto> {
    return this.request<ApiFichaOdonto>(`/prontuarios/odonto/${id}/homologar`, {
      method: 'PATCH',
      body: JSON.stringify({ decisao, parecer }),
    });
  }

  // --- Auditoria LGPD ---
  async getAuditoria(limite = 50): Promise<ApiLogAuditoria[]> {
    return this.request<ApiLogAuditoria[]>(`/auditoria?limite=${limite}`);
  }

  // --- Relatórios Estatísticos (RF-006) ---
  async getEstatisticas(): Promise<RelatorioEstatisticas> {
    return this.request<RelatorioEstatisticas>('/relatorios/estatisticas');
  }

  // Demandas de estágio removidas: o botão "Conciliar" só escrevia a palavra
  // `Agendado` sem agendar nem atribuir paciente a ninguém. O vínculo do RF-001
  // (`/atribuicoes/psico`) faz o trabalho de verdade.
}

export interface RelatorioEstatisticas {
  resumo_executivo: {
    instituicao: string;
    unidade: string;
    total_pacientes: number;
    total_agendamentos: number;
    taxa_comparecimento_pct: number;
    taxa_absenteismo_pct: number;
  };
  distribuicao_cursos: {
    psicologia: {
      pacientes_ativos: number;
      agendamentos_totais: number;
      prontuarios_submetidos: number;
      prontuarios_aguardando_visto: number;
      prontuarios_validados: number;
      prontuarios_devolvidos: number;
    };
    odontologia: {
      pacientes_ativos: number;
      agendamentos_totais: number;
      fichas_clinicas_totais: number;
    };
  };
  agendamentos_por_status: Record<string, number>;
  conformidade_legal: {
    pacientes_menores_com_responsavel: number;
    total_logs_rastreados_lgpd: number;
    normas_atendidas: string[];
  };
}

export const api = new ApiService();
