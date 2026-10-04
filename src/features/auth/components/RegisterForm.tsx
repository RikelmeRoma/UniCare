import { ProfileSelector } from './ProfileSelector';
import { PersonalInfoFields } from './PersonalInfoFields';
import { CredentialsFields } from './CredentialsFields';
import { TermsCheckboxes } from './TermsCheckboxes';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  LockClosedIcon,
  ShieldCheckIcon,
} from '../../../components/icons/CorporateIcons';

export function RegisterForm() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Solicitação de credenciamento enviada para validação da Diretoria Técnica!');
  };

  return (
    <div className="w-full max-w-4xl bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 font-sans">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md uppercase tracking-wider">
          Credenciamento Acadêmico & Profissional
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Cadastro Institucional UniCare</h1>
        <p className="text-xs text-slate-500 mt-1">
          Preencha os dados abaixo para solicitar acesso ao sistema hospitalar sob conformidade ética e LGPD.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-10">
          {/* Etapa 1: Perfil de Acesso */}
          <section>
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <BuildingOfficeIcon className="w-4 h-4 text-blue-700" />
                <span>1. Perfil Institucional</span>
              </h2>
              <span className="text-xs text-slate-400">Selecione sua função</span>
            </div>
            <ProfileSelector />
          </section>

          {/* Etapa 2: Dados Pessoais */}
          <section>
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <UserGroupIcon className="w-4 h-4 text-blue-700" />
                <span>2. Dados Pessoais e Vínculo Acadêmico</span>
              </h2>
            </div>
            <PersonalInfoFields />
          </section>

          {/* Etapa 3: Senhas */}
          <section>
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <LockClosedIcon className="w-4 h-4 text-blue-700" />
                <span>3. Credenciais de Acesso Seguro</span>
              </h2>
            </div>
            <CredentialsFields />
          </section>

          {/* Etapa 4: Termos e LGPD */}
          <section>
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
                <ShieldCheckIcon className="w-4 h-4 text-blue-700" />
                <span>4. Termos e Governança Clínica (LGPD Art. 11)</span>
              </h2>
            </div>
            <TermsCheckboxes />
          </section>
        </div>

        {/* Rodapé e Botões */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-10 pt-6 border-t border-slate-100 gap-4">
          <a href="/login" className="text-xs text-blue-700 font-semibold hover:underline flex items-center gap-1">
            ← Já possuo cadastro institucional
          </a>
          <button 
            type="submit" 
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Submeter Solicitação de Cadastro
          </button>
        </div>
      </form>
    </div>
  );
}