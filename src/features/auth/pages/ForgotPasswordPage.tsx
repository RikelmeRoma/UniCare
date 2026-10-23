import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LockClosedIcon,
  KeyIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '../../../components/icons/CorporateIcons';

/**
 * Recuperação de senha por código enviado no e-mail.
 *
 * Antes esta tela era um formulário inerte que prometia "emissão de token
 * criptográfico" e envio por e-mail — nada disso existia. Hoje o fluxo é real:
 * a pessoa pede o código, recebe por e-mail e escolhe a própria senha. Ela não
 * depende de ninguém.
 *
 * A tela trata três estados que não podem virar um só:
 *
 * - **envio ok** → a resposta é genérica (o backend não diz se a conta existe),
 *   e isso é o comportamento certo, não um defeito;
 * - **SMTP desligado ou quebrado** → o backend devolve 503 e a tela **diz**,
 *   em vez de mandar a pessoa esperar um e-mail que não virá;
 * - **código errado** → a mensagem é a mesma para código inválido, expirado,
 *   já usado ou conta inexistente.
 */
export function ForgotPasswordPage() {
  const [etapa, setEtapa] = useState<'pedido' | 'codigo'>('pedido');

  const [identificador, setIdentificador] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [mostrar, setMostrar] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const [envioIndisponivel, setEnvioIndisponivel] = useState(false);
  const [okMsg, setOkMsg] = useState('');

  const campo =
    'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors font-mono pr-10';
  const rotulo = 'block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wider';

  const novaCurta = novaSenha.length > 0 && novaSenha.length < 6;
  const naoCoincidem = confirmacao.length > 0 && confirmacao !== novaSenha;
  const podeResgatar =
    identificador.trim().length >= 3 &&
    codigo.trim().length >= 4 &&
    novaSenha.length >= 6 &&
    confirmacao === novaSenha &&
    !isSaving;

  const pedirCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');
    setEnvioIndisponivel(false);
    setOkMsg('');

    if (identificador.trim().length < 3) {
      setErroMsg('Informe o e-mail institucional ou a matrícula.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.solicitarRecuperacaoSenha(identificador.trim());
      setOkMsg(res.message);
      setEtapa('codigo');
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Não foi possível pedir o código.';
      // 503 é o estado de ambiente: o SMTP não está configurado ou falhou. Não
      // é problema do identificador digitado, e a tela precisa distinguir.
      setEnvioIndisponivel(mensagem.includes('indisponível') || mensagem.includes('Não foi possível enviar'));
      setErroMsg(mensagem);
    }
    setIsSaving(false);
  };

  const resgatar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');
    setOkMsg('');

    if (!podeResgatar) {
      setErroMsg('Preencha o código e as duas senhas. A nova senha precisa de ao menos 6 caracteres.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.resgatarRecuperacaoSenha(
        identificador.trim(),
        codigo.trim().toUpperCase(),
        novaSenha
      );
      setOkMsg(res.message);
      setCodigo('');
      setNovaSenha('');
      setConfirmacao('');
      setEtapa('pedido');
    } catch (err) {
      setErroMsg(err instanceof Error ? err.message : 'Não foi possível trocar a senha.');
    }
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">UniCare Enterprise Health</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Hospital-Escola UNINASSAU</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold border border-slate-200">
            <MapPinIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Campus Aracaju</span>
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="mb-6 flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200/80 uppercase tracking-wider">
          <ShieldCheckIcon className="w-4 h-4 text-blue-700" />
          <span>Portal de Identidade & Acesso Institucional</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
          <div className="bg-slate-900 text-white p-8 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              {etapa === 'pedido' ? (
                <ArrowPathIcon className="w-6 h-6 text-slate-300" />
              ) : (
                <KeyIcon className="w-6 h-6 text-slate-300" />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Recuperar senha</h2>
            <p className="text-xs text-slate-300 px-4 leading-relaxed">
              {etapa === 'pedido'
                ? 'Enviamos um código de uso único para o e-mail cadastrado na sua conta.'
                : 'Digite o código recebido e escolha uma nova senha.'}
            </p>
          </div>

          <div className="p-8 space-y-5">
            {etapa === 'pedido' ? (
              <form onSubmit={pedirCodigo} className="space-y-4">
                <div>
                  <label className={rotulo} htmlFor="rec-id">
                    E-mail institucional ou matrícula
                  </label>
                  <input
                    id="rec-id"
                    value={identificador}
                    onChange={(e) => setIdentificador(e.target.value)}
                    placeholder="matricula@prof.uninassau.edu.br ou matricula@sempreuninassau.com.br ou 16032935"
                    className={`${campo} pr-3.5`}
                    autoComplete="username"
                    required
                  />
                </div>

                {envioIndisponivel && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <ExclamationTriangleIcon className="w-4 h-4" />
                      O envio por e-mail está indisponível agora
                    </p>
                    <p>{erroMsg}</p>
                    <p className="text-amber-800">
                      Enquanto isso, procure a coordenação da sua clínica-escola: a
                      Referência Técnica pode redefinir a sua senha.
                    </p>
                  </div>
                )}

                {erroMsg && !envioIndisponivel && (
                  <p className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-semibold">
                    {erroMsg}
                  </p>
                )}

                {okMsg && (
                  <p className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold">
                    {okMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={identificador.trim().length < 3 || isSaving}
                  className={`w-full px-5 py-3 rounded-xl text-xs font-bold text-white transition-all ${
                    identificador.trim().length >= 3 && !isSaving
                      ? 'bg-blue-700 hover:bg-blue-800 shadow-xs'
                      : 'bg-slate-300 cursor-not-allowed opacity-70'
                  }`}
                >
                  {isSaving ? 'Enviando…' : 'Enviar código'}
                </button>
              </form>
            ) : (
              <form onSubmit={resgatar} className="space-y-4">
                <div>
                  <label className={rotulo} htmlFor="rec-codigo">Código recebido</label>
                  <input
                    id="rec-codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="Ex: K7M2QP"
                    className={`${campo} pr-3.5 uppercase tracking-[0.2em]`}
                    autoComplete="one-time-code"
                    required
                  />
                </div>

                <div>
                  <label className={rotulo} htmlFor="rec-nova">Nova senha</label>
                  <input
                    id="rec-nova"
                    type={mostrar ? 'text' : 'password'}
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={campo}
                    autoComplete="new-password"
                    required
                  />
                  {novaCurta && (
                    <p className="text-[10px] text-amber-700 font-semibold mt-1">
                      Faltam {6 - novaSenha.length} caracteres.
                    </p>
                  )}
                </div>

                <div>
                  <label className={rotulo} htmlFor="rec-confirma">Confirmar nova senha</label>
                  <input
                    id="rec-confirma"
                    type={mostrar ? 'text' : 'password'}
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    placeholder="Repita a nova senha"
                    className={campo}
                    autoComplete="new-password"
                    required
                  />
                  {naoCoincidem && (
                    <p className="text-[10px] text-rose-700 font-semibold mt-1">
                      A confirmação não bate com a nova senha.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setMostrar(!mostrar)}
                  className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold"
                >
                  {mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
                </button>

                {erroMsg && (
                  <p className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-semibold">
                    {erroMsg}
                  </p>
                )}
                {okMsg && (
                  <p className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-start gap-1.5">
                    <CheckCircleIcon className="w-4 h-4 shrink-0 mt-px" />
                    {okMsg}
                  </p>
                )}

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setEtapa('pedido'); setErroMsg(''); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={!podeResgatar}
                    className={`flex-1 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 ${
                      podeResgatar
                        ? 'bg-blue-700 hover:bg-blue-800 shadow-xs'
                        : 'bg-slate-300 cursor-not-allowed opacity-70'
                    }`}
                  >
                    <LockClosedIcon className="w-3.5 h-3.5" />
                    {isSaving ? 'Trocando…' : 'Trocar senha'}
                  </button>
                </div>
              </form>
            )}

            {/* O que a tela não promete: revogação de sessões já abertas. */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-[11px] text-slate-600 leading-relaxed">
              O código vale por poucos minutos e só funciona uma vez. A senha nova é
              guardada apenas como hash bcrypt — nem a coordenação consegue consultá-la.
              Trocar a senha aqui não encerra sessões já abertas neste dispositivo.
            </div>

            <div className="flex items-center justify-between text-xs">
              <Link to="/login" className="font-semibold text-slate-600 hover:text-slate-900">
                Voltar para o login
              </Link>
              <Link to="/cadastro" className="font-bold text-blue-700 hover:underline">
                Ainda não tenho conta
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Coordenação de Odontologia e Serviço de Psicologia Aplicada — Aracaju</span>
        </p>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 sm:px-8 py-3.5 flex justify-between items-center text-[10px] text-slate-500 shrink-0">
        <p>© 2026 UniCare UNINASSAU — Todos os direitos reservados.</p>
        <p className="flex items-center gap-1.5 font-mono">
          <ShieldCheckIcon className="w-3 h-3 text-emerald-600" />
          <span>LGPD Art. 11 — dados sensíveis de saúde</span>
        </p>
      </footer>
    </div>
  );
}