import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '../../../../components/icons/CorporateIcons';

export function PsySupervisionStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-slate-700">Evoluções Aguardando<br/>Homologação</p>
          <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
            <DocumentTextIcon className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <h3 className="text-3xl font-bold text-slate-900 font-mono">06</h3>
          <span className="text-[11px] text-amber-800 font-semibold mb-1">pendentes</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-slate-700">Sessões Homologadas<br/>na Semana</p>
          <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircleIcon className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <h3 className="text-3xl font-bold text-slate-900 font-mono">24</h3>
          <span className="text-[11px] text-emerald-700 font-semibold mb-1">validadas</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-slate-700">Devolvidas para<br/>Revisão Técnica</p>
          <span className="p-2 bg-red-50 text-red-700 rounded-xl">
            <ExclamationTriangleIcon className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <h3 className="text-3xl font-bold text-slate-900 font-mono">02</h3>
          <span className="text-[11px] text-red-700 font-semibold mb-1">em ajuste</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-bold text-slate-700">Estagiários sob<br/>Orientação</p>
          <span className="p-2 bg-blue-50 text-blue-700 rounded-xl">
            <UserGroupIcon className="w-4 h-4" />
          </span>
        </div>
        <div className="flex items-end gap-2 mt-2">
          <h3 className="text-3xl font-bold text-slate-900 font-mono">10</h3>
          <span className="text-[11px] text-blue-700 font-semibold mb-1">acadêmicos</span>
        </div>
      </div>
    </div>
  );
}