export type SimNao = 'sim' | 'nao';

export type Etnia = 'leucoderma' | 'melanoderma' | 'xantoderma';
export type Genero = 'masculino' | 'feminino';
export type EstadoCivil = 'casado' | 'solteiro' | 'outros';
export type FrequenciaHigiene = 'uma' | 'duas' | 'tres' | 'mais';

export type Linfonodo = 'normal' | 'inflamatorio' | 'neoplasico';

export type CorGengiva =
  | 'rosea'
  | 'opaca'
  | 'avermelhada'
  | 'arroxeada'
  | 'brilhante';

export type TexturaGengiva = 'pontilhada' | 'lisa' | 'ulcerada';
export type FormaGengiva = 'regular' | 'irregular';

export interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
}

export interface Identificacao {
  nome: string;
  rg: string;
  dataNascimento: string;
  idade: string;
  etnia: Etnia | '';
  genero: Genero | '';
  estadoCivil: EstadoCivil | '';
  naturalidade: string;
  endereco: string;
  cep: string;
  uf: string;
  telefone: string;
  celular: string;
  trabalho: string;
}

export interface HistoriaMedica {
  tratamentoAtual: SimNao | '';
  tratamentoQual: string;
  medicoServico: string;
  medicoFone: string;
  medicamentos: string;
  cardiovascular: string[];
  respiratorio: string[];
  geniturinario: string[];
  gastrintestinal: string[];
  nervosoMuscular: string[];
  endocrino: string[];
  antecedentesFamiliais: string[];
}

export interface HistoriaOdontologica {
  historiaDoenca: string;
  dificuldadeMastigacao: SimNao | '';
  denteSensivel: SimNao | '';
  gengivaSangra: SimNao | '';
  dificuldadeAbrirBoca: SimNao | '';
  feridasBoca: SimNao | '';
  rangeDentes: SimNao | '';
  estalos: SimNao | '';
  ultimaVisita: string;
}

export interface Habitos {
  higieneFrequencia: FrequenciaHigiene | '';
  higieneRecursos: string[];
  alimentacao: string[];
  tabagismo: SimNao | '';
  tabagismoFrequencia: string;
  etilismo: SimNao | '';
  etilismoFrequencia: string;
  outrosHabitos: string;
}

export interface Declaracao {
  nome: string;
  cpf: string;
  rg: string;
  local: string;
  dia: string;
  mes: string;
  ano: string;
  assinaturaPaciente: string;
}

export interface Afericao {
  sistolica: string;
  diastolica: string;
  fc: string;
  fr: string;
  temperatura: string;
  dia: string;
}

export interface Estomatograma {
  regioes: number[];
  alteracao: string;
  descricao: string;
}

export interface Periodonto {
  cor: CorGengiva | '';
  textura: TexturaGengiva | '';
  forma: FormaGengiva | '';
  observacoes: string;
}

export interface ExameFisico {
  afericoes: Afericao[];
  assimetrias: SimNao | '';
  linfonodos: Linfonodo | '';
  estomatograma: Estomatograma;
  periodonto: Periodonto;
}

export interface ExamesComplementares {
  radiografico: string[];
  radiograficoOutros: string;
  hematologico: string;
  outros: string;
}

export interface EvolucaoLinha {
  data: string;
  intervencao: string;
  assinaturaDocente: string;
}

export interface TermoAssinaturas {
  paciente: string;
  discente: string;
  professor: string;
}

export interface ExameDental {
  exames: ExamesComplementares;
  planejamento: string[];
  termo: TermoAssinaturas;
  evolucao: EvolucaoLinha[];
}

export interface AnamneseCliFor45 {
  versao: 2;
  atualizadoEm: string;
  identificacao: Identificacao;
  historiaMedica: HistoriaMedica;
  historiaOdontologica: HistoriaOdontologica;
  habitos: Habitos;
  declaracao: Declaracao;
  exameFisico: ExameFisico;
  exameDental: ExameDental;
}

export const OPCOES_SIM_NAO: Opcao<SimNao>[] = [
  { valor: 'sim', rotulo: 'Sim' },
  { valor: 'nao', rotulo: 'Não' },
];

export const OPCOES_ETNIA: Opcao<Etnia>[] = [
  { valor: 'leucoderma', rotulo: 'Leucoderma' },
  { valor: 'melanoderma', rotulo: 'Melanoderma' },
  { valor: 'xantoderma', rotulo: 'Xantoderma' },
];

export const OPCOES_GENERO: Opcao<Genero>[] = [
  { valor: 'masculino', rotulo: 'masculino' },
  { valor: 'feminino', rotulo: 'feminino' },
];

export const OPCOES_ESTADO_CIVIL: Opcao<EstadoCivil>[] = [
  { valor: 'casado', rotulo: 'Casado' },
  { valor: 'solteiro', rotulo: 'Solteiro' },
  { valor: 'outros', rotulo: 'Outros' },
];

export const OPCOES_FREQUENCIA_HIGIENE: Opcao<FrequenciaHigiene>[] = [
  { valor: 'uma', rotulo: 'Uma' },
  { valor: 'duas', rotulo: 'Duas' },
  { valor: 'tres', rotulo: 'Três' },
  { valor: 'mais', rotulo: 'Mais vezes ao dia' },
];

export const OPCOES_LINFONODO: Opcao<Linfonodo>[] = [
  { valor: 'normal', rotulo: 'Normal' },
  {
    valor: 'inflamatorio',
    rotulo: 'Características inflamatórias (doloroso, móvel, liso)',
  },
  {
    valor: 'neoplasico',
    rotulo: 'Características Neoplásicas (ausência de dor, fixo, irregular)',
  },
];

export const OPCOES_COR_GENGIVA: Opcao<CorGengiva>[] = [
  { valor: 'rosea', rotulo: 'Rósea' },
  { valor: 'opaca', rotulo: 'Opaca' },
  { valor: 'avermelhada', rotulo: 'Avermelhada' },
  { valor: 'arroxeada', rotulo: 'Arroxeada' },
  { valor: 'brilhante', rotulo: 'Brilhante' },
];

export const OPCOES_TEXTURA_GENGIVA: Opcao<TexturaGengiva>[] = [
  { valor: 'pontilhada', rotulo: 'Pontilhada' },
  { valor: 'lisa', rotulo: 'Lisa' },
  { valor: 'ulcerada', rotulo: 'Ulcerada' },
];

export const OPCOES_FORMA_GENGIVA: Opcao<FormaGengiva>[] = [
  { valor: 'regular', rotulo: 'Contorno regular' },
  { valor: 'irregular', rotulo: 'Contorno irregular' },
];

export const SISTEMA_CARDIOVASCULAR = [
  'Doença do coração',
  'Hipertensão',
  'Angina',
  'Cirurgia cardíaca',
  'Febre reumática',
  'Hemorragia',
  'Anemia',
];

export const SISTEMA_RESPIRATORIO = ['Asma', 'Bronquite', 'Tuberculose'];

export const SISTEMA_GENITURINARIO = [
  'problema renal',
  'Sífilis',
  'Herpes',
  'HPV',
  'HIV',
  'Gravidez',
  'Menopausa',
];

export const SISTEMA_GASTRINTESTINAL = ['Hepatite', 'Gastrite', 'Úlcera', 'Refluxo'];

export const SISTEMA_NERVOSO_MUSCULAR = [
  'Visão',
  'Audição',
  'AVC',
  'Parkinson',
  'Epilepsia',
  'Problema psiquiátrico',
];

export const SISTEMA_ENDOCRINO = [
  'Diabetes',
  'Hiper/hipotireoidismo',
  'Doença de pele',
];

export const ANTECEDENTES_FAMILIAIS = [
  'Diabetes',
  'Doenças Cardiovasculares',
  'Câncer',
  'Alergias',
];

export const RECURSOS_HIGIENE = [
  'Escova',
  'Fio dental',
  'Creme dental',
  'Colutório (enxaguante bucal)',
];

export const ALIMENTACAO = ['Açúcar', 'Gordura', 'Carboidrato', 'Vegetais'];

export const REGIOES_ESTOMATOGRAMA: { numero: number; rotulo: string }[] = [
  { numero: 1, rotulo: 'Lábios' },
  { numero: 2, rotulo: 'Mucosa Labial' },
  { numero: 3, rotulo: 'Mucosa Jugal' },
  { numero: 4, rotulo: 'Língua' },
  { numero: 5, rotulo: 'Assoalho da boca' },
  { numero: 6, rotulo: 'Palato' },
  { numero: 7, rotulo: 'Orofaringe' },
  { numero: 8, rotulo: 'Glândulas Salivares' },
];

export const RADIOGRAFICOS = ['Periapical', 'Interproximal', 'Panorâmica'];
