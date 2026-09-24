import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ForgotPasswordPage() {
  const [locationMethod, setLocationMethod] = useState<'email' | 'cpf'>('email');
  const [profile, setProfile] = useState<'student' | 'teacher' | 'reception'>('student');

  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col font-sans relative">
      
      {/* Cabeçalho da Página */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">UniCare</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Clínicas-Escola UNINASSAU</p>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="#" className="hover:text-blue-600">Ajuda & Suporte</a>
          <a href="#" className="hover:text-blue-600">Contato</a>
          <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-bold border border-blue-100">
            <span>📍</span> Unidade Aracaju
          </div>
        </div>
      </header>

      {/* Área Central */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        
        <div className="mb-6 flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 uppercase tracking-wider">
          <span>🛡️</span> Portal de Identidade & Acesso Institucional
        </div>

        {/* Cartão Principal */}
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg overflow-hidden border border-gray-100">
          
          {/* Topo Escuro do Cartão */}
          <div className="bg-[#0a1526] text-white p-8 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
              <span className="text-2xl">🔄</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Redefinição de Senha</h2>
            <p className="text-sm text-gray-300 px-4">
              Informe suas credenciais registradas no Sistema Clínico UniCare para receber o token de acesso temporário e o link seguro.
            </p>
          </div>

          {/* Corpo do Cartão */}
          <div className="p-8">
            
            {/* Método de Localização */}
            <div className="mb-6">
              <div className="flex justify-between items-end mb-2">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Método de Localização</label>
                <a href="#" className="text-xs text-blue-600 hover:underline">Dúvida cadastral?</a>
              </div>
              <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button 
                  onClick={() => setLocationMethod('email')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md flex justify-center items-center gap-2 transition-colors ${locationMethod === 'email' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <span className="text-blue-500">@</span> E-mail Institucional
                </button>
                <button 
                  onClick={() => setLocationMethod('cpf')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md flex justify-center items-center gap-2 transition-colors ${locationMethod === 'cpf' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <span className="text-gray-400">📄</span> CPF Registrado
                </button>
              </div>
            </div>

            {/* Input Dinâmico */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                {locationMethod === 'email' ? 'E-mail Acadêmico / Institucional *' : 'CPF Registrado *'}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {locationMethod === 'email' ? '✉️' : '📄'}
                </span>
                <input 
                  type={locationMethod === 'email' ? 'email' : 'text'}
                  placeholder={locationMethod === 'email' ? 'usuario@uninassau.edu.br' : '000.000.000-00'}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 pl-10 pr-4 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
              {locationMethod === 'email' && (
                <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                  <span>ℹ️</span> Utilize o domínio @uninassau.edu.br ou @prof.uninassau.edu.br
                </p>
              )}
            </div>

            {/* Perfil de Atuação */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Perfil de Atuação na Clínica-Escola</label>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setProfile('student')}
                  className={`py-3 px-2 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center gap-1 ${profile === 'student' ? 'bg-[#0a1526] border-[#0a1526] text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >
                  <span className="text-lg">🎓</span>
                  Estagiário / Aluno
                </button>
                <button 
                  onClick={() => setProfile('teacher')}
                  className={`py-3 px-2 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center gap-1 ${profile === 'teacher' ? 'bg-[#0a1526] border-[#0a1526] text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >
                  <span className="text-lg">👨‍🏫</span>
                  Docente / Supervisor
                </button>
                <button 
                  onClick={() => setProfile('reception')}
                  className={`py-3 px-2 rounded-lg text-xs font-medium border transition-colors flex flex-col items-center gap-1 ${profile === 'reception' ? 'bg-[#0a1526] border-[#0a1526] text-white' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                >
                  <span className="text-lg">🖥️</span>
                  Recepção / Triagem
                </button>
              </div>
            </div>

            {/* Alerta de Segurança */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex gap-3">
              <span className="text-blue-500 mt-0.5">📨</span>
              <div>
                <h4 className="text-xs font-bold text-blue-800 mb-1">Envio Seguro de Token Temporário</h4>
                <p className="text-[11px] text-blue-600 leading-relaxed">
                  Um código criptográfico válido por <strong>15 minutos</strong> será emitido ao canal de segurança associado ao seu prontuário acadêmico.
                </p>
              </div>
            </div>

            {/* Botão e Links */}
            <button className="w-full bg-[#0a1526] hover:bg-black text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors mb-6 shadow-md">
              <span>➤</span> Enviar Instruções de Recuperação
            </button>

            <div className="flex justify-between items-center text-xs">
              <Link to="/login" className="font-medium text-gray-600 hover:text-[#0a1526] flex items-center gap-1">
                <span>←</span> Voltar para o Login Institucional
              </Link>
              <span className="text-gray-500">
                Primeiro acesso clínico? <Link to="/cadastro" className="font-bold text-blue-600 hover:underline">Cadastre-se</Link>
              </span>
            </div>

          </div>

          {/* Rodapé do Cartão */}
          <div className="bg-gray-50 border-t border-gray-100 p-4 flex justify-center items-center gap-4 text-[10px] text-gray-500 font-medium">
            <span className="flex items-center gap-1"><span className="text-green-600">🛡️</span> LGPD Art. 46 Protegido</span>
            <span>•</span>
            <span className="flex items-center gap-1"><span>🛡️</span> Log de Auditoria NTI #4092</span>
          </div>

        </div>
        
        <p className="mt-4 text-xs font-medium text-gray-500 flex items-center gap-2">
          <span>🏢</span> Coordenação de Odontologia e Psicologia Clínica • Aracaju
        </p>

      </main>

      {/* Rodapé da Página */}
      <footer className="border-t border-gray-200 bg-white px-8 py-4 flex justify-between items-center text-[10px] text-gray-500 shrink-0">
        <p>© 2024 UniCare UNINASSAU • Todos os direitos reservados.</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-green-600 font-medium">
            <span>🔒</span> Conexão Segura TLS 1.3
          </span>
          <span>•</span>
          <a href="#" className="hover:text-gray-800 font-medium">Termos & Privacidade</a>
        </div>
      </footer>

    </div>
  );
}