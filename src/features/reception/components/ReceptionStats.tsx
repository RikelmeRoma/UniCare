import { useMemo } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '../../../components/icons/CorporateIcons';

export function ReceptionStats() {
  const { agendamentos, pacientes, sync } = useClinic();

  const indicadores = useMemo(() => {
    const porStatus = (s: string) => agendamentos.filter((a) => a.status === s).length;

    const emEspera = porStatus('PRESENTE');
    const emAtendimento = porStatus('EM_ATENDIMENTO');
    const concluidos = porStatus('CONCLUIDO');
    const faltas = porStatus('FALTOU');

    // Mesma fórmula do backend em routers/relatorios.py, para que o cartão e o
    // relatório gerencial não diverjam.
    const atendidos = emEspera + emAtendimento + concluidos;
    const finalizados = atendidos + faltas;
    const taxaAbsenteismo = finalizados > 0 ? (faltas / finalizados) * 100 : 0;

    return {
      total: agendamentos.length,
      pacientesAtivos: pacientes.length,
      emEspera,
      emAtendimento,
      faltas,
      taxaAbsenteismo,
    };
  }, [agendamentos, pacientes]);

  // Distingue dado real do Postgres de mock — sem isso não há como saber, na tela,
  // se os números vêm do banco ou do fallback local.
  const origemLabel =
    sync.estado === 'sincronizando'
      ? { texto: 'Sincronizando...', classe: 'bg-slate-100 text-slate-600' }
      : sync.estado === 'sincronizado'
        ? { texto: 'Dados da API', classe: 'bg-emerald-50 text-emerald-700' }
        : sync.estado === 'parcial'
          ? { texto: 'Dados parciais da API', classe: 'bg-amber-50 text-amber-700' }
          : sync.estado === 'erro'
            ? { texto: 'Falha na API', classe: 'bg-red-50 text-red-700' }
            : { texto: 'Aguardando login', classe: 'bg-slate-100 text-slate-500' };

  return (
    <>
      <div className="flex items-center justify-between mb-4 text-[11px]">
        <span className={`px-2 py-1 rounded-md font-bold ${origemLabel.classe}`}>
          {origemLabel.texto}
        </span>
        {sync.estado === 'parcial' && sync.falhas.length > 0 && (
          <span className="text-amber-700 text-[10px] font-mono truncate ml-3" title={sync.falhas.join(' | ')}>
            {sync.falhas[0]}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Agendados */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Agendamentos</p>
            <h3 className="text-3xl font-bold text-slate-900 font-mono">{indicadores.total}</h3>
            <p className="text-[10px] text-slate-400 mt-1">
              {indicadores.pacientesAtivos} pacientes ativos
            </p>
          </div>
          <span className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <CalendarIcon className="w-4 h-4" />
          </span>
        </div>

        {/* Em Espera */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">Em Espera na Recepção</p>
            <h3 className="text-3xl font-bold text-amber-700 font-mono">{indicadores.emEspera}</h3>
            <p className="text-[10px] text-amber-800 font-medium mt-1">Aguardando acolhimento</p>
          </div>
          <span className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
            <ClockIcon className="w-4 h-4" />
          </span>
        </div>

        {/* Em Atendimento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-2">Em Atendimento</p>
            <h3 className="text-3xl font-bold text-blue-700 font-mono">{indicadores.emAtendimento}</h3>
            <p className="text-[10px] text-blue-700 font-medium mt-1">Procedimento em curso</p>
          </div>
          <span className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
            <UserGroupIcon className="w-4 h-4" />
          </span>
        </div>

        {/* Faltas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-red-700 uppercase tracking-wider mb-2">Faltas Registradas</p>
            <h3 className="text-3xl font-bold text-red-700 font-mono">{indicadores.faltas}</h3>
            <p className="text-[10px] text-red-700 font-medium mt-1">
              Taxa absenteísmo {indicadores.taxaAbsenteismo.toFixed(1)}%
            </p>
          </div>
          <span className="p-2.5 bg-red-50 text-red-700 rounded-xl">
            <ExclamationTriangleIcon className="w-4 h-4" />
          </span>
        </div>
      </div>
    </>
  );
}