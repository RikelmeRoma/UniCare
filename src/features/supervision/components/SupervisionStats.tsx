import { useClinic } from '../../clinic/context/ClinicContext';

/**
 * Contadores da supervisão de odontologia.
 *
 * Os números saem dos documentos completos da fila de homologação, a mesma
 * fonte usada por `ApprovalQueue` e `PedagogicalHistory`. Sem API não se
 * inventa número de tela docente.
 */
export function SupervisionStats() {
  const { documentosOdonto, sync } = useClinic();

  const aguardando = documentosOdonto.filter(
    (d) => d.status === 'AGUARDANDO_VALIDACAO'
  ).length;
  const validados = documentosOdonto.filter((d) => d.status === 'VALIDADO').length;
  const devolvidos = documentosOdonto.filter(
    (d) => d.status === 'DEVOLVIDO_PARA_AJUSTE'
  ).length;
  const duplas = new Set(documentosOdonto.map((d) => d.duplaEstagiarios)).size;
  const pendentesDeDecisao = aguardando + devolvidos;
  const taxaHomologacao =
    documentosOdonto.length > 0
      ? Math.round((validados / documentosOdonto.length) * 100)
      : 0;

  const semDado = sync.estado === 'erro' || sync.estado === 'aguardando-login';

  const cards = [
    {
      rotulo: 'Fichas Aguardando Homologação',
      valor: aguardando,
      badge: pendentesDeDecisao > 0 ? `${pendentesDeDecisao} pendente(s)` : 'Fila vazia',
      card: 'bg-white dark:bg-[#0E1729] border-orange-100 dark:border-amber-900/60',
      numero: 'text-slate-900 dark:text-white',
      badgeClass: 'text-orange-700 dark:text-amber-300 bg-orange-50 dark:bg-amber-950/60 border border-orange-200/70 dark:border-amber-800/60',
    },
    {
      rotulo: 'Fichas Homologadas',
      valor: validados,
      badge: `${taxaHomologacao}% da fila`,
      card: 'bg-white dark:bg-[#0E1729] border-green-100 dark:border-emerald-900/60',
      numero: 'text-slate-900 dark:text-white',
      badgeClass: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/70 dark:border-emerald-800/60',
    },
    {
      rotulo: 'Devolvidas para Ajuste',
      valor: devolvidos,
      badge: 'Revisão Técnica',
      card: 'bg-white dark:bg-[#0E1729] border-red-100 dark:border-rose-900/60',
      numero: 'text-slate-900 dark:text-white',
      badgeClass: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200/70 dark:border-rose-800/60',
    },
    {
      rotulo: 'Duplas com Ficha Registrada',
      valor: duplas,
      badge: `${documentosOdonto.length} ficha(s)`,
      card: 'bg-white dark:bg-[#0E1729] border-blue-100 dark:border-blue-900/60',
      numero: 'text-slate-900 dark:text-white',
      badgeClass: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200/70 dark:border-blue-800/60',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.rotulo} className={`${c.card} p-5 rounded-2xl border shadow-xs hover:shadow-sm transition-all`}>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">{c.rotulo}</p>
          <div className="flex items-end gap-3 mb-1">
            <h3 className={`text-4xl font-bold font-mono tabular-nums ${c.numero}`}>
              {semDado ? '—' : String(c.valor).padStart(2, '0')}
            </h3>
            <span className={`text-[10px] font-semibold px-2 py-1 rounded-md ${c.badgeClass}`}>
              {semDado ? 'sem dado' : c.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
