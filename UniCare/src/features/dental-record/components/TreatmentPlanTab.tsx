import { useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  ClipboardDocumentCheckIcon,
  PlusIcon,
  XMarkIcon,
} from '../../../components/icons/CorporateIcons';

export function TreatmentPlanTab() {
  const { planosTratamento } = useClinic();
  const [itens, setItens] = useState(planosTratamento);
  const [showNovo, setShowNovo] = useState(false);

  const [prioridade, setPrioridade] = useState<'Urgência' | 'Fase 1 - Restauradora' | 'Fase 2 - Periodontal' | 'Fase 3 - Manutenção'>('Fase 1 - Restauradora');
  const [denteRegiao, setDenteRegiao] = useState('');
  const [procedimento, setProcedimento] = useState('');

  const handleSalvarItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!denteRegiao.trim() || !procedimento.trim()) return;

    setItens([
      ...itens,
      {
        id: Date.now(),
        prioridade,
        denteRegiao,
        procedimento,
        status: 'Planejado',
        estagiarioResponsavel: 'Augusto Cesar Farias',
      },
    ]);

    setDenteRegiao('');
    setProcedimento('');
    setShowNovo(false);
  };

  const getPriorityBadge = (p: string) => {
    if (p.includes('Urgência')) {
      return <span className="bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded-md text-[10px] border border-red-200">1. Urgência Máxima</span>;
    }
    if (p.includes('Restauradora')) {
      return <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded-md text-[10px] border border-blue-200">2. Dentística / Restauração</span>;
    }
    if (p.includes('Periodontal')) {
      return <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-md text-[10px] border border-amber-200">3. Periodontia</span>;
    }
    return <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-md text-[10px]">4. Manutenção</span>;
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-4 h-4 text-emerald-800" />
            <span>Plano de Tratamento Hierarquizado (Do mais urgente ao mais simples)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Estrutura obrigatória validada pela coordenação do curso de Odontologia (Profa. Dra. Bianca Nubia)
          </p>
        </div>
        <button
          onClick={() => setShowNovo(!showNovo)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
        >
          {showNovo ? <XMarkIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
          <span>{showNovo ? 'Fechar' : 'Adicionar Procedimento'}</span>
        </button>
      </div>

      {showNovo && (
        <form onSubmit={handleSalvarItem} className="bg-white p-5 rounded-2xl border border-emerald-500/50 shadow-sm space-y-3 text-xs ring-1 ring-emerald-500/20">
          <div className="font-bold text-slate-900 text-xs mb-1">Novo Procedimento no Plano:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Hierarquia de Urgência *</label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as unknown as typeof prioridade)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white"
              >
                <option value="Urgência">1. Urgência / Dor</option>
                <option value="Fase 1 - Restauradora">2. Fase 1 - Restauradora</option>
                <option value="Fase 2 - Periodontal">3. Fase 2 - Periodontal</option>
                <option value="Fase 3 - Manutenção">4. Fase 3 - Manutenção / Profilaxia</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Dente / Região *</label>
              <input
                type="text"
                required
                value={denteRegiao}
                onChange={(e) => setDenteRegiao(e.target.value)}
                placeholder="Ex: Dente 24 ou Geral"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Procedimento Planejado *</label>
              <input
                type="text"
                required
                value={procedimento}
                onChange={(e) => setProcedimento(e.target.value)}
                placeholder="Ex: Tratamento de canal ou coroa"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowNovo(false)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition-colors"
            >
              Inserir no Plano
            </button>
          </div>
        </form>
      )}

      {/* Tabela de Procedimentos do Plano */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200 text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Prioridade / Fase</th>
              <th className="py-3.5 px-4">Dente / Região</th>
              <th className="py-3.5 px-4">Procedimento</th>
              <th className="py-3.5 px-4">Responsável</th>
              <th className="py-3.5 px-4">Status de Execução</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {itens.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4">{getPriorityBadge(item.prioridade)}</td>
                <td className="py-3.5 px-4 font-bold text-slate-900 font-mono">{item.denteRegiao}</td>
                <td className="py-3.5 px-4 text-slate-700 font-medium">{item.procedimento}</td>
                <td className="py-3.5 px-4 text-slate-500">{item.estagiarioResponsavel}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      item.status === 'Concluído'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'Em Andamento'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
