import {
  DocumentTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '../../../components/icons/CorporateIcons';

export function FeedbackPanel() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-emerald-800" />
          <span>Devolutiva Pedagógica</span>
        </h3>
        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          Supervisão CFO
        </span>
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-6">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="col-span-1 text-slate-500 font-medium">Dupla Selecionada:</div>
          <div className="col-span-2 font-bold text-slate-900">Lucas Vasconcelos & Gabriela Prado (Cadeira 04)</div>
          
          <div className="col-span-1 text-slate-500 font-medium mt-1.5">Ficha / Dente:</div>
          <div className="col-span-2 font-mono text-slate-800 mt-1.5">#0884/26 (Dente 36 MOD)</div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Checklist Normativo & Clínico (CFO)</p>
        <div className="space-y-3 text-xs text-slate-700">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <div>
              <span className="font-bold block text-slate-900">Anamnese e Risco Sistêmico:</span>
              <span className="text-slate-500">Verificação de PA, glicemia, alergias, medicamentos e termo de consentimento.</span>
            </div>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <div>
              <span className="font-bold block text-slate-900">Odontograma FDI & Periodograma:</span>
              <span className="text-slate-500">Preenchimento anatômico correto e indicação de faces restauradas.</span>
            </div>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <div>
              <span className="font-bold block text-slate-900">Técnica Anestésica & Materiais:</span>
              <span className="text-slate-500">Descrição do sal anestésico, vasoconstritor, tubetes e lote dos biomateriais.</span>
            </div>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <div>
              <span className="font-bold block text-slate-900">Assinatura da Dupla:</span>
              <span className="text-slate-500">Validação do Operador Titular e Auxiliar Clínico.</span>
            </div>
          </label>
        </div>
      </div>

      <div className="flex-1 mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Parecer do Supervisor / Orientações Clínicas:</p>
        <textarea 
          rows={3}
          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none resize-none bg-slate-50/50 text-slate-700"
          placeholder="Registre apontamentos sobre técnica restauradora, biossegurança e validação pedagógica..."
        ></textarea>
        
        <div className="mt-3 bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-900">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold block text-[11px]">Assinatura e Visto Eletrônico Docente</span>
            <span className="text-[10px] text-emerald-700 font-mono">Orientadora Clínica • CRO-SE 4512</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-auto">
        <button
          type="button"
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3 rounded-xl flex justify-center items-center gap-2 transition-colors shadow-xs"
        >
          <CheckCircleIcon className="w-4 h-4" />
          <span>Homologar Procedimento com Visto Digital</span>
        </button>
        <button
          type="button"
          className="w-full bg-white hover:bg-amber-50 text-amber-800 border border-amber-200/80 font-semibold text-xs py-2.5 rounded-xl flex justify-center items-center gap-2 transition-colors"
        >
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
          <span>Solicitar Ajuste ou Reavaliação à Dupla</span>
        </button>
      </div>
    </div>
  );
}