import { Fragment, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type {
  CondicaoOdontogramaInfantil,
  DenticaoInfantil,
  FaceOdontogramaInfantil,
  FacesOdontogramaInfantil,
  OdontogramaInfantilDados,
} from './tipos';
import {
  CONDICOES_ODONTOGRAMA_INFANTIL,
  CORES_CONDICAO_INFANTIL,
  DENTES_DECIDUOS_INFERIORES,
  DENTES_DECIDUOS_SUPERIORES,
  DENTES_PERMANENTES_INFERIORES,
  DENTES_PERMANENTES_SUPERIORES,
  dentesPorDenticao,
} from './constantes';
import { criarDenteOdontogramaInfantil } from './estado';
import { DenteOdontogramaInfantilSVG } from './DenteOdontogramaInfantilSVG';

type FerramentaOdontograma = CondicaoOdontogramaInfantil | 'borracha';
type Arcada = 'upper' | 'lower';

interface LinhaArcadaProps {
  titulo: string;
  dentes: string[];
  arcada: Arcada;
  odontograma: OdontogramaInfantilDados;
  onAlternarFace: (numero: string, face: FaceOdontogramaInfantil) => void;
  onAlternarPresente: (numero: string) => void;
}

interface ArcadaConfig {
  titulo: string;
  dentes: string[];
  arcada: Arcada;
}

function facesVazias(): FacesOdontogramaInfantil {
  return { V: null, L: null, M: null, D: null, O: null };
}

function transformacaoArco(
  indice: number,
  total: number,
  arcada: Arcada
): CSSProperties {
  const centro = (total - 1) / 2;
  const proporcao = (indice - centro) / centro;
  const rotacao = proporcao * (total <= 10 ? 9 : 13);
  const elevacao = Math.abs(proporcao) * (total <= 10 ? 5 : 7);
  const y = arcada === 'upper' ? -elevacao : elevacao;

  return {
    transform: `translateY(${y}px) rotate(${
      arcada === 'upper' ? rotacao : -rotacao
    }deg)`,
    transformOrigin: arcada === 'upper' ? 'top center' : 'bottom center',
  };
}

function rotuloDenticao(denticao: DenticaoInfantil | ''): string {
  if (denticao === 'decidua') return 'Decídua';
  if (denticao === 'mista') return 'Mista';
  if (denticao === 'permanente') return 'Permanente';
  return 'Não informada (padrão decídua)';
}

function arcadasPorDenticao(denticao: DenticaoInfantil | ''): ArcadaConfig[] {
  if (denticao === 'mista') {
    return [
      {
        titulo: 'Permanentes — arcada superior',
        dentes: DENTES_PERMANENTES_SUPERIORES,
        arcada: 'upper',
      },
      {
        titulo: 'Decíduos — arcada superior',
        dentes: DENTES_DECIDUOS_SUPERIORES,
        arcada: 'upper',
      },
      {
        titulo: 'Decíduos — arcada inferior',
        dentes: DENTES_DECIDUOS_INFERIORES,
        arcada: 'lower',
      },
      {
        titulo: 'Permanentes — arcada inferior',
        dentes: DENTES_PERMANENTES_INFERIORES,
        arcada: 'lower',
      },
    ];
  }

  if (denticao === 'permanente') {
    return [
      {
        titulo: 'Permanentes — arcada superior',
        dentes: DENTES_PERMANENTES_SUPERIORES,
        arcada: 'upper',
      },
      {
        titulo: 'Permanentes — arcada inferior',
        dentes: DENTES_PERMANENTES_INFERIORES,
        arcada: 'lower',
      },
    ];
  }

  return [
    {
      titulo: 'Decíduos — arcada superior',
      dentes: DENTES_DECIDUOS_SUPERIORES,
      arcada: 'upper',
    },
    {
      titulo: 'Decíduos — arcada inferior',
      dentes: DENTES_DECIDUOS_INFERIORES,
      arcada: 'lower',
    },
  ];
}

function LinhaArcada({
  titulo,
  dentes,
  arcada,
  odontograma,
  onAlternarFace,
  onAlternarPresente,
}: LinhaArcadaProps) {
  const separador = Math.floor(dentes.length / 2);
  const larguraMinima = dentes.length > 10 ? 820 : 520;

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {titulo}
        </p>
        <p className="font-mono text-[10px] text-slate-400">
          {dentes.length} dentes
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="mx-auto pb-2" style={{ minWidth: larguraMinima }}>
          <div className="mb-1 flex justify-between px-1 text-[10px] font-medium text-slate-400">
            <span>Direita</span>
            <span>Esquerda</span>
          </div>

          <div
            className={`flex justify-center gap-1.5 ${
              arcada === 'upper' ? 'items-end pb-3' : 'items-start pt-3'
            }`}
          >
            {dentes.map((numero, indice) => {
              const dente =
                odontograma.dentes[numero] ??
                criarDenteOdontogramaInfantil();

              return (
                <Fragment key={numero}>
                  {indice === separador && (
                    <div
                      className="mx-1 w-px self-stretch bg-slate-200"
                      aria-hidden="true"
                    />
                  )}
                  <div
                    style={transformacaoArco(
                      indice,
                      dentes.length,
                      arcada
                    )}
                  >
                    <DenteOdontogramaInfantilSVG
                      numero={numero}
                      dente={dente}
                      onAlternarFace={(face) =>
                        onAlternarFace(numero, face)
                      }
                      onAlternarPresente={() =>
                        onAlternarPresente(numero)
                      }
                    />
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResumoItemProps {
  rotulo: string;
  valor: number;
  cor?: string;
}

function ResumoItem({ rotulo, valor, cor }: ResumoItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
      <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-600">
        {cor && (
          <span
            className="h-2.5 w-2.5 rounded-sm border border-slate-300"
            style={{ backgroundColor: cor }}
          />
        )}
        {rotulo}
      </span>
      <span className="font-mono text-[11px] font-bold text-slate-900">
        {valor}
      </span>
    </div>
  );
}

interface OdontogramaInfantilProps {
  odontograma: OdontogramaInfantilDados;
  denticao: DenticaoInfantil | '';
  onChange: (odontograma: OdontogramaInfantilDados) => void;
}

export function OdontogramaInfantil({
  odontograma,
  denticao,
  onChange,
}: OdontogramaInfantilProps) {
  const [ferramenta, setFerramenta] =
    useState<FerramentaOdontograma>('azul');

  const arcadas = useMemo(() => arcadasPorDenticao(denticao), [denticao]);
  const dentesVisiveis = useMemo(
    () => dentesPorDenticao(denticao),
    [denticao]
  );
  const deciduosVisiveis = dentesVisiveis.filter(
    (numero) => Number(numero[0]) >= 5
  ).length;
  const permanentesVisiveis =
    dentesVisiveis.length - deciduosVisiveis;
  const resumoDenticao =
    permanentesVisiveis === 0
      ? `${deciduosVisiveis} decíduos`
      : deciduosVisiveis === 0
        ? `${permanentesVisiveis} permanentes`
        : `${deciduosVisiveis} decíduos + ${permanentesVisiveis} permanentes`;

  const alterarFace = (
    numero: string,
    face: FaceOdontogramaInfantil
  ) => {
    const dente =
      odontograma.dentes[numero] ?? criarDenteOdontogramaInfantil();
    if (!dente.presente) return;

    const condicaoAtual = dente.faces[face];
    const proximaCondicao =
      ferramenta === 'borracha' || condicaoAtual === ferramenta
        ? null
        : ferramenta;

    const faces = {
      ...dente.faces,
      [face]: proximaCondicao,
    };

    onChange({
      ...odontograma,
      dentes: {
        ...odontograma.dentes,
        [numero]: { ...dente, faces },
      },
    });
  };

  const alternarPresente = (numero: string) => {
    const dente =
      odontograma.dentes[numero] ?? criarDenteOdontogramaInfantil();
    const presente = !dente.presente;

    onChange({
      ...odontograma,
      dentes: {
        ...odontograma.dentes,
        [numero]: {
          presente,
          faces: presente ? dente.faces : facesVazias(),
        },
      },
    });
  };

  const limparMarcacoes = () => {
    const visiveis = new Set(dentesVisiveis);
    const dentes = { ...odontograma.dentes };

    Object.keys(dentes).forEach((numero) => {
      if (!visiveis.has(numero)) return;
      dentes[numero] = { ...dentes[numero], faces: facesVazias() };
    });

    onChange({ ...odontograma, dentes });
  };

  const resumo = useMemo(() => {
    let azul = 0;
    let preto = 0;
    let vermelho = 0;
    let ausentes = 0;

    dentesVisiveis.forEach((numero) => {
      const dente =
        odontograma.dentes[numero] ?? criarDenteOdontogramaInfantil();

      if (!dente.presente) {
        ausentes += 1;
        return;
      }

      Object.values(dente.faces).forEach((condicao) => {
        if (condicao === 'azul') azul += 1;
        if (condicao === 'preto') preto += 1;
        if (condicao === 'vermelho') vermelho += 1;
      });
    });

    return { azul, preto, vermelho, ausentes };
  }, [dentesVisiveis, odontograma.dentes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-900 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Odontograma
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Exame Anatômico FDI
            </span>
          </div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">
            Odontograma Infantil
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Dentição: <strong>{rotuloDenticao(denticao)}</strong> ·{' '}
            {dentesVisiveis.length} dentes exibidos ({resumoDenticao})
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {CONDICOES_ODONTOGRAMA_INFANTIL.map((condicao) => (
            <button
              key={condicao.valor}
              type="button"
              onClick={() => setFerramenta(condicao.valor)}
              aria-pressed={ferramenta === condicao.valor}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                ferramenta === condicao.valor
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <span
                className="h-3 w-3 rounded-sm border border-slate-400"
                style={{ backgroundColor: condicao.cor }}
              />
              {condicao.rotulo}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFerramenta('borracha')}
            aria-pressed={ferramenta === 'borracha'}
            className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors ${
              ferramenta === 'borracha'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
            }`}
          >
            Borracha
          </button>
        </div>
        <button
          type="button"
          onClick={limparMarcacoes}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:border-rose-300 hover:text-rose-900"
        >
          Limpar tudo
        </button>
      </div>

      <div className="space-y-4">
        {arcadas.map((arcada) => (
          <LinhaArcada
            key={arcada.titulo}
            titulo={arcada.titulo}
            dentes={arcada.dentes}
            arcada={arcada.arcada}
            odontograma={odontograma}
            onAlternarFace={alterarFace}
            onAlternarPresente={alternarPresente}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ResumoItem
          rotulo="Azul"
          valor={resumo.azul}
          cor={CORES_CONDICAO_INFANTIL.azul}
        />
        <ResumoItem
          rotulo="Preto"
          valor={resumo.preto}
          cor={CORES_CONDICAO_INFANTIL.preto}
        />
        <ResumoItem
          rotulo="Vermelho"
          valor={resumo.vermelho}
          cor={CORES_CONDICAO_INFANTIL.vermelho}
        />
        <ResumoItem rotulo="Ausentes" valor={resumo.ausentes} />
      </div>

      <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-[10px] leading-relaxed text-slate-600">
        <p>
          <span
            className="mr-1 inline-block h-3 w-3 rounded-sm border border-slate-400 align-middle"
            style={{ backgroundColor: CORES_CONDICAO_INFANTIL.azul }}
          />
          <strong>AZUL:</strong> restaurações em bom estado
        </p>
        <p>
          <span
            className="mr-1 inline-block h-3 w-3 rounded-sm border border-slate-400 align-middle"
            style={{ backgroundColor: CORES_CONDICAO_INFANTIL.preto }}
          />
          <strong>PRETO:</strong> restaurações insatisfatórias
        </p>
        <p>
          <span
            className="mr-1 inline-block h-3 w-3 rounded-sm border border-slate-400 align-middle"
            style={{ backgroundColor: CORES_CONDICAO_INFANTIL.vermelho }}
          />
          <strong>VERMELHO:</strong> faces cariadas ou com curativo
        </p>
        <p className="font-semibold text-slate-700">
          Circule os números dos dentes presentes. Clique nas faces para
          marcar a condição selecionada e clique novamente na mesma face para
          remover.
        </p>
      </div>
    </div>
  );
}
