import { useMemo, useState } from 'react';
import { useClinic, type Atribuicao } from '../../../clinic/context/ClinicContext';
import { useAuth } from '../../../auth/context/AuthContext';
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
  const { allUsers } = useAuth();

  const [atribuindoPara, setAtribuindoPara] = useState<number | null>(null);
  const [trocandoId, setTrocandoId] = useState<number | null>(null);
  const [estagiarioEscolhido, setEstagiarioEscolhido] = useState('');
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState<{ texto: string; ok: boolean } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const estagiarios = useMemo(
    () =>
      Object.values(allUsers || {}).filter(
        (u) => u.perfil === 'estagiario' && u.curso === cursoFiltro && u.ativo
      ),
    [allUsers, cursoFiltro]
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
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
          <UserGroupIcon className="w-4 h-4 text-blue-700" />
          <span>Estagiário Responsável</span>
        </h4>
        <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">
          RF-001
        </span>
      </div>

      {semDado ? (
        <p className="text-[11px] text-slate-400 italic border border-dashed border-slate-200 rounded-xl p-3 text-center">
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
                  className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200/70 bg-slate-50/60"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-900 truncate">{p.nome}</p>
                    {ativa ? (
                      <p className="text-[10px] text-blue-800 font-mono truncate">
                        {ativa.estagiarioNome}
                        <span className="text-slate-400"> · {ativa.estagiarioMatricula}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-amber-700 font-semibold">
                        sem responsável — o estagiário não consegue escrever
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {ativa ? (
                      <button
                        type="button"
                        onClick={() => abrirTroca(ativa)}
                        className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        title="Transferir para outro estagiário"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => abrirAtribuicao(p.id)}
                        className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
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
            <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/70 rounded-lg p-2 flex items-start gap-1.5">
              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-px" />
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
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Estagiário responsável
          </label>
          <select
            value={estagiarioEscolhido}
            onChange={(e) => setEstagiarioEscolhido(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:border-blue-600 focus:outline-none"
          >
            {estagiarios.length === 0 && <option value="">Nenhum estagiário ativo na clínica</option>}
            {estagiarios.map((e) => (
              <option key={e.matricula} value={e.matricula}>
                {e.nome} ({e.matricula})
              </option>
            ))}
          </select>

          {trocandoId !== null && (
            <>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Motivo da transferência
              </label>
              <textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="O que motivou a troca. Fica no histórico do vínculo."
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:border-blue-600 focus:outline-none resize-none"
              />
              <p className="text-[10px] text-slate-400">
                O estagiário anterior deixa de escrever. O prontuário já registrado continua
                com o nome dele.
              </p>
            </>
          )}

          {msg && (
            <p
              className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${
                msg.ok ? 'text-emerald-800 bg-emerald-50' : 'text-rose-800 bg-rose-50'
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
              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : trocandoId !== null ? 'Transferir' : 'Atribuir'}
            </button>
            <button
              type="button"
              onClick={setAtribuiroEstado}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
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