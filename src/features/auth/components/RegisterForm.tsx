import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type SolicitacaoEnviada } from '../../../services/api';
import { dominioDoPerfil } from '../dominios';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
} from '../../../components/icons/CorporateIcons';

/**
 * Pedido de credencial. Substitui o "cadastro" que existia só na fachada.
 *
 * O que mudou, e por quê:
 *
 * - **Envia de verdade.** A versão anterior tinha `alert('Solicitação
 *   credenciamento enviada')` e nenhuma chamada de API. Agora vai para
 *   `POST /solicitacoes-cadastro/`.
 * - **Sem campo de senha.** O servidor gera a senha inicial no ato da aprovação
 *   e a envia ao e-mail informado, nas duas clínicas. Guardar credencial de quem
 *   nem tem conta, em tabela alcançável por qualquer chamada anônima, não é uma
 *   superfície que vale abrir.
 * - **Sai o "Mínimo 8 caracteres" e o badge "Forte" fixo.** A regra real é 6, no
 *   servidor, e nada aqui valida força de senha — o badge aparecia em cima de um
 *   campo vazio.
 * - **Sai o "Docente Supervisor Responsável: Profa. Dra. Juliana Moura Feitosa
 *   (CRO/SE 412)".** Nome que não existe no seed, com conselho de odontologia
 *   num campo que aceita psicologia. Quem designa o docente é a gestão.
 * - **Os termos de sigilo passam a ser exigidos** de verdade, não decorativos.
 */
export function RegisterForm() {
  const [nome, setNome] = useState('');
  // `null` = o campo ainda não foi editado; aí vale a sugestão derivada da
  // matrícula. Guardar `string | null` em vez de sincronizar com `useEffect`
  // evita reescrever o que a pessoa digitou e permite limpar o campo sem que
  // ele se preencha sozinho de novo.
  const [emailManual, setEmailManual] = useState<string | null>(null);
  const [matricula, setMatricula] = useState('');
  const [telefone, setTelefone] = useState('');
  const [curso, setCurso] = useState<'psicologia' | 'odontologia'>('psicologia');
  const [perfil, setPerfil] = useState<'estagiario' | 'supervisor' | 'recepcao'>('estagiario');
  const [sigilo, setSigilo] = useState(false);
  const [auditoria, setAuditoria] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const [protocolo, setProtocolo] = useState<SolicitacaoEnviada | null>(null);

  // Domínio institucional esperado para o perfil solicitado, vindo do módulo
  // compartilhado — a fila de aprovação usa a mesma lista para avisar quando o
  // endereço de destino não é institucional. É só uma sugestão: com
  // `PERMITIR_EMAILS_EXTERNOS` ligado, o servidor aceita qualquer endereço, e a
  // pessoa pode sobrescrever este valor.
  const dominioEsperado = dominioDoPerfil(perfil);
  const emailSugerido = matricula.trim().length >= 2 ? `${matricula.trim()}${dominioEsperado}` : '';
  const email = emailManual ?? emailSugerido;
  const emailPreenchido = email.trim().length > 0;

  const podeEnviar =
    nome.trim().length >= 3 &&
    matricula.trim().length >= 2 &&
    emailPreenchido &&
    sigilo &&
    auditoria &&
    !isSaving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg('');
    setProtocolo(null);

    if (!podeEnviar) {
      setErroMsg('Preencha todos os campos obrigatórios e aceite os dois termos.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.solicitarCredencial({
        nome: nome.trim(),
        email: email.trim(),
        matricula: matricula.trim(),
        telefone: telefone.trim() || undefined,
        curso_declarado: curso,
        perfil_declarado: perfil,
      });
      setProtocolo(res);
      setNome('');
      setEmailManual(null);
      setMatricula('');
      setTelefone('');
      setSigilo(false);
      setAuditoria(false);
    } catch (err) {
      // Falha de escrita não pode ser engolida nem vestida de sucesso.
      setErroMsg(err instanceof Error ? err.message : 'Não foi possível enviar o pedido.');
    }
    setIsSaving(false);
  };

  const campo =
    'w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 dark:focus:border-blue-500 transition-colors font-mono';
  const rotulo = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5';
  const obrigatorio = <span className="text-red-500 dark:text-red-400">*</span>;

  if (protocolo) {
    return (
      <div className="w-full max-w-lg bg-white dark:bg-[#0D1628] p-8 sm:p-10 rounded-2xl shadow-xl dark:shadow-black/50 border border-slate-200 dark:border-slate-800 font-sans">
        <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4">
          <CheckCircleIcon className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Pedido registrado</h1>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
          Seu pedido entrou na fila da gestão da clínica e será analisado.
          A conta só é criada <strong>quando a gestão autorizar</strong> — e a
          senha inicial é enviada ao e-mail informado.
        </p>

        <div className="mt-5 p-4 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Protocolo</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white font-mono mt-0.5">#{protocolo.id}</p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 font-mono">{protocolo.email}</p>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
          Guarde este número: é por ele que a gestão localiza seu pedido.
          A senha inicial é enviada ao e-mail cadastrado quando o pedido for aprovado.
        </p>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Link to="/login" className="text-xs text-blue-700 dark:text-blue-400 font-semibold hover:underline">
            Voltar para o login
          </Link>
          <button
            type="button"
            onClick={() => setProtocolo(null)}
            className="text-xs text-slate-600 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white"
          >
            Enviar outro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-[#0D1628] p-8 sm:p-10 rounded-2xl shadow-xl dark:shadow-black/50 border border-slate-200 dark:border-slate-800 font-sans">
      <div className="mb-7">
        <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/70 px-2.5 py-1 rounded-md uppercase tracking-wider">
          Solicitação de Credencial
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">
          Pedir acesso ao UniCare
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          Preencha o pedido e aguarde a autorização da gestão da clínica
          (Referência Técnica ou coordenação). Nenhuma conta é criada sem essa
          aprovação.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
              <UserGroupIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>1. Seus dados</span>
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={rotulo} htmlFor="solic-nome">Nome completo {obrigatorio}</label>
              <input
                id="solic-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Beatriz Lima Ribeiro"
                className={campo}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={rotulo} htmlFor="solic-matricula">
                  Matrícula {obrigatorio}
                </label>
                <input
                  id="solic-matricula"
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  placeholder="Ex: 17012345"
                  className={campo}
                  required
                />
              </div>
              <div>
                <label className={rotulo} htmlFor="solic-telefone">Telefone</label>
                <input
                  id="solic-telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(79) 90000-0000"
                  className={campo}
                />
              </div>
            </div>

            <div>
              <label className={rotulo} htmlFor="solic-email">
                E-mail para receber a senha {obrigatorio}
              </label>
              <input
                id="solic-email"
                type="email"
                value={email}
                onChange={(e) => setEmailManual(e.target.value)}
                placeholder="voce@exemplo.com"
                className={campo}
                required
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                É para este endereço que a senha inicial será enviada quando a
                gestão aprovar. Use um e-mail que você acessa.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
              <BuildingOfficeIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>2. Onde você quer atuar</span>
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className={rotulo} htmlFor="solic-curso">Clínica {obrigatorio}</label>
              <select
                id="solic-curso"
                value={curso}
                onChange={(e) => setCurso(e.target.value as 'psicologia' | 'odontologia')}
                className={campo}
              >
                <option value="psicologia">Psicologia — Serviço de Psicologia Aplicada</option>
                <option value="odontologia">Odontologia — Clínica Integrada</option>
              </select>
            </div>

            <div>
              <span className={rotulo}>Perfil desejado {obrigatorio}</span>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { valor: 'estagiario', rotulo: 'Estagiário' },
                  { valor: 'supervisor', rotulo: 'Supervisor' },
                  { valor: 'recepcao', rotulo: 'Recepção' },
                ] as const).map((op) => (
                  <button
                    key={op.valor}
                    type="button"
                    onClick={() => setPerfil(op.valor)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      perfil === op.valor
                        ? 'bg-slate-900 dark:bg-blue-700 border-slate-900 dark:border-blue-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {op.rotulo}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                É o que você solicita. A gestão confirma na hora de aprovar.
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 uppercase tracking-wider">
              <ShieldCheckIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>3. Termos e governança</span>
            </h2>
            <span className="text-xs text-slate-400">ambos obrigatórios</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sigilo}
                onChange={(e) => setSigilo(e.target.checked)}
                className="w-4 h-4 mt-0.5 border-slate-300 dark:border-slate-600 rounded text-blue-600"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white">Sigilo profissional e LGPD: </strong>
                comprometo-me com o sigilo dos dados de saúde dos pacientes, conforme
                normas éticas (CFP/CFO) e a Lei nº 13.709/2018.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={auditoria}
                onChange={(e) => setAuditoria(e.target.checked)}
                className="w-4 h-4 mt-0.5 border-slate-300 dark:border-slate-600 rounded text-blue-600"
              />
              <span className="text-xs text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white">Trilha de auditoria: </strong>
                estou ciente de que todos os acessos e registros no prontuário
                eletrônico são rastreados.
              </span>
            </label>
          </div>
        </section>

        {erroMsg && (
          <p className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200 text-xs rounded-xl font-semibold">
            {erroMsg}
          </p>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-center pt-5 border-t border-slate-100 dark:border-slate-800 gap-4">
          <Link to="/login" className="text-xs text-blue-700 dark:text-blue-400 font-semibold hover:underline">
            ← Já possuo cadastro institucional
          </Link>
          <button
            type="submit"
            disabled={!podeEnviar}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold text-white transition-all ${
              podeEnviar
                ? 'bg-slate-900 dark:bg-blue-700 hover:bg-slate-800 dark:hover:bg-blue-600 shadow-xs cursor-pointer'
                : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
            }`}
          >
            {isSaving ? 'Enviando pedido…' : 'Enviar pedido de credencial'}
          </button>
        </div>
      </form>
    </div>
  );
}