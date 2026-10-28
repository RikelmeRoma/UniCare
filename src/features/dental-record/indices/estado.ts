import type { Face, IndicesGengivais } from './tipos';
import { TOTAL_FACES } from './tipos';

const PREFIXO = 'unicare:indices-gengivais:';
const PREFIXO_LEGADO = 'unicare:anamnese-cli45:';

function chaveAtual(pacienteId: number) {
  return `${PREFIXO}${pacienteId}`;
}

export function criarIndicesVazios(): IndicesGengivais {
  return {
    dentesAusentes: [],
    sangramento: {},
    placa: {},
  };
}

function normalizarFaces(entrada: unknown): Record<string, Face[]> {
  if (!entrada || typeof entrada !== 'object') return {};

  return Object.entries(entrada as Record<string, unknown>).reduce(
    (acumulado, [dente, faces]) => {
      if (Array.isArray(faces)) {
        acumulado[dente] = faces.filter(
          (face): face is Face =>
            face === 'V' || face === 'M' || face === 'D' || face === 'L'
        );
      }
      return acumulado;
    },
    {} as Record<string, Face[]>
  );
}

function sanitizar(valor: unknown): IndicesGengivais | null {
  if (!valor || typeof valor !== 'object') return null;

  const dados = valor as Partial<IndicesGengivais>;
  if (!Array.isArray(dados.dentesAusentes)) return null;

  return {
    dentesAusentes: dados.dentesAusentes.filter(
      (dente): dente is string => typeof dente === 'string'
    ),
    sangramento: normalizarFaces(dados.sangramento),
    placa: normalizarFaces(dados.placa),
  };
}

function lerChave(chave: string): unknown {
  try {
    const bruto = window.sessionStorage.getItem(chave);
    if (!bruto) return null;
    return JSON.parse(bruto) as unknown;
  } catch {
    return null;
  }
}

export function carregarIndices(pacienteId: number): IndicesGengivais {
  const atual = sanitizar(lerChave(chaveAtual(pacienteId)));
  if (atual) return atual;

  const legado = lerChave(`${PREFIXO_LEGADO}${pacienteId}`) as
    | { exameFisico?: { indices?: unknown } }
    | null;
  const migrado = sanitizar(legado?.exameFisico?.indices);
  return migrado ?? criarIndicesVazios();
}

export function salvarIndices(pacienteId: number, indices: IndicesGengivais): void {
  try {
    window.sessionStorage.setItem(chaveAtual(pacienteId), JSON.stringify(indices));
  } catch {
    // Sem espaço ou com sessionStorage bloqueado, o rascunho não é gravado.
    // As marcações continuam válidas enquanto a aba estiver aberta.
  }
}

export function alternarFace(faces: Face[], face: Face): Face[] {
  return faces.includes(face)
    ? faces.filter((item) => item !== face)
    : [...faces, face];
}

export function percentualIndice(numerador: number, denominador: number): string {
  if (
    !Number.isFinite(numerador) ||
    !Number.isFinite(denominador) ||
    denominador <= 0
  ) {
    return '—';
  }
  const percentual = (numerador / denominador) * 100;
  return percentual.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function totalFacesPresentes(dentesAusentes: string[]): number {
  return Math.max(0, TOTAL_FACES - dentesAusentes.length * 4);
}
