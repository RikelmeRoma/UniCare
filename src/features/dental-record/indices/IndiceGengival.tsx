import { memo } from 'react';
import { DENTES_INFERIORES, DENTES_SUPERIORES } from './tipos';
import type { Face } from './tipos';
import { percentualIndice, totalFacesPresentes } from './estado';

const FACES_POR_QUADRANTE: { face: Face; pontos: string; nome: string }[] = [
  { face: 'V', pontos: '0,0 40,0 20,14', nome: 'vestibular' },
  { face: 'D', pontos: '40,0 40,28 20,14', nome: 'distal' },
  { face: 'L', pontos: '0,28 40,28 20,14', nome: 'lingual/palatina' },
  { face: 'M', pontos: '0,0 0,28 20,14', nome: 'mesial' },
];

interface CaixaDenteProps {
  dente: string;
  faces: Face[];
  ausente: boolean;
  onAlternarFace: (dente: string, face: Face) => void;
}

function CaixaDente({ dente, faces, ausente, onAlternarFace }: CaixaDenteProps) {
  return (
    <svg
      viewBox="0 0 40 28"
      className="block h-8 w-full"
      aria-label={`Dente ${dente}${ausente ? ', ausente' : ''}`}
    >
      {FACES_POR_QUADRANTE.map(({ face, pontos, nome }) => {
        const marcada = faces.includes(face);
        const preenchimento = ausente
          ? '#e2e8f0'
          : marcada
            ? '#dc2626'
            : '#ffffff';
        return (
          <polygon
            key={face}
            points={pontos}
            role={ausente ? undefined : 'button'}
            tabIndex={ausente ? undefined : 0}
            aria-label={
              ausente
                ? undefined
                : `Dente ${dente}, face ${nome}${marcada ? ', marcada' : ''}`
            }
            aria-pressed={ausente ? undefined : marcada}
            onClick={() => {
              if (!ausente) onAlternarFace(dente, face);
            }}
            onKeyDown={(e) => {
              if (ausente) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onAlternarFace(dente, face);
              }
            }}
            className={
              ausente
                ? 'cursor-not-allowed'
                : 'cursor-pointer transition-colors focus:outline-none focus-visible:opacity-70'
            }
            fill={preenchimento}
            stroke="#000"
            strokeWidth={1}
          />
        );
      })}
      {ausente && (
        <>
          <line x1="2" y1="2" x2="38" y2="26" stroke="#94a3b8" strokeWidth={1.5} />
          <line x1="38" y1="2" x2="2" y2="26" stroke="#94a3b8" strokeWidth={1.5} />
        </>
      )}
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="27"
        fill="none"
        stroke="#000"
        strokeWidth={1}
        pointerEvents="none"
      />
    </svg>
  );
}

interface NumeroDenteProps {
  dente: string;
  ausente: boolean;
  onAlternarDente: (dente: string) => void;
}

function NumeroDente({ dente, ausente, onAlternarDente }: NumeroDenteProps) {
  return (
    <button
      type="button"
      onClick={() => onAlternarDente(dente)}
      aria-pressed={ausente}
      title={ausente ? 'Marcar dente como presente' : 'Marcar dente como ausente'}
      className={`w-full border-r border-b border-black py-0.5 text-center font-mono text-[10px] font-bold transition-colors ${
        ausente
          ? 'bg-slate-100 text-slate-400 line-through'
          : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {dente}
    </button>
  );
}

interface IndiceGengivalProps {
  titulo: string;
  rotuloNumerador: string;
  facesMarcadas: Record<string, Face[]>;
  dentesAusentes: string[];
  onAlternarFace: (dente: string, face: Face) => void;
  onAlternarDente: (dente: string) => void;
  onLimpar: () => void;
}

export const IndiceGengival = memo(function IndiceGengival({
  titulo,
  rotuloNumerador,
  facesMarcadas,
  dentesAusentes,
  onAlternarFace,
  onAlternarDente,
  onLimpar,
}: IndiceGengivalProps) {
  const facesPresentes = totalFacesPresentes(dentesAusentes);
  const marcadas = Object.entries(facesMarcadas).reduce((total, [dente, faces]) => {
    if (dentesAusentes.includes(dente)) return total;
    return total + faces.length;
  }, 0);
  const resultado = percentualIndice(marcadas, facesPresentes);
  const conta = `${marcadas} / ${facesPresentes} x 100`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900">
          {titulo}
        </h4>
        <button
          type="button"
          onClick={onLimpar}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-900"
        >
          Limpar marcações
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">
        <span>
          ({rotuloNumerador} / Faces presentes x 100)
        </span>
        <input
          type="text"
          readOnly
          value={conta}
          aria-label={`Conta do ${titulo}`}
          className="w-40 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-mono text-[11px] text-slate-800"
        />
        <span>=</span>
        <input
          type="text"
          readOnly
          value={resultado}
          aria-label={`Resultado do ${titulo}`}
          className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center font-mono text-[11px] font-bold text-slate-900"
        />
        <span>%</span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[720px] border-l border-t border-black bg-white">
          <div className="grid grid-cols-16">
            {DENTES_SUPERIORES.map((dente) => (
              <CaixaDente
                key={dente}
                dente={dente}
                faces={facesMarcadas[dente] ?? []}
                ausente={dentesAusentes.includes(dente)}
                onAlternarFace={onAlternarFace}
              />
            ))}
          </div>

          <div className="grid grid-cols-16">
            {DENTES_SUPERIORES.map((dente) => (
              <NumeroDente
                key={dente}
                dente={dente}
                ausente={dentesAusentes.includes(dente)}
                onAlternarDente={onAlternarDente}
              />
            ))}
          </div>

          <div className="grid grid-cols-16">
            {DENTES_INFERIORES.map((dente) => (
              <NumeroDente
                key={dente}
                dente={dente}
                ausente={dentesAusentes.includes(dente)}
                onAlternarDente={onAlternarDente}
              />
            ))}
          </div>

          <div className="grid grid-cols-16">
            {DENTES_INFERIORES.map((dente) => (
              <CaixaDente
                key={dente}
                dente={dente}
                faces={facesMarcadas[dente] ?? []}
                ausente={dentesAusentes.includes(dente)}
                onAlternarFace={onAlternarFace}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span>
          <strong className="font-mono text-slate-900">V</strong> topo
        </span>
        <span>
          <strong className="font-mono text-slate-900">D</strong> direita
        </span>
        <span>
          <strong className="font-mono text-slate-900">L</strong> base
        </span>
        <span>
          <strong className="font-mono text-slate-900">M</strong> esquerda
        </span>
        <span>Clique no número para marcar o dente como ausente.</span>
      </div>
    </div>
  );
});
