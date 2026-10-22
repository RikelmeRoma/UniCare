import { useClinic } from '../../clinic/context/ClinicContext';
import { useAuth } from '../../auth/context/AuthContext';
import { DocumentTextIcon } from '../../../components/icons/CorporateIcons';

/**
 * Histórico pedagógico das fichas da clínica.
 *
 * As três linhas eram literais no JSX, com "Total mês: 42" e "CRO-SE 4512"
 * fixos. Agora a tabela vem das fichas reais: as que já têm decisão aparecem com
 * o parecer do supervisor.
 */
export function PedagogicalHistory() {
  const { fichasOdonto, sync } = useClinic();
  const { user } = useAuth();

  // Só entra no histórico o que já foi decidido pelo docente.
  const decididas = fichasOdonto
    .filter((f) => f.status === 'VALIDADO' || f.status === 'DEVOLVIDO_PARA_AJUSTE')
    .sort((a, b) => b.id - a.id);

  const statusLabel = (status: string) =>
    status === 'VALIDADO' ? 'Homologado' : 'Revisão';
  const statusClass = (status: string) =>
    status === 'VALIDADO'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-6">
      <div className="flex justify-between items-end mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-emerald-800" />
            <span>Histórico Pedagógico Recente</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Fichas já homologadas ou devolvidas, com o parecer do docente
          </p>
        </div>
        <div className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-3 py-1 rounded-full">
          Total: {decididas.length}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 text-[10px] font-bold">
              <th className="py-3 px-4">Ficha</th>
              <th className="py-3 px-4">Dupla Clínica</th>
              <th className="py-3 px-4">Paciente</th>
              <th className="py-3 px-4">Procedimento / Dente</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Parecer / Visto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {decididas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 px-4 text-slate-500">
                  {sync.estado === 'sincronizando'
                    ? 'Carregando histórico do servidor…'
                    : 'Nenhuma ficha decidida neste ciclo.'}
                </td>
              </tr>
            )}

            {decididas.map((ficha) => (
              <tr key={ficha.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 px-4 font-mono">
                  <p className="font-bold text-slate-900">#{ficha.id}</p>
                  <p className="text-slate-400 text-[11px]">{ficha.submetidoEm}</p>
                </td>
                <td className="py-3 px-4">
                  <p className="font-semibold text-slate-900">{ficha.duplaEstagiarios}</p>
                </td>
                <td className="py-3 px-4 font-mono text-slate-800">{ficha.pacienteNome}</td>
                <td className="py-3 px-4">
                  <p className="font-semibold text-slate-900">{ficha.denteRegiao}</p>
                  <p className="text-slate-500 text-[11px]">{ficha.procedimentoRealizado}</p>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`border text-[10px] font-bold px-2 py-0.5 rounded-md ${statusClass(ficha.status)}`}
                  >
                    {statusLabel(ficha.status)}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono">
                  {ficha.parecerSupervisor ? (
                    <>
                      <p className="text-slate-700">{ficha.parecerSupervisor}</p>
                      {ficha.status === 'VALIDADO' && (
                        <p className="text-slate-400 text-[11px]">
                          Visto de {user?.nome || 'docente'}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400">—</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}