import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '../../../components/icons/CorporateIcons';

export function ReceptionStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Agendados Hoje */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Agendados Hoje</p>
          <h3 className="text-3xl font-bold text-slate-900 font-mono">42</h3>
          <p className="text-[10px] text-slate-400 mt-1">Capacidade de boxes 100%</p>
        </div>
        <span className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
          <CalendarIcon className="w-4 h-4" />
        </span>
      </div>

      {/* Em Espera */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">Em Espera na Recepção</p>
          <h3 className="text-3xl font-bold text-amber-700 font-mono">6</h3>
          <p className="text-[10px] text-amber-800 font-medium mt-1">Tempo médio: 8 min</p>
        </div>
        <span className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
          <ClockIcon className="w-4 h-4" />
        </span>
      </div>

      {/* Em Atendimento */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">Em Atendimento</p>
          <h3 className="text-3xl font-bold text-blue-700 font-mono">12</h3>
          <p className="text-[10px] text-blue-700 font-medium mt-1">Boxes 01 a 12 ocupados</p>
        </div>
        <span className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
          <UserGroupIcon className="w-4 h-4" />
        </span>
      </div>

      {/* Faltas */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
        <div>
          <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-2">Faltas Registradas</p>
          <h3 className="text-3xl font-bold text-red-700 font-mono">3</h3>
          <p className="text-[10px] text-red-700 font-medium mt-1">Taxa absenteísmo 7.1%</p>
        </div>
        <span className="p-2.5 bg-red-50 text-red-700 rounded-xl">
          <ExclamationTriangleIcon className="w-4 h-4" />
        </span>
      </div>
    </div>
  );
}