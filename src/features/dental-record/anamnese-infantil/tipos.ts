export type { Opcao, SimNao } from '../anamnese/tipos';
import type { SimNao } from '../anamnese/tipos';

export type SexoInfantil = 'feminino' | 'masculino';
export type ReacaoContrariado = 'birra' | 'choro';
export type Aprendizado = 'lento' | 'normal' | 'adiantado';
export type TipoParto = 'normal' | 'cesariana' | 'forceps' | 'outro';
export type AtmInfantil = 'normal' | 'dor' | 'crepitacao' | 'estalido';
export type RespiracaoInfantil = 'nasal' | 'bucal' | 'mista';
export type FalaInfantil = 'normal' | 'alterada';
export type PalatoDuroInfantil = 'normal' | 'atresico';
export type AmigdalasInfantil = 'normais' | 'anormais' | 'operadas';
export type DenticaoInfantil = 'decidua' | 'mista' | 'permanente';
export type BaumeInfantil = 'tipo1' | 'tipo2';
export type EspacoPrimataInfantil = 'presente' | 'ausente';
export type RelacaoCaninaInfantil = 'degrau_mesial' | 'degrau_distal';
export type LinhaMedianaInfantil = 'normal' | 'desviada';
export type AngleInfantil = 'classe1' | 'classe2' | 'classe3';
export type DivisaoAngleInfantil = 'divisao1' | 'divisao2';
export type CurvaSpeeInfantil = 'moderada' | 'acentuada';
export type PlanoSagitalInfantil = 'normal' | 'desvio_esquerdo' | 'desvio_direito';

export type FaceHigieneInfantil = 'V' | 'M' | 'D' | 'L';
export type FaceOdontogramaInfantil = 'V' | 'L' | 'M' | 'D' | 'O';
export type CondicaoOdontogramaInfantil = 'azul' | 'preto' | 'vermelho';

export interface IdentificacaoInfantil {
  nome: string;
  apelido: string;
  comoGostaSerChamado: string;
  dataNascimento: string;
  sexo: SexoInfantil | '';
  naturalidade: string;
  nomeMae: string;
  profissaoMae: string;
  nomePai: string;
  profissaoPai: string;
  endereco: string;
  telefone: string;
  responsavelAcompanhante: string;
  estadoCivilPais: string;
  numeroIrmaos: string;
  idadesIrmaos: string;
  raca: string;
}

export interface AvaliacaoPsicologica {
  comQuemFica: string;
  amizades: SimNao | '';
  esportes: SimNao | '';
  esportesQuais: string;
  esportesTime: string;
  jaFoiDentista: SimNao | '';
  comportamentoDentista: string;
  experienciaAdversa: string[];
  experienciaRelato: string;
  atitudesPais: string[];
  caracteristicasCrianca: string[];
  caracteristicasOutros: string;
  reacaoContrariado: ReacaoContrariado | '';
  aprendizado: Aprendizado | '';
}

export interface AntecedentesHereditariosInfantil {
  relato: string;
}

export interface PreNatalInfantil {
  alteracaoGravidez: SimNao | '';
  alteracaoGravidezQual: string;
  medicamentos: SimNao | '';
  medicamentosQuais: string;
  fluor: SimNao | '';
  fluorQual: string;
  orientacaoOdontologica: SimNao | '';
}

export interface NatalInfantil {
  tipoParto: TipoParto | '';
  tipoPartoOutro: string;
  problemas: SimNao | '';
  problemasQuais: string;
  anomalias: SimNao | '';
  anomaliasQuais: string;
  amamentacao: SimNao | '';
  amamentacaoTempo: string;
  mamadeira: SimNao | '';
  mamadeiraQuantidade: string;
  mamadeiraHorario: string;
}

export interface PosNatalSaudeInfantil {
  estadoSaude: string;
  ultimoExame: string;
  tratamentoMedico: string;
  medicacao: SimNao | '';
  medicacaoQual: string;
  medicamentosPassado: string;
  doencasInfancia: string[];
  doencasOutras: string;
  problemasEspecificar: string;
  hospitalizado: SimNao | '';
  hospitalizadoMotivo: string;
  hospitalizadoData: string;
  alergia: SimNao | '';
  alergiaQuais: string;
}

export interface HabitosHigieneInfantil {
  habitos: string[];
  habitosOutros: string;
  orientacaoHigiene: SimNao | '';
  orientacaoPorQuem: string;
  escova: SimNao | '';
  escovaVezes: string;
  escovaQuem: string;
  pasta: SimNao | '';
  pastaQual: string;
  fioDental: SimNao | '';
  fioDentalVezes: string;
  fioDentalQuem: string;
  fluor: SimNao | '';
  fluorForma: string;
}

export interface ExameExtrabucalInfantil {
  alteracaoCabecaFacePescoco: SimNao | '';
  alteracaoQual: string;
  atm: AtmInfantil | '';
  respiracao: RespiracaoInfantil | '';
  fala: FalaInfantil | '';
  falaEspecifique: string;
}

export interface ExameIntrabucalInfantil {
  alteracoes: SimNao | '';
  alteracoesQuais: string;
  labios: string;
  freios: string;
  mucosa: string;
  lingua: string;
  assoalho: string;
  palatoDuro: PalatoDuroInfantil | '';
  amigdalas: AmigdalasInfantil | '';
  denticao: DenticaoInfantil | '';
  anomalias: string[];
}

export interface OclusaoDeciduaInfantil {
  baumeSuperior: BaumeInfantil | '';
  baumeInferior: BaumeInfantil | '';
  espacoPrimataSuperiorDireito: EspacoPrimataInfantil | '';
  espacoPrimataSuperiorEsquerdo: EspacoPrimataInfantil | '';
  espacoPrimataInferiorDireito: EspacoPrimataInfantil | '';
  espacoPrimataInferiorEsquerdo: EspacoPrimataInfantil | '';
  relacaoCaninaDireita: RelacaoCaninaInfantil | '';
  relacaoCaninaEsquerda: RelacaoCaninaInfantil | '';
  terminacaoMolarDireita: boolean;
  terminacaoMolarEsquerda: boolean;
  mordidaCruzada: string[];
  trespasseHorizontal: string;
  trespasseVertical: string;
  linhaMediana: LinhaMedianaInfantil | '';
}

export interface OclusaoMistaPermanenteInfantil {
  perdasPrecoces: string;
  angle: AngleInfantil | '';
  divisao: DivisaoAngleInfantil | '';
  subdivisao: string;
  mordidaCruzadaPosterior: SimNao | '';
  mordidaCruzadaAnterior: SimNao | '';
  trespasseHorizontal: string;
  trespasseVertical: string;
  curvaSpee: CurvaSpeeInfantil | '';
  linhaMediana: LinhaMedianaInfantil | '';
  planoSagitalSuperior: PlanoSagitalInfantil | '';
  planoSagitalInferior: PlanoSagitalInfantil | '';
}

export interface MapaHigieneInfantilDados {
  placa: Record<string, FaceHigieneInfantil[]>;
  sangramento: Record<string, FaceHigieneInfantil[]>;
  dentesAusentes: string[];
}

export interface DiarioAlimentarInfantil {
  frequencia: {
    refeicoes: [string, string, string];
    lanches: [string, string, string];
  };
  sacarose: {
    refeicoes: [string, string, string];
    lanches: [string, string, string];
  };
  consistenciaAnalise: string;
}

export type FacesOdontogramaInfantil = Record<
  FaceOdontogramaInfantil,
  CondicaoOdontogramaInfantil | null
>;

export interface DenteOdontogramaInfantil {
  presente: boolean;
  faces: FacesOdontogramaInfantil;
}

export interface OdontogramaInfantilDados {
  dentes: Record<string, DenteOdontogramaInfantil>;
  diagnosticoRadiografico: string;
}

export interface PlanoTratamentoInfantil {
  faseSistemica: string;
  etapaPreventiva: string;
  adequacaoMeio: string;
  etapaRestauradora: string;
  tratamentoOrtodontico: string;
  faseManutencao: string;
  assinaturaProfessor: string;
  dataAssinatura: string;
}

export interface EvolucaoInfantilLinha {
  data: string;
  procedimento: string;
  assinaturaProfessor: string;
}

export interface TermoInfantil {
  data: string;
  assinaturaResponsavel: string;
  assinaturaAluno1: string;
  assinaturaAluno2: string;
}

export interface AnamneseInfantil {
  versao: 1;
  atualizadoEm: string;
  identificacao: IdentificacaoInfantil;
  avaliacaoPsicologica: AvaliacaoPsicologica;
  antecedentesHereditarios: AntecedentesHereditariosInfantil;
  preNatal: PreNatalInfantil;
  natal: NatalInfantil;
  posNatalSaude: PosNatalSaudeInfantil;
  habitosHigiene: HabitosHigieneInfantil;
  exameExtrabucal: ExameExtrabucalInfantil;
  exameIntrabucal: ExameIntrabucalInfantil;
  oclusaoDecidua: OclusaoDeciduaInfantil;
  oclusaoMistaPermanente: OclusaoMistaPermanenteInfantil;
  mapaHigiene: MapaHigieneInfantilDados;
  diarioAlimentar: DiarioAlimentarInfantil;
  odontograma: OdontogramaInfantilDados;
  planoTratamento: PlanoTratamentoInfantil;
  evolucao: EvolucaoInfantilLinha[];
  termo: TermoInfantil;
}
