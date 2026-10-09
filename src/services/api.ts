/**
 * UniCare API Client
 * Integração Frontend React 19 -> Backend FastAPI (SQLModel + JWT)
 * Compatível com arquitetura Antigravity Kit & BMad Method
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface AuthLoginResponse {
  access_token: string;
  token_type: string;
  perfil: 'estagiario' | 'supervisor' | 'recepcao' | 'rt';
  curso: 'psicologia' | 'odontologia' | 'geral';
  nome: string;
  matricula: string;
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
  curso: 'psicologia' | 'odontologia';
  horario: string;
  turno: 'manha' | 'tarde' | 'noite';
  sala_ou_cadeira: string;
  tipo_consulta: string;
  status: 'AGENDADO' | 'PRESENTE' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'FALTOU' | 'CANCELADO';
  observacao_logistica?: string;
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
  inicio_sessao_texto: string;
  meio_sessao_texto: string;
  fim_sessao_texto: string;
  parecer_supervisor?: string;
  status: 'EM_ELABORACAO' | 'AGUARDANDO_VALIDACAO' | 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE';
  criado_em: string;
}

export interface ApiFichaOdonto {
  id: number;
  paciente_id: number;
  dupla_estagiarios: string;
  dente_regiao: string;
  procedimento_realizado: string;
  materiais_utilizados: string;
  anestesico?: string;
  alerta_alergia?: string;
  parecer_supervisor?: string;
  status: 'EM_ELABORACAO' | 'AGUARDANDO_VALIDACAO' | 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE';
  criado_em: string;
}

export interface ApiDemanda {
  id: number;
  aluno_nome: string;
  aluno_matricula: string;
  curso: 'psicologia' | 'odontologia';
  procedimento_desejado: string;
  prioridade: 'Alta' | 'Média' | 'Normal';
  data_solicitacao: string;
  status: 'Pendente' | 'Agendado';
  criado_em?: string;
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
      throw new Error(errorDetail);
    }

    return response.json();
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

  async getMe() {
    return this.request<{
      id: number;
      nome: string;
      email: string;
      perfil: string;
      curso: string;
      matricula: string;
      registro_profissional?: string;
    }>('/auth/me');
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
    curso: string;
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
    inicio_sessao_texto: string;
    meio_sessao_texto: string;
    fim_sessao_texto: string;
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

  // --- Fichas Odontológicas (RF-004, paridade com a clínica de psicologia) ---
  async getFichasOdonto(): Promise<ApiFichaOdonto[]> {
    return this.request<ApiFichaOdonto[]>('/prontuarios/odonto');
  }

  async createFichaOdonto(dados: {
    paciente_id: number;
    dupla_estagiarios: string;
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

  // --- Demandas de Estágio (RF-009) ---
  async getDemandas(curso?: string, status?: string): Promise<ApiDemanda[]> {
    const params = new URLSearchParams();
    if (curso) params.append('curso', curso);
    if (status) params.append('status_filtro', status);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request<ApiDemanda[]>(`/demandas${qs}`);
  }

  async createDemanda(demanda: {
    aluno_nome: string;
    aluno_matricula: string;
    curso: string;
    procedimento_desejado: string;
    prioridade: 'Alta' | 'Média' | 'Normal';
    data_solicitacao: string;
  }): Promise<ApiDemanda> {
    return this.request<ApiDemanda>('/demandas', {
      method: 'POST',
      body: JSON.stringify(demanda),
    });
  }

  async updateDemandaStatus(id: number, status: 'Pendente' | 'Agendado'): Promise<ApiDemanda> {
    return this.request<ApiDemanda>(`/demandas/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }
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
