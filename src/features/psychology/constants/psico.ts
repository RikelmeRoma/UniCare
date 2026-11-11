import type { TipoOcorrenciaPsico, TipoRegistroPsico } from '../../../services/api';

/**
 * Seis consultórios disponíveis no Serviço de Psicologia Aplicada (SPA).
 */
export const CONSULTORIOS_SPA = [
  'Consultório SPA-01',
  'Consultório SPA-02',
  'Consultório SPA-03',
  'Consultório SPA-04',
  'Consultório SPA-05',
  'Consultório SPA-06',
] as const;

export const TOTAL_CONSULTORIOS_SPA = CONSULTORIOS_SPA.length;

/**
 * Opções oficiais do quadro "Registro de Encerramento" (Prontuário Psicológico UNINASSAU-AJU).
 */
export const MOTIVOS_ENCERRAMENTO_PSICO = [
  'Desistência do cliente',
  'Finalização do período de estágio',
  'Mudança de Estagiário/Horário/Dia',
  'Perda da vaga por falta do cliente',
  'Alta do Cliente/Finalização',
  'Saída do estagiário',
] as const;

export const TIPOS_OCORRENCIA_PSICO: { value: TipoOcorrenciaPsico; label: string }[] = [
  { value: 'ATRASO', label: 'Atraso no Atendimento' },
  { value: 'FALTA', label: 'Falta do Estagiário' },
  { value: 'ATENDIMENTO', label: 'Ocorrência em Atendimento' },
  { value: 'CONDUTA', label: 'Conduta / Postura' },
  { value: 'ADMINISTRATIVO', label: 'Questão Administrativa' },
  { value: 'OUTRO', label: 'Outro' },
];

export const LABEL_TIPO_OCORRENCIA_PSICO: Record<string, string> = Object.fromEntries(
  TIPOS_OCORRENCIA_PSICO.map((t) => [t.value, t.label])
);

export const META_TIPO_REGISTRO_PSICO: Record<
  TipoRegistroPsico,
  { titulo: string; badge: string; classeBadge: string; ordemImpressao: string }
> = {
  SESSAO: {
    titulo: 'Sessão Clínica',
    badge: 'Sessão Clínica',
    classeBadge:
      'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800/70',
    ordemImpressao: 'Evolução de Sessão',
  },
  DEMANDA: {
    titulo: 'Avaliação da Demanda',
    badge: 'Demanda',
    classeBadge:
      'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800/70',
    ordemImpressao: 'Avaliação da Demanda',
  },
  ENCERRAMENTO: {
    titulo: 'Registro de Encerramento',
    badge: 'Encerramento',
    classeBadge:
      'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-800/70',
    ordemImpressao: 'Registro de Encerramento',
  },
};

export function calcularIdade(dataNascimento?: string): string {
  if (!dataNascimento) return '—';
  const br = dataNascimento.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const iso = dataNascimento.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let ano: number;
  let mes: number;
  let dia: number;
  if (iso) {
    ano = Number(iso[1]);
    mes = Number(iso[2]) - 1;
    dia = Number(iso[3]);
  } else if (br) {
    ano = Number(br[3]);
    mes = Number(br[2]) - 1;
    dia = Number(br[1]);
  } else {
    return '—';
  }
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const ajusteMes = hoje.getMonth() - mes;
  if (ajusteMes < 0 || (ajusteMes === 0 && hoje.getDate() < dia)) {
    idade -= 1;
  }
  return idade >= 0 && idade < 130 ? `${idade} anos` : '—';
}

export function formatarDataBr(dataStr?: string): string {
  if (!dataStr) return '—';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dataStr)) return dataStr;
  const iso = dataStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return dataStr;
}
