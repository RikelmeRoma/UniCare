import { useClinic } from '../../clinic/context/ClinicContext';
import { DocumentTextIcon } from '../../../components/icons/CorporateIcons';

/**
 * Histórico pedagógico das fichas clínicas odontológicas.
 *
 * A tabela deriva da mesma fonte da fila de homologação: os documentos
 * completos enviados pelas duplas. Só entra no histórico o que já recebeu
 * decisão do docente, com o parecer e o carimbo de quem homologou.
 */
export function PedagogicalHistory() {
  const { documentosOdonto, sync } = useClinic();

  const decididas = documentosOdonto
    .filter(
      (d) => d.status === 'VALIDADO' || d.status === 'DEVOLVIDO_PARA_AJUSTE'
    )
    .sort((a, b) => b.id - a.id);

  const statusLabel = (status: string) =>
    status === 'VALIDADO' ? 'Homologado' : 'Revisão';
  const statusClass = (status: string) =>
    status === 'VALIDADO'
      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/70'
      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/70';

  return (
    <div className="bg-white dark:bg-[#0E1729] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 mb-6 transition-colors">
      <div className="flex justify-between items-end mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-emerald-800 dark:text-emerald-400" />
            <span>Histórico Pedagógico Recente</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Fichas clínicas já homologadas ou devolvidas, com o parecer do docente
          </p>
        </div>
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full tabular-nums">
          Total: {decididas.length}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold">
              <th className="py-3 px-4">Ficha</th>
              <th className="py-3 px-4">Dupla Clínica</th>
              <th className="py-3 px-4">Paciente</th>
              <th className="py-3 px-4">Tipo de Ficha</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Parecer / Visto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {decididas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 px-4 text-slate-500 dark:text-slate-400">
                  {sync.estado === 'sincronizando'
                    ? 'Carregando histórico do servidor...'
                    : 'Nenhuma ficha decidida neste ciclo.'}
                </td>
              </tr>
            )}

            {decididas.map((ficha) => (
              <tr key={ficha.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-4 font-mono">
                  <p className="font-bold text-slate-900 dark:text-white">
                    #{ficha.id} · v{ficha.versao}
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px]">{ficha.submetidoEm}</p>
                </td>
                <td className="py-3 px-4">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {ficha.duplaEstagiarios}
                  </p>
                </td>
                <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                  {ficha.pacienteNome}
                </td>
                <td className="py-3 px-4">
                  {ficha.tipo === 'infantil' ? 'Odontopediatria' : 'Adulto e Idoso'}
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
                      <p className="text-slate-700 dark:text-slate-200">{ficha.parecerSupervisor}</p>
                      {ficha.status === 'VALIDADO' && (
                        <p className="text-slate-400 dark:text-slate-500 text-[11px]">
                          Visto de {ficha.supervisorNome || 'docente'}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500">—</p>
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
