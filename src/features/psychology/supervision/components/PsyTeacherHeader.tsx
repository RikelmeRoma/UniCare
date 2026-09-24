export function PsyTeacherHeader() {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-2xl font-bold text-[#0a1526]">Prof. Dr. Orientador Clínico</h2>
          <span className="bg-[#0a1526] text-white text-xs px-2 py-0.5 rounded font-bold">CRP 19/0844</span>
        </div>
        <p className="text-sm font-medium text-blue-600 mb-2">Docente Supervisor(a) de Psicologia Clínica - Ênfase em Clínica e Saúde Mental</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="text-blue-500">👥</span> Turma PSI-2026.2-T1</span>
          <span>•</span>
          <span>Estágio Supervisionado Específico I e II</span>
          <span>•</span>
          <span>Coordenação do Serviço de Psicologia Aplicada (SPA)</span>
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-3 rounded-lg">
          <span className="text-blue-600 text-xl">🛡️</span>
          <div>
            <p className="text-[10px] font-bold text-blue-800 uppercase leading-tight">Conformidade<br/>Técnica</p>
            <p className="text-[9px] text-blue-600">Resolução CFP nº 06/2019</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 p-3 rounded-lg">
          <span className="text-green-600 text-xl">🔒</span>
          <div>
            <p className="text-[10px] font-bold text-green-800 uppercase leading-tight">Garantia<br/>Sigilosa</p>
            <p className="text-[9px] text-green-600">Ética e Sigilo Profissional</p>
          </div>
        </div>
      </div>
    </div>
  );
}