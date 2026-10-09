import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, type ApiPaciente, type ApiAgendamento, type ApiProntuarioPsico, type ApiFichaOdonto, type ApiDemanda } from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';

export type StatusAgendamento = 'AGENDADO' | 'PRESENTE' | 'EM_ATENDIMENTO' | 'CONCLUIDO' | 'FALTOU' | 'CANCELADO';
export type StatusProntuario = 'EM_ELABORACAO' | 'AGUARDANDO_VALIDACAO' | 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE';

export interface Paciente {
  id: number;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  ehMenor: boolean;
  nomeResponsavel?: string;
  contatoResponsavel?: string;
  curso: 'psicologia' | 'odontologia' | 'ambos';
  prontuarioAtivo: boolean;
}

export interface Agendamento {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  estagiarioNome: string;
  estagiarioMatricula: string;
  curso: 'psicologia' | 'odontologia';
  horario: string; // Ex: '14:00'
  turno: 'manha' | 'tarde' | 'noite';
  salaOuCadeira: string; // Ex: 'Sala 03' ou 'Cadeira 04'
  tipoConsulta: string; // Ex: 'Psicoterapia Adulto' ou 'Restauração Resina'
  status: StatusAgendamento;
  observacaoLogistica?: string;
}

export interface DemandaEstagio {
  id: number;
  alunoNome: string;
  alunoMatricula: string;
  curso: 'psicologia' | 'odontologia';
  procedimentoDesejado: string;
  prioridade: 'Alta' | 'Média' | 'Normal';
  dataSolicitacao: string;
  status: 'Pendente' | 'Agendado';
}

export interface EvolucaoPsico {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  estagiarioNome: string;
  estagiarioMatricula: string;
  supervisorNome: string;
  dataSessao: string;
  numeroSessao: string;
  inicioTexto: string;
  meioTexto: string;
  fimTexto: string;
  parecerSupervisor?: string;
  status: StatusProntuario;
  submetidoEm: string;
}

export interface FichaOdonto {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  duplaEstagiarios: string;
  denteRegiao: string;
  procedimentoRealizado: string;
  materiaisUtilizados: string;
  anestesico?: string;
  alertaAlergia?: string;
  parecerSupervisor?: string;
  status: StatusProntuario;
  submetidoEm: string;
}

export interface ItemPlanoTratamento {
  id: number;
  prioridade: 'Urgência' | 'Fase 1 - Restauradora' | 'Fase 2 - Periodontal' | 'Fase 3 - Manutenção';
  denteRegiao: string;
  procedimento: string;
  status: 'Concluído' | 'Em Andamento' | 'Planejado';
  estagiarioResponsavel: string;
}

/** Origem dos dados em tela. Permite diferenciar dado real do Postgres de mock. */
export type OrigemDados = 'mock' | 'api' | 'erro';

/** Resumo de uma sincronizacao com o backend. */
export interface SyncStatus {
  estado: 'aguardando-login' | 'sincronizando' | 'sincronizado' | 'parcial' | 'erro';
  origem: OrigemDados;
  /** Mensagens de erro por endpoint que falhou (ex.: 403 em prontuarios para recepcao). */
  falhas: string[];
  ultimoEm: string | null;
}

interface ClinicContextType {
  pacientes: Paciente[];
  agendamentos: Agendamento[];
  demandas: DemandaEstagio[];
  evolucoesPsico: EvolucaoPsico[];
  fichasOdonto: FichaOdonto[];
  planosTratamento: ItemPlanoTratamento[];
  sync: SyncStatus;
  sincronizar: () => Promise<void>;
  cadastrarPaciente: (p: Omit<Paciente, 'id' | 'prontuarioAtivo'>) => Promise<{ success: boolean; message: string; paciente?: Paciente }>;
  adicionarAgendamento: (a: Omit<Agendamento, 'id'>) => Promise<{ success: boolean; message: string; agendamento?: Agendamento }>;
  atualizarStatusAgendamento: (id: number, status: StatusAgendamento) => void;
  adicionarDemanda: (d: Omit<DemandaEstagio, 'id' | 'status' | 'dataSolicitacao'>) => Promise<{ success: boolean; message: string; demanda?: DemandaEstagio }>;
  atualizarStatusDemanda: (id: number, status: DemandaEstagio['status']) => void;
  homologarEvolucaoPsico: (id: number, decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE', parecer: string) => void;
  adicionarEvolucaoPsico: (e: Omit<EvolucaoPsico, 'id' | 'status' | 'submetidoEm'>) => Promise<{ success: boolean; message: string; evolucao?: EvolucaoPsico }>;
  adicionarFichaOdonto: (f: Omit<FichaOdonto, 'id' | 'status' | 'submetidoEm'>) => Promise<{ success: boolean; message: string; ficha?: FichaOdonto }>;
  homologarFichaOdonto: (id: number, decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE', parecer: string) => Promise<{ success: boolean; message: string }>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

const INITIAL_PACIENTES: Paciente[] = [
  {
    id: 1,
    nome: 'Marcos Aurélio Silveira',
    cpf: '048.291.545-88',
    dataNascimento: '1998-08-14',
    telefone: '(79) 99841-2299',
    ehMenor: false,
    curso: 'psicologia',
    prontuarioAtivo: true,
  },
  {
    id: 2,
    nome: 'Carlos Silva e Santos',
    cpf: '123.456.789-00',
    dataNascimento: '1984-05-12',
    telefone: '(79) 98821-3312',
    ehMenor: false,
    curso: 'odontologia',
    prontuarioAtivo: true,
  },
  {
    id: 3,
    nome: 'Juliana Ferreira Oliveira',
    cpf: '789.123.456-11',
    dataNascimento: '2003-11-20',
    telefone: '(79) 99122-4455',
    ehMenor: false,
    curso: 'ambos',
    prontuarioAtivo: true,
  },
  {
    id: 4,
    nome: 'Lucas Gabriel Menezes (Menor)',
    cpf: '882.114.992-30',
    dataNascimento: '2016-04-10',
    telefone: '(79) 98711-0022',
    ehMenor: true,
    nomeResponsavel: 'Mariana Menezes (Mãe)',
    contatoResponsavel: '(79) 98711-0022',
    curso: 'odontologia',
    prontuarioAtivo: true,
  },
];

const INITIAL_AGENDAMENTOS: Agendamento[] = [
  {
    id: 1,
    pacienteId: 1,
    pacienteNome: 'Marcos Aurélio Silveira',
    estagiarioNome: 'Rikelme Roma Santos',
    estagiarioMatricula: '16032935',
    curso: 'psicologia',
    horario: '14:00',
    turno: 'tarde',
    salaOuCadeira: 'Consultório SPA-02',
    tipoConsulta: 'Psicoterapia Cognitivo-Comportamental',
    status: 'PRESENTE',
    observacaoLogistica: 'Aguardando na recepção pontual',
  },
  {
    id: 2,
    pacienteId: 3,
    pacienteNome: 'Juliana Ferreira Oliveira',
    estagiarioNome: 'João Kaio Rodrigues',
    estagiarioMatricula: '16031730',
    curso: 'psicologia',
    horario: '15:00',
    turno: 'tarde',
    salaOuCadeira: 'Consultório SPA-04',
    tipoConsulta: 'Avaliação Psicológica Vocacional',
    status: 'AGENDADO',
    observacaoLogistica: 'Confirmou presença por WhatsApp',
  },
  {
    id: 3,
    pacienteId: 2,
    pacienteNome: 'Carlos Silva e Santos',
    estagiarioNome: 'Augusto Cesar Farias & Gabriela Prado',
    estagiarioMatricula: '16024402',
    curso: 'odontologia',
    horario: '14:00',
    turno: 'tarde',
    salaOuCadeira: 'Cadeira Odonto 04',
    tipoConsulta: 'Restauração Resina Dente 36 (Classe II)',
    status: 'EM_ATENDIMENTO',
    observacaoLogistica: 'Alerta de Alergia a Penicilina conferido',
  },
  {
    id: 4,
    pacienteId: 4,
    pacienteNome: 'Lucas Gabriel Menezes (Menor)',
    estagiarioNome: 'Marlon Bruno dos Santos',
    estagiarioMatricula: '16032601',
    curso: 'odontologia',
    horario: '15:30',
    turno: 'tarde',
    salaOuCadeira: 'Cadeira Odonto 02 (Odontopediatria)',
    tipoConsulta: 'Aplicação de Selante Dente 16',
    status: 'AGENDADO',
    observacaoLogistica: 'Acompanhado pela responsável legal',
  },
  {
    id: 5,
    pacienteId: 1,
    pacienteNome: 'Beatriz Almeida Costa',
    estagiarioNome: 'Rikelme Roma Santos',
    estagiarioMatricula: '16032935',
    curso: 'psicologia',
    horario: '16:00',
    turno: 'tarde',
    salaOuCadeira: 'Consultório SPA-01',
    tipoConsulta: 'Acolhimento Inicial / Triagem',
    status: 'FALTOU',
    observacaoLogistica: 'Paciente justificou ausência por motivo de trabalho',
  },
];

const INITIAL_DEMANDAS: DemandaEstagio[] = [
  {
    id: 1,
    alunoNome: 'Augusto Cesar Farias (Odonto)',
    alunoMatricula: '16024402',
    curso: 'odontologia',
    procedimentoDesejado: '1 paciente para raspagem supra e subgengival (Periodontia)',
    prioridade: 'Alta',
    dataSolicitacao: '15/09/2026',
    status: 'Pendente',
  },
  {
    id: 2,
    alunoNome: 'Rikelme Roma Santos (Psico)',
    alunoMatricula: '16032935',
    curso: 'psicologia',
    procedimentoDesejado: '1 paciente adulto para avaliação TCC (Sessão inicial)',
    prioridade: 'Média',
    dataSolicitacao: '15/09/2026',
    status: 'Pendente',
  },
  {
    id: 3,
    alunoNome: 'Marlon Bruno dos Santos (Odonto)',
    alunoMatricula: '16032601',
    curso: 'odontologia',
    procedimentoDesejado: '1 paciente infantil para profilaxia e aplicação de flúor',
    prioridade: 'Normal',
    dataSolicitacao: '14/09/2026',
    status: 'Agendado',
  },
];

const INITIAL_EVOLUCOES: EvolucaoPsico[] = [
  {
    id: 1,
    pacienteId: 1,
    pacienteNome: 'Marcos Aurélio Silveira',
    estagiarioNome: 'Rikelme Roma Santos',
    estagiarioMatricula: '16032935',
    supervisorNome: 'Prof. Dr. Robert Santos do Carmo',
    dataSessao: '15/09/2026',
    numeroSessao: 'Sessão 04',
    inicioTexto: 'Acolhimento pontual e receptivo. Paciente relata persistência dos gatilhos de sobrecarga com avaliações acadêmicas.',
    meioTexto: 'Aplicação da técnica de questionamento socrático sobre catastrofização. Paciente identificou padrões de autoexigência com flexibilização cognitiva orientada.',
    fimTexto: 'Pactuado automonitoramento diário de pensamentos disfuncionais (RPD). Sem risco autolesivo ou queixas agudas.',
    status: 'AGUARDANDO_VALIDACAO',
    submetidoEm: '15/09/2026 14:52',
  },
  {
    id: 2,
    pacienteId: 3,
    pacienteNome: 'Juliana Ferreira Oliveira',
    estagiarioNome: 'João Kaio Rodrigues',
    estagiarioMatricula: '16031730',
    supervisorNome: 'Prof. Dr. Robert Santos do Carmo',
    dataSessao: '14/09/2026',
    numeroSessao: 'Sessão 02',
    inicioTexto: 'Sessão iniciada no horário. Acolhimento e validação dos sentimentos relativos à escolha profissional.',
    meioTexto: 'Aplicação da primeira bateria do questionário de interesses ocupacionais. Boa compreensão das instruções e colaboração ativa.',
    fimTexto: 'Encerramento com agendamento da aplicação da escala complementar na sessão seguinte.',
    parecerSupervisor: 'Excelente condução técnica e síntese clínica sem transcrições literais. Aprovado com visto digital.',
    status: 'VALIDADO',
    submetidoEm: '14/09/2026 16:30',
  },
];

const INITIAL_PLANOS: ItemPlanoTratamento[] = [
  {
    id: 1,
    prioridade: 'Urgência',
    denteRegiao: 'Dente 36',
    procedimento: 'Restauração profunda em resina composta (Classe II MOD)',
    status: 'Concluído',
    estagiarioResponsavel: 'Lucas Vasconcelos & Gabriela Prado',
  },
  {
    id: 2,
    prioridade: 'Fase 1 - Restauradora',
    denteRegiao: 'Dente 16',
    procedimento: 'Remoção de cárie oclusal e selante invasivo',
    status: 'Em Andamento',
    estagiarioResponsavel: 'Augusto Cesar Farias & Gabriela Prado',
  },
  {
    id: 3,
    prioridade: 'Fase 2 - Periodontal',
    denteRegiao: 'Sextante Ântero-Inferior (33 ao 43)',
    procedimento: 'Raspagem supra e alisamento coronário',
    status: 'Planejado',
    estagiarioResponsavel: 'Augusto Cesar Farias',
  },
  {
    id: 4,
    prioridade: 'Fase 3 - Manutenção',
    denteRegiao: 'Arcada Completa',
    procedimento: 'Profilaxia com pasta profilática e aplicação tópica de flúor',
    status: 'Planejado',
    estagiarioResponsavel: 'Augusto Cesar Farias',
  },
];

const STORAGE_PREFIX = 'unicare_clinic_';

/** Mapeia o wire (snake_case) para o dominio do frontend (camelCase). */
const mapearPaciente = (p: ApiPaciente): Paciente => ({
  id: p.id,
  nome: p.nome,
  cpf: p.cpf_rg,
  dataNascimento: p.data_nascimento,
  telefone: p.telefone,
  ehMenor: p.eh_menor,
  nomeResponsavel: p.nome_responsavel,
  contatoResponsavel: p.contato_responsavel,
  curso: p.curso,
  prontuarioAtivo: p.prontuario_ativo,
});

const mapearAgendamento = (a: ApiAgendamento): Agendamento => ({
  id: a.id,
  pacienteId: a.paciente_id,
  pacienteNome: a.paciente_nome,
  estagiarioNome: a.estagiario_nome,
  estagiarioMatricula: a.estagiario_matricula,
  curso: a.curso,
  horario: a.horario,
  turno: a.turno,
  salaOuCadeira: a.sala_ou_cadeira,
  tipoConsulta: a.tipo_consulta,
  status: a.status,
  observacaoLogistica: a.observacao_logistica,
});

const mapearEvolucao = (pr: ApiProntuarioPsico): EvolucaoPsico => ({
  id: pr.id,
  pacienteId: pr.paciente_id,
  pacienteNome: pr.paciente_nome,
  estagiarioNome: pr.estagiario_nome,
  estagiarioMatricula: pr.estagiario_matricula,
  supervisorNome: pr.supervisor_nome || '',
  dataSessao: pr.data_sessao,
  numeroSessao: pr.numero_sessao,
  inicioTexto: pr.inicio_sessao_texto,
  meioTexto: pr.meio_sessao_texto,
  fimTexto: pr.fim_sessao_texto,
  parecerSupervisor: pr.parecer_supervisor,
  status: pr.status,
  submetidoEm: pr.criado_em ? new Date(pr.criado_em).toLocaleDateString('pt-BR') : 'Hoje',
});

// A ficha odontológica não guarda o nome do paciente: ele vem por FK. O mapper
// recebe o nome resolvido pela listagem de pacientes.
const mapearFichaOdonto = (f: ApiFichaOdonto, nomePorPaciente: Map<number, string>): FichaOdonto => ({
  id: f.id,
  pacienteId: f.paciente_id,
  pacienteNome: nomePorPaciente.get(f.paciente_id) || `Paciente #${f.paciente_id}`,
  duplaEstagiarios: f.dupla_estagiarios,
  denteRegiao: f.dente_regiao,
  procedimentoRealizado: f.procedimento_realizado,
  materiaisUtilizados: f.materiais_utilizados,
  anestesico: f.anestesico,
  alertaAlergia: f.alerta_alergia,
  parecerSupervisor: f.parecer_supervisor,
  status: f.status,
  submetidoEm: f.criado_em ? new Date(f.criado_em).toLocaleDateString('pt-BR') : 'Hoje',
});

const mapearDemanda = (d: ApiDemanda): DemandaEstagio => ({
  id: d.id,
  alunoNome: d.aluno_nome,
  alunoMatricula: d.aluno_matricula,
  curso: d.curso,
  procedimentoDesejado: d.procedimento_desejado,
  prioridade: d.prioridade,
  dataSolicitacao: d.data_solicitacao,
  status: d.status,
});

/** Extrai a mensagem de erro do envelope do FastAPI ({ detail }). */
const mensagemDeErro = (err: unknown, padrao: string): string =>
  err instanceof Error && err.message ? err.message : padrao;

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [pacientes, setPacientes] = useState<Paciente[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + 'pacientes');
      return stored ? JSON.parse(stored) : INITIAL_PACIENTES;
    } catch {
      return INITIAL_PACIENTES;
    }
  });

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + 'agendamentos');
      return stored ? JSON.parse(stored) : INITIAL_AGENDAMENTOS;
    } catch {
      return INITIAL_AGENDAMENTOS;
    }
  });

  const [demandas, setDemandas] = useState<DemandaEstagio[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + 'demandas');
      return stored ? JSON.parse(stored) : INITIAL_DEMANDAS;
    } catch {
      return INITIAL_DEMANDAS;
    }
  });

  const [evolucoesPsico, setEvolucoesPsico] = useState<EvolucaoPsico[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + 'evolucoes');
      return stored ? JSON.parse(stored) : INITIAL_EVOLUCOES;
    } catch {
      return INITIAL_EVOLUCOES;
    }
  });

  // Sem mock: a fila de homologação odontológica nascia vazia e a tela de
  // supervisão ficava sem o que mostrar. Antes de o seed criar fichas, este
  // estado já refletia o banco.
  const [fichasOdonto, setFichasOdonto] = useState<FichaOdonto[]>([]);

  const [planosTratamento] = useState<ItemPlanoTratamento[]>(INITIAL_PLANOS);

  const { user, isAuthenticated } = useAuth();
  const matriculaAutenticada = user?.matricula ?? null;

  const [sync, setSync] = useState<SyncStatus>({
    estado: 'aguardando-login',
    origem: 'mock',
    falhas: [],
    ultimoEm: null,
  });

  /**
   * Sincroniza com o backend FastAPI.
   *
   * Antes este carregamento rodava num useEffect com deps: [], o que disparava no
   * primeiro render — antes de qualquer login. Sem token, as tres chamadas levavam
   * 401, Promise.allSettled absorvia o erro e a tela ficava nos mocks ate um F5.
   * Agora a carga depende da matricula autenticada e re-executa a cada login.
   */
  const sincronizar = useCallback(async () => {
    if (!isAuthenticated || !matriculaAutenticada) {
      setSync({
        estado: 'aguardando-login',
        origem: 'mock',
        falhas: [],
        ultimoEm: null,
      });
      return;
    }

    setSync((prev) => ({ ...prev, estado: 'sincronizando', falhas: [] }));

    // 403 em prontuarios e o comportamento esperado para o perfil de recepcao
    // (RN-001), nao uma falha de infraestrutura. Demais rejeicoes sao registradas.
    const [apiPacientes, apiAgendamentos, apiProntuarios, apiFichasOdonto, apiDemandas] = await Promise.allSettled([
      api.getPacientes(),
      api.getAgendamentos(),
      api.getProntuariosPsico(),
      api.getFichasOdonto(),
      api.getDemandas(),
    ]);

    const falhas: string[] = [];

    if (apiPacientes.status === 'fulfilled') {
      if (apiPacientes.value.length > 0) {
        setPacientes(apiPacientes.value.map(mapearPaciente));
      }
    } else {
      falhas.push(`pacientes: ${apiPacientes.reason?.message ?? 'falhou'}`);
    }

    if (apiAgendamentos.status === 'fulfilled') {
      if (apiAgendamentos.value.length > 0) {
        setAgendamentos(apiAgendamentos.value.map(mapearAgendamento));
      }
    } else {
      falhas.push(`agendamentos: ${apiAgendamentos.reason?.message ?? 'falhou'}`);
    }

    if (apiProntuarios.status === 'fulfilled') {
      if (apiProntuarios.value.length > 0) {
        setEvolucoesPsico(apiProntuarios.value.map(mapearEvolucao));
      }
    } else {
      const msg = apiProntuarios.reason?.message ?? 'falhou';
      // RN-001: recepcao e supervisor sem prontuarios proprios recebem 403. Isso e
      // esperado e nao deve aparecer como falha de sistema.
      const eh403 = msg.includes('403');
      falhas.push(eh403 ? 'prontuários: 403 (perfil sem acesso — RN-001)' : `prontuários: ${msg}`);
    }

    if (apiFichasOdonto.status === 'fulfilled') {
      // Nome do paciente vem por FK: resolvido aqui, uma vez, pelo mapa.
      const nomePorPaciente = new Map<number, string>(
        (apiPacientes.status === 'fulfilled' ? apiPacientes.value : []).map((p) => [p.id, p.nome])
      );
      setFichasOdonto(apiFichasOdonto.value.map((f) => mapearFichaOdonto(f, nomePorPaciente)));
    } else {
      const msg = apiFichasOdonto.reason?.message ?? 'falhou';
      // Mesma regra do prontuário psicológico: recepção é barrada pelo RN-001.
      const eh403 = msg.includes('403');
      falhas.push(eh403 ? 'fichas odonto: 403 (perfil sem acesso — RN-001)' : `fichas odonto: ${msg}`);
    }

    if (apiDemandas.status === 'fulfilled') {
      setDemandas(apiDemandas.value.map(mapearDemanda));
    } else {
      falhas.push(`demandas: ${apiDemandas.reason?.message ?? 'falhou'}`);
    }

    if (falhas.length > 0) {
      console.warn('[UniCare] Sincronização parcial:', falhas);
    }

    const tudoOk = falhas.length === 0;
    setSync({
      estado: tudoOk ? 'sincronizado' : falhas.length < 3 ? 'parcial' : 'erro',
      origem: tudoOk ? 'api' : 'erro',
      falhas,
      ultimoEm: new Date().toISOString(),
    });
  }, [isAuthenticated, matriculaAutenticada]);

  // Sincroniza apos o login e re-sincroniza quando o usuario muda (switchUser).
  useEffect(() => {
    void sincronizar();
  }, [sincronizar]);

  // No logout, descarta os dados do usuario anterior em vez de deixa-los na tela.
  useEffect(() => {
    if (!isAuthenticated) {
      setPacientes([]);
      setAgendamentos([]);
      setEvolucoesPsico([]);
      setDemandas([]);
      localStorage.removeItem(STORAGE_PREFIX + 'pacientes');
      localStorage.removeItem(STORAGE_PREFIX + 'agendamentos');
      localStorage.removeItem(STORAGE_PREFIX + 'evolucoes');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'pacientes', JSON.stringify(pacientes));
  }, [pacientes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'agendamentos', JSON.stringify(agendamentos));
  }, [agendamentos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'demandas', JSON.stringify(demandas));
  }, [demandas]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'evolucoes', JSON.stringify(evolucoesPsico));
  }, [evolucoesPsico]);

  /**
   * Cadastra o paciente AGUARDANDO a resposta do backend.
   *
   * Antes usava um id temporario (Date.now()) e trocava pelo real depois, num
   * .then(). Como agendamentos referenciam paciente_id por uma FK real no
   * PostgreSQL, um agendamento criado nesse intervalo recebia 500 e era engolido
   * por um console.warn — o registro aparecia na tela e nunca chegava ao banco.
   * Aguardar a resposta elimina a janela e garante que o id devolvido seja o real.
   */
  const cadastrarPaciente = async (
    dados: Omit<Paciente, 'id' | 'prontuarioAtivo'>
  ): Promise<{ success: boolean; message: string; paciente?: Paciente }> => {
    // Validação de CPF duplicado (RF-007)
    const limpaCpf = (c: string) => c.replace(/\D/g, '');
    const jaExiste = pacientes.some((p) => limpaCpf(p.cpf) === limpaCpf(dados.cpf));

    if (jaExiste) {
      return { success: false, message: 'Já existe um paciente cadastrado com este número de CPF!' };
    }

    if (dados.ehMenor && (!dados.nomeResponsavel || !dados.contatoResponsavel)) {
      return { success: false, message: 'Para pacientes menores de idade, é obrigatório registrar o Responsável Legal e Contato!' };
    }

    try {
      const created = await api.createPaciente({
        nome: dados.nome,
        cpf_rg: dados.cpf,
        data_nascimento: dados.dataNascimento,
        telefone: dados.telefone,
        eh_menor: dados.ehMenor,
        nome_responsavel: dados.nomeResponsavel,
        contato_responsavel: dados.contatoResponsavel,
        curso: dados.curso,
      });

      const salvo = mapearPaciente(created);
      setPacientes((prev) => [salvo, ...prev]);

      return { success: true, message: 'Paciente cadastrado com sucesso!', paciente: salvo };
    } catch (err) {
      const msg = mensagemDeErro(err, 'Falha ao cadastrar paciente no servidor.');
      console.error('[UniCare] cadastro de paciente falhou:', err);
      return { success: false, message: msg };
    }
  };

  /** Agendamento tambem aguarda o backend: o id so entra na tela quando e real. */
  const adicionarAgendamento = async (
    novo: Omit<Agendamento, 'id'>
  ): Promise<{ success: boolean; message: string; agendamento?: Agendamento }> => {
    try {
      const created = await api.createAgendamento({
        paciente_id: novo.pacienteId,
        paciente_nome: novo.pacienteNome,
        estagiario_nome: novo.estagiarioNome,
        estagiario_matricula: novo.estagiarioMatricula,
        curso: novo.curso,
        horario: novo.horario,
        turno: novo.turno,
        sala_ou_cadeira: novo.salaOuCadeira,
        tipo_consulta: novo.tipoConsulta,
        observacao_logistica: novo.observacaoLogistica,
      });

      const salvo = mapearAgendamento(created);
      setAgendamentos((prev) => [salvo, ...prev]);

      return { success: true, message: 'Agendamento criado com sucesso!', agendamento: salvo };
    } catch (err) {
      const msg = mensagemDeErro(err, 'Falha ao criar agendamento no servidor.');
      console.error('[UniCare] criação de agendamento falhou:', err);
      return { success: false, message: msg };
    }
  };

  /**
   * Atualização otimista com rollback: a interface responde na hora, mas se o
   * backend recusar (id obsoleto → 404, permissão → 403), o estado local volta ao
   * anterior em vez de divergir silenciosamente do banco.
   */
  const atualizarStatusAgendamento = (id: number, status: StatusAgendamento) => {
    const anterior = agendamentos.find((a) => a.id === id)?.status;
    if (!anterior) return;

    setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));

    api.updateAgendamentoStatus(id, status).catch((err) => {
      console.error('[UniCare] atualização de status revertida:', err);
      setAgendamentos((prev) => prev.map((a) => (a.id === id ? { ...a, status: anterior } : a)));
    });
  };

  /**
   * Cria a demanda aguardando o backend. Mesmo padrao da Camada 3: nada entra na
   * tela antes de o banco confirmar, e o id devolvido e sempre o real.
   */
  const adicionarDemanda = async (
    d: Omit<DemandaEstagio, 'id' | 'status' | 'dataSolicitacao'>
  ): Promise<{ success: boolean; message: string; demanda?: DemandaEstagio }> => {
    try {
      const created = await api.createDemanda({
        aluno_nome: d.alunoNome,
        aluno_matricula: d.alunoMatricula,
        curso: d.curso,
        procedimento_desejado: d.procedimentoDesejado,
        prioridade: d.prioridade,
        data_solicitacao: new Date().toLocaleDateString('pt-BR'),
      });

      const salva = mapearDemanda(created);
      setDemandas((prev) => [salva, ...prev]);

      return { success: true, message: 'Demanda registrada com sucesso!', demanda: salva };
    } catch (err) {
      const msg = mensagemDeErro(err, 'Falha ao registrar a demanda no servidor.');
      console.error('[UniCare] criação de demanda falhou:', err);
      return { success: false, message: msg };
    }
  };

  /** Atualização otimista com rollback, no mesmo padrão do status de agendamento. */
  const atualizarStatusDemanda = (id: number, status: DemandaEstagio['status']) => {
    const anterior = demandas.find((d) => d.id === id)?.status;
    if (!anterior) return;

    setDemandas((prev) => prev.map((d) => (d.id === id ? { ...d, status } : d)));

    api.updateDemandaStatus(id, status).catch((err) => {
      console.error('[UniCare] status da demanda revertido:', err);
      setDemandas((prev) => prev.map((d) => (d.id === id ? { ...d, status: anterior } : d)));
    });
  };

  const homologarEvolucaoPsico = (id: number, decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE', parecer: string) => {
    const anterior = evolucoesPsico.find((e) => e.id === id);
    if (!anterior) return;

    setEvolucoesPsico((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: decisao, parecerSupervisor: parecer } : e))
    );

    api.homologarProntuarioPsico(id, decisao, parecer).catch((err) => {
      console.error('[UniCare] homologação revertida:', err);
      setEvolucoesPsico((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: anterior.status, parecerSupervisor: anterior.parecerSupervisor } : e))
      );
    });
  };

  const adicionarEvolucaoPsico = async (
    e: Omit<EvolucaoPsico, 'id' | 'status' | 'submetidoEm'>
  ): Promise<{ success: boolean; message: string; evolucao?: EvolucaoPsico }> => {
    try {
      const created = await api.createProntuarioPsico({
        paciente_id: e.pacienteId,
        paciente_nome: e.pacienteNome,
        estagiario_nome: e.estagiarioNome,
        estagiario_matricula: e.estagiarioMatricula,
        supervisor_nome: e.supervisorNome,
        data_sessao: e.dataSessao,
        numero_sessao: e.numeroSessao,
        inicio_sessao_texto: e.inicioTexto,
        meio_sessao_texto: e.meioTexto,
        fim_sessao_texto: e.fimTexto,
      });

      const salva = mapearEvolucao(created);
      setEvolucoesPsico((prev) => [salva, ...prev]);

      return { success: true, message: 'Síntese submetida com sucesso!', evolucao: salva };
    } catch (err) {
      const msg = mensagemDeErro(err, 'Falha ao submeter a síntese no servidor.');
      console.error('[UniCare] submissão de evolução falhou:', err);
      return { success: false, message: msg };
    }
  };

  const adicionarFichaOdonto = async (
    f: Omit<FichaOdonto, 'id' | 'status' | 'submetidoEm'>
  ): Promise<{ success: boolean; message: string; ficha?: FichaOdonto }> => {
    try {
      const created = await api.createFichaOdonto({
        paciente_id: f.pacienteId,
        dupla_estagiarios: f.duplaEstagiarios,
        dente_regiao: f.denteRegiao,
        procedimento_realizado: f.procedimentoRealizado,
        materiais_utilizados: f.materiaisUtilizados,
        anestesico: f.anestesico,
        alerta_alergia: f.alertaAlergia,
      });

      // Id real do banco, nunca um temporário: a supervisão lista por id.
      const salva = mapearFichaOdonto(created, new Map([[created.paciente_id, f.pacienteNome]]));
      setFichasOdonto((prev) => [salva, ...prev]);

      return { success: true, message: 'Ficha submetida com sucesso!', ficha: salva };
    } catch (err) {
      const msg = mensagemDeErro(err, 'Falha ao submeter a ficha no servidor.');
      console.error('[UniCare] submissão de ficha odonto falhou:', err);
      return { success: false, message: msg };
    }
  };

  const homologarFichaOdonto = async (
    id: number,
    decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE',
    parecer: string
  ): Promise<{ success: boolean; message: string }> => {
    const anterior = fichasOdonto.find((f) => f.id === id);
    if (!anterior) {
      return { success: false, message: 'Ficha não está na fila.' };
    }

    // Otimista: a fila do supervisor atualiza na hora, e volta atrás se o
    // servidor recusar. O usuário vê a falha em vez de um visto que não existe.
    setFichasOdonto((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: decisao, parecerSupervisor: parecer } : f))
    );

    try {
      await api.homologarFichaOdonto(id, decisao, parecer);
      return {
        success: true,
        message: decisao === 'VALIDADO' ? 'Ficha homologada com visto digital.' : 'Ficha devolvida para ajuste.',
      };
    } catch (err) {
      setFichasOdonto((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, status: anterior.status, parecerSupervisor: anterior.parecerSupervisor }
            : f
        )
      );
      const msg = mensagemDeErro(err, 'Falha ao homologar a ficha.');
      console.error('[UniCare] homologação de ficha odonto falhou:', err);
      return { success: false, message: msg };
    }
  };

  return (
    <ClinicContext.Provider
      value={{
        pacientes,
        agendamentos,
        demandas,
        evolucoesPsico,
        fichasOdonto,
        planosTratamento,
        sync,
        sincronizar,
        cadastrarPaciente,
        adicionarAgendamento,
        atualizarStatusAgendamento,
        adicionarDemanda,
        atualizarStatusDemanda,
        homologarEvolucaoPsico,
        adicionarEvolucaoPsico,
        adicionarFichaOdonto,
        homologarFichaOdonto,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export function useClinic() {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinic deve ser utilizado dentro de um ClinicProvider');
  }
  return context;
}
