import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import {
  CalendarIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  LockClosedIcon,
} from '../icons/CorporateIcons';

export function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Para o perfil de RT Master: seletor de visão
  const [rtCourseView, setRtCourseView] = useState<'psicologia' | 'odontologia' | 'global'>('global');

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

          {/* Sub-badge normativo específico do curso com cor oficial */}
          <div className="mt-2.5">
            {isPsicoUser && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/70">
                Resolução CFP nº 06/2019
              </span>
            )}
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


        {/* MÓDULO EXCLUSIVO DA RT MASTER: Seletor de Visão de Curso */}
        {isRT && (
          <div className="px-3 pt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
              Filtrar Módulo Clínico:
            </p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setRtCourseView('global')}
                className={`py-1 rounded-lg transition-all ${
                  rtCourseView === 'global' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Global
              </button>
              <button
                type="button"
                onClick={() => setRtCourseView('psicologia')}
                className={`py-1 rounded-lg transition-all ${
                  rtCourseView === 'psicologia' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Psico
              </button>
              <button
                type="button"
                onClick={() => setRtCourseView('odontologia')}
                className={`py-1 rounded-lg transition-all ${
                  rtCourseView === 'odontologia' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Odonto
              </button>
            </div>
          </div>
        )}

        {/* NAVEGAÇÃO ESTRITAMENTE SEGREGADA CONFORME PERMISSÃO DO USUÁRIO */}
        <nav className="px-3 py-3 space-y-4">
          {/* 1. SE FOR PSICOLOGIA (OU RT NA VISÃO PSICO/GLOBAL) */}
          {(isPsicoUser || (isRT && (rtCourseView === 'psicologia' || rtCourseView === 'global'))) && (
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
                {(isRecepcao || isRT) && (
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

          {/* 2. SE FOR ODONTOLOGIA (OU RT NA VISÃO ODONTO/GLOBAL) */}
          {(isOdontoUser || (isRT && (rtCourseView === 'odontologia' || rtCourseView === 'global'))) && (
            <div>
              <h2 className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Clínica Odontológica
              </h2>
              <ul className="space-y-1">
                {/* Ficha Clínica & Odontograma: Estagiário, Supervisor e RT */}
                {(user?.perfil === 'estagiario' || user?.perfil === 'supervisor' || isRT) && (
                  <li>
                    <NavLink to="/ficha-odonto" className={getLinkStyle}>
                      <DocumentTextIcon className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>Ficha Clínica & Odontograma</span>
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
                {(isRecepcao || isRT) && (
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
                <li>
                  <NavLink to="/recepcao" className={getLinkStyle}>
                    <CalendarIcon className="w-4 h-4 shrink-0 text-slate-500" />
                    <span>Recepção Odontologia</span>
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/psi/recepcao" className={getLinkStyle}>
                    <CalendarIcon className="w-4 h-4 shrink-0 text-slate-500" />
                    <span>Recepção SPA (Psicologia)</span>
                  </NavLink>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <LockClosedIcon className="w-3.5 h-3.5 text-amber-700" />
                  <span>Salvaguarda RN-001 Ativa</span>
                </div>
                <p className="text-[10px] text-amber-800 leading-relaxed">
                  Acesso aos prontuários clínicos estritamente vedado para a equipe de recepção.
                </p>
              </div>
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
