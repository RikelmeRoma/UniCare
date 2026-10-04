export function TermsCheckboxes() {
  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="flex-shrink-0 mt-0.5">
          <input 
            type="checkbox" 
            className="w-4 h-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500 bg-indigo-50/40" 
          />
        </div>
        <div className="text-sm">
          <span className="font-semibold text-gray-800">Sigilo Profissional e LGPD: </span>
          <span className="text-gray-600">
            Comprometo-me formalmente com o sigilo profissional dos dados de saúde dos pacientes, conforme normas éticas (CFP/CFO) e Lei nº 13.709/2018.
          </span>
        </div>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <div className="flex-shrink-0 mt-0.5">
          <input 
            type="checkbox" 
            className="w-4 h-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500 bg-indigo-50/40" 
          />
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">Trilha de Auditoria: </span> 
          Estou ciente de que todos os acessos e registros no prontuário eletrônico são rastreados para conformidade médica.
        </div>
      </label>
    </div>
  );
}