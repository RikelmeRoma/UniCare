import type {
  CondicaoOdontogramaInfantil,
  DenteOdontogramaInfantil,
  FaceOdontogramaInfantil,
} from './tipos';
import {
  CONDICOES_ODONTOGRAMA_INFANTIL,
  CORES_CONDICAO_INFANTIL,
} from './constantes';

interface DenteOdontogramaInfantilSVGProps {
  numero: string;
  dente: DenteOdontogramaInfantil;
  onAlternarFace: (face: FaceOdontogramaInfantil) => void;
  onAlternarPresente: () => void;
}

function quadrante(numero: string): number {
  return Number(numero[0]);
}

function isUpper(numero: string): boolean {
  const q = quadrante(numero);
  return q === 1 || q === 2 || q === 5 || q === 6;
}

function isRightQuadrant(numero: string): boolean {
  const q = quadrante(numero);
  return q === 1 || q === 4 || q === 5 || q === 8;
}

function isAnterior(numero: string): boolean {
  return Number(numero[1]) <= 3;
}

function faceLabel(numero: string, face: FaceOdontogramaInfantil): string {
  switch (face) {
    case 'V':
      return 'Vestibular';
    case 'L':
      return isUpper(numero) ? 'Palatina' : 'Lingual';
    case 'O':
      return isAnterior(numero) ? 'Incisal' : 'Oclusal';
    case 'M':
      return 'Mesial';
    case 'D':
      return 'Distal';
    default:
      return face;
  }
}

function sideKeys(numero: string): {
  left: FaceOdontogramaInfantil;
  right: FaceOdontogramaInfantil;
} {
  return isRightQuadrant(numero)
    ? { left: 'D', right: 'M' }
    : { left: 'M', right: 'D' };
}

function rotuloCondicao(condicao: CondicaoOdontogramaInfantil): string {
  return (
    CONDICOES_ODONTOGRAMA_INFANTIL.find(
      (item) => item.valor === condicao
    )?.rotulo ?? condicao
  );
}

export function DenteOdontogramaInfantilSVG({
  numero,
  dente,
  onAlternarFace,
  onAlternarPresente,
}: DenteOdontogramaInfantilSVGProps) {
  const { left: leftKey, right: rightKey } = sideKeys(numero);
  const w = 44;
  const h = 54;
  const r = 11;
  const clipId = `dente-infantil-clip-${numero}`;
  const sheenId = `dente-infantil-sheen-${numero}`;
  const depthId = `dente-infantil-depth-${numero}`;
  const bloqueado = !dente.presente;

  const preenchimento = (face: FaceOdontogramaInfantil) => {
    const condicao = dente.faces[face];
    return condicao ? CORES_CONDICAO_INFANTIL[condicao] : '#FBFDFC';
  };

  const celula = (
    face: FaceOdontogramaInfantil,
    x: number,
    y: number,
    cw: number,
    ch: number
  ) => {
    const condicao = dente.faces[face];
    const rotulo = condicao ? `, ${rotuloCondicao(condicao)}` : ', sem marcação';

    return (
      <rect
        key={face}
        x={x}
        y={y}
        width={cw}
        height={ch}
        fill={preenchimento(face)}
        stroke="#E7ECEB"
        strokeWidth="1"
        role={bloqueado ? undefined : 'button'}
        tabIndex={bloqueado ? undefined : 0}
        aria-label={
          bloqueado
            ? undefined
            : `Dente ${numero}, face ${faceLabel(numero, face)}${rotulo}`
        }
        aria-pressed={bloqueado ? undefined : Boolean(condicao)}
        onClick={() => {
          if (!bloqueado) onAlternarFace(face);
        }}
        onKeyDown={(event) => {
          if (bloqueado) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onAlternarFace(face);
          }
        }}
        className={
          bloqueado
            ? 'cursor-not-allowed'
            : 'cursor-pointer transition-colors focus:outline-none focus-visible:opacity-70'
        }
      >
        <title>{`${numero} — ${faceLabel(numero, face)}${
          condicao ? `: ${rotuloCondicao(condicao)}` : ''
        }`}</title>
      </rect>
    );
  };

  return (
    <div
      className="flex shrink-0 select-none flex-col items-center"
      style={{ width: w }}
    >
      <button
        type="button"
        onClick={onAlternarPresente}
        aria-pressed={dente.presente}
        aria-label={`Dente ${numero}${
          dente.presente ? ', presente' : ', ausente'
        }. Clique para alternar.`}
        title={
          dente.presente
            ? 'Marcar dente como ausente'
            : 'Marcar dente como presente'
        }
        className={`mb-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 font-mono text-[10px] font-bold transition-colors ${
          dente.presente
            ? 'border-slate-900 bg-white text-slate-900 hover:bg-slate-100'
            : 'border-transparent bg-slate-100 text-slate-400 line-through hover:text-slate-600'
        }`}
      >
        {numero}
      </button>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        className="block transition-transform duration-150 ease-out hover:-translate-y-0.5"
        style={{
          overflow: 'visible',
          filter: 'drop-shadow(0 1px 2px rgba(20,38,42,0.18))',
        }}
        aria-label={`Odontograma do dente ${numero}`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={0.75}
              y={0.75}
              width={w - 1.5}
              height={h - 1.5}
              rx={r}
              ry={r}
            />
          </clipPath>
          <radialGradient id={sheenId} cx="30%" cy="16%" r="80%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={depthId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="65%" stopColor="#0B1A1D" stopOpacity="0" />
            <stop offset="100%" stopColor="#0B1A1D" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          {celula('V', 14, 0, 16, 16)}
          {celula(leftKey, 0, 16, 14, 22)}
          {celula('O', 14, 16, 16, 22)}
          {celula(rightKey, 30, 16, 14, 22)}
          {celula('L', 14, 38, 16, 16)}

          {bloqueado && (
            <>
              <rect x={0} y={0} width={w} height={h} fill="#E6EAE9" opacity="0.95" />
              <line
                x1={11}
                y1={11}
                x2={w - 11}
                y2={h - 11}
                stroke="#9AA5A3"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1={w - 11}
                y1={11}
                x2={11}
                y2={h - 11}
                stroke="#9AA5A3"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <title>{`${numero} — Ausente`}</title>
            </>
          )}

          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill={`url(#${sheenId})`}
            pointerEvents="none"
          />
          <rect
            x={0}
            y={0}
            width={w}
            height={h}
            fill={`url(#${depthId})`}
            pointerEvents="none"
          />
        </g>

        <rect
          x={0.75}
          y={0.75}
          width={w - 1.5}
          height={h - 1.5}
          rx={r}
          ry={r}
          fill="none"
          stroke="#C7D0CE"
          strokeWidth="1.2"
          pointerEvents="none"
        />
      </svg>
    </div>
  );
}
