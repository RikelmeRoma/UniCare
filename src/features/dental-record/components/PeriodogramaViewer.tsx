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
interface ToothData {
  fdi: number; // Número do dente (notação FDI)
  missing: boolean; // Dente ausente
  implant: boolean; // Implante
  mobility: Grade; // Mobilidade dentária
  furcation: Grade; // Envolvimento de furca
  vestibular: FaceData;
  lingual: FaceData; // Lingual (inferiores) / Palatino (superiores)
}

/** Mapa de todos os dentes, indexados pelo número FDI. */
type ToothMap = Record<number, ToothData>;

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

// Ordem dos dentes conforme layout clássico do periodograma.
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

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "Segoe UI, Arial, sans-serif",
    fontSize: 12,
    color: "#1f2937",
    padding: 16,
    background: "#f9fafb",
    boxSizing: "border-box",
    overflowX: "auto",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 12px",
    color: "#0f172a",
  },
  patientCard: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 160,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#6b7280",
  },
  textInput: {
    padding: "6px 8px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    fontSize: 12,
    outline: "none",
  },
  arcadaTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: "16px 0 6px",
    color: "#0f172a",
  },
  table: {
    borderCollapse: "collapse",
    background: "#ffffff",
    tableLayout: "fixed",
  },
  rowLabelCell: {
    border: "1px solid #e5e7eb",
    background: "#f3f4f6",
    fontWeight: 700,
    fontSize: 10,
    textAlign: "center",
    padding: "2px 4px",
    width: 46,
    whiteSpace: "nowrap",
  },
  toothCell: {
    border: "1px solid #e5e7eb",
    padding: 0,
    textAlign: "center",
    verticalAlign: "middle",
  },
  siteWrap: {
    display: "flex",
    justifyContent: "center",
    gap: 1,
  },
  numInput: {
    width: 20,
    height: 20,
    border: "1px solid #d1d5db",
    borderRadius: 2,
    textAlign: "center",
    fontSize: 10,
    padding: 0,
    MozAppearance: "textfield",
  },
  nicCell: {
    width: 20,
    height: 20,
    lineHeight: "20px",
    fontSize: 10,
    display: "inline-block",
    textAlign: "center",
    color: "#374151",
  },
  ssCell: {
    width: 20,
    height: 20,
    border: "1px solid #d1d5db",
    borderRadius: 2,
    cursor: "pointer",
    display: "inline-block",
    boxSizing: "border-box",
  },
  toothNumber: {
    fontWeight: 700,
    fontSize: 12,
    padding: "2px 0",
  },
  smallSelect: {
    fontSize: 10,
    padding: 0,
    width: 40,
    border: "1px solid #d1d5db",
    borderRadius: 3,
  },
  toothSvgWrap: {
    padding: "2px 0",
  },
  toggleBtn: {
    fontSize: 9,
    padding: "1px 3px",
    margin: 1,
    border: "1px solid #d1d5db",
    borderRadius: 3,
    cursor: "pointer",
    background: "#ffffff",
    lineHeight: 1.2,
  },
  toggleBtnActive: {
    background: "#334155",
    color: "#ffffff",
    borderColor: "#334155",
  },
  summaryGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
  },
  summaryCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "12px 16px",
    minWidth: 150,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    marginTop: 12,
    fontSize: 11,
  },
  legendChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    border: "1px solid #d1d5db",
    display: "inline-block",
  },
  expandBtn: {
    marginTop: 16,
    padding: "6px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 6,
    background: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
  },
  summaryTable: {
    borderCollapse: "collapse",
    marginTop: 12,
    background: "#ffffff",
    fontSize: 11,
  },
  summaryTh: {
    border: "1px solid #e5e7eb",
    background: "#f3f4f6",
    padding: "4px 8px",
    fontWeight: 700,
  },
  summaryTd: {
    border: "1px solid #e5e7eb",
    padding: "4px 8px",
    textAlign: "center",
  },
};

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
      <div style={styles.toothSvgWrap}>
        <svg width={26} height={30} viewBox="0 0 26 30" aria-label="ausente">
          <line x1={5} y1={5} x2={21} y2={25} stroke="#9ca3af" strokeWidth={2} />
          <line x1={21} y1={5} x2={5} y2={25} stroke="#9ca3af" strokeWidth={2} />
        </svg>
        <div style={{ fontSize: 10, color: "#9ca3af" }}>{fdi}</div>
      </div>
    );
  }

  // Implante: parafuso estilizado.
  if (implant) {
    return (
      <div style={styles.toothSvgWrap}>
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
        <div style={{ fontSize: 10, color: "#475569" }}>{fdi}</div>
      </div>
    );
  }

  // Dente normal: coroa arredondada.
  return (
    <div style={styles.toothSvgWrap}>
      <svg width={26} height={30} viewBox="0 0 26 30" aria-label={`dente ${fdi}`}>
        <path
          d="M6 10 C6 3, 20 3, 20 10 C20 16, 22 26, 17 27 C14 27.5, 13 22, 13 22
             C13 22, 12 27.5, 9 27 C4 26, 6 16, 6 10 Z"
          fill="#ffffff"
          stroke="#334155"
          strokeWidth={1.2}
        />
      </svg>
      <div style={styles.toothNumber}>{fdi}</div>
    </div>
  );
};

/* =========================================================
 * COMPONENTE PRINCIPAL
 * ========================================================= */

const Periodograma: React.FC = () => {
  const [patient, setPatient] = useState<PatientInfo>({
    nome: "",
    nascimento: "",
    exame: "",
    examinador: "",
  });

  const [teeth, setTeeth] = useState<ToothMap>(buildInitialTeeth);
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
    []
  );

  /** Alterna o sangramento à sondagem (SS) de um sítio. */
  const toggleSS = useCallback(
    (fdi: number, face: FaceKey, site: SiteKey) => {
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
    []
  );

  /** Atualiza mobilidade ou furca. */
  const updateGrade = useCallback(
    (fdi: number, field: "mobility" | "furcation", value: Grade) => {
      setTeeth((prev) => ({
        ...prev,
        [fdi]: { ...prev[fdi], [field]: value },
      }));
    },
    []
  );

  /** Alterna ausente/implante. */
  const toggleFlag = useCallback(
    (fdi: number, field: "missing" | "implant") => {
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
    []
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
  const renderNumberCells = (
    fdi: number,
    face: FaceKey,
    field: "ps" | "rec"
  ) => {
    const tooth = teeth[fdi];
    if (tooth.missing) {
      return <td key={`${fdi}-${face}-${field}`} style={styles.toothCell} />;
    }
    return (
      <td key={`${fdi}-${face}-${field}`} style={styles.toothCell}>
        <div style={styles.siteWrap}>
          {SITES.map((s) => {
            const site = tooth[face][s];
            const value = site[field];
            const bg = field === "ps" ? psColor(value) : "transparent";
            return (
              <input
                key={s}
                type="number"
                className="hide-arrows" // <--- ADICIONE ESTA LINHA AQUI
                min={0}
                max={20}
                step={0.5}
                value={value === null ? "" : value}
                onChange={(e) =>
                  updateSiteNumber(fdi, face, s, field, e.target.value)
                }
                style={{ ...styles.numInput, background: bg }}
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
      return <td key={`${fdi}-${face}-nic`} style={styles.toothCell} />;
    }
    return (
      <td key={`${fdi}-${face}-nic`} style={styles.toothCell}>
        <div style={styles.siteWrap}>
          {SITES.map((s) => {
            const nic = calcNic(tooth[face][s]);
            return (
              <span key={s} style={styles.nicCell}>
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
      return <td key={`${fdi}-${face}-ss`} style={styles.toothCell} />;
    }
    return (
      <td key={`${fdi}-${face}-ss`} style={styles.toothCell}>
        <div style={styles.siteWrap}>
          {SITES.map((s) => {
            const on = tooth[face][s].ss;
            return (
              <span
                key={s}
                onClick={() => toggleSS(fdi, face, s)}
                style={{
                  ...styles.ssCell,
                  background: on ? "#ef4444" : "#ffffff",
                }}
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
      <td key={`${fdi}-hdr`} style={styles.toothCell}>
        <div style={styles.toothNumber}>{fdi}</div>
        <div>
          <button
            type="button"
            onClick={() => toggleFlag(fdi, "missing")}
            style={{
              ...styles.toggleBtn,
              ...(tooth.missing ? styles.toggleBtnActive : {}),
            }}
            title="Marcar dente ausente"
          >
            Aus
          </button>
          <button
            type="button"
            onClick={() => toggleFlag(fdi, "implant")}
            style={{
              ...styles.toggleBtn,
              ...(tooth.implant ? styles.toggleBtnActive : {}),
            }}
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
      <td key={`${fdi}-mob`} style={styles.toothCell}>
        <select
          value={tooth.mobility}
          disabled={tooth.missing}
          onChange={(e) => updateGrade(fdi, "mobility", e.target.value as Grade)}
          style={styles.smallSelect}
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
      <td key={`${fdi}-fur`} style={styles.toothCell}>
        <select
          value={tooth.furcation}
          disabled={tooth.missing}
          onChange={(e) =>
            updateGrade(fdi, "furcation", e.target.value as Grade)
          }
          style={styles.smallSelect}
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
    <td key={`${fdi}-glyph`} style={styles.toothCell}>
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
      <td style={styles.rowLabelCell}>{text}</td>
    );

    // Linhas para uma face, na ordem fornecida (de cima p/ baixo).
    const faceRows = (
      face: FaceKey,
      rows: Array<"SS" | "PS" | "REC" | "NIC">
    ) =>
      rows.map((row) => {
        let label = "";
        let cells: React.ReactNode[] = [];
        if (row === "SS") {
          label = "SS";
          cells = order.map((fdi) => renderSSCells(fdi, face));
        } else if (row === "PS") {
          label = "PS";
          cells = order.map((fdi) => renderNumberCells(fdi, face, "ps"));
        } else if (row === "REC") {
          label = "REC";
          cells = order.map((fdi) => renderNumberCells(fdi, face, "rec"));
        } else {
          label = "NIC";
          cells = order.map((fdi) => renderNicCells(fdi, face));
        }
        return (
          <tr key={`${arcada}-${face}-${row}`}>
            {rowLabel(`${label}`)}
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
      <table style={styles.table}>
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

  return (
    <div style={styles.container}>
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

      <h1 style={styles.title}>Periodograma</h1>
      <h1 style={styles.title}>Periodograma</h1>

      {/* Informações do paciente */}
      <div style={styles.patientCard}>
        <div style={styles.field}>
          <label style={styles.label}>Nome do paciente</label>
          <input
            style={styles.textInput}
            value={patient.nome}
            onChange={(e) => updatePatient("nome", e.target.value)}
            placeholder="Nome completo"
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Data de nascimento</label>
          <input
            type="date"
            style={styles.textInput}
            value={patient.nascimento}
            onChange={(e) => updatePatient("nascimento", e.target.value)}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Data do exame</label>
          <input
            type="date"
            style={styles.textInput}
            value={patient.exame}
            onChange={(e) => updatePatient("exame", e.target.value)}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Examinador</label>
          <input
            style={styles.textInput}
            value={patient.examinador}
            onChange={(e) => updatePatient("examinador", e.target.value)}
            placeholder="Nome do examinador"
          />
        </div>
      </div>

      {/* Arcada Superior */}
      <div style={styles.arcadaTitle}>
        Arcada Superior&nbsp;(18–11 | 21–28)
      </div>
      {renderArcada(UPPER_TEETH, "superior")}

      {/* Arcada Inferior */}
      <div style={styles.arcadaTitle}>
        Arcada Inferior&nbsp;(48–41 | 31–38)
      </div>
      {renderArcada(LOWER_TEETH, "inferior")}

      {/* Legenda de cores */}
      <div style={styles.legend}>
        <strong>PS (mm):</strong>
        <span style={styles.legendChip}>
          <span style={{ ...styles.legendSwatch, background: "#bbf7d0" }} />
          1–3
        </span>
        <span style={styles.legendChip}>
          <span style={{ ...styles.legendSwatch, background: "#fef08a" }} />
          4–5
        </span>
        <span style={styles.legendChip}>
          <span style={{ ...styles.legendSwatch, background: "#fed7aa" }} />
          6–7
        </span>
        <span style={styles.legendChip}>
          <span style={{ ...styles.legendSwatch, background: "#fca5a5" }} />
          ≥8
        </span>
        <span style={styles.legendChip}>
          <span style={{ ...styles.legendSwatch, background: "#ef4444" }} />
          Sangramento (SS)
        </span>
      </div>

      {/* Painel de resumo */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.bleedingPct}%</div>
          <div style={styles.summaryLabel}>Sítios com sangramento</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.ps4Pct}%</div>
          <div style={styles.summaryLabel}>Sítios com PS ≥ 4 mm</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.ps6Pct}%</div>
          <div style={styles.summaryLabel}>Sítios com PS ≥ 6 mm</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.nicMean}</div>
          <div style={styles.summaryLabel}>NIC médio (mm)</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.missing}</div>
          <div style={styles.summaryLabel}>Dentes ausentes</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.present}</div>
          <div style={styles.summaryLabel}>Dentes presentes</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.implants}</div>
          <div style={styles.summaryLabel}>Implantes</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.totalSites}</div>
          <div style={styles.summaryLabel}>Sítios medidos</div>
        </div>
      </div>

      {/* Tabela resumo por dente (expansível) */}
      <button
        type="button"
        style={styles.expandBtn}
        onClick={() => setShowDetail((v) => !v)}
      >
        {showDetail ? "Ocultar" : "Mostrar"} resumo por dente
      </button>

      {showDetail && (
        <table style={styles.summaryTable}>
          <thead>
            <tr>
              <th style={styles.summaryTh}>Dente</th>
              <th style={styles.summaryTh}>Estado</th>
              <th style={styles.summaryTh}>Mob.</th>
              <th style={styles.summaryTh}>Furca</th>
              <th style={styles.summaryTh}>PS máx.</th>
              <th style={styles.summaryTh}>NIC máx.</th>
              <th style={styles.summaryTh}>Sítios c/ SS</th>
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
                  <td style={styles.summaryTd}>{fdi}</td>
                  <td style={styles.summaryTd}>{estado}</td>
                  <td style={styles.summaryTd}>{t.mobility}</td>
                  <td style={styles.summaryTd}>{t.furcation}</td>
                  <td style={styles.summaryTd}>
                    {t.missing ? "—" : maxPs || "—"}
                  </td>
                  <td style={styles.summaryTd}>
                    {t.missing ? "—" : maxNic || "—"}
                  </td>
                  <td style={styles.summaryTd}>
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

export default Periodograma;
