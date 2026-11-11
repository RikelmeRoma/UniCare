import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDestinationRoute } from '../routes';
import { BackendStatus } from './BackendStatus';
import {
  KeyIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  LockClosedIcon,
} from '../../../components/icons/CorporateIcons';
import type { ActiveDomain } from './LoginForm';

interface LoginFieldsProps {
  activeDomain: ActiveDomain;
  onDomainChange: (domain: ActiveDomain) => void;
}

export function LoginFields({ onDomainChange }: LoginFieldsProps) {
  const navigate = useNavigate();
  const { loginWithCredentials } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Roteamento pós-autenticação. A regra mora em `../routes`, compartilhada com
  // a tela de acesso negado: quando as duas coppias divergiram, a recepção de
  // psicologia passou a cair no prontuário e a tomar 403 ao entrar.

  // Reação dinâmica na digitação da credencial para alternar a atmosfera visual do painel lateral
  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    const low = val.toLowerCase();
    if (low.includes('psi') || low.includes('crp') || low.includes('8821')) {
      onDomainChange('psicologia');
    } else if (low.includes('odo') || low.includes('cro') || low.includes('9122') || low.includes('dente')) {
      onDomainChange('odontologia');
    } else if (
      low.includes('rec') ||
      low.includes('rt') ||
      low.includes('adm') ||
      low.includes('coord')
    ) {
      onDomainChange('institucional');
    } else {
      onDomainChange('credenciais');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanIdent = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanIdent) {
      setErrorMsg('Por favor, informe sua matrícula acadêmica ou e-mail institucional.');
      return;
    }

    if (!cleanPass) {
      setErrorMsg('Por favor, informe sua senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithCredentials(cleanIdent, cleanPass);
      if (res.success && res.user) {
        navigate(getDestinationRoute(res.user));
      } else {
        setErrorMsg(res.message || 'Credenciais inválidas. Verifique sua matrícula/e-mail e senha.');
      }
    } catch {
      setErrorMsg('Falha inesperada ao tentar conectar ao serviço de autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:w-1/2 p-6 sm:p-10 flex flex-col justify-between bg-white dark:bg-[#0D1628] overflow-y-auto transition-colors">
      <div>
        {/* Cabeçalho Institucional do Card */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#002B49] dark:bg-blue-900 text-white text-[10px] font-bold tracking-wider shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD100]"></span>
              <span>UNINASSAU</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Portal Integrado • Clínicas-Escola
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Autenticação Corporativa</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Digite sua credencial acadêmica para identificação e roteamento automático pelo backend.
          </p>
        </div>

        {/* Formulário de Acesso Direto */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Matrícula Institucional ou E-mail Corporativo
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={identifier}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                placeholder="Ex: 16032935, DOC-8821, RT-001 ou usuario@uninassau.edu.br"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#002B49]/10 dark:focus:ring-blue-500/20 outline-none transition-all font-mono"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Senha de Acesso</label>
              <a
                href="/recuperar-senha"
                className="text-xs text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline font-medium"
              >
                Esqueci minha senha
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Informe sua senha"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 focus:ring-2 focus:ring-[#002B49]/10 dark:focus:ring-blue-500/20 outline-none transition-all font-mono pr-10"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mensagem de Erro ou Feedback */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/80 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300 animate-fadeIn">
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Botão de Submissão */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#002B49] hover:bg-[#001D33] dark:bg-blue-700 dark:hover:bg-blue-600 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm flex justify-center items-center gap-2 border border-[#001D33] dark:border-blue-600 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 text-[#FFD100] animate-spin" />
                <span>Autenticando no Servidor...</span>
              </>
            ) : (
              <>
                <KeyIcon className="w-4 h-4 text-[#FFD100]" />
                <span>Entrar no Sistema UNINASSAU</span>
              </>
            )}
          </button>
        </form>

        {/* Estado real do serviço */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
          <BackendStatus />

          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <LockClosedIcon className="w-3.5 h-3.5 text-slate-400" />
              <span>Autenticação RBAC</span>
            </span>
            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">Bearer JWT Criptografado</span>
          </div>
        </div>
      </div>

      {/* Rodapé com Link para Cadastro */}
      <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Primeiro acesso à Clínica-Escola?{' '}
          <a href="/cadastro" className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 font-bold hover:underline">
            Solicite o cadastro de acesso
          </a>
        </p>
      </div>
    </div>
  );
}