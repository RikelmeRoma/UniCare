export function LoginInfoPanel() {
  return (
    <div className="hidden lg:flex w-1/2 bg-[#0a1526] text-white p-12 flex-col justify-between relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-transparent"></div>
      
      <div className="relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 text-xs font-medium text-blue-100 mb-8 border border-white/10">
          <span>🏥</span> Clínicas Integradas UNINASSAU
        </span>
        <h2 className="text-4xl font-bold leading-tight mb-4 text-white">
          Formando profissionais com rigor científico e cuidado humano.
        </h2>
        <p className="text-blue-200/80 text-sm leading-relaxed max-w-md">
          Ambiente unificado para registros de prontuários, planos terapêuticos e evolução supervisionada das Clínicas de Psicologia e Odontologia.
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 mt-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            📍
          </div>
          <div>
            <p className="text-sm font-semibold">Unidade Aracaju</p>
            <p className="text-xs text-blue-300">Ambiente Seguro & Monitorado</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          Sistema Ativo
        </div>
      </div>
    </div>
  );
}