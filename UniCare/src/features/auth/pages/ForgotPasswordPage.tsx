import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '../../../components/icons/CorporateIcons';

export function ForgotPasswordPage() {
  const [locationMethod, setLocationMethod] = useState<'email' | 'cpf'>('email');
  const [profile, setProfile] = useState<'student' | 'teacher' | 'reception'>('student');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Cabeçalho da Página */}
      <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">UniCare Enterprise Health</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Hospital-Escola UNINASSAU</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <a href="#" className="hover:text-slate-900 transition-colors">Ajuda & Suporte</a>
          <a href="#" className="hover:text-slate-900 transition-colors">Contato NTI</a>
          <div className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold border border-slate-200">
            <MapPinIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Campus Aracaju</span>
          </div>
        </div>
      </header>

      {/* Área Central */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="mb-6 flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200/80 uppercase tracking-wider">
          <ShieldCheckIcon className="w-4 h-4 text-blue-700" />
          <span>Portal de Identidade & Acesso Institucional</span>
        </div>

        {/* Cartão Principal */}
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
          {/* Topo Escuro do Cartão */}
          <div className="bg-slate-900 text-white p-8 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <ArrowPathIcon className="w-6 h-6 text-blue-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Redefinição de Credenciais</h2>
            <p className="text-xs text-slate-300 px-4 leading-relaxed">
              Informe suas credenciais registradas no Sistema Clínico UniCare para receber o token seguro de validação.
            </p>
          </div>

          {/* Corpo do Cartão */}
          <div className="p-8 space-y-6">
            {/* Método de Localização */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Método de Localização
                </label>
                <a href="#" className="text-xs text-blue-700 hover:underline font-semibold">
                  Dúvida cadastral?
                </a>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button 
                  type="button"
                  onClick={() => setLocationMethod('email')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex justify-center items-center gap-2 transition-all ${
                    locationMethod === 'email' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>E-mail Institucional</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setLocationMethod('cpf')}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg flex justify-center items-center gap-2 transition-all ${
                    locationMethod === 'cpf' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <DocumentTextIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>CPF Registrado</span>
                </button>
              </div>
            </div>

            {/* Input Dinâmico */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {locationMethod === 'email' ? 'E-mail Acadêmico / Institucional *' : 'CPF Registrado *'}
              </label>
              <input 
                type={locationMethod === 'email' ? 'email' : 'text'}
                placeholder={locationMethod === 'email' ? 'usuario@uninassau.edu.br' : '000.000.000-00'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors font-mono"
              />
              {locationMethod === 'email' && (
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Utilize o domínio institucional @uninassau.edu.br ou @prof.uninassau.edu.br
                </p>
              )}
            </div>

            {/* Perfil de Atuação */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Perfil de Atuação na Clínica-Escola
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button"
                  onClick={() => setProfile('student')}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center gap-1.5 ${
                    profile === 'student' ? 'bg-slate-900 border-slate-900 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <AcademicCapIcon className="w-4 h-4" />
                  <span>Estudante</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setProfile('teacher')}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center gap-1.5 ${
                    profile === 'teacher' ? 'bg-slate-900 border-slate-900 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>Supervisor</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setProfile('reception')}
                  className={`py-3 px-2 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center gap-1.5 ${
                    profile === 'reception' ? 'bg-slate-900 border-slate-900 text-white shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserGroupIcon className="w-4 h-4" />
                  <span>Recepção</span>
                </button>
              </div>
            </div>

            {/* Alerta de Segurança */}
            <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3.5 flex gap-3 text-xs">
              <LockClosedIcon className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-900">Emissão de Token Criptográfico</h4>
                <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                  Um código temporário válido por 15 minutos será gerado e enviado ao e-mail institucional registrado sob conformidade com a LGPD.
                </p>
              </div>
            </div>

            {/* Botão de Envio */}
            <button
              type="button"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-colors shadow-xs"
            >
              Enviar Instruções de Recuperação
            </button>

            <div className="flex justify-between items-center text-xs pt-2">
              <Link to="/login" className="font-semibold text-slate-600 hover:text-slate-900">
                ← Voltar para o Login
              </Link>
              <span className="text-slate-500">
                Primeiro acesso? <Link to="/cadastro" className="font-bold text-blue-700 hover:underline">Cadastre-se</Link>
              </span>
            </div>
          </div>

          {/* Rodapé do Cartão */}
          <div className="bg-slate-50 border-t border-slate-100 p-3.5 flex justify-center items-center gap-4 text-[10px] text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>LGPD Art. 46 Protegido</span>
            </span>
            <span>•</span>
            <span>Auditoria NTI Ativa</span>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <BuildingOfficeIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Coordenação de Odontologia e Serviço de Psicologia Aplicada • Aracaju</span>
        </p>
      </main>

      {/* Rodapé da Página */}
      <footer className="border-t border-slate-200 bg-white px-6 sm:px-8 py-3.5 flex justify-between items-center text-[10px] text-slate-500 shrink-0">
        <p>© 2026 UniCare UNINASSAU • Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <LockClosedIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>TLS 1.3 Criptografado</span>
          </span>
          <span>•</span>
          <a href="#" className="hover:text-slate-800 font-medium">Termos & Privacidade</a>
        </div>
      </footer>
    </div>
  );
}