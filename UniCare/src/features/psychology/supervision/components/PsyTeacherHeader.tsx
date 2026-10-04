import {
  ShieldCheckIcon,
  LockClosedIcon,
  UserGroupIcon,
} from '../../../../components/icons/CorporateIcons';

export function PsyTeacherHeader() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-xl font-bold text-slate-900">Prof. Dr. Robert Santos do Carmo</h2>
          <span className="bg-blue-700 text-white text-xs px-2.5 py-0.5 rounded-md font-bold font-mono">
            CRP 19/0844
          </span>
        </div>
        <p className="text-xs font-semibold text-blue-700 mb-2">
          Docente Supervisor de Psicologia Clínica • Ênfase em Saúde Mental e Psicoterapia Individual
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <UserGroupIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>Turma PSI-2026.2-T1</span>
          </span>
          <span className="text-slate-300">•</span>
          <span>Estágio Supervisionado Específico I e II</span>
          <span className="text-slate-300">•</span>
          <span>Serviço de Psicologia Aplicada (SPA)</span>
        </div>
      </div>
      
      <div className="flex gap-3">
        <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200/80 p-3 rounded-xl">
          <ShieldCheckIcon className="w-5 h-5 text-blue-700 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-blue-900 uppercase leading-tight">Conformidade Técnica</p>
            <p className="text-[10px] text-blue-700 font-semibold">Resolução CFP nº 06/2019</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl">
          <LockClosedIcon className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-emerald-900 uppercase leading-tight">Custódia Sigilosa</p>
            <p className="text-[10px] text-emerald-700 font-semibold">LGPD Artigo 11</p>
          </div>
        </div>
      </div>
    </div>
  );
}