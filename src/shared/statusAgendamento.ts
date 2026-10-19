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
    classes: `${BASE} bg-slate-100 text-slate-700 border-slate-200`,
  },
  PRESENTE: {
    rotulo: 'Na Recepção',
    classes: `${BASE} bg-amber-50 text-amber-800 border-amber-200`,
  },
  EM_ATENDIMENTO: {
    rotulo: 'Em Atendimento',
    classes: `${BASE} bg-blue-50 text-blue-700 border-blue-200`,
  },
  CONCLUIDO: {
    rotulo: 'Atendido',
    classes: `${BASE} bg-emerald-50 text-emerald-800 border-emerald-200`,
  },
  FALTOU: {
    rotulo: 'Faltou',
    classes: `${BASE} bg-red-50 text-red-700 border-red-200`,
  },
  CANCELADO: {
    rotulo: 'Cancelado',
    classes: `${BASE} bg-slate-100 text-slate-600 border-slate-200`,
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
