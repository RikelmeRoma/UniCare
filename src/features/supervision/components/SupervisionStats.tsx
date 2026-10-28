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
      card: 'bg-white border-orange-100',
      numero: 'text-gray-900',
      badgeClass: 'text-orange-600 bg-orange-50',
    },
    {
      rotulo: 'Fichas Homologadas',
      valor: validados,
      badge: `${taxaHomologacao}% da fila`,
      card: 'bg-white border-green-100',
      numero: 'text-gray-900',
      badgeClass: 'text-green-600 bg-green-50',
    },
    {
      rotulo: 'Devolvidas para Ajuste',
      valor: devolvidos,
      badge: 'Revisão Técnica',
      card: 'bg-white border-red-100',
      numero: 'text-gray-900',
      badgeClass: 'text-red-600 bg-red-50',
    },
    {
      rotulo: 'Duplas com Ficha Registrada',
      valor: duplas,
      badge: `${documentosOdonto.length} ficha(s)`,
      card: 'bg-white border-blue-100',
      numero: 'text-gray-900',
      badgeClass: 'text-blue-600 bg-blue-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {cards.map((c) => (
        <div key={c.rotulo} className={`${c.card} p-5 rounded-xl border shadow-sm`}>
          <p className="text-xs font-semibold text-gray-600 mb-2">{c.rotulo}</p>
          <div className="flex items-end gap-3 mb-2">
            <h3 className={`text-4xl font-bold ${c.numero}`}>
              {semDado ? '—' : String(c.valor).padStart(2, '0')}
            </h3>
            <span className={`text-[10px] font-medium px-2 py-1 rounded ${c.badgeClass}`}>
              {semDado ? 'sem dado' : c.badge}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
