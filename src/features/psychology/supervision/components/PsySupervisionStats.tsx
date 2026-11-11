import { useClinic } from '../../../clinic/context/ClinicContext';
import { useAuth } from '../../../auth/context/AuthContext';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '../../../../components/icons/CorporateIcons';

/**
 * Contadores da supervisão de psicologia.
 *
 * Antes os quatro números eram literais (`06`, `24`, `02`, `10`). Agora três
 * saem do `status` das evoluções reais e o quarto conta os estagiários da
 * clínica que o supervisor enxerga — o mesmo filtro que `PsySupervisionPage`
 * já usava.
 *
 * O rótulo não diz "na Semana": não existe filtro de período, e `dataSessao` é
 * texto livre (`submetidoEm` só tem data, sem hora).
 */
export function PsySupervisionStats() {
  const { evolucoesPsico, sync } = useClinic();
  const { allUsers } = useAuth();

  const aguardando = evolucoesPsico.filter((e) => e.status === 'AGUARDANDO_VALIDACAO').length;
  const validados = evolucoesPsico.filter((e) => e.status === 'VALIDADO').length;
  const devolvidos = evolucoesPsico.filter((e) => e.status === 'DEVOLVIDO_PARA_AJUSTE').length;

  const estagiarios = Object.values(allUsers).filter(
    (u) => u.perfil === 'estagiario' && u.curso === 'psicologia'
  ).length;

  // A lista de usuários não expõe estado de erro: no 403 ela simplesmente fica
  // vazia. Vazia pode ser clínica sem estagiário ou chamada que não voltou, e
  // sem distinguir, dizer "0" seria afirmar que não se sabe. Fica `—`.
  const semDadoEvolucoes = sync.estado === 'erro' || sync.estado === 'aguardando-login';
  const semDados = { agendamentos: semDadoEvolucoes, estagiarios: estagiarios === 0 };

  const cartoes = [
    {
      rotulo: 'Evoluções Aguardando Homologação',
      valor: aguardando,
      rodape: 'pendentes na fila docente',
      numero: 'text-amber-700 dark:text-amber-400',
      semDado: semDados.agendamentos,
      icone: <DocumentTextIcon className="w-4 h-4" />,
      iconeClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/60',
    },
    {
      rotulo: 'Sessões Homologadas',
      valor: validados,
      rodape: `${evolucoesPsico.length} evolução(ões) no total`,
      numero: 'text-emerald-700 dark:text-emerald-400',
      semDado: semDados.agendamentos,
      icone: <CheckCircleIcon className="w-4 h-4" />,
      iconeClass: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60',
    },
    {
      rotulo: 'Devolvidas para Revisão Técnica',
      valor: devolvidos,
      rodape: 'em ajuste pelo estagiário',
      numero: 'text-red-700 dark:text-red-400',
      semDado: semDados.agendamentos,
      icone: <ExclamationTriangleIcon className="w-4 h-4" />,
      iconeClass: 'bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800/60',
    },
    {
      rotulo: 'Estagiários sob Orientação',
      valor: estagiarios,
      rodape: 'na clínica de psicologia',
      numero: 'text-blue-700 dark:text-blue-400',
      semDado: semDados.estagiarios,
      icone: <UserGroupIcon className="w-4 h-4" />,
      iconeClass: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cartoes.map((c) => (
        <div key={c.rotulo} className="bg-white dark:bg-[#0E1729] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{c.rotulo}</p>
            <span className={`p-2 rounded-xl ${c.iconeClass}`}>{c.icone}</span>
          </div>
          <div className="flex items-end gap-2 mt-2">
            <h3 className={`text-3xl font-bold text-slate-900 dark:text-white font-mono tabular-nums ${c.semDado ? 'text-slate-400 dark:text-slate-500' : ''}`}>
              {c.semDado ? '—' : String(c.valor).padStart(2, '0')}
            </h3>
            <span className={`text-[11px] font-semibold mb-1 ${c.numero}`}>
              {c.semDado ? 'sem dado' : c.rodape}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}