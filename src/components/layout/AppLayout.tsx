import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '../../features/auth/context/AuthContext';
import { InfoTooltip } from '../ui/InfoTooltip';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
} from '../icons/CorporateIcons';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  info?: string;
  badge?: string;
  badgeType?: 'blue' | 'emerald' | 'indigo' | 'amber' | 'slate' | 'granada';
  actions?: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'unicare_sidebar_collapsed';

export function AppLayout({
  children,
  title,
  subtitle,
  info,
  badge,
  badgeType = 'blue',
  actions,
}: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const isPsico = user?.curso === 'psicologia';
  const isOdonto = user?.curso === 'odontologia';
  const isRT = user?.perfil === 'rt';
  const isCoordenacao = user?.perfil === 'coordenacao';

  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'granada':
        return 'bg-rose-50 text-[#881337] border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800/70';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800/70';
      case 'indigo':
        return 'bg-indigo-50 text-[#002B49] border-indigo-200/80 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800/70';
      case 'amber':
        return 'bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800/70';
      case 'slate':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800/70';
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-[#070D19] font-sans text-slate-900 dark:text-slate-100 antialiased overflow-hidden transition-colors duration-200">
      {/* Backdrop mobile para menu lateral */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Corporativo com Controle RBAC Estrito */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Superior Corporativo */}
        <header className="h-16 bg-white/90 dark:bg-[#0B1220]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-20 shadow-2xs">
          {/* Breadcrumb e Identificação da Unidade */}
          <div className="flex items-center gap-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menu lateral"
              className="lg:hidden p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Bars3Icon className="w-5 h-5" />
            </button>

            <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
              UNINASSAU Aracaju
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden xs:inline">/</span>
            <span className="text-slate-600 dark:text-slate-300 font-semibold truncate hidden sm:inline">
              {isCoordenacao
                ? 'Coordenação de Psicologia'
                : isPsico
                ? 'Serviço de Psicologia Aplicada (SPA)'
                : isOdonto
                ? 'Clínica Odontológica Integrada'
                : isRT
                ? 'Controladoria & RT Master'
                : 'Central Integrada de Acolhimento'}
            </span>
            {badge && (
              <>
                <span className="text-slate-300 dark:text-slate-700 hidden md:inline">/</span>
                <span
                  className={`hidden md:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeStyle()}`}
                >
                  <ShieldCheckIcon className="w-3 h-3 mr-1 inline" />
                  {badge}
                </span>
              </>
            )}
          </div>

          {/* Área do Usuário Autenticado e Alternador de Tema */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <ThemeToggle />

            <div className="text-right hidden sm:block pl-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[200px]">
                {user?.nome || 'Usuário'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-mono tracking-tight">
                {user?.matricula ? `Matrícula: ${user.matricula} • ` : ''}
                <span className="uppercase font-semibold text-slate-700 dark:text-slate-200">
                  {user?.perfil}
                </span>
              </p>
            </div>

            {/* Avatar Inicial na Cor Oficial do Curso */}
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-xs ring-1 ring-white/15 ${
                isCoordenacao
                  ? 'bg-blue-800'
                  : isPsico
                  ? 'bg-blue-700'
                  : isOdonto
                  ? 'bg-[#881337]'
                  : isRT
                  ? 'bg-[#002B49]'
                  : 'bg-[#B45309]'
              }`}
            >
              {user?.nome?.charAt(0) || 'U'}
            </div>

            {/* Botão de Logout */}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors cursor-pointer"
              title="Encerrar Sessão"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Cabeçalho da Página (Page Header Card) */}
        <div className="bg-white/80 dark:bg-[#0E1729]/85 backdrop-blur-xs border-b border-slate-200/70 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h1>
                {info && <InfoTooltip texto={info} />}
                {badge && (
                  <span
                    className={`inline-flex md:hidden items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeStyle()}`}
                  >
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
          </div>
        </div>

        {/* Conteúdo Principal */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
