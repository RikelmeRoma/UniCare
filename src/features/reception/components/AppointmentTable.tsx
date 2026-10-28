import { useState } from 'react';
import {
  useClinic,
  type Agendamento,
  type StatusAgendamento,
} from '../../clinic/context/ClinicContext';
import { rotuloStatus } from '../../../shared/statusAgendamento';
import { RegistrarFaltaModal } from './RegistrarFaltaModal';
import {
  LockClosedIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
} from '../../../components/icons/CorporateIcons';

function StatusBadge({ status }: { status: StatusAgendamento }) {
  const s = rotuloStatus(status);
  return <span className={s.classes}>{s.rotulo}</span>;
}

const MES_ABREVIADO = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/** `17/10/2026`, ou `—` quando a sessão é anterior à coluna de data.
 *
 * A parte da data do ISO é lida direto, sem `new Date()`: `new Date('2026-10-17')`
 * é meia-noite UTC e, em Aracaju (UTC-3), `toLocaleDateString` devolveria
 * 16/10. A data não tem fuso, e a formatação não pode inventar um. */
function rotuloData(iso?: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return '—';
  return `${dia}/${mes}/${ano}`;
}

interface AppointmentTableProps {
  exibirTextoSalvaguarda?: boolean;
  /** Psicologia captura o motivo da falta; odontologia mantém o fluxo direto. */
  permitirMotivoFalta?: boolean;
}

export function AppointmentTable({
  exibirTextoSalvaguarda = true,
  permitirMotivoFalta = false,
}: AppointmentTableProps) {
  const { agendamentos, atualizarStatusAgendamento } = useClinic();
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');
  const [busca, setBusca] = useState<string>('');
  const [agendamentoParaFalta, setAgendamentoParaFalta] =
    useState<Agendamento | null>(null);
  const [erroStatus, setErroStatus] = useState('');

  const itensFiltrados = agendamentos
    .filter((item) => {
      const matchStatus = statusFiltro === 'TODOS' || item.status === statusFiltro;
      const matchBusca =
        item.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
        item.estagiarioNome.toLowerCase().includes(busca.toLowerCase()) ||
        item.salaOuCadeira.toLowerCase().includes(busca.toLowerCase());
      return matchStatus && matchBusca;
    })
    // Ordenar por dia e hora: sem isso a agenda sai na ordem de inserção e o
    // próximo paciente nao aparece no topo. A comparação é de string ISO, que
    // ordena igual a data — e as sessões sem dia vão para o fim, não para o
    // começo fingindo que são a mais antiga.
    .sort((a, b) => {
      const da = a.dataSessao ?? '9999-12-31';
      const db = b.dataSessao ?? '9999-12-31';
      if (da !== db) return da < db ? -1 : 1;
      return a.horario < b.horario ? -1 : a.horario > b.horario ? 1 : 0;
    });

  const alterarStatus = async (id: number, status: StatusAgendamento) => {
    setErroStatus('');
    const res = await atualizarStatusAgendamento(id, status);
    if (!res.success) setErroStatus(res.message);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden font-sans">
      {/* Alerta de Conformidade RN-001 (Visão Exclusivamente Logística da Recepção) */}
      <div className="bg-slate-900 text-slate-300 px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <LockClosedIcon className="w-4 h-4 text-amber-400 shrink-0" />
          {exibirTextoSalvaguarda && (
            <span>
              <strong className="text-white">Salvaguarda:</strong> Perfil de recepção restrito a agendamento e acolhimento presencial.
            </span>
          )}
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-md">
          {itensFiltrados.length} registros ativos
        </span>
      </div>

      {erroStatus && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-2.5 flex items-start justify-between gap-3 text-xs text-red-800">
          <p className="leading-relaxed">{erroStatus}</p>
          <button
            type="button"
            onClick={() => setErroStatus('')}
            className="text-red-500 hover:text-red-800 p-0.5 rounded shrink-0"
            aria-label="Fechar aviso"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {['TODOS', 'AGENDADO', 'PRESENTE', 'EM_ATENDIMENTO', 'CONCLUIDO', 'FALTOU'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFiltro(st)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                statusFiltro === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {st === 'TODOS' ? 'Todos os Status' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por paciente, aluno ou sala..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-slate-900 outline-none"
          />
        </div>
      </div>

      {/* Tabela de Atendimentos */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Data / Horário</th>
              <th className="py-3 px-4">Paciente</th>
              <th className="py-3 px-4">Local / Especialidade</th>
              <th className="py-3 px-4">Estagiários da Sessão</th>
              <th className="py-3 px-4">Status Presença</th>
              <th className="py-3 px-4 text-right">Ações de Recepção</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itensFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Nenhum agendamento encontrado para os filtros selecionados.
                </td>
              </tr>
            ) : (
              itensFiltrados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Data e horário na MESMA célula. Com a data em coluna
                      própria a tabela passou de seis para sete colunas e os
                      botões de "Ações de Recepção" ficaram cortados pela
                      rolagem horizontal em tela de 1366px — que é onde a
                      recepção trabalha. Seis colunas cabem. */}
                  <td className="py-3.5 px-4">
                    {item.dataSessao ? (
                      <>
                        <p className="font-mono text-xs font-bold text-slate-900">
                          {rotuloData(item.dataSessao)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {MES_ABREVIADO[Number(item.dataSessao.split('-')[1]) - 1]} ·{' '}
                          {item.horario}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">Turno: {item.turno}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-mono text-xs font-bold text-slate-300">—</p>
                        <p className="text-[10px] text-slate-400 font-mono">{item.horario}</p>
                        <p
                          className="text-[10px] text-slate-400 italic"
                          title="Sessão registrada antes de o sistema passar a exigir data"
                        >
                          data não registrada
                        </p>
                      </>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
<p className="font-bold text-slate-900">{item.pacienteNome}</p>
                {/* observacaoLogistica é opcional no schema: renderizar direto
                    quebrava a linha da tabela quando vinha vazio. */}
                {item.observacaoLogistica && (
                  <p className="text-[10px] text-slate-500 italic">{item.observacaoLogistica}</p>
                )}
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{item.salaOuCadeira}</p>
                    <p className="text-[10px] text-blue-700 font-medium capitalize">{item.tipoConsulta}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{item.estagiarioNome}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Matrícula: {item.estagiarioMatricula}
                      {item.auxiliarMatricula ? ` · Aux.: ${item.auxiliarMatricula}` : ''}
                    </p>
                  </td>

                  <td className="py-3.5 px-4">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      {item.status === 'AGENDADO' && (
                        <button
                          type="button"
                          onClick={() => void alterarStatus(item.id, 'PRESENTE')}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                          title="Confirmar presença do paciente"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          <span>Dar Presença</span>
                        </button>
                      )}

                      {item.status === 'PRESENTE' && (
                        <button
                          type="button"
                          onClick={() => void alterarStatus(item.id, 'EM_ATENDIMENTO')}
                          className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                          title="Encaminhar para atendimento no box/sala"
                        >
                          <span>Iniciar Atendimento</span>
                        </button>
                      )}

                      {item.status === 'EM_ATENDIMENTO' && (
                        <button
                          type="button"
                          onClick={() => void alterarStatus(item.id, 'CONCLUIDO')}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-colors shadow-2xs"
                        >
                          Concluir
                        </button>
                      )}

                      {(item.status === 'AGENDADO' || item.status === 'PRESENTE') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              permitirMotivoFalta &&
                              item.curso === 'psicologia'
                            ) {
                              setAgendamentoParaFalta(item);
                              return;
                            }
                            void alterarStatus(item.id, 'FALTOU');
                          }}
                          className="text-red-700 hover:bg-red-50 border border-red-200 font-semibold px-2 py-1.5 rounded-lg text-[11px] transition-colors"
                          title="Registrar falta para indicador de absenteísmo"
                        >
                          Falta
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {agendamentoParaFalta && (
        <RegistrarFaltaModal
          agendamento={agendamentoParaFalta}
          onClose={() => setAgendamentoParaFalta(null)}
        />
      )}
    </div>
  );
}
