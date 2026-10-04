import {
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from '../../../components/icons/CorporateIcons';

export function ApprovalQueue() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-emerald-800" />
            <span>Fila de Homologação de Procedimentos Odontológicos</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Fichas clínicas submetidas pelas duplas do estágio para visto digital</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">
            5 pendentes
          </span>
          <button
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Atualizar fila"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Cartão 1 */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 relative">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h4 className="font-bold text-slate-900 text-sm">
                Paciente: M. A. S. <span className="text-slate-400 font-mono text-xs font-normal">Ficha #0884/26</span>
              </h4>
            </div>
            <div className="text-right text-xs text-slate-500 font-mono">
              <p>Cadeira 04 • Realizada em</p>
              <p className="font-bold text-slate-700">15/09 (10:00)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Dupla Clínica Responsável:</p>
              <p className="font-semibold text-slate-900">Lucas Vasconcelos (Op.) & Gabriela Prado (Aux.)</p>
              <p className="text-slate-500 font-mono text-[11px]">9º Período • Matrícula: 01498231</p>
            </div>
            <div>
              <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">Procedimento / CID-10:</p>
              <p className="font-medium text-slate-800">Restauração em Resina Composta dente 36 (Classe II MOD) • K02.1</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Registro Clínico & Conduta Operatória:</p>
            <p className="text-xs text-slate-700 bg-white p-3 border border-slate-200/80 rounded-xl leading-relaxed">
              Remoção de tecido cariado, isolamento absoluto efetivo, condicionamento ácido seletivo em esmalte, sistema adesivo autocondicionante e inserção incremental de resina Filtek Z350 cor A2 com acabamento e ajuste oclusal em papel carbono.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3.5 border-t border-slate-200/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Alerta de Penicilina conferido • Odontograma 2D sincronizado</span>
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                <span>Ver Odontograma</span>
              </button>
              <button
                type="button"
                className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span>Homologar com Visto Digital</span>
              </button>
            </div>
          </div>
        </div>

        {/* Cartão 2 */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">
                Paciente: J. F. O. <span className="text-slate-400 font-mono text-[11px] font-normal">Ficha #0912/26</span>
              </h4>
              <p className="text-[11px] text-slate-500">Exame Periodontal Inicial e Profilaxia • Dupla: Marlon & Camila</p>
            </div>
          </div>
          <button
            type="button"
            className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
          >
            Emitir Parecer
          </button>
        </div>
      </div>
    </div>
  );
}