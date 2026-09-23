export function PedagogicalHistory() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-blue-600">🗂️</span> Histórico Pedagógico Recente (RF-008)
          </h3>
          <p className="text-xs text-gray-500 mt-1">Últimas evoluções homologadas e auditadas com assinatura digital</p>
        </div>
        <div className="text-sm font-semibold text-gray-700">
          Total mês: 42
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#f8fafc] text-gray-500 uppercase tracking-wider border-y border-gray-200">
              <th className="py-3 px-4 font-semibold">Data/Hora</th>
              <th className="py-3 px-4 font-semibold">Dupla Clínica</th>
              <th className="py-3 px-4 font-semibold">Paciente</th>
              <th className="py-3 px-4 font-semibold">Procedimento / Dente</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Carimbo CRO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-700">
            {/* Linha 1 */}
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">14/09</p>
                <p className="text-gray-500">18:20</p>
              </td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">Dupla 04</p>
                <p className="text-gray-500">Cadeira 04</p>
              </td>
              <td className="py-3 px-4 font-medium">G. H. N.</td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">Dentística - Dente 11</p>
                <p className="text-gray-500">(Faceta Resina)</p>
              </td>
              <td className="py-3 px-4">
                <span className="text-green-600 font-medium">Homologado</span>
              </td>
              <td className="py-3 px-4 font-medium text-gray-900">CRO-SE 4821</td>
            </tr>
            {/* Linha 2 */}
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">13/09</p>
                <p className="text-gray-500">20:10</p>
              </td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">Dupla 05</p>
                <p className="text-gray-500">Cadeira 05</p>
              </td>
              <td className="py-3 px-4 font-medium">A. K. S.</td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">Cirurgia Bucal</p>
                <p className="text-gray-500">- Exodontia 38</p>
              </td>
              <td className="py-3 px-4">
                <span className="text-red-600 font-medium">Revisão</span>
              </td>
              <td className="py-3 px-4 font-medium text-gray-400">Pendente Aluno</td>
            </tr>
            {/* Linha 3 */}
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">12/09</p>
                <p className="text-gray-500">17:45</p>
              </td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">Dupla 06</p>
                <p className="text-gray-500">Cadeira 11</p>
              </td>
              <td className="py-3 px-4 font-medium">V. B. C.</td>
              <td className="py-3 px-4">
                <p className="font-medium text-gray-900">Periodontia</p>
                <p className="text-gray-500">Profilaxia e RAR</p>
              </td>
              <td className="py-3 px-4">
                <span className="text-green-600 font-medium">Homologado</span>
              </td>
              <td className="py-3 px-4 font-medium text-gray-900">CRO-SE 4821</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}