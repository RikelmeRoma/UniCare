import {
  DocumentTextIcon,
} from '../../../components/icons/CorporateIcons';

export function PedagogicalHistory() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 mb-6">
      <div className="flex justify-between items-end mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-emerald-800" />
            <span>Histórico Pedagógico Recente</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Últimas evoluções homologadas e auditadas com assinatura digital</p>
        </div>
        <div className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-3 py-1 rounded-full">
          Total mês: 42
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 text-[10px] font-bold">
              <th className="py-3 px-4">Data/Hora</th>
              <th className="py-3 px-4">Dupla Clínica</th>
              <th className="py-3 px-4">Paciente</th>
              <th className="py-3 px-4">Procedimento / Dente</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Carimbo CRO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {/* Linha 1 */}
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-4 font-mono">
                <p className="font-bold text-slate-900">14/09</p>
                <p className="text-slate-400 text-[11px]">18:20</p>
              </td>
              <td className="py-3 px-4">
                <p className="font-semibold text-slate-900">Dupla 04</p>
                <p className="text-slate-500 text-[11px]">Cadeira 04</p>
              </td>
              <td className="py-3 px-4 font-mono text-slate-800">G. H. N.</td>
              <td className="py-3 px-4">
                <p className="font-semibold text-slate-900">Dentística - Dente 11</p>
                <p className="text-slate-500 text-[11px]">Faceta Resina</p>
              </td>
              <td className="py-3 px-4">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Homologado
                </span>
              </td>
              <td className="py-3 px-4 font-mono font-medium text-slate-900">CRO-SE 4512</td>
            </tr>
            {/* Linha 2 */}
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-4 font-mono">
                <p className="font-bold text-slate-900">13/09</p>
                <p className="text-slate-400 text-[11px]">20:10</p>
              </td>
              <td className="py-3 px-4">
                <p className="font-semibold text-slate-900">Dupla 05</p>
                <p className="text-slate-500 text-[11px]">Cadeira 05</p>
              </td>
              <td className="py-3 px-4 font-mono text-slate-800">A. K. S.</td>
              <td className="py-3 px-4">
                <p className="font-semibold text-slate-900">Cirurgia Bucal</p>
                <p className="text-slate-500 text-[11px]">Exodontia 38</p>
              </td>
              <td className="py-3 px-4">
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Revisão
                </span>
              </td>
              <td className="py-3 px-4 font-mono text-slate-400">Pendente Aluno</td>
            </tr>
            {/* Linha 3 */}
            <tr className="hover:bg-slate-50/60 transition-colors">
              <td className="py-3 px-4 font-mono">
                <p className="font-bold text-slate-900">12/09</p>
                <p className="text-slate-400 text-[11px]">17:45</p>
              </td>
              <td className="py-3 px-4">
                <p className="font-semibold text-slate-900">Dupla 06</p>
                <p className="text-slate-500 text-[11px]">Cadeira 11</p>
              </td>
              <td className="py-3 px-4 font-mono text-slate-800">V. B. C.</td>
              <td className="py-3 px-4">
                <p className="font-semibold text-slate-900">Periodontia</p>
                <p className="text-slate-500 text-[11px]">Profilaxia e RAR</p>
              </td>
              <td className="py-3 px-4">
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Homologado
                </span>
              </td>
              <td className="py-3 px-4 font-mono font-medium text-slate-900">CRO-SE 4512</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}