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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 uppercase tracking-wider">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
            <span>{titulo}</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {visiveis.length}
            </span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitulo}</p>
        </div>

        {!filtrarPorMatricula && ocorrenciasPsico.length > 0 && (
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar aluno ou descrição..."
            className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none w-full sm:w-56"
          />
        )}
      </div>

      {visiveis.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">
          Nenhuma ocorrência registrada até o momento.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {visiveis.map((oc) => (
            <li
              key={oc.id}
              className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 text-xs space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-900">{oc.estagiarioNome}</span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                    {oc.estagiarioMatricula}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                    {LABEL_TIPO_OCORRENCIA_PSICO[oc.tipo] ?? oc.tipo}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {formatarDataBr(oc.dataOcorrencia)}
                </span>
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                {oc.descricao}
              </p>
              <p className="text-[10px] text-slate-400">
                Registrado por {oc.registradoPorNome} ({oc.registradoPorMatricula})
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
