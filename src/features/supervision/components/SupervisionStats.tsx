import { useClinic } from '../../clinic/context/ClinicContext';

/**
 * Contadores da supervisão de odontologia.
 *
 * Antes os quatro números eram literais (`05`, `18`, `02`, `12`) e a badge
 * "100% Ativas" era constante. Agora saem das fichas reais do Postgres.
 */
export function SupervisionStats() {
  const { fichasOdonto, sync } = useClinic();

  const aguardando = fichasOdonto.filter((f) => f.status === 'AGUARDANDO_VALIDACAO').length;
  const validados = fichasOdonto.filter((f) => f.status === 'VALIDADO').length;
  const devolvidos = fichasOdonto.filter((f) => f.status === 'DEVOLVIDO_PARA_AJUSTE').length;
  // Dupla é o par operador/auxiliar que assinou a ficha. O total no banco é o
  // número de duplas distintas, não um número inventado de "12 duplas ativas".
  const duplas = new Set(fichasOdonto.map((f) => f.duplaEstagiarios)).size;
  const pendentesDeDecisao = aguardando + devolvidos;
  const taxaHomologacao =
    fichasOdonto.length > 0 ? Math.round((validados / fichasOdonto.length) * 100) : 0;

  const semDado = sync.estado === 'erro' || sync.estado === 'aguardando-login';

  const cards = [
    {
      rotulo: 'Fichas Odontológicas Aguardando',
      valor: aguardando,
      badge: pendentesDeDecisao > 0 ? `${pendentesDeDecisao} pendente(s)` : 'Fila vazia',
      card: 'bg-white border-orange-100',
      numero: 'text-gray-900',
      badgeClass: 'text-orange-600 bg-orange-50',
    },
    {
      rotulo: 'Procedimentos Homologados',
      valor: validados,
      badge: `${taxaHomologacao}% da fila`,
      card: 'bg-white border-green-100',
      numero: 'text-gray-900',
      badgeClass: 'text-green-600 bg-green-50',
    },
    {
      rotulo: 'Devolvidos para Ajuste Clínico',
      valor: devolvidos,
      badge: 'Revisão Técnica',
      card: 'bg-white border-red-100',
      numero: 'text-gray-900',
      badgeClass: 'text-red-600 bg-red-50',
    },
    {
      rotulo: 'Duplas com Ficha Registrada',
      valor: duplas,
      badge: `${fichasOdonto.length} ficha(s)`,
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
              {/* Sem API não se inventa número de tela docente. */}
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