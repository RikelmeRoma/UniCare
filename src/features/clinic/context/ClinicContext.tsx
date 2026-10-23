import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api, ApiError, type ApiPaciente, type ApiAgendamento, type ApiProntuarioPsico, type ApiFichaOdonto, type ApiAnamnese, type ApiAtribuicao } from '../../../services/api';
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
  /** ISO `YYYY-MM-DD`, ou `undefined` nas sessões anteriores à coluna. */
  dataSessao?: string | null;
  horario: string; // Ex: '14:00'
  turno: 'manha' | 'tarde' | 'noite';
  salaOuCadeira: string; // Ex: 'Sala 03' ou 'Cadeira 04'
  tipoConsulta: string; // Ex: 'Psicoterapia Adulto' ou 'Restauração Resina'
  status: StatusAgendamento;
  observacaoLogistica?: string;
}

export interface Atribuicao {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  curso: string;
  estagiarioNome: string;
  estagiarioMatricula: string;
  situacao: 'ATIVA' | 'SUBSTITUIDA';
  motivo?: string | null;
  atribuidoPorNome: string;
  atribuidoPorMatricula: string;
  dataAtribuicao: string;
  dataEncerramento?: string | null;
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
  redacaoTexto: string;
  parecerSupervisor?: string;
  status: StatusProntuario;
  submetidoEm: string;
}

export interface FichaOdonto {
  id: number;
  pacienteId: number;
  pacienteNome: string;
  duplaEstagiarios: string;
  /** Matrículas da dupla (PDR-05). Nulas nas fichas anteriores à coluna. */
  operadorMatricula?: string | null;
  auxiliarMatricula?: string | null;
  denteRegiao: string;
  procedimentoRealizado: string;
  materiaisUtilizados: string;
  anestesico?: string;
  alertaAlergia?: string;
  /** Carimbo de quem homologou, vindo do servidor. */
  supervisorNome?: string | null;
  parecerSupervisor?: string;
  status: StatusProntuario;
  submetidoEm: string;
}

/** Dados aceitos na criação da ficha: a dupla vai por matrícula, não por nome
 *  digitado — o servidor resolve os cadastros e monta o texto da dupla. */
export interface NovaFichaOdonto {
  pacienteId: number;
  pacienteNome: string;
  operadorMatricula: string;
  auxiliarMatricula: string;
  denteRegiao: string;
  procedimentoRealizado: string;
  materiaisUtilizados: string;
  anestesico?: string;
  alertaAlergia?: string;
}

export interface Anamnese {
  id: number;
  pacienteId: number;
  afetidoEm: string;
  pressaoArterial?: string;
  glicemiaCapilar?: number;
  frequenciaCardiaca?: number;
  temperatura?: number;
  alergias?: string;
  condicoesCronicas?: string;
  medicacoesEmUso?: string;
  responsavelNome: string;
  responsavelMatricula: string;
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
  /** Pacientes com o estagiário autenticado como responsável (RF-001).
   *  O estagiário recebe só os próprios, de `/minha`. Recepção, RT e supervisor
   *  recebem a clínica inteira (`/psico`, ativas e encerradas), porque a mesma
   *  tela monta o painel de atribuição. A distinção é por perfil — trocar a
   *  chamada para todo mundo faria o seletor de pacientes do prontuário do
   *  aluno mostrar a clínica inteira. */
  atribuicoes: Atribuicao[];
  atribuirPaciente: (dados: { pacienteId: number; estagiarioNome: string; estagiarioMatricula: string }) => Promise<{ success: boolean; message: string }>;
  transferirPaciente: (dados: { id: number; estagiarioNome: string; estagiarioMatricula: string; motivo: string }) => Promise<{ success: boolean; message: string }>;
  recarregarAtribuicoes: () => Promise<void>;
  evolucoesPsico: EvolucaoPsico[];
  fichasOdonto: FichaOdonto[];
  /** Anamneses por id de paciente. Carregadas sob demanda pela ficha. */
  anamnesesPorPaciente: Record<number, Anamnese[]>;
  registrarAnamnese: (
    pacienteId: number,
    dados: Omit<Anamnese, 'id' | 'pacienteId' | 'afetidoEm' | 'responsavelNome' | 'responsavelMatricula'>
  ) => Promise<{ success: boolean; message: string; anamnese?: Anamnese }>;
  carregarAnamneses: (pacienteId: number) => Promise<void>;
  planosTratamento: ItemPlanoTratamento[];
  sync: SyncStatus;
  sincronizar: () => Promise<void>;
  cadastrarPaciente: (p: Omit<Paciente, 'id' | 'prontuarioAtivo'>) => Promise<{ success: boolean; message: string; paciente?: Paciente }>;
  /** `dataSessao` é obrigatória na criação (`data_sessao ?? ''` viraria 422
   *  em runtime). No `Agendamento` ela é opcional porque as sessões anteriores
   *  à coluna existem sem dia. */
  adicionarAgendamento: (a: Omit<Agendamento, 'id' | 'dataSessao'> & { dataSessao: string }) => Promise<{ success: boolean; message: string; agendamento?: Agendamento }>;
  atualizarStatusAgendamento: (id: number, status: StatusAgendamento) => void;
  homologarEvolucaoPsico: (id: number, decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE', parecer: string) => Promise<{ success: boolean; message: string }>;
  adicionarEvolucaoPsico: (e: Omit<EvolucaoPsico, 'id' | 'status' | 'submetidoEm'>) => Promise<{ success: boolean; message: string; evolucao?: EvolucaoPsico }>;
  adicionarFichaOdonto: (f: NovaFichaOdonto) => Promise<{ success: boolean; message: string; ficha?: FichaOdonto }>;
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
    estagiarioNome: 'Rikelme Roma Santos',
    estagiarioMatricula: '16032935',
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
    redacaoTexto: 'Acolhimento pontual e receptivo. Paciente relata persistência dos gatilhos de sobrecarga com avaliações acadêmicas. Aplicação da técnica de questionamento socrático sobre catastrofização. Paciente identificou padrões de autoexigência com flexibilização cognitiva orientada. Pactuado automonitoramento diário de pensamentos disfuncionais (RPD). Sem risco autolesivo ou queixas agudas.',
    status: 'AGUARDANDO_VALIDACAO',
    submetidoEm: '15/09/2026 14:52',
  },
  {
    id: 2,
    pacienteId: 3,
    pacienteNome: 'Juliana Ferreira Oliveira',
    estagiarioNome: 'Rikelme Roma Santos',
    estagiarioMatricula: '16032935',
    supervisorNome: 'Prof. Dr. Robert Santos do Carmo',
    dataSessao: '14/09/2026',
    numeroSessao: 'Sessão 02',
    redacaoTexto: 'Sessão iniciada no horário. Acolhimento e validação dos sentimentos relativos à escolha profissional. Aplicação da primeira bateria do questionário de interesses ocupacionais. Boa compreensão das instruções e colaboração ativa. Encerramento com agendamento da aplicação da escala complementar na sessão seguinte.',
    parecerSupervisor: 'Excelente condução técnica e síntese clínica sem transcrições literais. Aprovado com visto digital.',
    status: 'VALIDADO',
    submetidoEm: '14/09/2026 16:30',
  },
];

// O plano de tratamento não é uma entidade no banco: é derivado das fichas
// odontológicas, que já carregam dente, procedimento, dupla e status. Antes
// eram quatro planos fictícios em código, contados como "Procedimentos
// Registrados" no painel da RT.
// A anamnese é dado clínico por paciente: o histórico vem sob demanda, do id
// do paciente, e não na carga global — a recepção toma 403 nela (RN-001).
const mapearAnamnese = (a: ApiAnamnese): Anamnese => ({
  id: a.id,
  pacienteId: a.paciente_id,
  afetidoEm: a.afetido_em,
  pressaoArterial: a.pressao_arterial,
  glicemiaCapilar: a.glicemia_capilar,
  frequenciaCardiaca: a.frequencia_cardiaca,
  temperatura: a.temperatura,
  alergias: a.alergias,
  condicoesCronicas: a.condicoes_cronicas,
  medicacoesEmUso: a.medicacoes_em_uso,
  responsavelNome: a.responsavel_nome,
  responsavelMatricula: a.responsavel_matricula,
});

const planosDasFichas = (fichas: FichaOdonto[]): ItemPlanoTratamento[] =>
  fichas.map((f) => ({
    id: f.id,
    // `prioridade` é a fase de planejamento e `status` é o estado do fluxo:
    // são eixos diferentes, então o status do banco alimenta os dois campos.
    prioridade:
      f.status === 'VALIDADO'
        ? 'Fase 3 - Manutenção'
        : f.status === 'DEVOLVIDO_PARA_AJUSTE'
          ? 'Fase 1 - Restauradora'
          : 'Fase 2 - Periodontal',
    denteRegiao: f.denteRegiao,
    procedimento: f.procedimentoRealizado,
    status:
      f.status === 'VALIDADO'
        ? 'Concluído'
        : f.status === 'DEVOLVIDO_PARA_AJUSTE'
          ? 'Em Andamento'
          : 'Planejado',
    estagiarioResponsavel: f.duplaEstagiarios,
  }));

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
  dataSessao: a.data_sessao,
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
      redacaoTexto: pr.redacao_texto,
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
  operadorMatricula: f.operador_matricula,
  auxiliarMatricula: f.auxiliar_matricula,
  denteRegiao: f.dente_regiao,
  procedimentoRealizado: f.procedimento_realizado,
  materiaisUtilizados: f.materiais_utilizados,
  anestesico: f.anestesico,
  alertaAlergia: f.alerta_alergia,
  supervisorNome: f.supervisor_nome,
  parecerSupervisor: f.parecer_supervisor,
  status: f.status,
  submetidoEm: f.criado_em ? new Date(f.criado_em).toLocaleDateString('pt-BR') : 'Hoje',
});


const mapearAtribuicao = (a: ApiAtribuicao): Atribuicao => ({
  id: a.id,
  pacienteId: a.paciente_id,
  pacienteNome: a.paciente_nome,
  curso: a.curso,
  estagiarioNome: a.estagiario_nome,
  estagiarioMatricula: a.estagiario_matricula,
  situacao: a.situacao,
  motivo: a.motivo ?? null,
  atribuidoPorNome: a.atribuido_por_nome,
  atribuidoPorMatricula: a.atribuido_por_matricula,
  dataAtribuicao: a.data_atribuicao,
  dataEncerramento: a.data_encerramento ?? null,
});

/** Extrai a mensagem de erro do envelope do FastAPI ({ detail }). */
const mensagemDeErro = (err: unknown, padrao: string): string =>
  err instanceof Error && err.message ? err.message : padrao;

/**
 * O 403 que a RN-001 produz para a recepção é a regra funcionando, não uma
 * falha de sincronização.
 *
 * Três condições, todas necessárias:
 *
 * - **status 403**, lido do `ApiError` (que carrega o status do servidor). O
 *   `detail` do servidor — "Acesso negado: Perfil 'recepcao' não tem
 *   permissão para este recurso (RN-001)" — não contém "403" em lugar
 *   nenhum, então procurar "403" na mensagem nunca acertava;
 * - **a mensagem cita RN-001**: um 403 por outro motivo (clínica errada, por
 *   exemplo) não cita a regra e precisa aparecer na tela. A citação é lida do
 *   `detalhe` cru, porque a mensagem que a tela vê já vem sem identificador;
 * - **o perfil é o de recepção**: é a recepção que, por desenho, não tem
 *   acesso a dado clínico.
 */
const e403Esperado = (motivo: unknown, perfil?: string): boolean => {
  if (!(motivo instanceof ApiError)) return false;
  return motivo.status === 403 && motivo.detalhe.includes('RN-001') && perfil === 'recepcao';
};

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


  // Vinculo paciente-estagiario (RF-001). Nao vem do mock nem do
  // localStorage: lista vazia ate a API responder, porque mostrar um
  // paciente aqui significaria atribuir responsabilidade a alguem
  // antes de o servidor dizer quem e.
  const [atribuicoes, setAtribuicoes] = useState<Atribuicao[]>([]);

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

  // Derivado das fichas reais, sem mock.
const planosTratamento = useMemo(() => planosDasFichas(fichasOdonto), [fichasOdonto]);

const [anamnesesPorPaciente, setAnamnesesPorPaciente] = useState<Record<number, Anamnese[]>>({});

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
      const [apiPacientes, apiAgendamentos, apiProntuarios, apiFichasOdonto, apiVinculos] = await Promise.allSettled([
      api.getPacientes(),
      api.getAgendamentos(),
      api.getProntuariosPsico(),
      api.getFichasOdonto(),
      // `/minha` é a rota do próprio aluno; os demais perfis montam o painel de
      // atribuição e precisam da clínica inteira. Chamar `/minha` para todo
      // mundo devolvia `[]` para recepção e RT — 200 com lista vazia, sem
      // indicação de erro, e o painel dizia que ninguém tinha responsável.
      // A distinção precisa ser por perfil, e não "chamar a da clínica para
      // todos": o prontuário do aluno filtra a lista de pacientes por aqui, e
      // com a clínica inteira o seletor passaria a mostrar todo mundo.
      user?.perfil === 'estagiario'
        ? api.getMinhasAtribuicoesPsico()
        : api.getAtribuicoesPsico(),
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
      //
      // A classificacao usa o STATUS HTTP, nao o texto: o `detail` do servidor
      // ("Acesso negado: Perfil 'recepcao' nao tem permissao para este recurso
      // (RN-001)") nao contem "403", entao procurar "403" na mensagem nunca
      // acertava e o 403 esperado acabava despejado cru na tela da recepcao.
      // A regra funcionando: a recepcao nao acessa dado clinico, por desenho.
      // Nao e falha de sincronizacao e nao deve virar aviso na tela.
      if (!e403Esperado(apiProntuarios.reason, user?.perfil)) {
        falhas.push(msg.includes('403') ? 'prontuários: 403 (perfil sem acesso)' : `prontuários: ${msg}`);
      }
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
      // Bloqueio por desenho, não falha de sincronização.
      if (!e403Esperado(apiFichasOdonto.reason, user?.perfil)) {
        falhas.push(msg.includes('403') ? 'fichas odonto: 403 (perfil sem acesso)' : `fichas odonto: ${msg}`);
      }
    }


    if (apiVinculos.status === 'fulfilled') {
      setAtribuicoes(apiVinculos.value.map(mapearAtribuicao));
    } else {
      falhas.push(`vinculo de pacientes: ${apiVinculos.reason?.message ?? 'falhou'}`);
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
  // `user?.perfil` entra porque a escolha entre `/minha` e a rota da clínica
  // depende dele. Sem esta dependência, um logout que troque o perfil mantendo a
  // matrícula não recarregaria os vínculos da clínica certa.
  }, [isAuthenticated, matriculaAutenticada, user?.perfil]);

  // Sincroniza quando a matrícula autenticada muda (login e logout). Não cita
  // mais switchUser: o atalho de troca de usuário foi removido com o caminho
  // da senha fixa.
  useEffect(() => {
    void sincronizar();
  }, [sincronizar]);

// No logout, descarta os dados do usuario anterior em vez de deixa-los na tela.
  // Antes limpava só pacientes, agendamentos, evoluções e demandas. Faltavam as
  // fichas odontológicas e as anamneses: nenhuma das duas vai para o
  // localStorage, então o vazamento era só em memória — mas quem logasse em
  // seguida na mesma sessão via ficha e anamnese de outra pessoa até a
  // sincronização terminar.
  useEffect(() => {
    if (!isAuthenticated) {
      setPacientes([]);
      setAgendamentos([]);
      setEvolucoesPsico([]);
      // `planosTratamento` é derivado de `fichasOdonto` por useMemo, então
      // limpar as fichas limpa os planos junto.
      setFichasOdonto([]);
      setAnamnesesPorPaciente({});
      localStorage.removeItem(STORAGE_PREFIX + 'pacientes');
      localStorage.removeItem(STORAGE_PREFIX + 'agendamentos');
      localStorage.removeItem(STORAGE_PREFIX + 'evolucoes');
      // Chave da fila de demandas, removida com a feature. O dado saiu do app
      // mas continua gravado no navegador de quem já usou, e ninguém mais vai
      // limpar: apagar na saída do login é o que fecha essa conta.
      localStorage.removeItem(STORAGE_PREFIX + 'demandas');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'pacientes', JSON.stringify(pacientes));
  }, [pacientes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_PREFIX + 'agendamentos', JSON.stringify(agendamentos));
  }, [agendamentos]);


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
    novo: Omit<Agendamento, 'id' | 'dataSessao'> & { dataSessao: string }
  ): Promise<{ success: boolean; message: string; agendamento?: Agendamento }> => {
    try {
      const created = await api.createAgendamento({
        paciente_id: novo.pacienteId,
        paciente_nome: novo.pacienteNome,
        estagiario_nome: novo.estagiarioNome,
        estagiario_matricula: novo.estagiarioMatricula,
        curso: novo.curso,
        data_sessao: novo.dataSessao,
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

  const homologarEvolucaoPsico = async (
    id: number,
    decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE',
    parecer: string
  ): Promise<{ success: boolean; message: string }> => {
    const anterior = evolucoesPsico.find((e) => e.id === id);
    if (!anterior) {
      return { success: false, message: 'A evolução não está na fila.' };
    }

    // Otimista: a fila do supervisor atualiza na hora e volta atrás se o servidor
    // recusar. Retorna o resultado porque a tela precisa saber — antes ela
    // anunciava "APROVADA com Visto Eletrônico" sem esperar resposta, e uma
    // recusação sumia num console.error.
    setEvolucoesPsico((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: decisao, parecerSupervisor: parecer } : e))
    );

    try {
      await api.homologarProntuarioPsico(id, decisao, parecer);
      return {
        success: true,
        message:
          decisao === 'VALIDADO'
            ? 'Evolução homologada com visto digital.'
            : 'Evolução devolvida para ajuste.',
      };
    } catch (err) {
      setEvolucoesPsico((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: anterior.status, parecerSupervisor: anterior.parecerSupervisor } : e))
      );
      const msg = mensagemDeErro(err, 'Falha ao homologar a evolução.');
      console.error('[UniCare] homologação revertida:', err);
      return { success: false, message: msg };
    }
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
        redacao_texto: e.redacaoTexto,
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

  const carregarAnamneses = useCallback(async (pacienteId: number) => {
    try {
      const lista = await api.getAnamneses(pacienteId);
      setAnamnesesPorPaciente((prev) => ({ ...prev, [pacienteId]: lista.map(mapearAnamnese) }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // 403 é o esperado para quem não é clínico (recepção, RN-001): a ficha fica
      // sem anamnese em vez de virar erro de sistema.
      if (!msg.includes('403')) {
        console.error('[UniCare] falha ao carregar anamnese:', err);
      }
    }
  }, []);

  const registrarAnamnese = async (
    pacienteId: number,
    dados: Omit<Anamnese, 'id' | 'pacienteId' | 'afetidoEm' | 'responsavelNome' | 'responsavelMatricula'>
  ): Promise<{ success: boolean; message: string; anamnese?: Anamnese }> => {
    try {
      const criada = await api.criarAnamnese(pacienteId, {
        pressao_arterial: dados.pressaoArterial,
        glicemia_capilar: dados.glicemiaCapilar,
        frequencia_cardiaca: dados.frequenciaCardiaca,
        temperatura: dados.temperatura,
        alergias: dados.alergias,
        condicoes_cronicas: dados.condicoesCronicas,
        medicacoes_em_uso: dados.medicacoesEmUso,
      });

      const salva = mapearAnamnese(criada);
      // Mais recente primeiro, como o backend devolve.
      setAnamnesesPorPaciente((prev) => ({
        ...prev,
        [pacienteId]: [salva, ...(prev[pacienteId] ?? [])],
      }));

      return { success: true, message: 'Aferição registrada na ficha do paciente.', anamnese: salva };
    } catch (err) {
      const msg = mensagemDeErro(err, 'Falha ao registrar a aferição.');
      console.error('[UniCare] registro de anamnese falhou:', err);
      return { success: false, message: msg };
    }
  };

  const adicionarFichaOdonto = async (
    f: NovaFichaOdonto
  ): Promise<{ success: boolean; message: string; ficha?: FichaOdonto }> => {
    try {
      const created = await api.createFichaOdonto({
        paciente_id: f.pacienteId,
        operador_matricula: f.operadorMatricula,
        auxiliar_matricula: f.auxiliarMatricula,
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

  // --- Vinculo paciente-estagiario (RF-001) ---
  //
  // Falha de escrita nao volta com estado otimista: o vinculo so entra na tela
  // depois da confirmacao do servidor. Anunciar "atribuido" para um POST que o
  // servidor recusou deixaria a recepcao achando que o paciente tem responsavel
  // quando ninguem tem.

  const recarregarAtribuicoes = async () => {
    try {
      // Mesma escolha de rota de `sincronizar`: o aluno lê os próprios
      // vínculos, os demais perfis leem a clínica. Agendar uma sessão cria ou
      // troca o vínculo no servidor, então é este recarregamento que faz o
      // painel da recepção refletir o que acabou de ser agendado.
      const lista =
        user?.perfil === 'estagiario'
          ? await api.getMinhasAtribuicoesPsico()
          : await api.getAtribuicoesPsico();
      setAtribuicoes(lista.map(mapearAtribuicao));
    } catch (err) {
      console.error('[UniCare] vinculos de paciente nao carregaram:', err);
    }
  };

  const atribuirPaciente = async (dados: {
    pacienteId: number;
    estagiarioNome: string;
    estagiarioMatricula: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const criada = await api.atribuirPaciente({
        paciente_id: dados.pacienteId,
        estagiario_nome: dados.estagiarioNome,
        estagiario_matricula: dados.estagiarioMatricula,
      });
      // A tela da recepcao mostra a clinica inteira, entao ovinculo criado
      // entra na lista local sem esperar a proxima sincronizacao.
      setAtribuicoes((prev) => [mapearAtribuicao(criada), ...prev]);
      return {
        success: true,
        message: `${criada.paciente_nome} sob responsabilidade de ${criada.estagiario_nome}.`,
      };
    } catch (err) {
      const msg = mensagemDeErro(err, 'Falha ao atribuir o paciente.');
      console.error('[UniCare] atribuicao de paciente falhou:', err);
      return { success: false, message: msg };
    }
  };

  const transferirPaciente = async (dados: {
    id: number;
    estagiarioNome: string;
    estagiarioMatricula: string;
    motivo: string;
  }): Promise<{ success: boolean; message: string }> => {
    // Guardado para desfazer: a tela otimista troca o responsavel na hora, e
    // se o PATCH for recusado o vinculo antigo precisa voltar.
    const anterior = atribuicoes.find((a) => a.id === dados.id);
    if (anterior) {
      setAtribuicoes((prev) =>
        prev.map((a) => (a.id === dados.id ? { ...a, situacao: 'SUBSTITUIDA' } : a))
      );
    }

    try {
      const nova = await api.transferirPaciente(dados.id, {
        estagiario_nome: dados.estagiarioNome,
        estagiario_matricula: dados.estagiarioMatricula,
        motivo: dados.motivo,
      });
      setAtribuicoes((prev) => {
        const semAntiga = prev.filter((a) => a.id !== nova.id && a.id !== dados.id);
        return [mapearAtribuicao(nova), ...semAntiga];
      });
      return {
        success: true,
        message: `Transferido para ${nova.estagiario_nome}. O motivo ficou no historico.`,
      };
    } catch (err) {
      if (anterior) {
        setAtribuicoes((prev) => prev.map((a) => (a.id === dados.id ? anterior : a)));
      }
      const msg = mensagemDeErro(err, 'Falha ao transferir o paciente.');
      console.error('[UniCare] transferencia de paciente falhou:', err);
      return { success: false, message: msg };
    }
  };


  return (
    <ClinicContext.Provider
      value={{
        pacientes,
        agendamentos,
        atribuicoes,
        evolucoesPsico,
        fichasOdonto,
        anamnesesPorPaciente,
        registrarAnamnese,
        carregarAnamneses,
        planosTratamento,
        sync,
        sincronizar,
        cadastrarPaciente,
        adicionarAgendamento,
        atualizarStatusAgendamento,
        homologarEvolucaoPsico,
        adicionarEvolucaoPsico,
        adicionarFichaOdonto,
        homologarFichaOdonto,
        atribuirPaciente,
        transferirPaciente,
        recarregarAtribuicoes,
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
