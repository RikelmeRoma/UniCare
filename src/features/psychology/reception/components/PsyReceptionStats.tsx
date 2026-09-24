export function PsyReceptionStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Agendados Hoje</p>
          <span className="text-blue-400">📅</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-4xl font-bold text-gray-900">28</h3>
          <span className="text-xs text-gray-500 font-medium">atendimentos</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Sala de Espera / Recepção</p>
          <span className="text-blue-500">🛋️</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-4xl font-bold text-blue-600">04</h3>
          <span className="text-xs text-blue-500 font-medium">pacientes no hall</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Em Andamento</p>
          <span className="text-green-500">🗣️</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-4xl font-bold text-gray-900">07</h3>
          <span className="text-xs text-gray-500 font-medium">consultórios</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">7 de 10 ativos</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-start mb-2">
          <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Desmarcações do Dia</p>
          <span className="text-orange-500">❌</span>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-4xl font-bold text-orange-600">02</h3>
          <span className="text-xs text-orange-500 font-medium">horários vagos</span>
        </div>
      </div>
    </div>
  );
}