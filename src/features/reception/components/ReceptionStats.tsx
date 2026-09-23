export function ReceptionStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Agendados Hoje */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Agendados Hoje</p>
          <h3 className="text-4xl font-bold text-gray-900">42</h3>
        </div>
        <span className="p-2 bg-gray-50 rounded-lg text-gray-400">📅</span>
      </div>

      {/* Em Espera */}
      <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider mb-2">Em Espera na Recepção</p>
          <h3 className="text-4xl font-bold text-orange-500">6</h3>
        </div>
        <span className="p-2 bg-orange-50 rounded-lg text-orange-400">⏳</span>
      </div>

      {/* Em Atendimento */}
      <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Em Atendimento</p>
          <h3 className="text-4xl font-bold text-blue-500">12</h3>
        </div>
        <span className="p-2 bg-blue-50 rounded-lg text-blue-400">⚕️</span>
      </div>

      {/* Faltas */}
      <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm flex justify-between items-start">
        <div>
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Faltas Registradas</p>
          <h3 className="text-4xl font-bold text-red-500">3</h3>
        </div>
        <span className="p-2 bg-red-50 rounded-lg text-red-400">🚫</span>
      </div>
    </div>
  );
}