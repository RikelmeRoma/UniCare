import type { ComponentType } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import {
  CalendarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  type IconProps,
} from '../icons/CorporateIcons';

interface AppSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface SidebarNavItemProps {
  to: string;
  label: string;
  icon: ComponentType<IconProps>;
  collapsed: boolean;
  activeThemeClass: string;
  onCloseMobile?: () => void;
}

function SidebarNavItem({
  to,
  label,
  icon: Icon,
  collapsed,
  activeThemeClass,
  onCloseMobile,
}: SidebarNavItemProps) {
  const getLinkStyle = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center ${
      collapsed ? 'lg:justify-center lg:px-2' : ''
    } gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-tight transition-all ${
      isActive
        ? activeThemeClass
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
    }`;

  return (
    <li>
      <NavLink
        to={to}
        title={collapsed ? label : undefined}
        onClick={() => onCloseMobile?.()}
        className={getLinkStyle}
      >
        {({ isActive }) => (
          <>
            <Icon
              className={`w-4 h-4 shrink-0 transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
              }`}
            />
            <span className={collapsed ? 'lg:hidden truncate' : 'truncate'}>{label}</span>
          </>
        )}
      </NavLink>
    </li>
  );
}

export function AppSidebar({
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
}: AppSidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onCloseMobile?.();
    navigate('/login');
  };

  const isPsicoUser =
    user?.curso === 'psicologia' &&
    user?.perfil !== 'rt' &&
    user?.perfil !== 'recepcao' &&
    user?.perfil !== 'coordenacao';
  const isOdontoUser =
    user?.curso === 'odontologia' && user?.perfil !== 'rt' && user?.perfil !== 'recepcao';
  const isRecepcao = user?.perfil === 'recepcao';
  const isRT = user?.perfil === 'rt';
  const isCoordenacao = user?.perfil === 'coordenacao';
  const isRTPsicologia = isRT && user?.curso === 'psicologia';

  const activeThemeClass = isPsicoUser
    ? 'bg-blue-700 text-white shadow-sm shadow-blue-900/20'
    : isOdontoUser
    ? 'bg-[#881337] text-white shadow-sm shadow-rose-950/30'
    : isRecepcao
    ? 'bg-[#B45309] text-white shadow-sm shadow-amber-950/25'
    : isRT
    ? 'bg-[#002B49] dark:bg-blue-700 text-white shadow-sm shadow-slate-950/30'
    : isCoordenacao
    ? 'bg-blue-800 text-white shadow-sm shadow-blue-950/30'
    : 'bg-slate-900 dark:bg-blue-700 text-white shadow-sm';

  const sharedNavProps = { collapsed, activeThemeClass, onCloseMobile };

  const mostrarRecepcaoPsi = user?.curso === 'psicologia';
  const mostrarRecepcaoOdonto = user?.curso === 'odontologia';

  const painelExecutivo = (
    <SidebarNavItem
      {...sharedNavProps}
      to="/rt/relatorios"
      label="Painel Executivo & Custódia"
      icon={ChartBarIcon}
    />
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 lg:static flex flex-col h-screen justify-between select-none bg-white dark:bg-[#0B1220] border-r border-slate-200/80 dark:border-slate-800/90 shadow-lg lg:shadow-2xs transition-all duration-200 shrink-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${collapsed ? 'w-64 lg:w-[76px]' : 'w-64'}`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Faixa Institucional UNINASSAU Oficial com Brasão Veritas */}
        <div className="bg-[#002B49] dark:bg-[#061325] px-3 py-2.5 flex items-center justify-between text-white border-b border-[#001D33] dark:border-slate-800/90 shadow-xs">
          <div className={`flex items-center gap-2 ${collapsed ? 'lg:mx-auto' : ''}`}>
            <div className="p-1 bg-white rounded-md shadow-xs flex items-center justify-center shrink-0">
              <img
                src="/uninassau-crest.png"
                alt="Brasão UNINASSAU"
                className="h-6 w-auto object-contain"
              />
            </div>
            <div className={`flex flex-col ${collapsed ? 'lg:hidden' : ''}`}>
              <span className="tracking-widest font-black text-white text-[11px] leading-tight">
                UNINASSAU
              </span>
              <span className="text-[7.5px] text-[#FFD100] font-mono tracking-widest font-bold">
                VERITAS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {!collapsed && (
              <span className="text-slate-200 uppercase text-[9px] font-mono tracking-tight font-semibold bg-white/10 px-2 py-0.5 rounded border border-white/10">
                Aracaju
              </span>
            )}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Fechar menu lateral"
                className="lg:hidden p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Cabeçalho da Marca & Curso + Botão de recolher (Desktop) */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#0B1220]">
          <div className={`flex items-center justify-between gap-2 ${collapsed ? 'lg:flex-col' : ''}`}>
            <div className={`flex items-center gap-3 min-w-0 ${collapsed ? 'lg:justify-center' : ''}`}>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 ${
                  isCoordenacao
                    ? 'bg-blue-800'
                    : isPsicoUser
                    ? 'bg-blue-700'
                    : isOdontoUser
                    ? 'bg-[#881337]'
                    : isRT
                    ? 'bg-[#002B49] dark:bg-blue-700'
                    : 'bg-[#B45309]'
                }`}
              >
                {isCoordenacao ? 'COORD' : isPsicoUser ? 'SPA' : isOdontoUser ? 'ODO' : isRT ? 'RT' : 'REC'}
              </div>
              <div className={`overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
                <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                  {isCoordenacao
                    ? 'UniCare Coordenação'
                    : isPsicoUser
                    ? 'UniCare Psicologia'
                    : isOdontoUser
                    ? 'UniCare Odonto'
                    : isRT
                    ? 'UniCare Controladoria'
                    : 'UniCare Recepção'}
                </h1>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider mt-0.5 truncate">
                  Hospital-Escola Integrado
                </p>
              </div>
            </div>

            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                title={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
                aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'}
                className="hidden lg:inline-flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              >
                {collapsed ? (
                  <ChevronRightIcon className="w-4 h-4" />
                ) : (
                  <ChevronLeftIcon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Sub-badge normativo específico do curso */}
          {!collapsed && (
            <div className="mt-2.5">
              {isOdontoUser && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-[#881337] border border-rose-200/70 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800/70">
                  Supervisão Clínica CFO
                </span>
              )}
              {isRecepcao && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/70">
                  Acolhimento & Triagem Geral
                </span>
              )}
              {isRT && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-[#002B49] border border-indigo-200/70 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800/70">
                  Diretoria Técnica & Compliance
                </span>
              )}
              {isCoordenacao && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200/70 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800/70">
                  Coordenação de Psicologia
                </span>
              )}
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO ESTRITAMENTE SEGREGADA CONFORME PERMISSÃO DO USUÁRIO */}
        <nav className="px-3 py-3 space-y-4">
          {/* 1. SE FOR PSICOLOGIA (OU RT DE PSICOLOGIA) */}
          {(isPsicoUser || isCoordenacao || isRTPsicologia) && (
            <div>
              {!collapsed && (
                <h2 className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  {isCoordenacao ? 'Coordenação de Psicologia' : 'Serviço de Psicologia (SPA)'}
                </h2>
              )}
              <ul className="space-y-1">
                {(user?.perfil === 'estagiario' ||
                  user?.perfil === 'supervisor' ||
                  isRT ||
                  isCoordenacao) && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/psi/prontuario"
                    label="Prontuário Psicológico"
                    icon={DocumentTextIcon}
                  />
                )}

                {user?.perfil === 'estagiario' && mostrarRecepcaoPsi && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/psi/agendamentos"
                    label="Meus Agendamentos"
                    icon={CalendarIcon}
                  />
                )}

                {(user?.perfil === 'supervisor' || isRT || isCoordenacao) && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/psi/supervisao"
                    label="Supervisão Docente SPA"
                    icon={ShieldCheckIcon}
                  />
                )}

                {((isRecepcao && mostrarRecepcaoPsi) || isRT || isCoordenacao) && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/psi/recepcao"
                    label="Agenda & Triagem SPA"
                    icon={CalendarIcon}
                  />
                )}

                {isCoordenacao && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/psi/coordenacao"
                    label="Painel & Gestão da Equipe"
                    icon={ChartBarIcon}
                  />
                )}

                {isRT && painelExecutivo}
              </ul>
            </div>
          )}

          {/* 2. SE FOR ODONTOLOGIA (OU RT DE ODONTOLOGIA) */}
          {(isOdontoUser || (isRT && !isRTPsicologia)) && (
            <div>
              {!collapsed && (
                <h2 className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Clínica Odontológica
                </h2>
              )}
              <ul className="space-y-1">
                {(user?.perfil === 'estagiario' || user?.perfil === 'supervisor' || isRT) && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/ficha-odonto"
                    label="Ficha Clínica Odontológica"
                    icon={DocumentTextIcon}
                  />
                )}

                {(user?.perfil === 'estagiario' || user?.perfil === 'supervisor' || isRT) && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/odonto/agendamentos"
                    label={
                      user?.perfil === 'estagiario'
                        ? 'Meus Agendamentos'
                        : 'Agendamentos Odonto'
                    }
                    icon={CalendarIcon}
                  />
                )}

                {(user?.perfil === 'supervisor' || isRT) && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/supervisao"
                    label="Supervisão Odontologia"
                    icon={ShieldCheckIcon}
                  />
                )}

                {((isRecepcao && mostrarRecepcaoOdonto) ||
                  isRT ||
                  (user?.perfil === 'supervisor' && user?.curso === 'odontologia')) && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/recepcao"
                    label="Recepção Odontológica"
                    icon={CalendarIcon}
                  />
                )}

                {isRT && !isRTPsicologia && painelExecutivo}
              </ul>
            </div>
          )}

          {/* 3. SE FOR RECEPÇÃO */}
          {isRecepcao && (
            <div>
              {!collapsed && (
                <h2 className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Central de Recepção & Agendamento
                </h2>
              )}
              <ul className="space-y-1">
                {mostrarRecepcaoOdonto && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/recepcao"
                    label="Recepção Odontologia"
                    icon={CalendarIcon}
                  />
                )}
                {mostrarRecepcaoPsi && (
                  <SidebarNavItem
                    {...sharedNavProps}
                    to="/psi/recepcao"
                    label="Recepção SPA (Psicologia)"
                    icon={CalendarIcon}
                  />
                )}
              </ul>
            </div>
          )}
        </nav>
      </div>

      {/* RODAPÉ DO SIDEBAR */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#080E1B]">
        <div
          className={`flex items-center ${
            collapsed ? 'lg:flex-col lg:gap-2' : 'justify-between gap-2'
          }`}
        >
          <div className={`overflow-hidden ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate leading-snug">
              {user?.nome || 'Usuário'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate font-mono">
              {user?.perfil} • {user?.curso}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <NavLink
              to="/conta/senha"
              onClick={() => onCloseMobile?.()}
              className="p-1.5 text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
              title="Alterar minha senha"
            >
              <KeyIcon className="w-4 h-4" />
            </NavLink>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
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
