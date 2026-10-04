import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="flex items-center gap-3.5 text-red-600 mb-5">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-700 flex items-center justify-center border border-red-200">
            <LockClosedIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
              Controle de Acesso RBAC • Norma RN-001 & LGPD
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">Acesso Restrito ao Módulo Clínico</h1>
          </div>
        </div>

        <div className="bg-red-50/70 border border-red-200 p-4 rounded-xl mb-6 text-xs text-red-900 space-y-2">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldCheckIcon className="w-4 h-4 text-red-700 shrink-0" />
            <span>Salvaguarda Regulamentar Ativa (Resolução CFP nº 06/2019 & CFO):</span>
          </p>
          <p className="leading-relaxed">
            O perfil atual (<strong className="capitalize">{user?.perfil || 'Não autenticado'}</strong>: {user?.nome}) não possui autorização legal para visualizar o conteúdo de prontuários clínicos da rota{' '}
            <code className="bg-red-100 px-1.5 py-0.5 rounded text-red-950 font-mono text-[11px] font-bold">{attemptedPath}</code>.
          </p>
          <p className="text-[11px] text-red-700 leading-relaxed">
            Perfis de Recepção têm acesso restrito ao fluxo de agendamento e acolhimento presencial, sendo expressamente vedado o acesso a anotações psicoterápicas ou fichas evolutivas.
          </p>
        </div>

        <div className="border-t border-slate-100 pt-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (user?.perfil === 'estagiario' && user?.curso === 'psicologia') {
                navigate('/psi/prontuario');
              } else if (user?.perfil === 'estagiario' && user?.curso === 'odontologia') {
                navigate('/ficha-odonto');
              } else if (user?.perfil === 'supervisor' && user?.curso === 'psicologia') {
                navigate('/psi/supervisao');
              } else if (user?.perfil === 'supervisor' && user?.curso === 'odontologia') {
                navigate('/supervisao');
              } else if (user?.perfil === 'recepcao') {
                navigate('/recepcao');
              } else if (user?.perfil === 'rt') {
                navigate('/rt/relatorios');
              } else {
                navigate('/login');
              }
            }}
            className="w-full sm:w-auto bg-[#002B49] hover:bg-[#001D33] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 border border-[#001D33]"
          >
            <ShieldCheckIcon className="w-4 h-4 text-[#FFD100]" />
            <span>Voltar ao Meu Módulo Autorizado</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto text-xs text-slate-500 hover:text-slate-900 font-semibold px-4 py-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Ir para Tela de Login
          </button>
        </div>
      </div>
    </div>
  );
}
