import type { Paciente } from '../../clinic/context/ClinicContext';
import { calcularIdade } from '../anamnese/estado';
import type {
  AnamneseInfantil,
  DenteOdontogramaInfantil,
  DiarioAlimentarInfantil,
  EvolucaoInfantilLinha,
  FaceHigieneInfantil,
  FacesOdontogramaInfantil,
  MapaHigieneInfantilDados,
  OdontogramaInfantilDados,
  PlanoTratamentoInfantil,
} from './tipos';
import {
  DENTES_DECIDUOS_INFERIORES,
  DENTES_DECIDUOS_SUPERIORES,
  DENTES_INFANTIS_DECIDUOS,
  FACES_HIGIENE_INFANTIL,
  FACES_ODONTOGRAMA_INFANTIL,
  TOTAL_FACES_HIGIENE_INFANTIL,
} from './constantes';

const PREFIXO_RASCUNHO = 'unicare:anamnese-infantil:';
const VERSAO = 1;

function chaveRascunho(pacienteId: number) {
  return `${PREFIXO_RASCUNHO}${pacienteId}`;
}

function criarTripla(): [string, string, string] {
  return ['', '', ''];
}

export function atualizarTripla(
  tripla: [string, string, string],
  indice: number,
  valor: string
): [string, string, string] {
  const copia: [string, string, string] = [...tripla];
  copia[indice] = valor;
  return copia;
}

function facesVazias(): FacesOdontogramaInfantil {
  return {
    V: null,
    L: null,
    M: null,
    D: null,
    O: null,
  };
}

export function criarDenteOdontogramaInfantil(): DenteOdontogramaInfantil {
  return { presente: true, faces: facesVazias() };
}

function criarDentesOdontogramaInfantil(): Record<string, DenteOdontogramaInfantil> {
  return DENTES_INFANTIS_DECIDUOS.reduce(
    (acumulado, dente) => {
      acumulado[dente] = criarDenteOdontogramaInfantil();
      return acumulado;
    },
    {} as Record<string, DenteOdontogramaInfantil>
  );
}

function criarMapaHigieneVazio(): MapaHigieneInfantilDados {
  return { placa: {}, sangramento: {}, dentesAusentes: [] };
}

function criarDiarioAlimentarVazio(): DiarioAlimentarInfantil {
  return {
    frequencia: { refeicoes: criarTripla(), lanches: criarTripla() },
    sacarose: { refeicoes: criarTripla(), lanches: criarTripla() },
    consistenciaAnalise: '',
  };
}

function criarOdontogramaVazio(): OdontogramaInfantilDados {
  return {
    dentes: criarDentesOdontogramaInfantil(),
    diagnosticoRadiografico: '',
  };
}

function criarPlanoVazio(): PlanoTratamentoInfantil {
  return {
    faseSistemica: '',
    etapaPreventiva: '',
    adequacaoMeio: '',
    etapaRestauradora: '',
    tratamentoOrtodontico: '',
    faseManutencao: '',
    assinaturaProfessor: '',
    dataAssinatura: '',
  };
}

function criarEvolucaoVazia(): EvolucaoInfantilLinha {
  return { data: '', procedimento: '', assinaturaProfessor: '' };
}

export function criarAnamneseInfantilVazia(paciente?: Paciente): AnamneseInfantil {
  const dataNascimento = paciente?.dataNascimento ?? '';

  return {
    versao: VERSAO,
    atualizadoEm: new Date().toISOString(),
    identificacao: {
      nome: paciente?.nome ?? '',
      apelido: '',
      comoGostaSerChamado: '',
      dataNascimento,
      sexo: '',
      naturalidade: '',
      nomeMae: '',
      profissaoMae: '',
      nomePai: '',
      profissaoPai: '',
      endereco: '',
      telefone: paciente?.telefone ?? '',
      responsavelAcompanhante: paciente?.nomeResponsavel ?? '',
      estadoCivilPais: '',
      numeroIrmaos: '',
      idadesIrmaos: '',
      raca: '',
    },
    avaliacaoPsicologica: {
      comQuemFica: '',
      amizades: '',
      esportes: '',
      esportesQuais: '',
      esportesTime: '',
      jaFoiDentista: '',
      comportamentoDentista: '',
      experienciaAdversa: [],
      experienciaRelato: '',
      atitudesPais: [],
      caracteristicasCrianca: [],
      caracteristicasOutros: '',
      reacaoContrariado: '',
      aprendizado: '',
    },
    antecedentesHereditarios: { relato: '' },
    preNatal: {
      alteracaoGravidez: '',
      alteracaoGravidezQual: '',
      medicamentos: '',
      medicamentosQuais: '',
      fluor: '',
      fluorQual: '',
      orientacaoOdontologica: '',
    },
    natal: {
      tipoParto: '',
      tipoPartoOutro: '',
      problemas: '',
      problemasQuais: '',
      anomalias: '',
      anomaliasQuais: '',
      amamentacao: '',
      amamentacaoTempo: '',
      mamadeira: '',
      mamadeiraQuantidade: '',
      mamadeiraHorario: '',
    },
    posNatalSaude: {
      estadoSaude: '',
      ultimoExame: '',
      tratamentoMedico: '',
      medicacao: '',
      medicacaoQual: '',
      medicamentosPassado: '',
      doencasInfancia: [],
      doencasOutras: '',
      problemasEspecificar: '',
      hospitalizado: '',
      hospitalizadoMotivo: '',
      hospitalizadoData: '',
      alergia: '',
      alergiaQuais: '',
    },
    habitosHigiene: {
      habitos: [],
      habitosOutros: '',
      orientacaoHigiene: '',
      orientacaoPorQuem: '',
      escova: '',
      escovaVezes: '',
      escovaQuem: '',
      pasta: '',
      pastaQual: '',
      fioDental: '',
      fioDentalVezes: '',
      fioDentalQuem: '',
      fluor: '',
      fluorForma: '',
    },
    exameExtrabucal: {
      alteracaoCabecaFacePescoco: '',
      alteracaoQual: '',
      atm: '',
      respiracao: '',
      fala: '',
      falaEspecifique: '',
    },
    exameIntrabucal: {
      alteracoes: '',
      alteracoesQuais: '',
      labios: '',
      freios: '',
      mucosa: '',
      lingua: '',
      assoalho: '',
      palatoDuro: '',
      amigdalas: '',
      denticao: '',
      anomalias: [],
    },
    oclusaoDecidua: {
      baumeSuperior: '',
      baumeInferior: '',
      espacoPrimataSuperiorDireito: '',
      espacoPrimataSuperiorEsquerdo: '',
      espacoPrimataInferiorDireito: '',
      espacoPrimataInferiorEsquerdo: '',
      relacaoCaninaDireita: '',
      relacaoCaninaEsquerda: '',
      terminacaoMolarDireita: false,
      terminacaoMolarEsquerda: false,
      mordidaCruzada: [],
      trespasseHorizontal: '',
      trespasseVertical: '',
      linhaMediana: '',
    },
    oclusaoMistaPermanente: {
      perdasPrecoces: '',
      angle: '',
      divisao: '',
      subdivisao: '',
      mordidaCruzadaPosterior: '',
      mordidaCruzadaAnterior: '',
      trespasseHorizontal: '',
      trespasseVertical: '',
      curvaSpee: '',
      linhaMediana: '',
      planoSagitalSuperior: '',
      planoSagitalInferior: '',
    },
    mapaHigiene: criarMapaHigieneVazio(),
    diarioAlimentar: criarDiarioAlimentarVazio(),
    odontograma: criarOdontogramaVazio(),
    planoTratamento: criarPlanoVazio(),
    evolucao: [criarEvolucaoVazia()],
    termo: {
      data: '',
      assinaturaResponsavel: '',
      assinaturaAluno1: '',
      assinaturaAluno2: '',
    },
  };
}

function normalizarRascunho(dados: Partial<AnamneseInfantil>): AnamneseInfantil {
  const base = criarAnamneseInfantilVazia();

  return {
    ...base,
    ...dados,
    versao: VERSAO,
    identificacao: { ...base.identificacao, ...(dados.identificacao ?? {}) },
    avaliacaoPsicologica: {
      ...base.avaliacaoPsicologica,
      ...(dados.avaliacaoPsicologica ?? {}),
    },
    antecedentesHereditarios: {
      ...base.antecedentesHereditarios,
      ...(dados.antecedentesHereditarios ?? {}),
    },
    preNatal: { ...base.preNatal, ...(dados.preNatal ?? {}) },
    natal: { ...base.natal, ...(dados.natal ?? {}) },
    posNatalSaude: { ...base.posNatalSaude, ...(dados.posNatalSaude ?? {}) },
    habitosHigiene: { ...base.habitosHigiene, ...(dados.habitosHigiene ?? {}) },
    exameExtrabucal: {
      ...base.exameExtrabucal,
      ...(dados.exameExtrabucal ?? {}),
    },
    exameIntrabucal: {
      ...base.exameIntrabucal,
      ...(dados.exameIntrabucal ?? {}),
    },
    oclusaoDecidua: {
      ...base.oclusaoDecidua,
      ...(dados.oclusaoDecidua ?? {}),
    },
    oclusaoMistaPermanente: {
      ...base.oclusaoMistaPermanente,
      ...(dados.oclusaoMistaPermanente ?? {}),
    },
    mapaHigiene: {
      ...base.mapaHigiene,
      ...(dados.mapaHigiene ?? {}),
      placa: { ...base.mapaHigiene.placa, ...(dados.mapaHigiene?.placa ?? {}) },
      sangramento: {
        ...base.mapaHigiene.sangramento,
        ...(dados.mapaHigiene?.sangramento ?? {}),
      },
      dentesAusentes:
        dados.mapaHigiene?.dentesAusentes ?? base.mapaHigiene.dentesAusentes,
    },
    diarioAlimentar: {
      ...base.diarioAlimentar,
      ...(dados.diarioAlimentar ?? {}),
      frequencia: {
        ...base.diarioAlimentar.frequencia,
        ...(dados.diarioAlimentar?.frequencia ?? {}),
      },
      sacarose: {
        ...base.diarioAlimentar.sacarose,
        ...(dados.diarioAlimentar?.sacarose ?? {}),
      },
    },
    odontograma: {
      ...base.odontograma,
      ...(dados.odontograma ?? {}),
      dentes: {
        ...base.odontograma.dentes,
        ...(dados.odontograma?.dentes ?? {}),
      },
    },
    planoTratamento: {
      ...base.planoTratamento,
      ...(dados.planoTratamento ?? {}),
    },
    evolucao:
      dados.evolucao && dados.evolucao.length > 0
        ? dados.evolucao
        : base.evolucao,
    termo: { ...base.termo, ...(dados.termo ?? {}) },
  };
}

export function carregarRascunhoInfantil(
  pacienteId: number
): AnamneseInfantil | null {
  try {
    const bruto = window.sessionStorage.getItem(chaveRascunho(pacienteId));
    if (!bruto) return null;

    const dados = JSON.parse(bruto) as Partial<AnamneseInfantil>;
    if (!dados || dados.versao !== VERSAO || !dados.identificacao) {
      return null;
    }

    return normalizarRascunho(dados);
  } catch {
    return null;
  }
}

export function salvarRascunhoInfantil(
  pacienteId: number,
  dados: AnamneseInfantil
): boolean {
  try {
    window.sessionStorage.setItem(
      chaveRascunho(pacienteId),
      JSON.stringify({ ...dados, atualizadoEm: new Date().toISOString() })
    );
    return true;
  } catch {
    return false;
  }
}

export function removerRascunhoInfantil(pacienteId: number): void {
  try {
    window.sessionStorage.removeItem(chaveRascunho(pacienteId));
  } catch {
    // Nada a fazer: não havia rascunho gravado.
  }
}

function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function exportarJsonInfantil(
  paciente: Paciente | undefined,
  dados: AnamneseInfantil
): void {
  const conteudo = {
    documento: 'Anamnese Infantil — Odontopediatria',
    versao: VERSAO,
    exportadoEm: new Date().toISOString(),
    paciente: paciente
      ? {
          nome: paciente.nome,
          cpf: paciente.cpf,
          dataNascimento: paciente.dataNascimento,
          telefone: paciente.telefone,
          responsavel: paciente.nomeResponsavel,
          contatoResponsavel: paciente.contatoResponsavel,
        }
      : null,
    anamnese: { ...dados, atualizadoEm: new Date().toISOString() },
  };

  const blob = new Blob([JSON.stringify(conteudo, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const nome = slug(paciente?.nome ?? 'paciente') || 'paciente';
  const data = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `anamnese-infantil-${nome}-${data}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function totalFacesHigieneInfantil(dentesAusentes: string[]): number {
  return Math.max(0, TOTAL_FACES_HIGIENE_INFANTIL - dentesAusentes.length * 4);
}

export function contarFacesMarcadas(
  registro: Record<string, FaceHigieneInfantil[]>,
  dentesAusentes: string[]
): number {
  return Object.entries(registro).reduce((total, [dente, faces]) => {
    if (dentesAusentes.includes(dente)) return total;
    return total + faces.filter((face) => FACES_HIGIENE_INFANTIL.includes(face)).length;
  }, 0);
}

export function percentualInfantil(numerador: number, denominador: number): string {
  if (
    !Number.isFinite(numerador) ||
    !Number.isFinite(denominador) ||
    denominador <= 0
  ) {
    return '—';
  }

  const percentual = (numerador / denominador) * 100;
  return percentual.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function calcularIdadeInfantil(dataNascimento: string): string {
  return calcularIdade(dataNascimento);
}

export function nomesDentesHigiene(): {
  superiores: string[];
  inferiores: string[];
} {
  return {
    superiores: [...DENTES_DECIDUOS_SUPERIORES],
    inferiores: [...DENTES_DECIDUOS_INFERIORES],
  };
}

export function facesOdontogramaInfantis(): typeof FACES_ODONTOGRAMA_INFANTIL {
  return FACES_ODONTOGRAMA_INFANTIL;
}
