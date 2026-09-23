export function FeedbackPanel() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full">
      
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span className="text-blue-600">📝</span> Devolutiva Pedagógica
        </h3>
        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">Normativa CFO</span>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="col-span-1 text-gray-500 font-medium">Dupla Selecionada:</div>
          <div className="col-span-2 font-bold text-gray-900">Lucas Vasconcelos & Gabriela Prado (Cadeira 04)</div>
          
          <div className="col-span-1 text-gray-500 font-medium mt-2">Ficha / Dente:</div>
          <div className="col-span-2 font-medium text-gray-900 mt-2">#0884/26 (Dente 36 MOD)</div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Checklist Normativo & Clínico (CFO)</p>
        <div className="space-y-3 text-xs text-gray-700">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-blue-600" />
            <div>
              <span className="font-bold block">Anamnese e Risco Sistêmico:</span>
              <span className="text-gray-500">Verificação de PA, glicemia, alergias, medicamentos e termo de consentimento.</span>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-blue-600" />
            <div>
              <span className="font-bold block">Odontograma FDI & Periodograma:</span>
              <span className="text-gray-500">Preenchimento anatômico correto e indicação de faces restauradas.</span>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-blue-600" />
            <div>
              <span className="font-bold block">Técnica Anestésica & Materiais:</span>
              <span className="text-gray-500">Descrição do sal anestésico, vasoconstritor, tubetes e lote dos biomateriais.</span>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded border-gray-300 text-blue-600" />
            <div>
              <span className="font-bold block">Assinatura da Dupla:</span>
              <span className="text-gray-500">Validação do Operador Titular e Auxiliar Clínico.</span>
            </div>
          </label>
        </div>
      </div>

      <div className="flex-1 mb-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Parecer do Supervisor / Orientações Clínicas:</p>
        <textarea 
          className="w-full h-24 text-xs p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none resize-none bg-gray-50 text-gray-400"
          placeholder="Realize o apontamento odontológico, biossegurança e validação do procedimento..."
        ></textarea>
        
        <div className="mt-3 bg-blue-50 border border-blue-100 rounded p-2 flex items-center gap-2 text-xs text-blue-800">
          <span>✔️</span>
          <div>
            <span className="font-semibold block">Carimbo Digital Docente</span>
            <span>Docente Supervisor(a) Clínico Integrada • CRO-SE 4821</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-auto">
        <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium text-sm py-3 rounded-lg flex justify-center items-center gap-2 transition-colors">
          <span>✅</span> Homologar Procedimento & Assinar
        </button>
        <button className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-200 font-medium text-sm py-2.5 rounded-lg flex justify-center items-center gap-2 transition-colors">
          <span>↩️</span> Solicitar Ajuste à Dupla
        </button>
      </div>
    </div>
  );
}