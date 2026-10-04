export function TeacherHeader() {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#0a1526] text-white rounded-xl flex items-center justify-center text-xl font-bold">
          ODO
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">Docente Supervisor(a) de Odontologia Clínica</h2>
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-medium border border-blue-100">
              CRO-SE 4821
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1 flex flex-col md:flex-row md:items-center gap-2">
            <span className="text-green-600 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Docente Titular / RT Odonto
            </span>
            <span className="hidden md:inline">•</span>
            <span>Clínica Odontológica Integrada / Estágio Supervisionado</span>
            <span className="hidden md:inline">•</span>
            <span className="font-medium">Turma ODO-2026.2-D1 - Coordenação Acadêmica de Odontologia</span>
          </div>
        </div>
      </div>
    </div>
  );
}