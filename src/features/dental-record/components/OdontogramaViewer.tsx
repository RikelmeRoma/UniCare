import React, { useState, useEffect, useMemo, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Tipagem de Dados (TypeScript)                                     */
/* ------------------------------------------------------------------ */

type FaceKey = "V" | "L" | "M" | "D" | "O";
type FaceConditionKey = "carie" | "restauracao" | "selante" | "fratura";
type WholeConditionKey = "ausente" | "extracao" | "implante" | "coroa" | "canal" | "mobilidade";
type ActiveToolType = FaceConditionKey | WholeConditionKey | "eraser";

interface ConditionDef {
  key: FaceConditionKey | WholeConditionKey;
  label: string;
  color: string;
}

type ToothFaces = Record<FaceKey, FaceConditionKey | null>;

interface ToothData {
  faces: ToothFaces;
  whole: WholeConditionKey | null;
  note: string;
}

type TeethMap = Record<number, ToothData>;

interface PatientData {
  nome: string;
  data: string;
  profissional: string;
}

interface ToothSVGProps {
  fdi: number;
  data: ToothData;
  activeTool: ActiveToolType;
  onCellClick: (fdi: number, faceKey: FaceKey) => void;
  onSelect: (fdi: number) => void;
  isSelected: boolean;
}

/* ------------------------------------------------------------------ */
/*  Dados e configuração                                              */
/* ------------------------------------------------------------------ */

const QUAD_UR = [18, 17, 16, 15, 14, 13, 12, 11];
const QUAD_UL = [21, 22, 23, 24, 25, 26, 27, 28];
const QUAD_LR = [48, 47, 46, 45, 44, 43, 42, 41];
const QUAD_LL = [31, 32, 33, 34, 35, 36, 37, 38];

const UPPER_ROW = [...QUAD_UR, ...QUAD_UL];
const LOWER_ROW = [...QUAD_LR, ...QUAD_LL];
const ALL_TEETH = [...UPPER_ROW, ...LOWER_ROW];

const FACE_CONDITIONS: { key: FaceConditionKey; label: string; color: string }[] = [
  { key: "carie", label: "Cárie", color: "#B23A2E" },
  { key: "restauracao", label: "Restauração", color: "#2B5E86" },
  { key: "selante", label: "Selante", color: "#3D8A63" },
  { key: "fratura", label: "Fratura", color: "#9A6B33" },
];

const WHOLE_CONDITIONS: { key: WholeConditionKey; label: string; color: string }[] = [
  { key: "ausente", label: "Ausente", color: "#8E9598" },
  { key: "extracao", label: "Extração indicada", color: "#D08A2C" },
  { key: "implante", label: "Implante", color: "#6E5AA0" },
  { key: "coroa", label: "Coroa protética", color: "#B8860B" },
  { key: "canal", label: "Tratamento de canal", color: "#4A4A4A" },
  { key: "mobilidade", label: "Mobilidade", color: "#3167AC" },
];

const ALL_CONDITIONS: ConditionDef[] = [...FACE_CONDITIONS, ...WHOLE_CONDITIONS];

function conditionInfo(key: string): ConditionDef | undefined {
  return ALL_CONDITIONS.find((c) => c.key === key);
}

function emptyFaces(): ToothFaces {
  return { V: null, L: null, M: null, D: null, O: null };
}

function buildInitialTeeth(): TeethMap {
  const obj: TeethMap = {};
  ALL_TEETH.forEach((fdi) => {
    obj[fdi] = { faces: emptyFaces(), whole: null, note: "" };
  });
  return obj;
}

function quadrantOf(fdi: number): number {
  return Math.floor(fdi / 10);
}

function isRightQuadrant(fdi: number): boolean {
  const q = quadrantOf(fdi);
  return q === 1 || q === 4; 
}

function isUpper(fdi: number): boolean {
  return quadrantOf(fdi) <= 2;
}

function isAnterior(fdi: number): boolean {
  return fdi % 10 <= 3;
}

function toothTypeName(fdi: number): string {
  const names: Record<number, string> = {
    1: "Incisivo central",
    2: "Incisivo lateral",
    3: "Canino",
    4: "1º Pré-molar",
    5: "2º Pré-molar",
    6: "1º Molar",
    7: "2º Molar",
    8: "3º Molar (siso)",
  };
  return names[fdi % 10] || "";
}

function quadrantName(fdi: number): string {
  const map: Record<number, string> = {
    1: "Superior direito",
    2: "Superior esquerdo",
    3: "Inferior esquerdo",
    4: "Inferior direito",
  };
  return map[quadrantOf(fdi)] || "";
}

function faceLabel(fdi: number, key: FaceKey): string {
  switch (key) {
    case "V": return "Vestibular";
    case "L": return isUpper(fdi) ? "Palatina" : "Lingual";
    case "O": return isAnterior(fdi) ? "Incisal" : "Oclusal";
    case "M": return "Mesial";
    case "D": return "Distal";
    default: return key;
  }
}

function sideKeys(fdi: number): { left: FaceKey; right: FaceKey } {
  return isRightQuadrant(fdi)
    ? { left: "D", right: "M" }
    : { left: "M", right: "D" };
}

function archTransform(index: number, total: number, arch: "upper" | "lower"): React.CSSProperties {
  const center = (total - 1) / 2;
  const t = (index - center) / center; 
  const rotate = t * 13;
  const rise = Math.abs(t) * 7;
  const y = arch === "upper" ? -rise : rise;
  return {
    transform: `translateY(${y}px) rotate(${arch === "upper" ? rotate : -rotate}deg)`,
    transformOrigin: arch === "upper" ? "top center" : "bottom center",
  };
}

/* ------------------------------------------------------------------ */
/*  Componente: dente individual (SVG)                                */
/* ------------------------------------------------------------------ */

function ToothSVG({ fdi, data, activeTool, onCellClick, onSelect, isSelected }: ToothSVGProps) {
  const { left: leftKey, right: rightKey } = sideKeys(fdi);
  const w = 44, h = 54;
  const r = 11; 
  const clipId = `tooth-clip-${fdi}`;
  const sheenId = `tooth-sheen-${fdi}`;
  const depthId = `tooth-depth-${fdi}`;

  const cellFill = (key: FaceKey) => {
    const cond = data.faces[key];
    return cond ? conditionInfo(cond)?.color : "#FBFDFC";
  };

  const wholeInfo = data.whole ? conditionInfo(data.whole) : null;
  const isBlocked = data.whole === "ausente" || data.whole === "implante";

  const cellCommon = (key: FaceKey, x: number, y: number, cw: number, ch: number) => (
    <rect
      key={key}
      x={x}
      y={y}
      width={cw}
      height={ch}
      fill={cellFill(key)}
      stroke="#E7ECEB"
      strokeWidth="1"
      style={{ cursor: isBlocked ? "default" : "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        if (!isBlocked || activeTool === "eraser" || WHOLE_CONDITIONS.some((c) => c.key === activeTool)) {
          onCellClick(fdi, key);
        }
      }}
    >
      <title>{`${fdi} — ${faceLabel(fdi, key)}${data.faces[key] ? `: ${conditionInfo(data.faces[key]!)?.label}` : ""}`}</title>
    </rect>
  );

  return (
    <div className="flex flex-col items-center select-none group" style={{ width: w }}>
      <button
        onClick={() => onSelect(fdi)}
        className="mb-1.5 text-xs font-semibold rounded-full px-2 py-0.5 transition-colors"
        style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          color: isSelected ? "#FFFFFF" : "#3D4C4D",
          background: isSelected ? "#0E7C7B" : "#EAEFEE",
          letterSpacing: "0.02em",
        }}
        aria-label={`Selecionar dente ${fdi}`}
      >
        {fdi}
      </button>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        onClick={() => onCellClick(fdi, "O")}
        className="transition-transform duration-150 ease-out group-hover:-translate-y-0.5"
        style={{ overflow: "visible", filter: "drop-shadow(0 1px 2px rgba(20,38,42,0.18))" }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={r} ry={r} />
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
          {cellCommon("V", 14, 0, 16, 16)}
          {cellCommon(leftKey, 0, 16, 14, 22)}
          {cellCommon("O", 14, 16, 16, 22)}
          {cellCommon(rightKey, 30, 16, 14, 22)}
          {cellCommon("L", 14, 38, 16, 16)}

          {data.whole === "ausente" && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                onCellClick(fdi, "O");
              }}
            >
              <rect x={0} y={0} width={w} height={h} fill="#E6EAE9" opacity="0.95" />
              <line x1={11} y1={11} x2={w - 11} y2={h - 11} stroke="#9AA5A3" strokeWidth="2" strokeLinecap="round" />
              <line x1={w - 11} y1={11} x2={11} y2={h - 11} stroke="#9AA5A3" strokeWidth="2" strokeLinecap="round" />
              <title>{`${fdi} — Ausente`}</title>
            </g>
          )}

          {data.whole === "implante" && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                onCellClick(fdi, "O");
              }}
            >
              <rect x={0} y={0} width={w} height={h} fill="#6E5AA0" opacity="0.92" />
              <text
                x={w / 2}
                y={h / 2 + 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#FFFFFF"
                style={{ fontFamily: "ui-sans-serif, system-ui" }}
              >
                Im
              </text>
              <title>{`${fdi} — Implante`}</title>
            </g>
          )}

          <rect x={0} y={0} width={w} height={h} fill={`url(#${sheenId})`} pointerEvents="none" />
          <rect x={0} y={0} width={w} height={h} fill={`url(#${depthId})`} pointerEvents="none" />
        </g>

        <rect x={0.75} y={0.75} width={w - 1.5} height={h - 1.5} rx={r} ry={r} fill="none" stroke="#C7D0CE" strokeWidth="1.2" pointerEvents="none" />

        {wholeInfo && !isBlocked && (
          <rect x={-2} y={-2} width={w + 4} height={h + 4} fill="none" stroke={wholeInfo.color} strokeWidth="2.5" rx={r + 2}>
            <title>{`${fdi} — ${wholeInfo.label}`}</title>
          </rect>
        )}

        {isSelected && (
          <rect x={-4} y={-4} width={w + 8} height={h + 8} fill="none" stroke="#0E7C7B" strokeWidth="1.5" strokeDasharray="3 2" rx={r + 3} />
        )}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Componente principal                                              */
/* ------------------------------------------------------------------ */

export default function OdontogramApp() {
  const [teeth, setTeeth] = useState<TeethMap>(buildInitialTeeth);
  const [activeTool, setActiveTool] = useState<ActiveToolType>("carie");
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [patient, setPatient] = useState<PatientData>({ nome: "", data: "", profissional: "" });
  const [showJson, setShowJson] = useState(false);
  const fontsLoaded = useRef(false);

  useEffect(() => {
    if (fontsLoaded.current) return;
    fontsLoaded.current = true;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap";
    document.head.appendChild(link);
  }, []);

  const isFaceTool = FACE_CONDITIONS.some((c) => c.key === activeTool);
  const isWholeTool = WHOLE_CONDITIONS.some((c) => c.key === activeTool);

  function handleCellClick(fdi: number, faceKey: FaceKey) {
    setTeeth((prev) => {
      const t = prev[fdi];

      if (activeTool === "eraser") {
        if (t.whole) return { ...prev, [fdi]: { ...t, whole: null } };
        return { ...prev, [fdi]: { ...t, faces: { ...t.faces, [faceKey]: null } } };
      }

      if (isFaceTool) {
        if (t.whole === "ausente" || t.whole === "implante") return prev;
        const current = t.faces[faceKey];
        const nextVal = current === activeTool ? null : (activeTool as FaceConditionKey);
        return { ...prev, [fdi]: { ...t, faces: { ...t.faces, [faceKey]: nextVal } } };
      }

      if (isWholeTool) {
        const nextWhole = t.whole === activeTool ? null : (activeTool as WholeConditionKey);
        const nextFaces = nextWhole === "ausente" || nextWhole === "implante" ? emptyFaces() : t.faces;
        return { ...prev, [fdi]: { ...t, whole: nextWhole, faces: nextFaces } };
      }

      return prev;
    });
  }

  function updateToothFace(fdi: number, faceKey: FaceKey, value: string) {
    setTeeth((prev) => ({
      ...prev,
      [fdi]: { ...prev[fdi], faces: { ...prev[fdi].faces, [faceKey]: value ? (value as FaceConditionKey) : null } },
    }));
  }

  function updateToothWhole(fdi: number, value: string) {
    setTeeth((prev) => {
      const t = prev[fdi];
      const nextFaces = value === "ausente" || value === "implante" ? emptyFaces() : t.faces;
      return { ...prev, [fdi]: { ...t, whole: value ? (value as WholeConditionKey) : null, faces: nextFaces } };
    });
  }

  function updateNote(fdi: number, note: string) {
    setTeeth((prev) => ({ ...prev, [fdi]: { ...prev[fdi], note } }));
  }

  function resetTooth(fdi: number) {
    setTeeth((prev) => ({ ...prev, [fdi]: { faces: emptyFaces(), whole: null, note: prev[fdi].note } }));
  }

  function clearAll() {
    if (window.confirm("Limpar todo o odontograma? Esta ação não pode ser desfeita.")) {
      setTeeth(buildInitialTeeth());
      setSelectedTooth(null);
    }
  }

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_CONDITIONS.forEach((c) => (counts[c.key] = 0));
    let notesCount = 0;
    ALL_TEETH.forEach((fdi) => {
      const t = teeth[fdi];
      Object.values(t.faces).forEach((v) => {
        if (v) counts[v] += 1;
      });
      if (t.whole) counts[t.whole] += 1;
      if (t.note && t.note.trim()) notesCount += 1;
    });
    return { counts, notesCount };
  }, [teeth]);

  function downloadJson() {
    const payload = {
      paciente: patient,
      geradoEm: new Date().toISOString(),
      numeracao: "FDI",
      dentes: teeth,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `odontograma_${patient.nome ? patient.nome.replace(/\s+/g, "_") : "paciente"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const sel = selectedTooth ? teeth[selectedTooth] : null;

  const headingFont = "'Fraunces', ui-serif, Georgia, serif";
  const bodyFont = "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif";

  return (
    <div style={{ background: "#F2F5F4", color: "#14262A", fontFamily: bodyFont, minHeight: "100%" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
        .tool-btn { transition: transform 0.08s ease, box-shadow 0.08s ease; }
        .tool-btn:active { transform: translateY(1px); }
      `}</style>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="mb-5 pb-4" style={{ borderBottom: "1px solid #D7DEDD" }}>
          <h1 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: "30px", letterSpacing: "-0.01em" }}>Odontograma</h1>
          <p className="text-sm mt-1" style={{ color: "#5C6B6D" }}>Registro clínico interativo · numeração FDI (dois dígitos)</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 no-print">
          <label className="flex flex-col text-xs" style={{ color: "#5C6B6D" }}>
            Paciente
            <input
              value={patient.nome}
              onChange={(e) => setPatient((p) => ({ ...p, nome: e.target.value }))}
              placeholder="Nome completo"
              className="mt-1 px-2 py-1.5 rounded text-sm"
              style={{ border: "1px solid #D7DEDD", background: "#FFFFFF", color: "#14262A" }}
            />
          </label>
          <label className="flex flex-col text-xs" style={{ color: "#5C6B6D" }}>
            Data
            <input
              type="date"
              value={patient.data}
              onChange={(e) => setPatient((p) => ({ ...p, data: e.target.value }))}
              className="mt-1 px-2 py-1.5 rounded text-sm"
              style={{ border: "1px solid #D7DEDD", background: "#FFFFFF", color: "#14262A" }}
            />
          </label>
          <label className="flex flex-col text-xs" style={{ color: "#5C6B6D" }}>
            Profissional
            <input
              value={patient.profissional}
              onChange={(e) => setPatient((p) => ({ ...p, profissional: e.target.value }))}
              placeholder="Dentista responsável"
              className="mt-1 px-2 py-1.5 rounded text-sm"
              style={{ border: "1px solid #D7DEDD", background: "#FFFFFF", color: "#14262A" }}
            />
          </label>
        </div>

        <div className="mb-5 no-print">
          <div className="mb-2">
            <span className="text-xs font-medium" style={{ color: "#5C6B6D" }}>Condições por face</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {FACE_CONDITIONS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveTool(c.key)}
                  className="tool-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium"
                  aria-pressed={activeTool === c.key}
                  style={{ border: activeTool === c.key ? `2px solid ${c.color}` : "1px solid #D7DEDD", background: "#FFFFFF" }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color, display: "inline-block" }} />
                  {c.label}
                </button>
              ))}
              <button
                onClick={() => setActiveTool("eraser")}
                className="tool-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium"
                aria-pressed={activeTool === "eraser"}
                style={{ border: activeTool === "eraser" ? "2px solid #14262A" : "1px solid #D7DEDD", background: "#FFFFFF" }}
              >
                <span style={{ width: 10, height: 10, borderRadius: 2, background: "#eee", border: "1px solid #999", display: "inline-block" }} />
                Borracha
              </button>
            </div>
          </div>

          <div>
            <span className="text-xs font-medium" style={{ color: "#5C6B6D" }}>Condições do dente inteiro</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {WHOLE_CONDITIONS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setActiveTool(c.key)}
                  className="tool-btn flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium"
                  aria-pressed={activeTool === c.key}
                  style={{ border: activeTool === c.key ? `2px solid ${c.color}` : "1px solid #D7DEDD", background: "#FFFFFF" }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, display: "inline-block" }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg p-4 mb-5" style={{ background: "#FFFFFF", border: "1px solid #D7DEDD" }}>
          <div className="overflow-x-auto">
            <div style={{ minWidth: 780 }}>
              <div className="flex justify-between text-xs font-medium mb-2 px-1" style={{ color: "#5C6B6D" }}>
                <span>Superior direita</span>
                <span>Superior esquerda</span>
              </div>
              <div className="flex justify-center items-end gap-1.5 pb-4" style={{ borderBottom: "1px dashed #D7DEDD" }}>
                {UPPER_ROW.map((fdi, i) => (
                  <React.Fragment key={fdi}>
                    {i === 8 && <div style={{ width: 1, alignSelf: "stretch", background: "#D7DEDD", margin: "0 4px" }} />}
                    <div style={archTransform(i, UPPER_ROW.length, "upper")}>
                      <ToothSVG fdi={fdi} data={teeth[fdi]} activeTool={activeTool} onCellClick={handleCellClick} onSelect={setSelectedTooth} isSelected={selectedTooth === fdi} />
                    </div>
                  </React.Fragment>
                ))}
              </div>

              <div className="flex justify-center items-start gap-1.5 pt-4">
                {LOWER_ROW.map((fdi, i) => (
                  <React.Fragment key={fdi}>
                    {i === 8 && <div style={{ width: 1, alignSelf: "stretch", background: "#D7DEDD", margin: "0 4px" }} />}
                    <div style={archTransform(i, LOWER_ROW.length, "lower")}>
                      <ToothSVG fdi={fdi} data={teeth[fdi]} activeTool={activeTool} onCellClick={handleCellClick} onSelect={setSelectedTooth} isSelected={selectedTooth === fdi} />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>

        {sel && selectedTooth !== null && (
          <div className="rounded-lg p-4 mb-5 no-print" style={{ background: "#FFFFFF", border: "1px solid #D7DEDD" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 style={{ fontFamily: headingFont, fontWeight: 600, fontSize: "20px" }}>Dente {selectedTooth}</h2>
                <p className="text-xs" style={{ color: "#5C6B6D" }}>{toothTypeName(selectedTooth)} · {quadrantName(selectedTooth)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => resetTooth(selectedTooth)} className="text-xs px-2.5 py-1.5 rounded" style={{ border: "1px solid #D7DEDD" }}>Limpar dente</button>
                <button onClick={() => setSelectedTooth(null)} className="text-xs px-2.5 py-1.5 rounded" style={{ border: "1px solid #D7DEDD" }}>Fechar</button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
              {(["V", "M", "O", "D", "L"] as FaceKey[]).map((key) => (
                <label key={key} className="flex flex-col text-xs" style={{ color: "#5C6B6D" }}>
                  {faceLabel(selectedTooth, key)}
                  <select
                    value={sel.faces[key] || ""}
                    onChange={(e) => updateToothFace(selectedTooth, key, e.target.value)}
                    disabled={sel.whole === "ausente" || sel.whole === "implante"}
                    className="mt-1 px-1.5 py-1 rounded text-xs"
                    style={{ border: "1px solid #D7DEDD" }}
                  >
                    <option value="">Hígido</option>
                    {FACE_CONDITIONS.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <label className="flex flex-col text-xs mb-3" style={{ color: "#5C6B6D" }}>
              Condição geral do dente
              <select
                value={sel.whole || ""}
                onChange={(e) => updateToothWhole(selectedTooth, e.target.value)}
                className="mt-1 px-1.5 py-1.5 rounded text-xs sm:w-64"
                style={{ border: "1px solid #D7DEDD" }}
              >
                <option value="">Nenhuma</option>
                {WHOLE_CONDITIONS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col text-xs" style={{ color: "#5C6B6D" }}>
              Observações
              <textarea
                value={sel.note}
                onChange={(e) => updateNote(selectedTooth, e.target.value)}
                rows={2}
                placeholder="Anotações clínicas sobre este dente..."
                className="mt-1 px-2 py-1.5 rounded text-sm"
                style={{ border: "1px solid #D7DEDD", resize: "vertical" }}
              />
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
          <div className="rounded-lg p-4" style={{ background: "#FFFFFF", border: "1px solid #D7DEDD" }}>
            <h3 className="text-sm font-semibold mb-2">Legenda</h3>
            <div className="grid grid-cols-1 gap-1.5">
              {FACE_CONDITIONS.map((c) => (
                <div key={c.key} className="flex items-center gap-2 text-xs">
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: c.color, display: "inline-block" }} />
                  {c.label} <span style={{ color: "#8A9394" }}>— marcado na face</span>
                </div>
              ))}
              {WHOLE_CONDITIONS.map((c) => (
                <div key={c.key} className="flex items-center gap-2 text-xs">
                  <span style={{ width: 12, height: 12, borderRadius: "50%", border: `2.5px solid ${c.color}`, display: "inline-block" }} />
                  {c.label} <span style={{ color: "#8A9394" }}>— anel ao redor do dente</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg p-4" style={{ background: "#FFFFFF", border: "1px solid #D7DEDD" }}>
            <h3 className="text-sm font-semibold mb-2">Resumo</h3>
            <div className="grid grid-cols-2 gap-y-1 text-xs">
              {ALL_CONDITIONS.map((c) => (
                <div key={c.key} className="flex justify-between pr-3">
                  <span style={{ color: "#5C6B6D" }}>{c.label}</span>
                  <span className="font-semibold" style={{ fontFamily: "ui-monospace, monospace" }}>{summary.counts[c.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 no-print">
          <button onClick={downloadJson} className="text-sm px-3 py-2 rounded font-medium" style={{ background: "#0E7C7B", color: "#FFFFFF" }}>Exportar JSON</button>
          <button onClick={() => setShowJson((v) => !v)} className="text-sm px-3 py-2 rounded font-medium" style={{ border: "1px solid #D7DEDD", background: "#FFFFFF" }}>
            {showJson ? "Ocultar dados" : "Ver dados"}
          </button>
          <button onClick={clearAll} className="text-sm px-3 py-2 rounded font-medium" style={{ border: "1px solid #D08A2C", color: "#B5651D", background: "#FFFFFF" }}>Limpar tudo</button>
        </div>

        {showJson && (
          <pre className="mt-3 p-3 rounded text-xs overflow-auto no-print" style={{ background: "#14262A", color: "#E7ECEB", maxHeight: 300 }}>
            {JSON.stringify({ paciente: patient, dentes: teeth }, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}