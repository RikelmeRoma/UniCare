import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '../../features/auth/context/AuthContext';
import {
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
} from '../icons/CorporateIcons';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeType?: 'blue' | 'emerald' | 'indigo' | 'amber' | 'slate' | 'granada';
  actions?: React.ReactNode;
}

export function AppLayout({
  children,
  title,
  subtitle,
  badge,
  badgeType = 'blue',
  actions,
}: AppLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isPsico = user?.curso === 'psicologia';
  const isOdonto = user?.curso === 'odontologia';
  const isRT = user?.perfil === 'rt';

  const getBadgeStyle = () => {
    switch (badgeType) {
      case 'granada':
        return 'bg-rose-50 text-[#881337] border-rose-200/80';
      case 'emerald':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      case 'indigo':
        return 'bg-indigo-50 text-[#002B49] border-indigo-200/80';
      case 'amber':
        return 'bg-amber-50 text-amber-900 border-amber-200/80';
      case 'slate':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'blue':
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200/80';
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 antialiased overflow-hidden">
      {/* Sidebar Corporativo com Controle RBAC Estrito */}
      <AppSidebar />

      {/* Área de Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header Superior Corporativo */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-6 sm:px-8 flex items-center justify-between shrink-0 z-10 shadow-2xs">
          {/* Breadcrumb e Identificação da Unidade */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <span className="font-bold text-slate-700">UNINASSAU Aracaju</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 font-semibold">
              {isPsico
                ? 'Serviço de Psicologia Aplicada (SPA)'
                : isOdonto
                ? 'Clínica Odontológica Integrada'
                : isRT
                ? 'Controladoria & RT Master'
                : 'Central Integrada de Acolhimento'}
            </span>
            {badge && (
              <>
                <span className="text-slate-300 hidden sm:inline">/</span>
                <span
                  className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeStyle()}`}
                >
                  <ShieldCheckIcon className="w-3 h-3 mr-1 inline" />
                  {badge}
                </span>
              </>
            )}
          </div>

          {/* Área do Usuário Autenticado */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[200px]">
                {user?.nome || 'Usuário'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono tracking-tight">
                {user?.matricula ? `Matrícula: ${user.matricula} • ` : ''}
                <span className="uppercase font-semibold text-slate-700">
                  {user?.perfil}
                </span>
              </p>
            </div>

            {/* Avatar Inicial na Cor Oficial do Curso */}
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs ${
                isPsico
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
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Encerrar Sessão"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Cabeçalho da Página (Page Header Card) */}
        <div className="bg-white border-b border-slate-200/70 px-6 sm:px-8 py-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {title}
                </h1>
                {badge && (
                  <span
                    className={`inline-flex sm:hidden items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeStyle()}`}
                  >
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
          </div>
        </div>

        {/* Conteúdo Principal */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
