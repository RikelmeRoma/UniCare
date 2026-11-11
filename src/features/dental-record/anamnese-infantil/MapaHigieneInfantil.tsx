import { useState } from 'react';
import type { FaceHigieneInfantil, MapaHigieneInfantilDados } from './tipos';
import {
  DENTES_DECIDUOS_INFERIORES,
  DENTES_DECIDUOS_SUPERIORES,
} from './constantes';
import {
  contarFacesMarcadas,
  percentualInfantil,
  totalFacesHigieneInfantil,
} from './estado';
import { alternarValor } from '../anamnese/estado';

type FerramentaHigiene = 'placa' | 'sangramento' | 'borracha';

const COR_PLACA = '#f59e0b';
const COR_SANGRAMENTO = '#dc2626';

const FACES: { face: FaceHigieneInfantil; pontos: string; nome: string }[] = [
  { face: 'V', pontos: '0,0 40,0 20,14', nome: 'vestibular' },
  { face: 'D', pontos: '40,0 40,28 20,14', nome: 'distal' },
  { face: 'L', pontos: '0,28 40,28 20,14', nome: 'lingual/palatina' },
  { face: 'M', pontos: '0,0 0,28 20,14', nome: 'mesial' },
];

interface CaixaDenteProps {
  dente: string;
  facesPlaca: FaceHigieneInfantil[];
  facesSangramento: FaceHigieneInfantil[];
  ausente: boolean;
  ferramenta: FerramentaHigiene;
  onAlternarFace: (dente: string, face: FaceHigieneInfantil) => void;
}

function CaixaDente({
  dente,
  facesPlaca,
  facesSangramento,
  ausente,
  ferramenta,
  onAlternarFace,
}: CaixaDenteProps) {
  const corDaFace = (face: FaceHigieneInfantil) => {
    if (ausente) return '#e2e8f0';
    const placa = facesPlaca.includes(face);
    const sangramento = facesSangramento.includes(face);

    if (ferramenta === 'placa') return placa ? COR_PLACA : '#ffffff';
    if (ferramenta === 'sangramento') {
      return sangramento ? COR_SANGRAMENTO : '#ffffff';
    }
    if (placa) return COR_PLACA;
    if (sangramento) return COR_SANGRAMENTO;
    return '#ffffff';
  };

  return (
    <svg
      viewBox="0 0 40 28"
      preserveAspectRatio="none"
      className="block aspect-[40/28] w-full"
      aria-label={`Dente ${dente}${ausente ? ', ausente' : ''}`}
    >
      {FACES.map(({ face, pontos, nome }) => {
        const placa = facesPlaca.includes(face);
        const sangramento = facesSangramento.includes(face);
        return (
          <polygon
            key={face}
            points={pontos}
            role={ausente ? undefined : 'button'}
            tabIndex={ausente ? undefined : 0}
            aria-label={
              ausente
                ? undefined
                : `Dente ${dente}, face ${nome}${placa ? ', com placa' : ''}${sangramento ? ', com sangramento' : ''}`
            }
            aria-pressed={ausente ? undefined : placa || sangramento}
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
            fill={corDaFace(face)}
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
  comBordaInferior?: boolean;
  onAlternarDente: (dente: string) => void;
}

function NumeroDente({
  dente,
  ausente,
  comBordaInferior = true,
  onAlternarDente,
}: NumeroDenteProps) {
  return (
    <button
      type="button"
      onClick={() => onAlternarDente(dente)}
      aria-pressed={ausente}
      title={ausente ? 'Marcar dente como presente' : 'Marcar dente como ausente'}
      className={`documento-dado w-full border-r border-black dark:border-slate-600 py-0.5 text-center font-mono text-[10px] font-bold transition-colors first:border-l ${
        comBordaInferior ? 'border-b' : ''
      } ${
        ausente
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 line-through'
          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {dente}
    </button>
  );
}

interface ResultadoIndiceProps {
  sigla: string;
  descricao: string;
  marcadas: number;
  facesPresentes: number;
}

function ResultadoIndice({
  sigla,
  descricao,
  marcadas,
  facesPresentes,
}: ResultadoIndiceProps) {
  const resultado = percentualInfantil(marcadas, facesPresentes);
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {sigla} — {descricao}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
        <span>({marcadas} / {facesPresentes} x 100) =</span>
        <span className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 font-mono text-[11px] font-bold text-slate-900 dark:text-white tabular-nums">
          {resultado}
        </span>
        <span>%</span>
      </div>
    </div>
  );
}

interface MapaHigieneInfantilProps {
  mapa: MapaHigieneInfantilDados;
  onChange: (mapa: MapaHigieneInfantilDados) => void;
}

export function MapaHigieneInfantil({ mapa, onChange }: MapaHigieneInfantilProps) {
  const [ferramenta, setFerramenta] = useState<FerramentaHigiene>('placa');

  const facesPresentes = totalFacesHigieneInfantil(mapa.dentesAusentes);
  const totalPlaca = contarFacesMarcadas(mapa.placa, mapa.dentesAusentes);
  const totalSangramento = contarFacesMarcadas(
    mapa.sangramento,
    mapa.dentesAusentes
  );

  const alternarFace = (dente: string, face: FaceHigieneInfantil) => {
    if (ferramenta === 'borracha') {
      const placa = { ...mapa.placa };
      const sangramento = { ...mapa.sangramento };

      for (const camada of [placa, sangramento]) {
        const faces = camada[dente] ?? [];
        if (!faces.includes(face)) continue;
        const restantes = faces.filter((item) => item !== face);
        if (restantes.length > 0) camada[dente] = restantes;
        else delete camada[dente];
      }

      onChange({ ...mapa, placa, sangramento });
      return;
    }

    const camada = ferramenta === 'placa' ? 'placa' : 'sangramento';
    const faces = mapa[camada][dente] ?? [];
    const proximas = alternarValor(faces, face);
    const atualizado = { ...mapa[camada] };

    if (proximas.length > 0) atualizado[dente] = proximas;
    else delete atualizado[dente];

    onChange({ ...mapa, [camada]: atualizado });
  };

  const alternarDente = (dente: string) => {
    const ausente = mapa.dentesAusentes.includes(dente);
    const dentesAusentes = ausente
      ? mapa.dentesAusentes.filter((item) => item !== dente)
      : [...mapa.dentesAusentes, dente];
    const placa = { ...mapa.placa };
    const sangramento = { ...mapa.sangramento };

    if (!ausente) {
      delete placa[dente];
      delete sangramento[dente];
    }

    onChange({ ...mapa, dentesAusentes, placa, sangramento });
  };

  const limpar = () => {
    onChange({ placa: {}, sangramento: {}, dentesAusentes: [] });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { valor: 'placa', rotulo: 'Marcar placa' },
              { valor: 'sangramento', rotulo: 'Marcar sangramento' },
              { valor: 'borracha', rotulo: 'Borracha' },
            ] as const
          ).map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => setFerramenta(opcao.valor)}
              aria-pressed={ferramenta === opcao.valor}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                ferramenta === opcao.valor
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-blue-500 dark:bg-blue-600'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={limpar}
          className="rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800/60 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors hover:border-rose-300 dark:hover:border-rose-500/60 hover:text-rose-900 dark:hover:text-rose-300"
        >
          Limpar marcações
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <ResultadoIndice
          sigla="IP"
          descricao="Índice de Placa"
          marcadas={totalPlaca}
          facesPresentes={facesPresentes}
        />
        <ResultadoIndice
          sigla="IS"
          descricao="Índice de Sangramento"
          marcadas={totalSangramento}
          facesPresentes={facesPresentes}
        />
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="mx-auto min-w-[560px] max-w-[720px] rounded-md bg-white dark:bg-slate-900 pt-0.5">
          <div className="grid grid-cols-10">
            {DENTES_DECIDUOS_SUPERIORES.map((dente) => (
              <CaixaDente
                key={dente}
                dente={dente}
                facesPlaca={mapa.placa[dente] ?? []}
                facesSangramento={mapa.sangramento[dente] ?? []}
                ausente={mapa.dentesAusentes.includes(dente)}
                ferramenta={ferramenta}
                onAlternarFace={alternarFace}
              />
            ))}
          </div>

          <div className="grid grid-cols-10">
            {DENTES_DECIDUOS_SUPERIORES.map((dente) => (
              <NumeroDente
                key={dente}
                dente={dente}
                ausente={mapa.dentesAusentes.includes(dente)}
                onAlternarDente={alternarDente}
              />
            ))}
          </div>

          <div className="grid grid-cols-10">
            {DENTES_DECIDUOS_INFERIORES.map((dente) => (
              <NumeroDente
                key={dente}
                dente={dente}
                ausente={mapa.dentesAusentes.includes(dente)}
                comBordaInferior={false}
                onAlternarDente={alternarDente}
              />
            ))}
          </div>

          <div className="grid grid-cols-10">
            {DENTES_DECIDUOS_INFERIORES.map((dente) => (
              <CaixaDente
                key={dente}
                dente={dente}
                facesPlaca={mapa.placa[dente] ?? []}
                facesSangramento={mapa.sangramento[dente] ?? []}
                ausente={mapa.dentesAusentes.includes(dente)}
                ferramenta={ferramenta}
                onAlternarFace={alternarFace}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400">
        <span>
          <strong className="font-mono text-slate-900 dark:text-slate-100">V</strong> topo
        </span>
        <span>
          <strong className="font-mono text-slate-900 dark:text-slate-100">D</strong> direita
        </span>
        <span>
          <strong className="font-mono text-slate-900 dark:text-slate-100">L</strong> base
        </span>
        <span>
          <strong className="font-mono text-slate-900 dark:text-slate-100">M</strong> esquerda
        </span>
        <span>Clique no número para marcar o dente como ausente.</span>
      </div>
    </div>
  );
}
