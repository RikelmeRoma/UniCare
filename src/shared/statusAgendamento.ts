import type { StatusAgendamento } from '../features/clinic/context/ClinicContext';

export interface RotuloStatus {
  rotulo: string;
  classes: string;
}

const BASE =
  'px-2.5 py-0.5 rounded-md text-[10px] font-bold border';

const ROTULOS: Record<StatusAgendamento, RotuloStatus> = {
  AGENDADO: {
    rotulo: 'Agendado',
    classes: `${BASE} bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700`,
  },
  PRESENTE: {
    rotulo: 'Na Recepção',
    classes: `${BASE} bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/70`,
  },
  EM_ATENDIMENTO: {
    rotulo: 'Em Atendimento',
    classes: `${BASE} bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800/70`,
  },
  CONCLUIDO: {
    rotulo: 'Atendido',
    classes: `${BASE} bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/70`,
  },
  FALTOU: {
    rotulo: 'Faltou',
    classes: `${BASE} bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-200 border-red-200 dark:border-red-800/70`,
  },
  CANCELADO: {
    rotulo: 'Cancelado',
    classes: `${BASE} bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700`,
  },
};

/**
 * Rótulo e cor de um status de agendamento.
 *
 * Fica num `.ts` — e devolve dado, não JSX — porque o `react-refresh` do lint
 * proíbe exportar função que não seja componente a partir de um `.tsx`. As duas
 * telas que mostram status (recepção e a agenda do estagiário) precisam do
 * mesmo par rótulo/cor: repetir a tabela de cores faz as duas telas divergirem
 * com o tempo, que é como um status passa a significar coisas diferentes para
 * quem agenda e para quem atende.
 */
export function rotuloStatus(status: StatusAgendamento): RotuloStatus {
  return ROTULOS[status];
}
