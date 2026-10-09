import { useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import { useAuth } from '../../auth/context/AuthContext';
import {
  DocumentTextIcon,
  PlusIcon,
  XMarkIcon,
} from '../../../components/icons/CorporateIcons';

interface StudentDemandPanelProps {
  cursoFiltro?: 'psicologia' | 'odontologia';
}

export function StudentDemandPanel({ cursoFiltro }: StudentDemandPanelProps) {
  const { demandas, adicionarDemanda } = useClinic();
  // A matricula e de quem ESTA criando a demanda (o estagiario logado), nao de
  // um aluno fixo no codigo — antes enviava sempre '16032935'.
  const { user } = useAuth();
  const [showNovaDemanda, setShowNovaDemanda] = useState(false);
  const [alunoNome, setAlunoNome] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [prioridade, setPrioridade] = useState<'Alta' | 'Média' | 'Normal'>('Média');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const demandasFiltradas = demandas.filter(
    (d) => !cursoFiltro || d.curso === cursoFiltro
  );

  const handleNovaDemanda = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!alunoNome.trim() || !procedimento.trim()) return;

    setIsSaving(true);
    const res = await adicionarDemanda({
      alunoNome,
      alunoMatricula: user?.matricula ?? '',
      curso: cursoFiltro || 'odontologia',
      procedimentoDesejado: procedimento,
      prioridade,
    });
    setIsSaving(false);

    // So fecha o formulario em caso de sucesso; antes fechava sem verificar nada.
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    setAlunoNome('');
    setProcedimento('');
    setShowNovaDemanda(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 font-sans">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4 text-blue-700" />
            <span>Demandas de Estágio (RF-009)</span>
          </h3>
          <p className="text-[10px] text-slate-400">
            Pacientes solicitados pelos estagiários para a próxima semana
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNovaDemanda(!showNovaDemanda)}
          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-colors flex items-center gap-1"
        >
          {showNovaDemanda ? <XMarkIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
          <span>{showNovaDemanda ? 'Fechar' : 'Nova Solicitação'}</span>
        </button>
      </div>

      {showNovaDemanda && (
        <form onSubmit={handleNovaDemanda} className="mb-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Nome do Aluno / Dupla</label>
            <input
              type="text"
              required
              value={alunoNome}
              onChange={(e) => setAlunoNome(e.target.value)}
              placeholder="Ex: Rikelme Roma ou Augusto & Gabriela"
              className="w-full p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-slate-900"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 mb-1">Perfil de Paciente / Procedimento Necessário</label>
            <input
              type="text"
              required
              value={procedimento}
              onChange={(e) => setProcedimento(e.target.value)}
              placeholder="Ex: 1 paciente para raspagem periodontal ou avaliação infantil"
              className="w-full p-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-slate-900"
            />
          </div>
          <div className="flex justify-between items-center pt-1">
            <select
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value as 'Alta' | 'Média' | 'Normal')}
              className="p-1.5 border border-slate-200 rounded-lg bg-white text-xs outline-none"
            >
              <option value="Alta">Prioridade Alta</option>
              <option value="Média">Prioridade Média</option>
              <option value="Normal">Prioridade Normal</option>
            </select>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg font-bold text-xs shadow-2xs disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Demanda'}
            </button>
          </div>
          {errorMsg && (
            <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
              {errorMsg}
            </p>
          )}
        </form>
      )}

      <div className="space-y-3">
        {demandasFiltradas.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Nenhuma solicitação pendente no momento.
          </p>
        ) : (
          demandasFiltradas.map((d) => (
            <div
              key={d.id}
              className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 text-xs space-y-1 hover:border-slate-300 transition-colors"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-slate-900">{d.alunoNome}</span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                    d.prioridade === 'Alta'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : d.prioridade === 'Média'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {d.prioridade}
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                {d.procedimentoDesejado}
              </p>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 font-mono">
                <span>Solicitado em: {d.dataSolicitacao}</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {d.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
