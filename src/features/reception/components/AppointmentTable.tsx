import { useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  LockClosedIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from '../../../components/icons/CorporateIcons';

export function AppointmentTable() {
  const { agendamentos, atualizarStatusAgendamento } = useClinic();
  const [statusFiltro, setStatusFiltro] = useState<string>('TODOS');
  const [busca, setBusca] = useState<string>('');

  const itensFiltrados = agendamentos.filter((item) => {
    const matchStatus = statusFiltro === 'TODOS' || item.status === statusFiltro;
    const matchBusca =
      item.pacienteNome.toLowerCase().includes(busca.toLowerCase()) ||
      item.estagiarioNome.toLowerCase().includes(busca.toLowerCase()) ||
      item.salaOuCadeira.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AGENDADO':
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-slate-200">Agendado</span>;
      case 'PRESENTE':
        return <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-amber-200">Na Recepção</span>;
      case 'EM_ATENDIMENTO':
        return <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-blue-200">Em Atendimento</span>;
      case 'CONCLUIDO':
        return <span className="bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-emerald-200">Atendido</span>;
      case 'FALTOU':
        return <span className="bg-red-50 text-red-700 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-red-200">Faltou</span>;
      case 'CANCELADO':
        return <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-slate-200">Cancelado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden font-sans">
      {/* Alerta de Conformidade RN-001 (Visão Exclusivamente Logística da Recepção) */}
      <div className="bg-slate-900 text-slate-300 px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <LockClosedIcon className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="text-white">Salvaguarda RN-001 / Resolução CFP 06/2019:</strong> Perfil de recepção restrito a agendamento e acolhimento presencial.
          </span>
        </div>
        <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded-md">
          {itensFiltrados.length} registros ativos
        </span>
      </div>

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
              <th className="py-3 px-4">Horário / Turno</th>
              <th className="py-3 px-4">Paciente</th>
              <th className="py-3 px-4">Local / Especialidade</th>
              <th className="py-3 px-4">Estagiário Responsável</th>
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
                  <td className="py-3.5 px-4 font-mono">
                    <p className="font-bold text-slate-900 text-sm">{item.horario}</p>
                    <p className="text-[10px] text-slate-400 capitalize">Turno: {item.turno}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{item.pacienteNome}</p>
                    <p className="text-[10px] text-slate-500 italic">{item.observacaoLogistica}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{item.salaOuCadeira}</p>
                    <p className="text-[10px] text-blue-700 font-medium capitalize">{item.tipoConsulta}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{item.estagiarioNome}</p>
                    <p className="text-[10px] text-slate-400 font-mono">Matrícula: {item.estagiarioMatricula}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    {getStatusBadge(item.status)}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex justify-end gap-1.5">
                      {item.status === 'AGENDADO' && (
                        <button
                          type="button"
                          onClick={() => atualizarStatusAgendamento(item.id, 'PRESENTE')}
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
                          onClick={() => atualizarStatusAgendamento(item.id, 'EM_ATENDIMENTO')}
                          className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                          title="Encaminhar para atendimento no box/sala"
                        >
                          <span>Iniciar Atendimento</span>
                        </button>
                      )}

                      {item.status === 'EM_ATENDIMENTO' && (
                        <button
                          type="button"
                          onClick={() => atualizarStatusAgendamento(item.id, 'CONCLUIDO')}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition-colors shadow-2xs"
                        >
                          Concluir
                        </button>
                      )}

                      {(item.status === 'AGENDADO' || item.status === 'PRESENTE') && (
                        <button
                          type="button"
                          onClick={() => atualizarStatusAgendamento(item.id, 'FALTOU')}
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
    </div>
  );
}
