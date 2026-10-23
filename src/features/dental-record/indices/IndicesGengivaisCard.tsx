import { useEffect, useState } from 'react';
import type { Face, IndicesGengivais } from './tipos';
import {
  alternarFace as alternarFaceNaLista,
  carregarIndices,
  criarIndicesVazios,
  salvarIndices,
} from './estado';
import { IndiceGengival } from './IndiceGengival';

interface IndicesGengivaisCardProps {
  pacienteId?: number;
}

export function IndicesGengivaisCard({ pacienteId }: IndicesGengivaisCardProps) {
  const [indices, setIndices] = useState<IndicesGengivais>(() =>
    pacienteId ? carregarIndices(pacienteId) : criarIndicesVazios()
  );

  useEffect(() => {
    if (pacienteId) {
      salvarIndices(pacienteId, indices);
    }
  }, [pacienteId, indices]);

  if (!pacienteId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
        Selecione um paciente para registrar o ISG e o índice de placa.
      </div>
    );
  }

  const alternarDente = (dente: string) =>
    setIndices((prev) => {
      const ausente = prev.dentesAusentes.includes(dente);

      if (ausente) {
        return {
          ...prev,
          dentesAusentes: prev.dentesAusentes.filter((item) => item !== dente),
        };
      }

      const sangramento = { ...prev.sangramento };
      const placa = { ...prev.placa };
      delete sangramento[dente];
      delete placa[dente];

      return {
        ...prev,
        dentesAusentes: [...prev.dentesAusentes, dente],
        sangramento,
        placa,
      };
    });

  const alternarFace = (indice: 'sangramento' | 'placa') => (dente: string, face: Face) =>
    setIndices((prev) => {
      if (prev.dentesAusentes.includes(dente)) return prev;

      const faces = prev[indice][dente] ?? [];
      return {
        ...prev,
        [indice]: {
          ...prev[indice],
          [dente]: alternarFaceNaLista(faces, face),
        },
      };
    });

  const limparIndice = (indice: 'sangramento' | 'placa') =>
    setIndices((prev) => ({
      ...prev,
      [indice]: {},
    }));

  return (
    <div className="space-y-5">
      <header className="mb-4 pb-3 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs">
            Índices Gengivais
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            ISG & Placa
          </span>
        </div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Índice de Sangramento Gengival e Índice de Placa
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Clique nas faces para marcar sangramento (ISG) ou placa. Clique no número do dente para
          marcá-lo como ausente; o denominador usa as faces presentes. Os dentes ausentes são
          compartilhados pelos dois índices.
        </p>
      </header>

      <IndiceGengival
        titulo="ISG — Índice de Sangramento Gengival"
        rotuloNumerador="Faces Sangrantes"
        facesMarcadas={indices.sangramento}
        dentesAusentes={indices.dentesAusentes}
        onAlternarFace={alternarFace('sangramento')}
        onAlternarDente={alternarDente}
        onLimpar={() => limparIndice('sangramento')}
      />

      <div className="border-t border-dashed border-slate-200 pt-4">
        <IndiceGengival
          titulo="Índice de Placa"
          rotuloNumerador="Faces Coradas"
          facesMarcadas={indices.placa}
          dentesAusentes={indices.dentesAusentes}
          onAlternarFace={alternarFace('placa')}
          onAlternarDente={alternarDente}
          onLimpar={() => limparIndice('placa')}
        />
      </div>

      <p className="text-[10px] leading-relaxed text-slate-400">
        As marcações ficam neste navegador (sessionStorage) por paciente; nada é enviado ao
        servidor nesta fase.
      </p>
    </div>
  );
}
