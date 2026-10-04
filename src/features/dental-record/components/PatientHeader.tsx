import type { Paciente } from '../../clinic/context/ClinicContext';

interface PatientHeaderProps {
  paciente?: Paciente;
}

export function PatientHeader({ paciente }: PatientHeaderProps) {
  const nome = paciente?.nome || 'Carlos Silva e Santos';
  const cpf = paciente?.cpf || '123.456.789-00';
  const dataNasc = paciente?.dataNascimento || '1984-05-12';
  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-xs">
          {iniciais}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">{nome}</h2>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-emerald-200/60 uppercase tracking-wider">
              Prontuário Ativo
            </span>
            {paciente?.ehMenor && (
              <span className="bg-indigo-50 text-indigo-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-indigo-200/60 uppercase tracking-wider">
                Odontopediatria
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-mono">
            Nasc: {dataNasc} • CPF: {cpf}
            {paciente?.nomeResponsavel ? ` • Resp: ${paciente.nomeResponsavel}` : ''}
          </p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Protocolo Odonto</p>
          <p className="text-xs font-semibold text-slate-800 font-mono">#ODO-2026-0884</p>
        </div>
        <div className="w-px bg-slate-200"></div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Risco Sistêmico</p>
          <p className="text-xs font-bold text-amber-700 font-mono">ASA II</p>
        </div>
      </div>
    </div>
  );
}