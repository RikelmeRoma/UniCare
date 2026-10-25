import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../../../components/layout/AppLayout';
import { useAuth } from '../../../auth/context/AuthContext';
import { useClinic, type Agendamento } from '../../../clinic/context/ClinicContext';
import { rotuloStatus } from '../../../../shared/statusAgendamento';
import {
  ArrowPathIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
} from '../../../../components/icons/CorporateIcons';

const ROTULO_TURNO: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
};

/** `17 de out`, ou `—` quando a sessão é anterior à coluna de data.
 *
 * A parte da data do ISO é lida direto, sem `new Date()`: `new Date('2026-10-17')`
 * é meia-noite UTC e, em Aracaju (UTC-3), sairia como 16/10. */
function rotuloData(iso?: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return '—';
  return `${dia}/${mes}/${ano}`;
}

/**
 * Status em que a sessão ainda espera o estagiário. Sessão concluída ou
 * cancelada não pende de ninguém: o que interessa aqui é o que ele ainda
 * precisa fazer, e por isso esses pacientes aparecem primeiro.
 */
const PENDENTES: Agendamento['status'][] = ['AGENDADO', 'PRESENTE', 'EM_ATENDIMENTO'];

interface Grupo {
  pacienteId: number;
  pacienteNome: string;
  sessoes: Agendamento[];
}

function iniciais(nome: string): string {
  return (
    nome
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || 'P'
  );
}

function StatusBadge({ status }: { status: Agendamento['status'] }) {
  const s = rotuloStatus(status);
  return <span className={s.classes}>{s.rotulo}</span>;
}

export function PsyAppointmentsPage() {
  const { user } = useAuth();
  const { agendamentos, atribuicoes, sync, sincronizar } = useClinic();
  const navigate = useNavigate();

  // `sync.origem` não serve de porta aqui. O estagiário de psicologia leva 403
  // em /fichas-odonto — o mesmo RN-001 que barra a recepção —, o que joga uma
  // falha em `falhas`, deixa `tudoOk` falso e trava `origem` em 'erro' para
  // sempre. O que decide é se o endpoint de agendamento falhou, só ele.
  const agendamentosFalharam = sync.falhas.some((f) =>
    f.startsWith('agendamentos:')
  );
  const carregando =
    sync.estado === 'aguardando-login' || sync.estado === 'sincronizando';

  // Filtro redundante em cima do servidor: enquanto o contexto ainda segura os
  // agendamentos de mentira do `INITIAL_AGENDAMENTOS`, é este filtro que impede
  // a tela de listar paciente que não existe.
  const meus = useMemo(
    () =>
      agendamentos.filter(
        (a) =>
          a.curso === 'psicologia' &&
          a.estagiarioMatricula === user?.matricula
      ),
    [agendamentos, user?.matricula]
  );

  const grupos = useMemo<Grupo[]>(() => {
    const mapa = new Map<number, Grupo>();
    for (const a of meus) {
      const atual = mapa.get(a.pacienteId);
      if (atual) {
        atual.sessoes.push(a);
      } else {
        mapa.set(a.pacienteId, {
          pacienteId: a.pacienteId,
          pacienteNome: a.pacienteNome,
          sessoes: [a],
        });
      }
    }
    return [...mapa.values()]
      .map((g) => ({
        ...g,
        // Dentro do paciente, por dia e hora. As sessões sem dia vão para o fim
        // em vez de virarem a mais antiga.
        sessoes: [...g.sessoes].sort((a, b) => {
          const da = a.dataSessao ?? '9999-12-31';
          const db = b.dataSessao ?? '9999-12-31';
          if (da !== db) return da < db ? -1 : 1;
          return a.horario < b.horario ? -1 : a.horario > b.horario ? 1 : 0;
        }),
      }))
      .sort((x, y) => {
        const px = x.sessoes.some((s) => PENDENTES.includes(s.status)) ? 0 : 1;
        const py = y.sessoes.some((s) => PENDENTES.includes(s.status)) ? 0 : 1;
        if (px !== py) return px - py;
        return x.pacienteNome.localeCompare(y.pacienteNome, 'pt-BR');
      });
  }, [meus]);

  const total = meus.length;
  const pendentes = meus.filter((a) => PENDENTES.includes(a.status)).length;

  // "Abrir prontuário" só aparece para quem ainda está no seletor "Meus
  // Pacientes". A agenda filtra por matrícula e o seletor filtra por vínculo:
  // um paciente transferido continua com a sessão antiga aqui, mas some de lá —
  // e o botão levaria a um paciente que o <select> não consegue exibir.
  const vinculados = useMemo(
    () =>
      new Set(
        atribuicoes.filter((a) => a.situacao === 'ATIVA').map((a) => a.pacienteId)
      ),
    [atribuicoes]
  );

  const mostrarLista = !carregando && !agendamentosFalharam;

  return (
    <AppLayout
      title="Meus Agendamentos"
      info="Sessões que a recepção do Serviço de Psicologia Aplicada atribuiu a você. O registro clínico da sessão é feito no prontuário."
      badge="Agenda do Estagiário"
      badgeType="blue"
      actions={
        <button
          type="button"
          onClick={() => void sincronizar()}
          className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-bold px-3.5 py-2 rounded-xl text-xs transition-colors hover:bg-slate-50"
        >
          <ArrowPathIcon className="w-3.5 h-3.5" />
          Recarregar
        </button>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Resumo. Só aparece com dado real em mãos — número inventado em tela
            institucional é pior do que campo vazio. */}
        {mostrarLista && total > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sessões atribuídas a você
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Ainda aguardando atendimento
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{pendentes}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Pacientes na sua agenda
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {grupos.length}
              </p>
            </div>
          </div>
        )}

        {carregando && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-sm text-slate-500">
            Carregando sua agenda…
          </div>
        )}

        {/* Falha de leitura não é "sem agendamento". Mostra o erro em vez da
            lista — nem vazia, nem os dados de mentira do estado inicial. */}
        {!carregando && agendamentosFalharam && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-red-900">
              Não foi possível carregar sua agenda
            </h2>
            <p className="text-xs text-red-800 mt-1.5 leading-relaxed">
              A lista de agendamentos não chegou do servidor. Nada foi
              descartado — use “Recarregar” para tentar de novo.
            </p>
          </div>
        )}

        {mostrarLista && total === 0 && (
          <div className="bg-white p-10 rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <CalendarIcon className="w-10 h-10 mx-auto text-slate-300" />
            <h2 className="text-sm font-bold text-slate-800 mt-3">
              Nenhuma sessão atribuída a você no momento
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
              A recepção do SPA é quem monta a agenda. Assim que uma sessão for
              atribuída a você, ela aparece nesta tela.
            </p>
          </div>
        )}

        {mostrarLista &&
          grupos.map((grupo) => (
            <div
              key={grupo.pacienteId}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
            >
              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-blue-700 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                    {iniciais(grupo.pacienteNome)}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      {grupo.pacienteNome}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {grupo.sessoes.length}{' '}
                      {grupo.sessoes.length === 1
                        ? 'sessão agendada'
                        : 'sessões agendadas'}
                    </p>
                  </div>
                </div>

                {vinculados.has(grupo.pacienteId) ? (
                  <button
                    type="button"
                    onClick={() =>
                      navigate('/psi/prontuario', {
                        state: { pacienteId: grupo.pacienteId },
                      })
                    }
                    className="flex items-center gap-1.5 self-start sm:self-auto text-xs font-bold text-blue-700 hover:text-blue-900 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    Abrir prontuário
                    <ChevronRightIcon className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <p
                    className="self-start sm:self-auto text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 leading-relaxed max-w-xs"
                    title="A agenda é filtrada pela sua matrícula, mas o prontuário é filtrado pelo vínculo. Este paciente saiu da sua lista de pacientes."
                  >
                    Este paciente não está mais vinculado a você, então o
                    prontuário dele não abre por aqui.
                  </p>
                )}
              </div>

              <ul className="divide-y divide-slate-100">
                {grupo.sessoes.map((s) => (
                  <li key={s.id} className="px-5 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span
                          className="font-mono"
                          title={
                            s.dataSessao
                              ? undefined
                              : 'Sessão registrada antes de o sistema passar a exigir data'
                          }
                        >
                          {rotuloData(s.dataSessao)}
                        </span>
                        <span className="text-slate-300">·</span>
                        <ClockIcon className="w-4 h-4 text-slate-400" />
                        {s.horario || '—'}
                        <span className="text-xs font-semibold text-slate-500">
                          {ROTULO_TURNO[s.turno] ?? s.turno}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                        {s.salaOuCadeira}
                        {s.tipoConsulta ? ` · ${s.tipoConsulta}` : ''}
                      </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>

                    {s.status === 'FALTOU' && s.motivoFalta && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <p className="leading-relaxed">
                          <strong>Motivo da falta:</strong> {s.motivoFalta}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </div>
    </AppLayout>
  );
}
