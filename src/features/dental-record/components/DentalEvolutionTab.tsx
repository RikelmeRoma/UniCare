import { useState } from 'react';
import type { Paciente } from '../../clinic/context/ClinicContext';
import { listarEvolucoesRascunho } from '../anamnese/estado';
import type { EvolucaoLinha } from '../anamnese/tipos';
import { EvolucaoFolhaModal } from './EvolucaoFolhaModal';
import {
  CheckCircleIcon,
  DocumentTextIcon,
  PlusIcon,
} from '../../../components/icons/CorporateIcons';

interface DentalEvolutionTabProps {
  paciente?: Paciente;
}

const formatarDataEvolucao = (data: string) => {
  if (!data) return 'Data não informada';
  const parsed = new Date(`${data}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? data : parsed.toLocaleDateString('pt-BR');
};

export function DentalEvolutionTab({ paciente }: DentalEvolutionTabProps) {
  const [showNovo, setShowNovo] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [evolucoes, setEvolucoes] = useState<EvolucaoLinha[]>(() =>
    paciente ? listarEvolucoesRascunho(paciente.id) : []
  );

  if (!paciente) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-xs font-semibold text-amber-900">
        Nenhum paciente odontológico selecionado.
      </div>
    );
  }

  const abrirModal = () => {
    setSucessoMsg('');
    setShowNovo(true);
  };

  const handleSalvo = () => {
    setEvolucoes(listarEvolucoesRascunho(paciente.id));
    setSucessoMsg('Evolução adicionada ao histórico local.');
  };

  return (
    <div className="space-y-6 font-sans">
      {sucessoMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-2xs">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
              <DocumentTextIcon className="h-4 w-4 text-slate-900" />
              <span>Histórico da Folha de Evolução (CLI-FOR-45)</span>
            </h4>
            <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              Registros salvos neste navegador (sessionStorage); ainda não são enviados
              ao servidor.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-900">
              Rascunho local
            </span>
            <button
              type="button"
              onClick={abrirModal}
              className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-slate-800"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              <span>Nova Evolução</span>
            </button>
          </div>
        </div>

        {evolucoes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
            <DocumentTextIcon className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-bold text-slate-700">
              Nenhuma evolução registrada
            </p>
            <p className="mt-1 text-xs text-slate-500">
              As linhas da Folha de Evolução aparecem aqui.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {evolucoes.map((linha, indice) => (
              <li
                key={`${linha.data}-${indice}`}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50/40 p-4 pl-5"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1 bg-slate-900"
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm font-bold text-slate-900">
                    {linha.intervencao}
                  </p>
                  <span className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-900">
                    {formatarDataEvolucao(linha.data)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Assinatura do docente:
                  </span>{' '}
                  {linha.assinaturaDocente || 'Não informada'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      {showNovo && (
        <EvolucaoFolhaModal
          paciente={paciente}
          onClose={() => setShowNovo(false)}
          onSalvo={handleSalvo}
        />
      )}
    </div>
  );
}
