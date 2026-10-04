import { useState } from 'react';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
} from '../../../components/icons/CorporateIcons';

interface RegistroEvolucaoOdonto {
  id: number;
  data: string;
  dupla: string;
  denteRegiao: string;
  procedimento: string;
  materiais: string;
  anestesico: string;
  status: 'Homologado' | 'Pendente';
  vistoDocente?: string;
}

const INITIAL_REGISTROS: RegistroEvolucaoOdonto[] = [
  {
    id: 1,
    data: '15/09/2026',
    dupla: 'Lucas Vasconcelos (Op.) & Gabriela Prado (Aux.)',
    denteRegiao: 'Dente 36 (Face Oclusal-Mesial-Distal)',
    procedimento: 'Restauração profunda em resina composta (Classe II MOD) • CID K02.1',
    materiais: 'Ácido fosfórico 37%, adesivo Single Bond Universal, resina Filtek Z350 XT cor A2.',
    anestesico: 'Articaína 4% com epinefrina 1:100.000 (1 tubete - Bloqueio do NAI)',
    status: 'Pendente',
  },
  {
    id: 2,
    data: '08/09/2026',
    dupla: 'Augusto Cesar Farias (Op.) & Marlon Bruno (Aux.)',
    denteRegiao: 'Arcada Superior e Inferior',
    procedimento: 'Exame clínico periodontal inicial, odontograma e profilaxia com pasta profilática.',
    materiais: 'Sonda periodontal Williams, taça de borracha, pasta profilática menta.',
    anestesico: 'Sem anestesia',
    status: 'Homologado',
    vistoDocente: 'Profa. Dra. Bianca Nubia (CRO-SE 4512) • 08/09 16:45',
  },
];

export function DentalEvolutionTab() {
  const [registros, setRegistros] = useState<RegistroEvolucaoOdonto[]>(INITIAL_REGISTROS);
  const [showNovo, setShowNovo] = useState(false);

  const [dupla, setDupla] = useState('Augusto Cesar Farias (Op.) & Gabriela Prado (Aux.)');
  const [denteRegiao, setDenteRegiao] = useState('Dente 16');
  const [procedimento, setProcedimento] = useState('Remoção de cárie em esmalte e selante invasivo');
  const [materiais, setMateriais] = useState('Condicionamento ácido + Adesivo + Resina Flow A2');
  const [anestesico, setAnestesico] = useState('Lidocaína 2% 1:100.000 (Infiltrativa)');
  const [sucessoMsg, setSucessoMsg] = useState('');

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    const novo: RegistroEvolucaoOdonto = {
      id: Date.now(),
      data: '15/09/2026',
      dupla,
      denteRegiao,
      procedimento,
      materiais,
      anestesico,
      status: 'Pendente',
    };

    setRegistros([novo, ...registros]);
    setShowNovo(false);
    setSucessoMsg('Evolução odontológica registrada e submetida para homologação docente.');
    setTimeout(() => setSucessoMsg(''), 4000);
  };

  return (
    <div className="space-y-6 font-sans">
      {sucessoMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {/* Cabeçalho da Aba */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4 text-emerald-800" />
            <span>Evolução Clínica Diária • Atendimento em Dupla (PDR-05)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro formal de procedimentos, dentes/região e insumos utilizados conforme exigência do CFO
          </p>
        </div>
        <button
          onClick={() => setShowNovo(!showNovo)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
        >
          {showNovo ? <XMarkIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
          <span>{showNovo ? 'Fechar Formulário' : 'Nova Evolução'}</span>
        </button>
      </div>

      {/* Formulário de Registro Clínico */}
      {showNovo && (
        <form onSubmit={handleSalvar} className="bg-white p-6 rounded-2xl border border-emerald-500/50 shadow-sm space-y-4 text-xs ring-1 ring-emerald-500/20">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm">
              Registrar Procedimento do Dia (15/09/2026)
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              Dupla Obrigatória (CFO)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Dupla de Estagiários (Operador & Auxiliar - PDR-05) *
              </label>
              <input
                type="text"
                required
                value={dupla}
                onChange={(e) => setDupla(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Dente / Região Anatômica *
              </label>
              <input
                type="text"
                required
                value={denteRegiao}
                onChange={(e) => setDenteRegiao(e.target.value)}
                placeholder="Ex: Dente 16 ou Sextante Anterior"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Conduta Clínica e Procedimento Executado *
            </label>
            <input
              type="text"
              required
              value={procedimento}
              onChange={(e) => setProcedimento(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Materiais e Resinas Utilizadas *
              </label>
              <input
                type="text"
                required
                value={materiais}
                onChange={(e) => setMateriais(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Anestésico e Volume Injetado
              </label>
              <input
                type="text"
                value={anestesico}
                onChange={(e) => setAnestesico(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowNovo(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition-colors"
            >
              Gravar Procedimento e Enviar à Supervisora
            </button>
          </div>
        </form>
      )}

      {/* Linha do Tempo de Atendimentos Anteriores (RF-008) */}
      <div className="space-y-4">
        {registros.map((reg) => (
          <div
            key={reg.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{reg.procedimento}</span>
                  <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                    {reg.denteRegiao}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Atendimento em: <strong className="text-slate-700">{reg.data}</strong> • Dupla: {reg.dupla}
                </p>
              </div>

              {reg.status === 'Homologado' ? (
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shrink-0">
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Visto Concedido</span>
                </span>
              ) : (
                <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shrink-0">
                  <ClockIcon className="w-3.5 h-3.5 text-amber-600" />
                  <span>Aguardando Visto Docente</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Materiais:</span>
                <p className="text-slate-700 mt-0.5">{reg.materiais}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Anestesia:</span>
                <p className="text-slate-700 mt-0.5">{reg.anestesico}</p>
              </div>
            </div>

            {reg.vistoDocente && (
              <p className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5 pt-1">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                <span>Assinado digitalmente por: {reg.vistoDocente}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
