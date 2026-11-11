import { useEffect, useMemo, useState } from 'react';
import { useClinic, type Atribuicao } from '../../../clinic/context/ClinicContext';
import { api, type ApiEstagiario } from '../../../../services/api';
import { InfoTooltip } from '../../../../components/ui/InfoTooltip';
import {
  UserGroupIcon,
  PlusIcon,
  ArrowPathIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '../../../../components/icons/CorporateIcons';

/**
 * Vínculo paciente ↔ estagiário responsável (RF-001).
 *
 * A recepção vincula. O estagiário só escreve de paciente ativo em seu nome, e
 * a transferência move a responsabilidade guardando o motivo — que é o que a
 * linha encerrada responde quando alguém pergunta quem esteve com aquele
 * paciente.
 *
 * A escolha do estagiário sai da lista, não de digitação: o modal de agendamento
 * aceita matrícula fixa por clínica e o nome digitado pelo usuário, o que
 * gravava "João" com a matrícula do colega. Aqui o id é real.
 */
export function PatientAssignmentPanel({ cursoFiltro = 'psicologia' }: { cursoFiltro?: 'psicologia' }) {
  const { pacientes, atribuicoes, atribuirPaciente, transferirPaciente, sync } = useClinic();

  const [atribuindoPara, setAtribuindoPara] = useState<number | null>(null);
  const [trocandoId, setTrocandoId] = useState<number | null>(null);
  const [estagiarioEscolhido, setEstagiarioEscolhido] = useState('');
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [estagiariosApi, setEstagiariosApi] = useState<ApiEstagiario[]>([]);
  const [carregandoEstagiarios, setCarregandoEstagiarios] = useState(true);
  const [erroEstagiarios, setErroEstagiarios] = useState('');

  // `allUsers` do AuthContext só é carregado para RT e supervisor. Para a
  // recepção `GET /usuarios` devolve 403 (RN-001), então a lista ficava vazia e
  // o painel dizia "Nenhum estagiário ativo na clínica" — mentira. A rota
  // `GET /usuarios/estagiarios` não é gestão de usuário: existe para isso.
  useEffect(() => {
    let cancelado = false;
    api
      .getEstagiarios()
      .then((lista) => {
        if (cancelado) return;
        setEstagiariosApi(lista);
        setCarregandoEstagiarios(false);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setErroEstagiarios(
          err instanceof Error ? err.message : 'Não foi possível carregar os estagiários.'
        );
        setCarregandoEstagiarios(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const estagiarios = useMemo(
    () =>
      estagiariosApi.map((u) => ({
        perfil: 'estagiario' as const,
        curso: cursoFiltro,
        ativo: true,
        nome: u.nome,
        matricula: u.matricula,
      })),
    [estagiariosApi, cursoFiltro]
  );

  const pacientesDaClinica = useMemo(
    () => pacientes.filter((p) => p.curso === cursoFiltro || p.curso === 'ambos'),
    [pacientes, cursoFiltro]
  );

  const ativaDe = (pacienteId: number) =>
    atribuicoes.find((a) => a.pacienteId === pacienteId && a.situacao === 'ATIVA');

  const semVinculo = pacientesDaClinica.filter((p) => !ativaDe(p.id));

  const abrirAtribuicao = (pacienteId: number) => {
    setAtribuiroEstado();
    setAtribuindoPara(pacienteId);
    setEstagiarioEscolhido(estagiarios[0]?.matricula ?? '');
    setMsg(null);
  };

  const abrirTroca = (a: Atribuicao) => {
    setAtribuiroEstado();
    setTrocandoId(a.id);
    setEstagiarioEscolhido(estagiarios.find((e) => e.matricula !== a.estagiarioMatricula)?.matricula ?? '');
    setMsg(null);
  };

  const setAtribuiroEstado = () => {
    setAtribuindoPara(null);
    setTrocandoId(null);
    setEstagiarioEscolhido('');
    setMotivo('');
  };

  const confirmar = async () => {
    const escolhido = estagiarios.find((e) => e.matricula === estagiarioEscolhido);
    if (!escolhido) return;

    setIsSaving(true);
    setMsg(null);

    const resultado =
      trocandoId !== null
        ? await transferirPaciente({
            id: trocandoId,
            estagiarioNome: escolhido.nome,
            estagiarioMatricula: escolhido.matricula,
            motivo,
          })
        : atribuindoPara !== null
          ? await atribuirPaciente({
              pacienteId: atribuindoPara,
              estagiarioNome: escolhido.nome,
              estagiarioMatricula: escolhido.matricula,
            })
          : { success: false, message: 'Nada a confirmar.' };

    setIsSaving(false);
    setMsg({ texto: resultado.message, ok: resultado.success });
    if (resultado.success) setAtribuiroEstado();
  };

  const semDado = sync.estado === 'erro' || sync.estado === 'aguardando-login';

  return (
    <div className="bg-white dark:bg-[#0E1729] rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 space-y-3 transition-colors">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
          <UserGroupIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <span>Estagiário Responsável</span>
          <InfoTooltip
            align="right"
            texto="A recepção vincula o paciente ao estagiário responsável. O estagiário só escreve de paciente ativo em seu nome; a transferência guarda o motivo no histórico."
          />
        </h4>
      </div>

      {semDado ? (
        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
          Sem dado da API.
        </p>
      ) : (
        <>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {pacientesDaClinica.map((p) => {
              const ativa = ativaDe(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/70"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">{p.nome}</p>
                    {ativa ? (
                      <p className="text-[10px] text-blue-800 dark:text-blue-300 font-mono truncate">
                        {ativa.estagiarioNome}
                        <span className="text-slate-400 dark:text-slate-500"> · {ativa.estagiarioMatricula}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                        sem responsável — o estagiário não consegue escrever
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ativa ? (
                      <button
                        type="button"
                        onClick={() => abrirTroca(ativa)}
                        className="p-1 text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors"
                        title="Transferir para outro estagiário"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirAtribuicao(p.id)}
                        className="p-1 text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-md transition-colors"
                        title="Atribuir estagiário responsável"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {semVinculo.length > 0 && (
            <p className="text-[10px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/70 dark:border-amber-800/60 rounded-lg p-2 flex items-start gap-1.5">
              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-px" />
              <span>
                {semVinculo.length} paciente(s) sem responsável. Enquanto isso o estagiário
                recebe 403 ao tentar escrever.
              </span>
            </p>
          )}
        </>
      )}

      {/* Formulário de atribuição e de troca */}
      {(atribuindoPara !== null || trocandoId !== null) && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Estagiário responsável
          </label>
            <select
              value={estagiarioEscolhido}
              onChange={(e) => setEstagiarioEscolhido(e.target.value)}
              disabled={carregandoEstagiarios || Boolean(erroEstagiarios)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-100 focus:border-blue-600 focus:outline-none disabled:opacity-50"
            >

            {carregandoEstagiarios ? (
              <option value="">Carregando estagiários…</option>
            ) : erroEstagiarios ? (
              <option value="">Não foi possível carregar a lista</option>
            ) : estagiarios.length === 0 ? (
              <option value="">Nenhum estagiário ativo na clínica</option>
            ) : null}
            {estagiarios.map((e) => (
              <option key={e.matricula} value={e.matricula}>
                {e.nome} ({e.matricula})
              </option>
            ))}
          </select>

          {trocandoId !== null && (
            <>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Motivo da transferência
                <InfoTooltip
                  align="right"
                  texto="O estagiário anterior deixa de escrever. O prontuário já registrado continua com o nome dele."
                />
              </label>
              <textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="O que motivou a troca. Fica no histórico do vínculo."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none resize-none"
              />
            </>
          )}

          {erroEstagiarios && (
            <p className="text-[10px] font-semibold px-2 py-1 rounded-lg text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60">
              {erroEstagiarios}
            </p>
          )}

          {msg && (
            <p
              className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${
                msg.ok
                  ? 'text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/60'
                  : 'text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60'
              }`}
            >
              {msg.texto}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={confirmar}
              disabled={isSaving || !estagiarioEscolhido || (trocandoId !== null && !motivo.trim())}
              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : trocandoId !== null ? 'Transferir' : 'Atribuir'}
            </button>
            <button
              type="button"
              onClick={setAtribuiroEstado}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              title="Fechar"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}