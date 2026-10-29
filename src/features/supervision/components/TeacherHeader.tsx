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
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#0a1526] text-white rounded-xl flex items-center justify-center text-xl font-bold">
          {iniciais}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-gray-900">{user?.nome || 'Docente Supervisor(a)'}</h2>
          </div>
          <div className="text-sm text-gray-500 mt-1 flex flex-col md:flex-row md:items-center gap-2">
            <span className="text-green-600 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Docente Supervisor(a) de Odontologia Clínica
            </span>
            <span className="hidden md:inline">•</span>
            <span>Clínica Odontológica Integrada / Estágio Supervisionado</span>
          </div>
        </div>
      </div>
    </div>
  );
}