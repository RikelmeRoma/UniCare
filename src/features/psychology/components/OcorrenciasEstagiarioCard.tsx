import { useState } from 'react';
import { ExclamationTriangleIcon } from '../../../components/icons/CorporateIcons';
import { formatarDataBr, LABEL_TIPO_OCORRENCIA_PSICO } from '../constants/psico';
import { useClinic } from '../../clinic/context/ClinicContext';

interface OcorrenciasEstagiarioCardProps {
  titulo?: string;
  subtitulo?: string;
  filtrarPorMatricula?: string;
}

/**
 * Painel compartilhado para consulta de ocorrências operacionais de estagiários
 * registradas pela recepção (visível para supervisão/coordenação e para o próprio aluno).
 */
export function OcorrenciasEstagiarioCard({
  titulo = 'Ocorrências Registradas pela Recepção',
  subtitulo = 'Acompanhamento de pontualidade, faltas e ocorrências administrativas.',
  filtrarPorMatricula,
}: OcorrenciasEstagiarioCardProps) {
  const { ocorrenciasPsico } = useClinic();
  const [busca, setBusca] = useState('');

  const visiveis = ocorrenciasPsico.filter((oc) => {
    if (filtrarPorMatricula && oc.estagiarioMatricula !== filtrarPorMatricula) {
      return false;
    }
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return (
      oc.estagiarioNome.toLowerCase().includes(q) ||
      oc.estagiarioMatricula.toLowerCase().includes(q) ||
      oc.descricao.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-white dark:bg-[#0E1729] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2 uppercase tracking-wider">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{titulo}</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 tabular-nums">
              {visiveis.length}
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitulo}</p>
        </div>

        {!filtrarPorMatricula && ocorrenciasPsico.length > 0 && (
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar aluno ou descrição..."
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none w-full sm:w-56 transition-colors"
          />
        )}
      </div>

      {visiveis.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
          Nenhuma ocorrência registrada até o momento.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {visiveis.map((oc) => (
            <li
              key={oc.id}
              className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 p-3.5 text-xs space-y-1.5 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white">{oc.estagiarioNome}</span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded-md">
                    {oc.estagiarioMatricula}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70">
                    {LABEL_TIPO_OCORRENCIA_PSICO[oc.tipo] ?? oc.tipo}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatarDataBr(oc.dataOcorrencia)}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {oc.descricao}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Registrado por {oc.registradoPorNome} ({oc.registradoPorMatricula})
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
