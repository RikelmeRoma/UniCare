export function PatientHeader() {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xl font-bold">
          CS
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">Carlos Silva e Santos</h2>
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded font-medium border border-blue-100">
              Prontuário Ativo
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            42 anos • Masc. • CPF: 123.456.789-00 • RG: 1234567-SSP/SE
          </p>
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="text-right">
          <p className="text-xs text-gray-400 font-semibold uppercase">Última Consulta</p>
          <p className="text-sm font-medium text-gray-800">12/08/2026</p>
        </div>
        <div className="w-px bg-gray-200"></div>
        <div className="text-right">
          <p className="text-xs text-gray-400 font-semibold uppercase">Risco Sistêmico</p>
          <p className="text-sm font-bold text-orange-500">ASA II</p>
        </div>
      </div>
    </div>
  );
}