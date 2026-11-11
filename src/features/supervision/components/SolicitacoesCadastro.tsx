import { useEffect, useState } from 'react';
import { useAuth, type RoleType } from '../../auth/context/AuthContext';
import { eInstitucional } from '../../auth/dominios';
import {
  ClipboardDocumentCheckIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '../../../components/icons/CorporateIcons';

/**
 * Fila de pedidos de credencial da RT ou da coordenação.
 *
 * Quem pede não tem conta: o pedido entra pela tela pública `/cadastro` e a
 * **gestão da clínica autoriza**. Aprovar cria a conta no mesmo ato do
 * servidor — não existe estado "aprovado sem usuário".
 *
 * Três coisas que a tela não inventa:
 *
 * - O perfil enviado aqui é o **final**, não o declarado. O solicitante pede,
 *   a gestão confirma e pode corrigir.
 * - A senha inicial **não é digitada** em clínica nenhuma: a RT e a
 *   coordenação aprovam sem escolher credencial, e o servidor gera uma senha
 *   aleatória que só existe no e-mail do solicitante. A solicitação nunca
 *   transporta senha.
 * - A clínica é a de quem aprova, e o servidor a força pelo token. Não há
 *   seletor de curso.
 *
 * A coordenação decide apenas perfis operacionais. Pedido declarado como RT ou
 * coordenação só pode ser decidido pela RT.
 */
const PERFIL_LABEL: Record<RoleType, string> = {
  estagiario: 'Estagiário',
  supervisor: 'Supervisor',
  recepcao: 'Recepção',
  rt: 'RT',
  coordenacao: 'Coordenação',
};

export function SolicitacoesCadastro() {
  const { solicitacoes, carregarSolicitacoes, aprovarSolicitacao, recusarSolicitacao, user } =
    useAuth();
  const isCoordenacao = user?.perfil === 'coordenacao';

  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [perfil, setPerfil] = useState<RoleType>('estagiario');
  const [registro, setRegistro] = useState('');
  const [motivo, setMotivo] = useState('');
  const [mostrarRecusa, setMostrarRecusa] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    void carregarSolicitacoes('PENDENTE');
  }, [carregarSolicitacoes]);

  const abrir = (id: number) => {
    setSelecionada(selecionada === id ? null : id);
    setErro('');
    setAviso('');
    setMotivo('');
    setMostrarRecusa(false);
    const pedido = solicitacoes.find((s) => s.id === id);
    // Pré-preenche com o declarado; a gestão pode mudar antes de aprovar. A
    // coordenação não pode confirmar RT/coordenação, então nesse caso o select
    // cai em um perfil que ela realmente administra.
    const declarado = pedido?.perfil_declarado as RoleType | undefined;
    const foraDaAlcada =
      isCoordenacao && (declarado === 'rt' || declarado === 'coordenacao');
    const coordenacaoIndisponivel =
      declarado === 'coordenacao' && user?.curso !== 'psicologia';
    setPerfil(
      foraDaAlcada || coordenacaoIndisponivel
        ? 'estagiario'
        : (declarado ?? 'estagiario')
    );
    setRegistro('');
  };

  const aprovar = async (id: number) => {
    setIsSaving(true);
    setErro('');
    const resultado = await aprovarSolicitacao(id, {
      perfil,
      registro_profissional: registro.trim() || undefined,
    });
    setIsSaving(false);

    if (!resultado.success) {
      setErro(resultado.message);
      return;
    }
    const pedido = solicitacoes.find((s) => s.id === id);
    setAviso(
      `Conta criada. Senha inicial enviada por e-mail para ${pedido?.email}.`
    );
    setSelecionada(null);
  };

  const recusar = async (id: number) => {
    if (motivo.trim().length < 3) {
      setErro('A recusa precisa de motivo — é o que a pessoa vai ler.');
      return;
    }
    setIsSaving(true);
    setErro('');
    const resultado = await recusarSolicitacao(id, motivo.trim());
    setIsSaving(false);

    if (!resultado.success) {
      setErro(resultado.message);
      return;
    }
    setAviso('Pedido recusado. O motivo ficou registrado na fila.');
    setSelecionada(null);
    setMotivo('');
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-900/60 p-4 space-y-3 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Solicitações de credencial</span>
            {solicitacoes.length > 0 && (
              <span className="text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 px-1.5 py-0.5 rounded tabular-nums">
                {solicitacoes.length}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Pedidos feitos pela tela pública. Ao aprovar, a conta nasce e a
            senha inicial é gerada pelo sistema e enviada por e-mail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void carregarSolicitacoes('PENDENTE')}
          className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
        >
          <CheckIcon className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {aviso && (
        <p className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200 text-[11px] font-semibold rounded-lg">
          {aviso}
        </p>
      )}

      {solicitacoes.length === 0 ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center py-4">
          {`Nenhum pedido aguardando na clínica de ${
            user?.curso === 'psicologia' ? 'Psicologia' : 'Odontologia'
          }.`}
        </p>
      ) : (
        <ul className="space-y-2">
          {solicitacoes.map((s) => {
            const aberto = selecionada === s.id;
            const foraDaAlcada =
              isCoordenacao &&
              (s.perfil_declarado === 'rt' ||
                s.perfil_declarado === 'coordenacao');
            return (
              <li key={s.id} className="bg-white dark:bg-[#0E1729] border border-slate-200 dark:border-slate-800 rounded-lg transition-colors">
                <button
                  type="button"
                  onClick={() => abrir(s.id)}
                  className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.nome}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      {s.matricula} • {s.email}
                    </p>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0 text-right">
                    <p>
                      Declarou:{' '}
                      {PERFIL_LABEL[s.perfil_declarado as RoleType] ??
                        s.perfil_declarado}
                    </p>
                    <p className="font-mono text-slate-400 dark:text-slate-500">#{s.id}</p>
                  </div>
                </button>

                {aberto && (
                  <div className="px-3.5 pb-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {erro && (
                      <p className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/70 text-rose-800 dark:text-rose-200 text-[11px] font-semibold rounded-lg flex items-start gap-1.5">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-px" />
                        {erro}
                      </p>
                    )}

                    {foraDaAlcada ? (
                      <p className="p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 text-amber-800 dark:text-amber-200 text-[11px] font-semibold rounded-lg">
                        Somente a RT pode decidir pedidos de RT ou de coordenação.
                      </p>
                    ) : (
                      <>
                    {/* O destino da senha é decisão, não rodapé: a senha
                        inicial só existe nesse endereço, e a linha recolhida
                        trunca o e-mail em `text-[10px]`. Por isso ele aparece
                        inteiro aqui, antes do botão de aprovar. */}
                    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 space-y-1">
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        A senha inicial será enviada para este endereço:
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-900 dark:text-white break-all">
                        {s.email}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Matrícula {s.matricula} ·{' '}
                        {s.curso_declarado === 'psicologia' ? 'Psicologia' : 'Odontologia'}
                      </p>
                      {!eInstitucional(s.email) && (
                        <p className="pt-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                          <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-px" />
                          <span>
                            Este endereço não é de domínio institucional. Confirme
                            com o solicitante antes de aprovar — a senha inicial
                            só existe nele.
                          </span>
                        </p>
                      )}
                    </div>
                    {mostrarRecusa ? (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Motivo da recusa (obrigatório)
                        </label>
                        <textarea
                          rows={2}
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          placeholder="Ex: e-mail sem vínculo ativo com a clínica."
                          className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#002B49] dark:focus:ring-blue-500 focus:outline-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setMostrarRecusa(false)}
                            className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void recusar(s.id)}
                            className="px-3 py-1.5 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50"
                          >
                            Confirmar recusa
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Perfil confirmado
                          </label>
                          <select
                            value={perfil}
                            onChange={(e) => setPerfil(e.target.value as RoleType)}
                            className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                          >
                            <option value="estagiario">Estagiário</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="recepcao">Recepção</option>
                            {!isCoordenacao && (
                              <>
                                <option value="rt">RT</option>
                                {user?.curso === 'psicologia' && (
                                  <option value="coordenacao">Coordenação</option>
                                )}
                              </>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Registro profissional
                          </label>
                          <input
                            value={registro}
                            onChange={(e) => setRegistro(e.target.value)}
                            placeholder="Ex: CRP 19/1234"
                            className="w-full px-2.5 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Senha inicial
                          </label>
                          <p className="px-2.5 py-2 text-[11px] leading-relaxed border border-emerald-200 dark:border-emerald-800/70 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200">
                            Gerada automaticamente pelo servidor e enviada por
                            e-mail ao solicitante. A gestão não define esta senha.
                          </p>
                        </div>
                      </div>
                    )}

                    {!mostrarRecusa && (
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setMostrarRecusa(true)}
                          className="px-3 py-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg flex items-center gap-1"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                          Recusar
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void aprovar(s.id)}
                          className="px-3 py-1.5 text-[11px] font-bold bg-[#002B49] hover:bg-[#001a2b] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          Aprovar e criar conta
                        </button>
                      </div>
                    )}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}