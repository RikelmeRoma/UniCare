import React, { useState, useMemo, useCallback } from "react";


/** Sítios possíveis em cada face. */
type SiteKey = "D" | "C" | "M";

/** Faces de cada dente. */
type FaceKey = "vestibular" | "lingual";

/** Graus usados para mobilidade e furca. */
type Grade = "0" | "I" | "II" | "III";

/** Dados de um único sítio de sondagem. */
interface SiteData {
  ps: number | null; // Profundidade de Sondagem (mm)
  rec: number | null; // Recessão gengival (mm)
  ss: boolean; // Sangramento à Sondagem
}

/** Dados de uma face (3 sítios: Distal, Central, Mesial). */
interface FaceData {
  D: SiteData;
  C: SiteData;
  M: SiteData;
}

/** Dados completos de um dente. */
export interface ToothData {
  fdi: number; // Número do dente (notação FDI)
  missing: boolean; // Dente ausente
  implant: boolean; // Implante
  mobility: Grade; // Mobilidade dentária
  furcation: Grade; // Envolvimento de furca
  vestibular: FaceData;
  lingual: FaceData; // Lingual (inferiores) / Palatino (superiores)
}

/** Mapa de todos os dentes, indexados pelo número FDI. */
export type ToothMap = Record<number, ToothData>;

/** Informações do paciente. */
interface PatientInfo {
  nome: string;
  nascimento: string;
  exame: string;
  examinador: string;
}

/* =========================================================
 * CONSTANTES
 * ========================================================= */

// Ordem dos dentes conforme layout clássico do periograma.
const UPPER_TEETH: number[] = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
const LOWER_TEETH: number[] = [
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];
const ALL_TEETH: number[] = [...UPPER_TEETH, ...LOWER_TEETH];

// Sítios em ordem Distal → Central → Mesial.
const SITES: SiteKey[] = ["D", "C", "M"];

const GRADES: Grade[] = ["0", "I", "II", "III"];

/* =========================================================
 * FUNÇÕES AUXILIARES
 * ========================================================= */

/** Cria um sítio vazio. */
function emptySite(): SiteData {
  return { ps: null, rec: null, ss: false };
}

/** Cria uma face vazia. */
function emptyFace(): FaceData {
  return { D: emptySite(), C: emptySite(), M: emptySite() };
}

/** Cria os dados iniciais de um dente. */
function emptyTooth(fdi: number): ToothData {
  return {
    fdi,
    missing: false,
    implant: false,
    mobility: "0",
    furcation: "0",
    vestibular: emptyFace(),
    lingual: emptyFace(),
  };
}

/** Estado inicial: todos os dentes vazios. */
function buildInitialTeeth(): ToothMap {
  const map: ToothMap = {};
  ALL_TEETH.forEach((fdi) => {
    map[fdi] = emptyTooth(fdi);
  });
  return map;
}

/** Retorna a cor de fundo do input de PS conforme o valor (mm). */
function psColor(ps: number | null): string {
  if (ps === null || ps <= 0) return "transparent";
  if (ps <= 3) return "#bbf7d0"; // verde claro (1-3 mm)
  if (ps <= 5) return "#fef08a"; // amarelo (4-5 mm)
  if (ps <= 7) return "#fed7aa"; // laranja (6-7 mm)
  return "#fca5a5"; // vermelho (>=8 mm)
}

/** NIC = PS + REC (retorna null se PS não informado). */
function calcNic(site: SiteData): number | null {
  if (site.ps === null) return null;
  return site.ps + (site.rec ?? 0);
}

/* =========================================================
 * ESTILOS INLINE
 * ========================================================= */


/* =========================================================
 * SUBCOMPONENTES
 * ========================================================= */

/** Diagrama SVG simples de um dente com o número FDI. */
const ToothGlyph: React.FC<{
  tooth: ToothData;
}> = ({ tooth }) => {
  const { fdi, missing, implant } = tooth;

  // Dente ausente: um "X".
  if (missing) {
    return (
      <div className="flex flex-col items-center py-0.5">
        <svg width={26} height={30} viewBox="0 0 26 30" aria-label="ausente">
          <line x1={5} y1={5} x2={21} y2={25} stroke="#9ca3af" strokeWidth={2} />
          <line x1={21} y1={5} x2={5} y2={25} stroke="#9ca3af" strokeWidth={2} />
        </svg>
        <div className="text-[10px] text-slate-400 dark:text-slate-500">{fdi}</div>
      </div>
    );
  }

  // Implante: parafuso estilizado.
  if (implant) {
    return (
      <div className="flex flex-col items-center py-0.5">
        <svg width={26} height={30} viewBox="0 0 26 30" aria-label="implante">
          <rect x={9} y={4} width={8} height={22} rx={2} fill="#94a3b8" />
          {[8, 12, 16, 20].map((y) => (
            <line
              key={y}
              x1={7}
              y1={y}
              x2={19}
              y2={y}
              stroke="#475569"
              strokeWidth={1}
            />
          ))}
        </svg>
        <div className="text-[10px] text-slate-600 dark:text-slate-400">{fdi}</div>
      </div>
    );
  }

  // Dente normal: coroa arredondada.
  return (
    <div className="flex flex-col items-center py-0.5">
      <svg width={26} height={30} viewBox="0 0 26 30" aria-label={`dente ${fdi}`}>
        <path
          d="M6 10 C6 3, 20 3, 20 10 C20 16, 22 26, 17 27 C14 27.5, 13 22, 13 22
             C13 22, 12 27.5, 9 27 C4 26, 6 16, 6 10 Z"
          fill="#ffffff"
          stroke="#334155"
          strokeWidth={1.2}
        />
      </svg>
      <div className="font-bold text-xs py-0.5 text-slate-800 dark:text-slate-200">{fdi}</div>
    </div>
  );
};

/* =========================================================
 * COMPONENTE PRINCIPAL
 * ========================================================= */

interface PeriogramaProps {
  valor?: ToothMap | null;
  onChange?: (teeth: ToothMap) => void;
  somenteLeitura?: boolean;
}

const Periograma: React.FC<PeriogramaProps> = ({
  valor,
  onChange,
  somenteLeitura = false,
}) => {
  const [patient, setPatient] = useState<PatientInfo>({
    nome: "",
    nascimento: "",
    exame: "",
    examinador: "",
  });

  const [teethInterno, setTeethInterno] = useState<ToothMap>(buildInitialTeeth);
  const teeth = valor ?? teethInterno;
  const setTeeth = useCallback(
    (atualizador: ToothMap | ((prev: ToothMap) => ToothMap)) => {
      const proximo =
        typeof atualizador === "function" ? atualizador(teeth) : atualizador;
      if (onChange) onChange(proximo);
      else setTeethInterno(proximo);
    },
    [teeth, onChange]
  );
  const [showDetail, setShowDetail] = useState<boolean>(false);

  /* ----------------------- Handlers ----------------------- */

  const updatePatient = useCallback(
    (key: keyof PatientInfo, value: string) => {
      setPatient((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /** Atualiza um valor numérico (PS ou REC) de um sítio. */
  const updateSiteNumber = useCallback(
    (
      fdi: number,
      face: FaceKey,
      site: SiteKey,
      field: "ps" | "rec",
      raw: string
    ) => {
      if (somenteLeitura) return;
      setTeeth((prev) => {
        const tooth = prev[fdi];
        let value: number | null = raw === "" ? null : parseFloat(raw);
        if (value !== null && (isNaN(value) || value < 0)) value = null;
        if (value !== null && value > 20) value = 20;
        const newSite: SiteData = { ...tooth[face][site], [field]: value };
        const newFace: FaceData = { ...tooth[face], [site]: newSite };
        return { ...prev, [fdi]: { ...tooth, [face]: newFace } };
      });
    },
    [setTeeth, somenteLeitura]
  );

  /** Alterna o sangramento à sondagem (SS) de um sítio. */
  const toggleSS = useCallback(
    (fdi: number, face: FaceKey, site: SiteKey) => {
      if (somenteLeitura) return;
      setTeeth((prev) => {
        const tooth = prev[fdi];
        const newSite: SiteData = {
          ...tooth[face][site],
          ss: !tooth[face][site].ss,
        };
        const newFace: FaceData = { ...tooth[face], [site]: newSite };
        return { ...prev, [fdi]: { ...tooth, [face]: newFace } };
      });
    },
    [setTeeth, somenteLeitura]
  );

  /** Atualiza mobilidade ou furca. */
  const updateGrade = useCallback(
    (fdi: number, field: "mobility" | "furcation", value: Grade) => {
      if (somenteLeitura) return;
      setTeeth((prev) => ({
        ...prev,
        [fdi]: { ...prev[fdi], [field]: value },
      }));
    },
    [setTeeth, somenteLeitura]
  );

  /** Alterna ausente/implante. */
  const toggleFlag = useCallback(
    (fdi: number, field: "missing" | "implant") => {
      if (somenteLeitura) return;
      setTeeth((prev) => {
        const tooth = prev[fdi];
        const next = !tooth[field];
        // Ausente e implante são mutuamente exclusivos.
        const other = field === "missing" ? "implant" : "missing";
        return {
          ...prev,
          [fdi]: { ...tooth, [field]: next, [other]: next ? false : tooth[other] },
        };
      });
    },
    [setTeeth, somenteLeitura]
  );

  /* ----------------------- Estatísticas ----------------------- */

  const stats = useMemo(() => {
    let totalSites = 0;
    let bleeding = 0;
    let ps4 = 0;
    let ps6 = 0;
    let nicSum = 0;
    let nicCount = 0;
    let missing = 0;
    let implants = 0;

    ALL_TEETH.forEach((fdi) => {
      const t = teeth[fdi];
      if (t.missing) {
        missing += 1;
        return; // dentes ausentes não entram nos sítios
      }
      if (t.implant) implants += 1;

      (["vestibular", "lingual"] as FaceKey[]).forEach((face) => {
        SITES.forEach((s) => {
          const site = t[face][s];
          // Só conta sítio "medido" (PS informado).
          if (site.ps !== null) {
            totalSites += 1;
            if (site.ss) bleeding += 1;
            if (site.ps >= 4) ps4 += 1;
            if (site.ps >= 6) ps6 += 1;
            const nic = calcNic(site);
            if (nic !== null) {
              nicSum += nic;
              nicCount += 1;
            }
          } else if (site.ss) {
            // Sangramento marcado sem PS ainda conta como sítio medido.
            totalSites += 1;
            bleeding += 1;
          }
        });
      });
    });

    const pct = (n: number) =>
      totalSites === 0 ? 0 : Math.round((n / totalSites) * 1000) / 10;

    return {
      totalSites,
      bleedingPct: pct(bleeding),
      ps4Pct: pct(ps4),
      ps6Pct: pct(ps6),
      nicMean: nicCount === 0 ? 0 : Math.round((nicSum / nicCount) * 10) / 10,
      missing,
      implants,
      present: ALL_TEETH.length - missing,
    };
  }, [teeth]);

  /* ----------------------- Renderização de linhas ----------------------- */

  /** Célula de sítios numéricos (PS ou REC) para uma face. */
  const tdCellClass =
    "border border-slate-200 dark:border-slate-700 p-0 text-center align-middle";
  const siteWrapClass = "flex justify-center gap-px";
  const smallSelectClass =
    "text-[10px] p-0 w-10 border border-slate-300 dark:border-slate-600 rounded-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 disabled:opacity-50";

  const renderNumberCells = (
    fdi: number,
    face: FaceKey,
    field: "ps" | "rec"
  ) => {
    const tooth = teeth[fdi];
    if (tooth.missing) {
      return <td key={`${fdi}-${face}-${field}`} className={tdCellClass} />;
    }
    return (
      <td key={`${fdi}-${face}-${field}`} className={tdCellClass}>
        <div className={siteWrapClass}>
          {SITES.map((s) => {
            const site = tooth[face][s];
            const value = site[field];
            const bg = field === "ps" ? psColor(value) : "transparent";
            return (
              <input
                key={s}
                type="number"
                className={`hide-arrows w-5 h-5 border border-slate-300 dark:border-slate-600 rounded-xs text-center text-[10px] p-0 [appearance:textfield] ${
                  bg === "transparent"
                    ? "bg-transparent text-slate-900 dark:text-slate-100"
                    : "text-slate-900 font-semibold"
                }`}
                min={0}
                max={20}
                step={0.5}
                value={value === null ? "" : value}
                onChange={(e) =>
                  updateSiteNumber(fdi, face, s, field, e.target.value)
                }
                style={bg !== "transparent" ? { background: bg } : undefined}
                title={`${field.toUpperCase()} ${face} ${s}`}
              />
            );
          })}
        </div>
      </td>
    );
  };

  /** Célula de NIC (somente leitura). */
  const renderNicCells = (fdi: number, face: FaceKey) => {
    const tooth = teeth[fdi];
    if (tooth.missing) {
      return <td key={`${fdi}-${face}-nic`} className={tdCellClass} />;
    }
    return (
      <td key={`${fdi}-${face}-nic`} className={tdCellClass}>
        <div className={siteWrapClass}>
          {SITES.map((s) => {
            const nic = calcNic(tooth[face][s]);
            return (
              <span
                key={s}
                className="w-5 h-5 leading-5 text-[10px] inline-block text-center text-slate-700 dark:text-slate-300"
              >
                {nic === null ? "" : nic}
              </span>
            );
          })}
        </div>
      </td>
    );
  };

  /** Célula de SS (clicável). */
  const renderSSCells = (fdi: number, face: FaceKey) => {
    const tooth = teeth[fdi];
    if (tooth.missing) {
      return <td key={`${fdi}-${face}-ss`} className={tdCellClass} />;
    }
    return (
      <td key={`${fdi}-${face}-ss`} className={tdCellClass}>
        <div className={siteWrapClass}>
          {SITES.map((s) => {
            const on = tooth[face][s].ss;
            return (
              <span
                key={s}
                onClick={() => toggleSS(fdi, face, s)}
                className={`w-5 h-5 border rounded-xs cursor-pointer inline-block box-border transition-colors ${
                  on
                    ? "bg-red-500 border-red-600"
                    : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                }`}
                title={`Sangramento ${face} ${s}`}
              />
            );
          })}
        </div>
      </td>
    );
  };

  /** Célula com número do dente + toggles ausente/implante. */
  const renderToothHeaderCell = (fdi: number) => {
    const tooth = teeth[fdi];
    return (
      <td key={`${fdi}-hdr`} className={tdCellClass}>
        <div className="font-bold text-xs py-0.5 text-slate-800 dark:text-slate-200">{fdi}</div>
        <div>
          <button
            type="button"
            onClick={() => toggleFlag(fdi, "missing")}
            className={`documento-dado text-[9px] px-1 py-px m-px border rounded-xs cursor-pointer leading-tight transition-colors ${
              tooth.missing
                ? "bg-slate-700 dark:bg-blue-600 text-white border-slate-700 dark:border-blue-500"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
            title="Marcar dente ausente"
          >
            Aus
          </button>
          <button
            type="button"
            onClick={() => toggleFlag(fdi, "implant")}
            className={`documento-dado text-[9px] px-1 py-px m-px border rounded-xs cursor-pointer leading-tight transition-colors ${
              tooth.implant
                ? "bg-slate-700 dark:bg-blue-600 text-white border-slate-700 dark:border-blue-500"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
            title="Marcar implante"
          >
            Imp
          </button>
        </div>
      </td>
    );
  };

  /** Célula de mobilidade. */
  const renderMobilityCell = (fdi: number) => {
    const tooth = teeth[fdi];
    return (
      <td key={`${fdi}-mob`} className={tdCellClass}>
        <select
          value={tooth.mobility}
          disabled={tooth.missing}
          onChange={(e) => updateGrade(fdi, "mobility", e.target.value as Grade)}
          className={smallSelectClass}
          title="Mobilidade"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </td>
    );
  };

  /** Célula de furca. */
  const renderFurcationCell = (fdi: number) => {
    const tooth = teeth[fdi];
    return (
      <td key={`${fdi}-fur`} className={tdCellClass}>
        <select
          value={tooth.furcation}
          disabled={tooth.missing}
          onChange={(e) =>
            updateGrade(fdi, "furcation", e.target.value as Grade)
          }
          className={smallSelectClass}
          title="Furca"
        >
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </td>
    );
  };

  /** Célula com o diagrama do dente. */
  const renderGlyphCell = (fdi: number) => (
    <td key={`${fdi}-glyph`} className={tdCellClass}>
      <ToothGlyph tooth={teeth[fdi]} />
    </td>
  );

  /**
   * Renderiza a tabela de uma arcada.
   * A ordem das linhas difere entre superior e inferior (espelhamento).
   */
  const renderArcada = (
    order: number[],
    arcada: "superior" | "inferior"
  ) => {
    const rowLabel = (text: string) => (
      <td className="border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold text-[10px] text-center px-1 py-0.5 w-[46px] whitespace-nowrap">
        {text}
      </td>
    );

    // Linhas para uma face, na ordem fornecida (de cima p/ baixo).
    const faceRows = (
      face: FaceKey,
      rows: Array<"SS" | "PS" | "REC" | "NIC">
    ) =>
      rows.map((row) => {
        const cells =
          row === "SS"
            ? order.map((fdi) => renderSSCells(fdi, face))
            : row === "PS"
              ? order.map((fdi) => renderNumberCells(fdi, face, "ps"))
              : row === "REC"
                ? order.map((fdi) => renderNumberCells(fdi, face, "rec"))
                : order.map((fdi) => renderNicCells(fdi, face));
        return (
          <tr key={`${arcada}-${face}-${row}`}>
            {rowLabel(row)}
            {cells}
          </tr>
        );
      });

    // Faixa de cabeçalho/rodapé (número + mobilidade + furca).
    const headerRows = (position: "top" | "bottom") => {
      const numberRow = (
        <tr key={`${arcada}-num-${position}`}>
          {rowLabel("Dente")}
          {order.map((fdi) => renderToothHeaderCell(fdi))}
        </tr>
      );
      const mobRow = (
        <tr key={`${arcada}-mob-${position}`}>
          {rowLabel("Mob.")}
          {order.map((fdi) => renderMobilityCell(fdi))}
        </tr>
      );
      const furRow = (
        <tr key={`${arcada}-fur-${position}`}>
          {rowLabel("Furca")}
          {order.map((fdi) => renderFurcationCell(fdi))}
        </tr>
      );
      return position === "top"
        ? [numberRow, mobRow, furRow]
        : [furRow, mobRow, numberRow];
    };

    // Linha com o diagrama dos dentes.
    const glyphRow = (
      <tr key={`${arcada}-glyph`}>
        {rowLabel("")}
        {order.map((fdi) => renderGlyphCell(fdi))}
      </tr>
    );

    let bodyRows: React.ReactNode[];

    if (arcada === "superior") {
      // Cabeçalho → Vestibular (SS/PS/REC/NIC) → Dente → Palatino (NIC/REC/PS/SS)
      bodyRows = [
        ...headerRows("top"),
        ...faceRows("vestibular", ["SS", "PS", "REC", "NIC"]),
        glyphRow,
        ...faceRows("lingual", ["NIC", "REC", "PS", "SS"]),
      ];
    } else {
      // Inferior espelhado:
      // Lingual (SS/PS/REC/NIC) → Dente → Vestibular (NIC/REC/PS/SS) → Rodapé
      bodyRows = [
        ...faceRows("lingual", ["SS", "PS", "REC", "NIC"]),
        glyphRow,
        ...faceRows("vestibular", ["NIC", "REC", "PS", "SS"]),
        ...headerRows("bottom"),
      ];
    }

    return (
      <table className="border-collapse bg-white dark:bg-slate-900/70 table-fixed">
        <colgroup>
          <col style={{ width: 46 }} />
          {order.map((fdi) => (
            <col key={fdi} style={{ width: 66 }} />
          ))}
        </colgroup>
        <tbody>{bodyRows}</tbody>
      </table>
    );
  };

  /* ----------------------- JSX principal ----------------------- */

  const fieldClass = "flex flex-col gap-1 min-w-[160px] flex-1";
  const labelClass = "text-[11px] font-semibold text-slate-500 dark:text-slate-400";
  const textInputClass =
    "px-2 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-md text-xs outline-none transition-colors focus:border-slate-800 dark:focus:border-blue-400";
  const summaryCardClass =
    "bg-white dark:bg-[#0E1729] border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 min-w-[150px] flex-1 shadow-2xs";
  const summaryValueClass =
    "text-[22px] font-bold text-slate-900 dark:text-white tabular-nums";
  const summaryLabelClass = "text-[11px] text-slate-500 dark:text-slate-400 mt-0.5";
  const legendChipClass = "inline-flex items-center gap-1";
  const legendSwatchClass =
    "w-3.5 h-3.5 rounded-xs border border-slate-300 dark:border-slate-600 inline-block";
  const summaryThClass =
    "border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 px-2 py-1 font-bold";
  const summaryTdClass =
    "border border-slate-200 dark:border-slate-800 px-2 py-1 text-center text-slate-700 dark:text-slate-300 tabular-nums";

  return (
    <div className="text-xs text-slate-800 dark:text-slate-200 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 overflow-x-auto box-border">
        <style>{`
        .hide-arrows::-webkit-inner-spin-button,
        .hide-arrows::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .hide-arrows {
          -moz-appearance: textfield;
        }
      `}</style>

      <div className="mb-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-md bg-slate-900 dark:bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-2xs">
            Periograma
          </span>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest font-mono">
            Exame Periodontal Clínico
          </span>
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
          Periograma Clínico Digital
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Mapeamento periodontal: profundidade de sondagem (PS), nível de inserção (NIC), recessão (REC) e sangramento (SS).
        </p>
      </div>

      {/* Informações do paciente */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-[#0E1729] border border-slate-200 dark:border-slate-800 rounded-lg p-3 mb-4">
        <div className={fieldClass}>
          <label className={labelClass}>Nome do paciente</label>
          <input
            className={textInputClass}
            value={patient.nome}
            onChange={(e) => updatePatient("nome", e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Data de nascimento</label>
          <input
            type="date"
            className={textInputClass}
            value={patient.nascimento}
            onChange={(e) => updatePatient("nascimento", e.target.value)}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Data do exame</label>
          <input
            type="date"
            className={textInputClass}
            value={patient.exame}
            onChange={(e) => updatePatient("exame", e.target.value)}
          />
        </div>
        <div className={fieldClass}>
          <label className={labelClass}>Examinador</label>
          <input
            className={textInputClass}
            value={patient.examinador}
            onChange={(e) => updatePatient("examinador", e.target.value)}
            placeholder="Nome do examinador"
          />
        </div>
      </div>

      {/* Arcada Superior */}
      <div className="text-sm font-bold mt-4 mb-1.5 text-slate-900 dark:text-white">
        Arcada Superior&nbsp;(18–11 | 21–28)
      </div>
      {renderArcada(UPPER_TEETH, "superior")}

      {/* Arcada Inferior */}
      <div className="text-sm font-bold mt-4 mb-1.5 text-slate-900 dark:text-white">
        Arcada Inferior&nbsp;(48–41 | 31–38)
      </div>
      {renderArcada(LOWER_TEETH, "inferior")}

      {/* Legenda de cores */}
      <div className="flex flex-wrap gap-3 items-center mt-3 text-[11px] text-slate-700 dark:text-slate-300">
        <strong>PS (mm):</strong>
        <span className={legendChipClass}>
          <span className={legendSwatchClass} style={{ background: "#bbf7d0" }} />
          1–3
        </span>
        <span className={legendChipClass}>
          <span className={legendSwatchClass} style={{ background: "#fef08a" }} />
          4–5
        </span>
        <span className={legendChipClass}>
          <span className={legendSwatchClass} style={{ background: "#fed7aa" }} />
          6–7
        </span>
        <span className={legendChipClass}>
          <span className={legendSwatchClass} style={{ background: "#fca5a5" }} />
          ≥8
        </span>
        <span className={legendChipClass}>
          <span className={legendSwatchClass} style={{ background: "#ef4444" }} />
          Sangramento (SS)
        </span>
      </div>

      {/* Painel de resumo */}
      <div className="flex flex-wrap gap-3 mt-5">
        <div className={summaryCardClass}>
          <div className={summaryValueClass}>{stats.bleedingPct}%</div>
          <div className={summaryLabelClass}>Sítios com sangramento</div>
        </div>
        <div className={summaryCardClass}>
          <div className={summaryValueClass}>{stats.ps4Pct}%</div>
          <div className={summaryLabelClass}>Sítios com PS ≥ 4 mm</div>
        </div>
        <div className={summaryCardClass}>
          <div className={summaryValueClass}>{stats.ps6Pct}%</div>
          <div className={summaryLabelClass}>Sítios com PS ≥ 6 mm</div>
        </div>
        <div className={summaryCardClass}>
          <div className={summaryValueClass}>{stats.nicMean}</div>
          <div className={summaryLabelClass}>NIC médio (mm)</div>
        </div>
        <div className={summaryCardClass}>
          <div className={summaryValueClass}>{stats.missing}</div>
          <div className={summaryLabelClass}>Dentes ausentes</div>
        </div>
        <div className={summaryCardClass}>
          <div className={summaryValueClass}>{stats.present}</div>
          <div className={summaryLabelClass}>Dentes presentes</div>
        </div>
        <div className={summaryCardClass}>
          <div className={summaryValueClass}>{stats.implants}</div>
          <div className={summaryLabelClass}>Implantes</div>
        </div>
        <div className={summaryCardClass}>
          <div className={summaryValueClass}>{stats.totalSites}</div>
          <div className={summaryLabelClass}>Sítios medidos</div>
        </div>
      </div>

      {/* Tabela resumo por dente (expansível) */}
      <button
        type="button"
        className="mt-4 px-3 py-1.5 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer text-xs transition-colors"
        onClick={() => setShowDetail((v) => !v)}
      >
        {showDetail ? "Ocultar" : "Mostrar"} resumo por dente
      </button>

      {showDetail && (
        <table className="border-collapse mt-3 bg-white dark:bg-[#0E1729] text-[11px] border border-slate-200 dark:border-slate-800">
          <thead>
            <tr>
              <th className={summaryThClass}>Dente</th>
              <th className={summaryThClass}>Estado</th>
              <th className={summaryThClass}>Mob.</th>
              <th className={summaryThClass}>Furca</th>
              <th className={summaryThClass}>PS máx.</th>
              <th className={summaryThClass}>NIC máx.</th>
              <th className={summaryThClass}>Sítios c/ SS</th>
            </tr>
          </thead>
          <tbody>
            {ALL_TEETH.map((fdi) => {
              const t = teeth[fdi];
              let maxPs = 0;
              let maxNic = 0;
              let ssCount = 0;
              (["vestibular", "lingual"] as FaceKey[]).forEach((face) => {
                SITES.forEach((s) => {
                  const site = t[face][s];
                  if (site.ps !== null && site.ps > maxPs) maxPs = site.ps;
                  const nic = calcNic(site);
                  if (nic !== null && nic > maxNic) maxNic = nic;
                  if (site.ss) ssCount += 1;
                });
              });
              const estado = t.missing
                ? "Ausente"
                : t.implant
                ? "Implante"
                : "Presente";
              return (
                <tr key={fdi}>
                  <td className={summaryTdClass}>{fdi}</td>
                  <td className={summaryTdClass}>{estado}</td>
                  <td className={summaryTdClass}>{t.mobility}</td>
                  <td className={summaryTdClass}>{t.furcation}</td>
                  <td className={summaryTdClass}>
                    {t.missing ? "—" : maxPs || "—"}
                  </td>
                  <td className={summaryTdClass}>
                    {t.missing ? "—" : maxNic || "—"}
                  </td>
                  <td className={summaryTdClass}>
                    {t.missing ? "—" : ssCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Periograma;
