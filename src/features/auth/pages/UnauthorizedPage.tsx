import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDestinationRoute } from '../routes';
import { ThemeToggle } from '../../../components/ui/ThemeToggle';
import {
  LockClosedIcon,
  ShieldCheckIcon,
} from '../../../components/icons/CorporateIcons';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const attemptedPath = (location.state as { from?: { pathname?: string } })?.from?.pathname || location.pathname;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#060B16] flex flex-col items-center justify-center p-6 font-sans transition-colors">
      <div className="w-full max-w-xl flex justify-end mb-3">
        <ThemeToggle />
      </div>
      <div className="max-w-xl w-full bg-white dark:bg-[#0D1628] rounded-2xl shadow-xl dark:shadow-black/50 p-8 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3.5 text-red-600 dark:text-red-400 mb-5">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 flex items-center justify-center border border-red-200 dark:border-red-800/70">
            <LockClosedIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800/70">
              Controle de Acesso RBAC • LGPD
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">Acesso Restrito ao Módulo Clínico</h1>
          </div>
        </div>

        <div className="bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 p-4 rounded-xl mb-6 text-xs text-red-900 dark:text-red-200 space-y-2">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldCheckIcon className="w-4 h-4 text-red-700 dark:text-red-400 shrink-0" />
            <span>Salvaguarda Regulamentar Ativa (Resolução CFP nº 06/2019 & CFO):</span>
          </p>
          <p className="leading-relaxed">
            O perfil atual (<strong className="capitalize">{user?.perfil || 'Não autenticado'}</strong>: {user?.nome}) não possui autorização legal para visualizar o conteúdo de prontuários clínicos da rota{' '}
            <code className="bg-red-100 dark:bg-red-900/60 px-1.5 py-0.5 rounded text-red-950 dark:text-red-100 font-mono text-[11px] font-bold">{attemptedPath}</code>.
          </p>
          <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed">
            Perfis de Recepção têm acesso restrito ao fluxo de agendamento e acolhimento presencial, sendo expressamente vedado o acesso a anotações psicoterápicas ou fichas evolutivas.
          </p>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              navigate(user ? getDestinationRoute(user) : '/login');
            }}
            className="w-full sm:w-auto bg-[#002B49] hover:bg-[#001D33] dark:bg-blue-700 dark:hover:bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 border border-[#001D33] dark:border-blue-600 cursor-pointer"
          >
            <ShieldCheckIcon className="w-4 h-4 text-[#FFD100]" />
            <span>Voltar ao Meu Módulo Autorizado</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Ir para Tela de Login
          </button>
        </div>
      </div>
    </div>
  );
}
