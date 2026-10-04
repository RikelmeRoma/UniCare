import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  XMarkIcon,
} from '../../../../components/icons/CorporateIcons';

export function PsyReceptionStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Agendados Hoje</p>
          <h3 className="text-3xl font-bold text-slate-900 font-mono">28</h3>
          <p className="text-[10px] text-slate-400 mt-1">Sessões individuais SPA</p>
        </div>
        <span className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
          <CalendarIcon className="w-4 h-4" />
        </span>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">Sala de Espera SPA</p>
          <h3 className="text-3xl font-bold text-blue-700 font-mono">04</h3>
          <p className="text-[10px] text-blue-700 font-medium mt-1">Pacientes no hall de acolhimento</p>
        </div>
        <span className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
          <ClockIcon className="w-4 h-4" />
        </span>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-2">Em Psicoterapia</p>
          <h3 className="text-3xl font-bold text-slate-900 font-mono">07</h3>
          <p className="text-[10px] text-emerald-800 font-medium mt-1">7 de 10 consultórios em uso</p>
        </div>
        <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
          <UserGroupIcon className="w-4 h-4" />
        </span>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">Desmarcações do Dia</p>
          <h3 className="text-3xl font-bold text-amber-700 font-mono">02</h3>
          <p className="text-[10px] text-amber-800 font-medium mt-1">Vagas remanejadas</p>
        </div>
        <span className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
          <XMarkIcon className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}