export function ApprovalQueue() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className="text-blue-600">📋</span> Fila de Homologação de Procedimentos
          </h3>
          <p className="text-xs text-gray-500 mt-1">Fichas clínicas submetidas pelas duplas do estágio da turma</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">
            5 pendentes
          </span>
          <button className="text-gray-400 hover:text-gray-600">🔄</button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Cartão 1 */}
        <div className="bg-[#f8fafc] border border-gray-200 rounded-lg p-5 relative">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              <h4 className="font-bold text-gray-900 text-sm">Paciente: M. A. S. <span className="text-gray-400 font-normal">Ficha Odonto #0884/26</span></h4>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>Cadeira 04 • Realizada em</p>
              <p className="font-medium text-gray-700">15/09 (10:00)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
            <div>
              <p className="text-gray-500 mb-1">Dupla Clínica Responsável:</p>
              <p className="font-semibold text-gray-900">Lucas Vasconcelos (Op.) & Gabriela Prado (Aux.)</p>
              <p className="text-gray-500">9º Período • Matrícula: 01498231</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Procedimento / CID-10:</p>
              <p className="font-medium text-gray-800">Restauração em Resina Composta dente 36 (Classe II MOD) • K02.1</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Registro Clínico & Conduta Operatória:</p>
            <p className="text-xs text-gray-600 italic bg-white p-3 border border-gray-100 rounded">
              "Remoção de tecido cariado, isolamento absoluto efetivo, condicionamento ácido seletivo em esmalte, sistema adesivo autocondicionante e inserção incremental d..."
            </p>
          </div>

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-1.5 text-xs text-blue-600">
              <span>⚠️</span> Alerta de Alergia a Penicilina conferido • Odontograma e Periodograma atualizados
            </div>
            <div className="flex gap-3">
              <button className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center gap-1">
                <span>👁️</span> Ver Odontograma
              </button>
              <button className="text-sm font-medium bg-[#0a1526] hover:bg-black text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
                <span>✍️</span> Avaliar Procedimento
              </button>
            </div>
          </div>
        </div>

        {/* Cartão 2 (Resumido) */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 opacity-75 hover:opacity-100 transition-opacity">
           <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400"></span>
              <h4 className="font-bold text-gray-900 text-sm">Paciente: J. F. O. <span className="text-gray-400 font-normal">Ficha Odonto #0912/26</span></h4>
            </div>
            <button className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg">Parecer Clínico</button>
          </div>
        </div>
      </div>
    </div>
  );
}