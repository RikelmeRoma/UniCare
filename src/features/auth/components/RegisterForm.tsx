import { useState } from 'react';
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
  const [aviso, setAviso] = useState('');

  // Antes isto era `alert('Solicitação de credenciamento enviada...')`: nada era
  // enviado. Não há rota pública de cadastro no backend — `POST /usuarios`
  // exige `autorizado_gestao`, só RT e supervisor cadastram alguém — e nenhuma
  // fila de solicitações é criada. Um `alert` dizendo "enviada" afirmava um
  // envio que não existe.
  //
  // O formulário continua preenchível porque o processo real — solicitar
  // credencial à coordenação da clínica-escola — é legítimo; o que não pode
  // continuar é a confirmação falsa.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAviso(
      'Nenhuma solicitação foi enviada: o UniCare ainda não tem canal digital de solicitação de credencial. ' +
        'Leve seus dados à coordenação da sua clínica-escola, que é quem autoriza o acesso.'
    );
  };

  return (
    <div className="w-full max-w-4xl bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 font-sans">
      <div className="mb-8">
        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md uppercase tracking-wider">
          Credenciamento Acadêmico & Profissional
        </span>
        <h1 className="text-2xl font-bold text-slate-900 mt-2 tracking-tight">Cadastro Institucional UniCare</h1>
        <p className="text-xs text-slate-500 mt-1">
          O UniCare ainda não recebe solicitações por esta tela: preencha os dados para
          levar o pedido à coordenação da sua clínica-escola.
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
            Revisar dados do pedido
          </button>
        </div>

        {/* Falha de escrita não pode ser engolida nem vestida de sucesso: o que
            aconteceu aqui é que nada foi enviado, e a tela precisa dizer isso. */}
        {aviso && (
          <p className="mt-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl">
            {aviso}
          </p>
        )}
      </form>
    </div>
  );
}