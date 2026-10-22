import { useEffect, useState } from 'react';
import { useAuth, type RoleType } from '../../auth/context/AuthContext';
import {
  ClipboardDocumentCheckIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '../../../components/icons/CorporateIcons';

/**
 * Fila de pedidos de credencial da RT.
 *
 * Quem pede não tem conta: o pedido entra pela tela pública `/cadastro` e a
 * **RT autoriza**. Aprovar cria a conta no mesmo ato do servidor — não existe
 * estado "aprovado sem usuário".
 *
 * Três coisas que a tela não inventa:
 *
 * - O perfil enviado aqui é o **final**, não o declarado. O solicitante pede,
 *   a RT confirma e pode corrigir.
 * - A senha é definida **aqui**, pela RT. A solicitação nunca transporta senha.
 * - A clínica é a da RT, e o servidor a force pelo token. Não há seletor de
 *   curso, porque a RT não pode escolher.
 */
export function SolicitacoesCadastro() {
  const { solicitacoes, carregarSolicitacoes, aprovarSolicitacao, recusarSolicitacao, user } =
    useAuth();

  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [perfil, setPerfil] = useState<RoleType>('estagiario');
  const [registro, setRegistro] = useState('');
  const [senha, setSenha] = useState('');
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
    setSenha('');
    setMotivo('');
    setMostrarRecusa(false);
    const pedido = solicitacoes.find((s) => s.id === id);
    // Pré-preenche com o declarado; a RT pode mudar antes de aprovar.
    setPerfil((pedido?.perfil_declarado as RoleType) ?? 'estagiario');
    setRegistro('');
  };

  const aprovar = async (id: number) => {
    if (senha.length < 6) {
      setErro('A senha inicial precisa de ao menos 6 caracteres.');
      return;
    }
    setIsSaving(true);
    setErro('');
    const resultado = await aprovarSolicitacao(id, {
      perfil,
      registro_profissional: registro.trim() || undefined,
      senha,
    });
    setIsSaving(false);

    if (!resultado.success) {
      setErro(resultado.message);
      return;
    }
    setAviso('Conta criada. Passe a senha inicial à pessoa por um canal seguro.');
    setSelecionada(null);
    setSenha('');
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
    <div className="border border-slate-200 rounded-xl bg-slate-50/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-4 h-4 text-amber-600" />
            <span>Solicitações de credencial</span>
            {solicitacoes.length > 0 && (
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                {solicitacoes.length}
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Pedidos feitos pela tela pública. Ao aprovar, a conta nasce e a senha é a
            que você definir aqui.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void carregarSolicitacoes('PENDENTE')}
          className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
        >
          <CheckIcon className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {aviso && (
        <p className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold rounded-lg">
          {aviso}
        </p>
      )}

      {solicitacoes.length === 0 ? (
        <p className="text-[11px] text-slate-500 text-center py-4">
          Nenhum pedido aguardando na clínica de {user?.curso === 'psicologia' ? 'Psicologia' : 'Odontologia'}.
        </p>
      ) : (
        <ul className="space-y-2">
          {solicitacoes.map((s) => {
            const aberto = selecionada === s.id;
            return (
              <li key={s.id} className="bg-white border border-slate-200 rounded-lg">
                <button
                  type="button"
                  onClick={() => abrir(s.id)}
                  className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{s.nome}</p>
                    <p className="text-[10px] text-slate-500 font-mono truncate">
                      {s.matricula} • {s.email}
                    </p>
                  </div>
                  <div className="text-[10px] font-semibold text-slate-500 shrink-0 text-right">
                    <p>
                      Declarou:{' '}
                      {s.perfil_declarado === 'estagiario'
                        ? 'Estagiário'
                        : s.perfil_declarado === 'supervisor'
                          ? 'Supervisor'
                          : 'Recepção'}
                    </p>
                    <p className="font-mono text-slate-400">#{s.id}</p>
                  </div>
                </button>

                {aberto && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 space-y-3">
                    {erro && (
                      <p className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold rounded-lg flex items-start gap-1.5">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-px" />
                        {erro}
                      </p>
                    )}

                    {mostrarRecusa ? (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Motivo da recusa (obrigatório)
                        </label>
                        <textarea
                          rows={2}
                          value={motivo}
                          onChange={(e) => setMotivo(e.target.value)}
                          placeholder="Ex: e-mail sem vínculo ativo com a clínica."
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#002B49] focus:outline-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setMostrarRecusa(false)}
                            className="px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900"
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
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Perfil confirmado
                          </label>
                          <select
                            value={perfil}
                            onChange={(e) => setPerfil(e.target.value as RoleType)}
                            className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
                          >
                            <option value="estagiario">Estagiário</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="recepcao">Recepção</option>
                            <option value="rt">RT</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Registro profissional
                          </label>
                          <input
                            value={registro}
                            onChange={(e) => setRegistro(e.target.value)}
                            placeholder="Ex: CRP 19/1234"
                            className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Senha inicial
                          </label>
                          <input
                            type="password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 font-mono"
                          />
                        </div>
                      </div>
                    )}

                    {!mostrarRecusa && (
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setMostrarRecusa(true)}
                          className="px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 rounded-lg flex items-center gap-1"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                          Recusar
                        </button>
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void aprovar(s.id)}
                          className="px-3 py-1.5 text-[11px] font-bold bg-[#002B49] hover:bg-[#001a2b] text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          Aprovar e criar conta
                        </button>
                      </div>
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