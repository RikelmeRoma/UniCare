export function ClinicalPairs() {
  const pairs = [
    { id: 'D1', name: 'L. Vasconcelos / G. Prado', chair: 'Cadeira 03', proc: '14 / 20', status: 'Pendente', patients: '2 Pacientes no Dia', color: 'bg-[#0a1526]' },
    { id: 'D2', name: 'B. Morais / P. Siqueira', chair: 'Cadeira 04', proc: '12 / 20', status: 'Pendente', patients: '2 Pacientes no Dia', color: 'bg-blue-600' },
    { id: 'D3', name: 'T. Nogueira / M. Figueira', chair: 'Cadeira 02', proc: '18 / 20', status: 'Em Análise', patients: '3 Pacientes Ativos', color: 'bg-blue-100 text-blue-800' },
    { id: 'D4', name: 'C. Castro / R. Lima', chair: 'Cadeira 08', proc: '16 / 20', status: 'Em Dia', patients: '2 Pacientes Ativos', color: 'bg-[#0a1526]' },
    { id: 'D5', name: 'M. Arantes / J. Costa', chair: 'Cadeira 09', proc: '11 / 20', status: 'Correção', patients: '1 Paciente Ativo', color: 'bg-red-50 text-red-600' },
    { id: 'D6', name: 'F. Toledo / B. Neves', chair: 'Cadeira 11', proc: '15 / 20', status: 'Em Dia', patients: '2 Pacientes no Dia', color: 'bg-blue-600' },
    { id: 'D7', name: 'S. Dantas / E. Rocha', chair: 'Cadeira 06', proc: '17 / 20', status: 'Em Dia', patients: '2 Pacientes no Dia', color: 'bg-blue-100 text-blue-800' },
    { id: 'D8', name: 'C. Barros / T. Freitas', chair: 'Cadeira 10', proc: '13 / 20', status: 'Pendente', patients: '2 Pacientes no Dia', color: 'bg-[#0a1526]' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-blue-600">👥</span> Duplas Clínicas sob Orientação (12 Duplas Alocadas)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Acompanhamento de carga horária prática, procedimentos odontológicos homologados e biossegurança de boxes.
          </p>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar aluno ou Dupla..." 
            className="pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs w-64 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {pairs.map((pair, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50/50 flex flex-col justify-between">
            <div className="flex gap-3 items-start mb-4">
              <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${pair.color} ${pair.color.includes('bg-') && !pair.color.includes('text-') ? 'text-white' : ''}`}>
                {pair.id}
              </div>
              <div>
                <p className="font-bold text-sm text-gray-900">Dupla 0{idx + 1} - {pair.chair}</p>
                <p className="text-[10px] text-gray-500">{pair.name}</p>
              </div>
            </div>
            <div className="text-[10px] border-t border-gray-200 pt-3 flex justify-between items-center">
              <div>
                <p className="text-gray-500">Procedimentos</p>
                <p className="font-bold text-gray-900">Homologados: <span className="text-blue-600">{pair.proc}</span></p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">{pair.patients}</p>
                <p className={`font-bold ${pair.status === 'Em Dia' ? 'text-green-600' : pair.status === 'Pendente' ? 'text-orange-500' : pair.status === 'Correção' ? 'text-red-600' : 'text-blue-600'}`}>
                  | {pair.status}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Paginação Inferior */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Exibindo 8 de 12 duplas alocadas na Turma ODO-2026.2-D1
        </p>
        <button className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded transition-colors flex items-center gap-1">
          Visualizar Matriz Completa de Turma <span>→</span>
        </button>
      </div>
    </div>
  );
}