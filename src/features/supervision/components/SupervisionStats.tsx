export function SupervisionStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {/* Fichas Aguardando */}
      <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm">
        <p className="text-xs font-semibold text-gray-600 mb-2">Fichas Odontológicas Aguardando</p>
        <div className="flex items-end gap-3 mb-2">
          <h3 className="text-4xl font-bold text-gray-900">05</h3>
          <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">Homologação CFO</span>
        </div>
      </div>

      {/* Procedimentos Homologados */}
      <div className="bg-white p-5 rounded-xl border border-green-100 shadow-sm">
        <p className="text-xs font-semibold text-gray-600 mb-2">Procedimentos Homologados</p>
        <div className="flex items-end gap-3 mb-2">
          <h3 className="text-4xl font-bold text-gray-900">18</h3>
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded">+5 ontem</span>
        </div>
      </div>

      {/* Devolvidos para Ajuste */}
      <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm">
        <p className="text-xs font-semibold text-gray-600 mb-2">Devolvidos para Ajuste Clínico</p>
        <div className="flex items-end gap-3 mb-2">
          <h3 className="text-4xl font-bold text-gray-900">02</h3>
          <span className="text-[10px] font-medium text-red-600 bg-red-50 px-2 py-1 rounded">Revisão Técnica</span>
        </div>
      </div>

      {/* Duplas Clínicas Ativas */}
      <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
        <p className="text-xs font-semibold text-gray-600 mb-2">Duplas Clínicas Ativas</p>
        <div className="flex items-end gap-3 mb-2">
          <h3 className="text-4xl font-bold text-gray-900">12</h3>
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">100% Ativas</span>
        </div>
      </div>
    </div>
  );
}