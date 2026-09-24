export function PsySupervisionStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-gray-700">Evoluções Aguardando<br/>Homologação</p>
          <span className="text-orange-500">📋</span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <h3 className="text-4xl font-bold text-gray-900">06</h3>
          <span className="text-xs text-gray-500 font-medium mb-1">evoluções</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-gray-700">Sessões Homologadas<br/>na Semana</p>
          <span className="text-green-500">✔️</span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <h3 className="text-4xl font-bold text-gray-900">24</h3>
          <span className="text-xs text-gray-500 font-medium mb-1">sessões validadas</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-gray-700">Devolvidas para<br/>Revisão Técnica</p>
          <span className="text-red-500">↩️</span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <h3 className="text-4xl font-bold text-gray-900">02</h3>
          <span className="text-xs text-gray-500 font-medium mb-1">casos</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-gray-700">Estagiários sob<br/>Orientação</p>
          <span className="text-blue-500">👥</span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <h3 className="text-4xl font-bold text-gray-900">10</h3>
          <span className="text-xs text-gray-500 font-medium mb-1">alunos ativos</span>
        </div>
      </div>
    </div>
  );
}