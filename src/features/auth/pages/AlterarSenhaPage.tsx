import { useState } from 'react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  EyeIcon,
  KeyIcon,
} from '../../../components/icons/CorporateIcons';

/**
 * Troca da própria senha.
 *
 * A senha atual é exigida pelo servidor (`PATCH /auth/senha`) e não é um enfeite
 * de tela: sem ela, qualquer sessão aberta trocaria a senha de quem estivesse
 * logado. O mesmo vale para o botão — ele só habilita quando os três campos
 * estão preenchidos e a confirmação bate.
 *
 * A sessão continua ativa depois da troca. O token JWT emitido no login segue
 * válido, e revogá-lo exigiria uma tabela de invalidação que o projeto não tem.
 */
export function AlterarSenhaPage() {
  const { user, trocarSenha } = useAuth();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');

  // Mesma regra do servidor (`min_length=6`): a tela não pode aceitar o que o
  // backend vai recusar com 422.
  const novaCurta = novaSenha.length > 0 && novaSenha.length < 6;
  const naoCoincidem = confirmacao.length > 0 && confirmacao !== novaSenha;
  const podeEnviar =
    senhaAtual.trim().length > 0 &&
    novaSenha.length >= 6 &&
    confirmacao === novaSenha &&
    !isSaving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');
    setOkMsg('');

    if (novaCurta) {
      setErroMsg('A nova senha precisa de ao menos 6 caracteres.');
      return;
    }
    if (naoCoincidem) {
      setErroMsg('A confirmação não bate com a nova senha.');
      return;
    }
    if (novaSenha === senhaAtual) {
      setErroMsg('A nova senha precisa ser diferente da senha atual.');
      return;
    }

    setIsSaving(true);
    const resultado = await trocarSenha(senhaAtual, novaSenha);
    setIsSaving(false);

    // Falha de escrita não pode ser engolida: o formulário continua na tela com
    // o que foi digitado para o usuário corrigir e tentar de novo.
    if (!resultado.success) {
      setErroMsg(resultado.message);
      return;
    }

    setOkMsg(`${resultado.message} Sua sessão continua ativa — use a nova senha no próximo acesso.`);
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmacao('');
  };

  const campo =
    'w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-mono pr-10';
  const rotulo = 'block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider';

  return (
    <AppLayout
      title="Minha Conta"
      subtitle="Troca de senha do seu próprio acesso"
      badge="Segurança da Conta"
      badgeType="blue"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl space-y-6">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-[#0E1729] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0">
                <KeyIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Alterar senha</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {user?.nome} • {user?.perfil} • {user?.curso}
                </p>
              </div>
            </div>

            <div>
              <label className={rotulo} htmlFor="senha-atual">Senha atual *</label>
              <input
                id="senha-atual"
                type={mostrar ? 'text' : 'password'}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Informe a senha que você usa hoje"
                className={campo}
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className={rotulo} htmlFor="nova-senha">Nova senha *</label>
              <input
                id="nova-senha"
                type={mostrar ? 'text' : 'password'}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className={`${campo} ${novaCurta ? 'border-amber-400 dark:border-amber-500 bg-amber-50/40 dark:bg-amber-950/30' : ''}`}
                autoComplete="new-password"
              />
              {novaCurta && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                  Faltam {6 - novaSenha.length} caracteres.
                </p>
              )}
            </div>

            <div>
              <label className={rotulo} htmlFor="confirmar-senha">Confirmar nova senha *</label>
              <input
                id="confirmar-senha"
                type={mostrar ? 'text' : 'password'}
                value={confirmacao}
                onChange={(e) => setConfirmacao(e.target.value)}
                placeholder="Repita a nova senha"
                className={`${campo} ${naoCoincidem ? 'border-rose-400 dark:border-rose-500 bg-rose-50/40 dark:bg-rose-950/30' : ''}`}
                autoComplete="new-password"
              />
              {naoCoincidem && (
                <p className="text-[10px] text-rose-700 dark:text-rose-400 font-semibold mt-1">
                  A confirmação não bate com a nova senha.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMostrar(!mostrar)}
              className="text-[11px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold flex items-center gap-1.5"
            >
              <EyeIcon className="w-3.5 h-3.5" />
              {mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
            </button>

            {erroMsg && (
              <p className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200 text-xs rounded-xl font-semibold">
                Não foi possível trocar a senha: {erroMsg}
              </p>
            )}
            {okMsg && (
              <p className="p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200 text-xs rounded-xl font-semibold">
                {okMsg}
              </p>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={!podeEnviar}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 ${
                  podeEnviar
                    ? 'bg-blue-700 hover:bg-blue-800 shadow-xs'
                    : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
                }`}
              >
                <LockClosedIcon className="w-3.5 h-3.5" />
                {isSaving ? 'Alterando…' : 'Alterar senha'}
              </button>
            </div>
          </form>

          <div className="bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl text-xs text-slate-800 dark:text-slate-200 space-y-1">
            <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              Como sua senha é guardada
            </p>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              A senha nunca é gravada em texto claro: o servidor guarda apenas o
              hash bcrypt, e ninguém — nem a coordenação — consegue consultá-la.
              Alterar a senha aqui não encerra as sessões já abertas neste
              dispositivo.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}