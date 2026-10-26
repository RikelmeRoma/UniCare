import type { Opcao } from '../anamnese/tipos';
import type {
  AmigdalasInfantil,
  AngleInfantil,
  Aprendizado,
  AtmInfantil,
  BaumeInfantil,
  CondicaoOdontogramaInfantil,
  CurvaSpeeInfantil,
  DenticaoInfantil,
  DivisaoAngleInfantil,
  EspacoPrimataInfantil,
  FalaInfantil,
  LinhaMedianaInfantil,
  PalatoDuroInfantil,
  PlanoSagitalInfantil,
  ReacaoContrariado,
  RelacaoCaninaInfantil,
  RespiracaoInfantil,
  SexoInfantil,
  TipoParto,
} from './tipos';

export const OPCOES_SEXO_INFANTIL: Opcao<SexoInfantil>[] = [
  { valor: 'feminino', rotulo: 'F' },
  { valor: 'masculino', rotulo: 'M' },
];

export const OPCOES_REACAO_CONTRARIADO: Opcao<ReacaoContrariado>[] = [
  { valor: 'birra', rotulo: 'Birra' },
  { valor: 'choro', rotulo: 'Choro' },
];

export const OPCOES_APRENDIZADO: Opcao<Aprendizado>[] = [
  { valor: 'lento', rotulo: 'Lento' },
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'adiantado', rotulo: 'Adiantado' },
];

export const OPCOES_TIPO_PARTO: Opcao<TipoParto>[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'cesariana', rotulo: 'Cesárea' },
  { valor: 'forceps', rotulo: 'Fórceps' },
  { valor: 'outro', rotulo: 'Outro' },
];

export const OPCOES_ATM: Opcao<AtmInfantil>[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'dor', rotulo: 'Dor à palpação' },
  { valor: 'crepitacao', rotulo: 'Crepitação' },
  { valor: 'estalido', rotulo: 'Estalido' },
];

export const OPCOES_RESPIRACAO: Opcao<RespiracaoInfantil>[] = [
  { valor: 'nasal', rotulo: 'Nasal' },
  { valor: 'bucal', rotulo: 'Bucal' },
  { valor: 'mista', rotulo: 'Mista' },
];

export const OPCOES_FALA: Opcao<FalaInfantil>[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'alterada', rotulo: 'Alterada' },
];

export const OPCOES_PALATO_DURO: Opcao<PalatoDuroInfantil>[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'atresico', rotulo: 'Atrésico' },
];

export const OPCOES_AMIGDALAS: Opcao<AmigdalasInfantil>[] = [
  { valor: 'normais', rotulo: 'Normais' },
  { valor: 'anormais', rotulo: 'Anormais' },
  { valor: 'operadas', rotulo: 'Operadas' },
];

export const OPCOES_DENTICAO: Opcao<DenticaoInfantil>[] = [
  { valor: 'decidua', rotulo: 'Decídua' },
  { valor: 'mista', rotulo: 'Mista' },
  { valor: 'permanente', rotulo: 'Permanente' },
];

export const OPCOES_BAUME: Opcao<BaumeInfantil>[] = [
  { valor: 'tipo1', rotulo: 'Tipo I' },
  { valor: 'tipo2', rotulo: 'Tipo II' },
];

export const OPCOES_ESPACO_PRIMATA: Opcao<EspacoPrimataInfantil>[] = [
  { valor: 'presente', rotulo: 'Presente' },
  { valor: 'ausente', rotulo: 'Ausente' },
];

export const OPCOES_RELACAO_CANINA: Opcao<RelacaoCaninaInfantil>[] = [
  { valor: 'degrau_mesial', rotulo: 'Degrau mesial' },
  { valor: 'degrau_distal', rotulo: 'Degrau distal' },
];

export const OPCOES_LINHA_MEDIANA: Opcao<LinhaMedianaInfantil>[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'desviada', rotulo: 'Desviada' },
];

export const OPCOES_ANGLE: Opcao<AngleInfantil>[] = [
  { valor: 'classe1', rotulo: 'Classe I' },
  { valor: 'classe2', rotulo: 'Classe II' },
  { valor: 'classe3', rotulo: 'Classe III' },
];

export const OPCOES_DIVISAO_ANGLE: Opcao<DivisaoAngleInfantil>[] = [
  { valor: 'divisao1', rotulo: 'Divisão 1' },
  { valor: 'divisao2', rotulo: 'Divisão 2' },
];

export const OPCOES_CURVA_SPEE: Opcao<CurvaSpeeInfantil>[] = [
  { valor: 'moderada', rotulo: 'Moderada' },
  { valor: 'acentuada', rotulo: 'Acentuada' },
];

export const OPCOES_PLANO_SAGITAL: Opcao<PlanoSagitalInfantil>[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'desvio_esquerdo', rotulo: 'Desvio esquerdo' },
  { valor: 'desvio_direito', rotulo: 'Desvio direito' },
];

export const OPCOES_EXPERIENCIA_ADVERSA = [
  'Medo',
  'Agressão',
  'Timidez',
  'Normal',
];

export const OPCOES_ATITUDES_PAIS = [
  'Pais presentes',
  'Pais separados',
  'Pai falecido',
  'Mãe falecida',
  'Pai ausente',
  'Mãe ausente',
];

export const OPCOES_CARACTERISTICAS_CRIANCA = [
  'Calmo',
  'Agitado',
  'Tímido',
  'Extrovertido',
  'Cooperativo',
  'Não cooperativo',
  'Dependente',
  'Independente',
  'Medroso',
  'Agressivo',
  'Chorão',
  'Curioso',
  'Distraído',
];

export const OPCOES_HABITOS_INFANTIS = [
  'Sucção de dedo',
  'Chupeta',
  'Bruxismo',
  'Onicofagia',
  'Respiração bucal',
];

export const OPCOES_ANOMALIAS_DENTAIS = [
  'Forma',
  'Tamanho',
  'Estrutura',
  'Número',
];

export const OPCOES_MORDIDA_CRUZADA = [
  'Anterior',
  'Posterior unilateral direita',
  'Posterior unilateral esquerda',
  'Posterior bilateral',
  'Normal',
  'Cruzada',
];

export const DOENCAS_INFANCIA = [
  'Sarampo',
  'Caxumba',
  'Catapora',
  'Difteria',
  'Coqueluche',
  'Diabetes',
  'Bronquite',
  'Anemia',
  'Asma',
  'Visão',
  'Audição',
  'Otite',
  'Coração',
  'Pulmões',
  'Pele',
  'Estômago',
  'Intestino',
  'Fígado',
  'Rins',
  'Bexiga',
  'Tireoide',
  'Hormonal',
  'Hemorragia',
  'Rinite alérgica',
  'AIDS',
];

export const DENTES_DECIDUOS_SUPERIORES = [
  '55',
  '54',
  '53',
  '52',
  '51',
  '61',
  '62',
  '63',
  '64',
  '65',
];

export const DENTES_DECIDUOS_INFERIORES = [
  '85',
  '84',
  '83',
  '82',
  '81',
  '71',
  '72',
  '73',
  '74',
  '75',
];

export const DENTES_PERMANENTES_SUPERIORES = [
  '18',
  '17',
  '16',
  '15',
  '14',
  '13',
  '12',
  '11',
  '21',
  '22',
  '23',
  '24',
  '25',
  '26',
  '27',
  '28',
];

export const DENTES_PERMANENTES_INFERIORES = [
  '48',
  '47',
  '46',
  '45',
  '44',
  '43',
  '42',
  '41',
  '31',
  '32',
  '33',
  '34',
  '35',
  '36',
  '37',
  '38',
];

export const DENTES_INFANTIS_DECIDUOS = [
  ...DENTES_DECIDUOS_SUPERIORES,
  ...DENTES_DECIDUOS_INFERIORES,
];

export const DENTES_INFANTIS_PERMANENTES = [
  ...DENTES_PERMANENTES_SUPERIORES,
  ...DENTES_PERMANENTES_INFERIORES,
];

export const DENTES_INFANTIS_MISTOS = [
  ...DENTES_PERMANENTES_SUPERIORES,
  ...DENTES_DECIDUOS_SUPERIORES,
  ...DENTES_DECIDUOS_INFERIORES,
  ...DENTES_PERMANENTES_INFERIORES,
];

export const TODOS_DENTES_INFANTIS = DENTES_INFANTIS_MISTOS;

export function dentesPorDenticao(
  denticao: DenticaoInfantil | ''
): string[] {
  if (denticao === 'mista') return DENTES_INFANTIS_MISTOS;
  if (denticao === 'permanente') return DENTES_INFANTIS_PERMANENTES;
  return DENTES_INFANTIS_DECIDUOS;
}

export const FACES_HIGIENE_INFANTIL = ['V', 'M', 'D', 'L'] as const;
export const FACES_ODONTOGRAMA_INFANTIL = ['V', 'L', 'M', 'D', 'O'] as const;

export const TOTAL_FACES_HIGIENE_INFANTIL = 80;

export const CONDICOES_ODONTOGRAMA_INFANTIL: {
  valor: CondicaoOdontogramaInfantil;
  rotulo: string;
  cor: string;
}[] = [
  { valor: 'azul', rotulo: 'Azul — restauração boa', cor: '#1d4ed8' },
  { valor: 'preto', rotulo: 'Preto — restauração insatisfatória', cor: '#000000' },
  { valor: 'vermelho', rotulo: 'Vermelho — cárie/curativo', cor: '#dc2626' },
];

export const CORES_CONDICAO_INFANTIL: Record<CondicaoOdontogramaInfantil, string> = {
  azul: '#1d4ed8',
  preto: '#000000',
  vermelho: '#dc2626',
};

export const TERMO_INFANTIL =
  'Declaro que as informações prestadas neste documento são verdadeiras e que fui informado(a) sobre o diagnóstico, os procedimentos, as alternativas de tratamento e os cuidados necessários. Autorizo a realização dos procedimentos odontológicos indicados e o registro dos dados clínicos da criança para acompanhamento, avaliação acadêmica e pesquisa, preservado o sigilo das informações.';
