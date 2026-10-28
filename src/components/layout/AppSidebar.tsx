import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import {
  CalendarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  KeyIcon,
} from '../icons/CorporateIcons';

export function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getLinkStyle = ({ isActive }: { isActive: boolean }) => {
    let activeClass = 'bg-slate-900 text-white shadow-xs';
    if (isPsicoUser) {
      activeClass = 'bg-blue-700 text-white shadow-xs';
    } else if (isOdontoUser) {
      activeClass = 'bg-[#881337] text-white shadow-xs';
    } else if (isRecepcao) {
      activeClass = 'bg-[#B45309] text-white shadow-xs';
    } else if (isRT) {
      activeClass = 'bg-[#002B49] text-white shadow-xs';
    }

    return `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all ${
      isActive
        ? activeClass
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;
  };

  const isPsicoUser = user?.curso === 'psicologia' && user?.perfil !== 'rt' && user?.perfil !== 'recepcao';
  const isOdontoUser = user?.curso === 'odontologia' && user?.perfil !== 'rt' && user?.perfil !== 'recepcao';
  const isRecepcao = user?.perfil === 'recepcao';
  const isRT = user?.perfil === 'rt';

  // As rotas de recepção são segregadas por curso no ProtectedRoute
  // (allowedCourses). O menu offering os dois links para qualquer recepção
  // fazia um deles cair sempre em /nao-autorizado: REC-001 via 403 em
  // /psi/recepcao e REC-002 via 403 em /recepcao. A RT segue a mesma regra:
  // cada uma vê só a seção da própria clínica.
  const mostrarRecepcaoPsi = user?.curso === 'psicologia';
  const mostrarRecepcaoOdonto = user?.curso === 'odontologia';

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen justify-between select-none z-30 shadow-2xs">
      <div>
        {/* Faixa Institucional UNINASSAU Oficial com Brasão Veritas */}
        <div className="bg-[#002B49] px-3.5 py-2 flex items-center justify-between text-white border-b border-[#001D33] shadow-xs">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white rounded-md shadow-xs flex items-center justify-center">
              <img
                src="/uninassau-crest.png"
                alt="Brasão UNINASSAU"
                className="h-6 w-auto object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="tracking-widest font-black text-white text-[11px] leading-tight">
                UNINASSAU
              </span>
              <span className="text-[7.5px] text-[#FFD100] font-mono tracking-widest font-bold">
                VERITAS
              </span>
            </div>
          </div>
          <span className="text-slate-200 uppercase text-[9px] font-mono tracking-tight font-semibold bg-white/10 px-2 py-0.5 rounded border border-white/10">
            Aracaju
          </span>
        </div>

        {/* Cabeçalho da Marca & Curso */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                isPsicoUser
                  ? 'bg-blue-700'
                  : isOdontoUser
                  ? 'bg-[#881337]'
                  : isRT
                  ? 'bg-[#002B49]'
                  : 'bg-[#B45309]'
              }`}
            >
              {isPsicoUser ? 'SPA' : isOdontoUser ? 'ODO' : isRT ? 'RT' : 'REC'}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight truncate">
                {isPsicoUser
                  ? 'UniCare Psicologia'
                  : isOdontoUser
                  ? 'UniCare Odonto'
                  : isRT
                  ? 'UniCare Controladoria'
                  : 'UniCare Recepção'}
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5 truncate">
                Hospital-Escola Integrado
              </p>
            </div>
          </div>

          {/* Sub-badge normativo específico do curso com cor oficial.
              O selo de psicologia saiu: era decoração de conformidade repetida
              em cada tela da clínica. A regra que ele citava (RN-002, vedação
              de aspas) continua valendo no servidor e continua aparecendo na
              tela no momento em que o estagiário digita a aspa. */}
          <div className="mt-2.5">
            {isOdontoUser && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-[#881337] border border-rose-200/70">
                Supervisão Clínica CFO
              </span>
            )}
            {isRecepcao && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                Acolhimento & Triagem Geral
              </span>
            )}
            {isRT && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-[#002B49] border border-indigo-200/70">
                Diretoria Técnica & Compliance
              </span>
            )}
          </div>
        </div>


        {/* NAVEGAÇÃO ESTRITAMENTE SEGREGADA CONFORME PERMISSÃO DO USUÁRIO */}
        <nav className="px-3 py-3 space-y-4">
          {/* 1. SE FOR PSICOLOGIA (INCLUSIVE A RT DE PSICOLOGIA) */}
          {(isPsicoUser || (isRT && user?.curso === 'psicologia')) && (
            <div>
              <h2 className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Serviço de Psicologia (SPA)
              </h2>
              <ul className="space-y-1">
                {/* Prontuário Psicológico: Estagiário, Supervisor e RT */}
                {(user?.perfil === 'estagiario' || user?.perfil === 'supervisor' || isRT) && (
                  <li>
                    <NavLink to="/psi/prontuario" className={getLinkStyle}>
                      <DocumentTextIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Prontuário Psicológico</span>
                    </NavLink>
                  </li>
                )}

                {/* Meus Agendamentos: só o estagiário. Supervisor e RT têm a
                    agenda da clínica inteira na recepção; aqui a lista é filtrada
                    pela matrícula de quem chama, e a deles não é de estagiário
                    nenhum — veria uma tela vazia sem motivo. */}
                {user?.perfil === 'estagiario' && mostrarRecepcaoPsi && (
                  <li>
                    <NavLink to="/psi/agendamentos" className={getLinkStyle}>
                      <CalendarIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Meus Agendamentos</span>
                    </NavLink>
                  </li>
                )}

                {/* Supervisão Docente SPA: Apenas Supervisor e RT (Não aparece para Estagiário) */}
                {(user?.perfil === 'supervisor' || isRT) && (
                  <li>
                    <NavLink to="/psi/supervisao" className={getLinkStyle}>
                      <ShieldCheckIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Supervisão Docente SPA</span>
                    </NavLink>
                  </li>
                )}

                {/* Agenda & Triagem SPA: Apenas Recepção e RT (Não aparece para Estagiário/Supervisor) */}
                {((isRecepcao && mostrarRecepcaoPsi) || isRT) && (
                  <li>
                    <NavLink to="/psi/recepcao" className={getLinkStyle}>
                      <CalendarIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Agenda & Triagem SPA</span>
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 2. SE FOR ODONTOLOGIA (INCLUSIVE A RT DE ODONTOLOGIA) */}
          {(isOdontoUser || (isRT && user?.curso === 'odontologia')) && (
            <div>
              <h2 className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Clínica Odontológica
              </h2>
              <ul className="space-y-1">
                {/* Ficha Clínica Odontológica: Estagiário, Supervisor e RT */}
                {(user?.perfil === 'estagiario' || user?.perfil === 'supervisor' || isRT) && (
                  <li>
                    <NavLink to="/ficha-odonto" className={getLinkStyle}>
                      <DocumentTextIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Ficha Clínica Odontológica</span>
                    </NavLink>
                  </li>
                )}

                {/* Agenda odontológica: o estagiário vê a própria dupla;
                    supervisor e RT veem o escopo que o servidor devolve. */}
                {(user?.perfil === 'estagiario' ||
                  user?.perfil === 'supervisor' ||
                  isRT) && (
                  <li>
                    <NavLink to="/odonto/agendamentos" className={getLinkStyle}>
                      <CalendarIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>
                        {user?.perfil === 'estagiario'
                          ? 'Meus Agendamentos'
                          : 'Agendamentos Odonto'}
                      </span>
                    </NavLink>
                  </li>
                )}

                {/* Supervisão Odontologia: Apenas Supervisor e RT (Não aparece para Estagiário) */}
                {(user?.perfil === 'supervisor' || isRT) && (
                  <li>
                    <NavLink to="/supervisao" className={getLinkStyle}>
                      <ShieldCheckIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Supervisão Odontologia</span>
                    </NavLink>
                  </li>
                )}

                {/* Recepção Odontológica: Apenas Recepção e RT (Não aparece para Estagiário/Supervisor) */}
                {((isRecepcao && mostrarRecepcaoOdonto) ||
                  isRT ||
                  (user?.perfil === 'supervisor' && user?.curso === 'odontologia')) && (
                  <li>
                    <NavLink to="/recepcao" className={getLinkStyle}>
                      <CalendarIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Recepção Odontológica</span>
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 3. SE FOR RECEPÇÃO */}
          {isRecepcao && (
            <div>
              <h2 className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Central de Recepção & Agendamento
              </h2>
              <ul className="space-y-1">
                {mostrarRecepcaoOdonto && (
                  <li>
                    <NavLink to="/recepcao" className={getLinkStyle}>
                      <CalendarIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Recepção Odontologia</span>
                    </NavLink>
                  </li>
                )}
                {mostrarRecepcaoPsi && (
                  <li>
                    <NavLink to="/psi/recepcao" className={getLinkStyle}>
                      <CalendarIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Recepção SPA (Psicologia)</span>
                    </NavLink>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 4. SE FOR RT MASTER: CONTROLADORIA, AUDITORIA & CUSTÓDIA */}
          {isRT && (
            <div className="pt-2 border-t border-slate-100">
              <h2 className="px-2 text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BuildingOfficeIcon className="w-3.5 h-3.5" />
                <span>Controladoria & RT Master</span>
              </h2>
              <ul className="space-y-1">
                <li>
                  <NavLink to="/rt/relatorios" className={getLinkStyle}>
                    <ChartBarIcon className="w-4 h-4 shrink-0 text-indigo-600" />
                    <span>Painel Executivo & Custódia</span>
                  </NavLink>
                </li>
              </ul>
            </div>
          )}
        </nav>
      </div>

      {/* RODAPÉ DO SIDEBAR: Perfil do Usuário e Simulador Rápido */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between gap-2">
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-900 truncate leading-snug">{user?.nome || 'Usuário'}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate font-mono">
              {user?.perfil} • {user?.curso}
            </p>
          </div>

          <div className="flex items-center gap-1">
            {/* Troca de senha: vale para todo perfil logado, nas duas
                clínicas. Sem `allowedRoles` na rota de propósito. */}
            <NavLink
              to="/conta/senha"
              className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              title="Alterar minha senha"
            >
              <KeyIcon className="w-4 h-4" />
            </NavLink>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="Encerrar Sessão"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
