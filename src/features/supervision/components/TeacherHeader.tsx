import { useAuth } from '../../auth/context/AuthContext';

/**
 * Cabeçalho do docente supervisor.
 *
 * "CRO-SE 4821" e "Turma ODO-2026.2-D1" eram literais: apareciam iguais para
 * qualquer usuário que abrisse a tela. O nome vem do login.
 */
export function TeacherHeader() {
  const { user } = useAuth();

  const iniciais = (user?.nome || 'Docente')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white dark:bg-[#0E1729] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#0a1526] dark:bg-blue-700 text-white rounded-xl flex items-center justify-center text-xl font-bold shadow-xs">
          {iniciais}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{user?.nome || 'Docente Supervisor(a)'}</h2>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex flex-col md:flex-row md:items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Docente Supervisor(a) de Odontologia Clínica
            </span>
            <span className="hidden md:inline text-slate-300 dark:text-slate-600">•</span>
            <span>Clínica Odontológica Integrada / Estágio Supervisionado</span>
          </div>
        </div>
      </div>
    </div>
  );
}