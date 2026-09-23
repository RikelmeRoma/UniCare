import { ProfileSelector } from './ProfileSelector';
import { PersonalInfoFields } from './PersonalInfoFields';
import { CredentialsFields } from './CredentialsFields';
import { TermsCheckboxes } from './TermsCheckboxes';

export function RegisterForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // A lógica de submissão será colocada aqui no futuro
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <form 
        onSubmit={handleSubmit} 
        className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-xl shadow-sm border border-gray-200"
      >
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Cadastro e Habilitação Clínica
            </h1>
            <p className="text-sm text-gray-500 mt-2">
              Preencha os dados institucionais para solicitar acesso ao prontuário eletrônico — Unidade Aracaju (2026.2).
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end text-xs text-gray-400 mt-4 md:mt-0">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Etapa Única • Credenciamento
            </span>
            <span className="flex items-center gap-1 mt-1">🔒 Ambiente Seguro • Clínica-Escola</span>
          </div>
        </div>

        <div className="space-y-12">
          {/* Etapa 1: Perfil */}
          <section>
            <div className="flex justify-between items-end mb-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-blue-600 text-xl">🏥</span> 1. Perfil Institucional
              </h2>
              <span className="text-xs text-gray-400">Selecione sua função</span>
            </div>
            <ProfileSelector />
          </section>

          {/* Etapa 2: Dados Pessoais */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-6">
              <span className="text-blue-600 text-xl">👤</span> 2. Dados Pessoais e Vínculo
            </h2>
            <PersonalInfoFields />
          </section>

          {/* Etapa 3: Senhas */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-6">
              <span className="text-blue-600 text-xl">🔒</span> 3. Credenciais de Acesso
            </h2>
            <CredentialsFields />
          </section>

          {/* Etapa 4: Termos e LGPD */}
          <section>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-6">
              <span className="text-blue-600 text-xl">🛡️</span> 4. Termos e Governança Clínica
            </h2>
            <TermsCheckboxes />
          </section>
        </div>

        {/* Rodapé e Botões */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 pt-6 border-t border-gray-100 gap-4">
          <a href="/login" className="text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors flex items-center gap-1">
            &larr; Já tenho cadastro
          </a>
          <button 
            type="submit" 
            className="w-full sm:w-auto bg-[#0056b3] hover:bg-blue-800 text-white px-8 py-3 rounded-md font-medium transition-all shadow-sm"
          >
            Solicitar Cadastro
          </button>
        </div>
      </form>
    </div>
  );
}