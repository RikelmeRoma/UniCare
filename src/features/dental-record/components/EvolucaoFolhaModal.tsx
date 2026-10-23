import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Paciente } from '../../clinic/context/ClinicContext';
import { adicionarEvolucaoRascunho } from '../anamnese/estado';
import { DocumentTextIcon, XMarkIcon } from '../../../components/icons/CorporateIcons';

interface EvolucaoFolhaModalProps {
  paciente: Paciente;
  onClose: () => void;
  onSalvo: () => void;
}

function hojeLocal(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

const CAMPO =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 outline-none transition-colors focus:border-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-800/15';
const ROTULO = 'mb-1 block text-[11px] font-bold text-slate-700';

export function EvolucaoFolhaModal({
  paciente,
  onClose,
  onSalvo,
}: EvolucaoFolhaModalProps) {
  const [data, setData] = useState(hojeLocal);
  const [intervencao, setIntervencao] = useState('');
  const [assinatura, setAssinatura] = useState('');
  const [erro, setErro] = useState('');

  const handleSalvar = (e: FormEvent) => {
    e.preventDefault();

    const texto = intervencao.trim();
    if (!data) {
      setErro('Informe a data da evolução.');
      return;
    }
    if (!texto) {
      setErro('Descreva a intervenção realizada.');
      return;
    }

    const resultado = adicionarEvolucaoRascunho(paciente, {
      data,
      intervencao: texto,
      assinaturaDocente: assinatura.trim(),
    });

    if (!resultado.ok) {
      setErro(
        'Não foi possível salvar neste navegador. O armazenamento pode estar cheio ou bloqueado.'
      );
      return;
    }

    onSalvo();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <form
        onSubmit={handleSalvar}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="evolucao-folha-titulo"
        className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <DocumentTextIcon className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="evolucao-folha-titulo"
                className="text-sm font-bold text-slate-900"
              >
                Nova Evolução
              </h3>
              <p className="text-[11px] text-slate-500">
                Registrar na Folha de Evolução (CLI-FOR-45)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_minmax(0,1fr)]">
          <div>
            <label htmlFor="evolucao-data" className={ROTULO}>
              Data *
            </label>
            <input
              id="evolucao-data"
              type="date"
              required
              value={data}
              onChange={(e) => setData(e.target.value)}
              className={CAMPO}
            />
          </div>
          <div>
            <label htmlFor="evolucao-assinatura" className={ROTULO}>
              Assinatura do docente
            </label>
            <input
              id="evolucao-assinatura"
              type="text"
              value={assinatura}
              onChange={(e) => setAssinatura(e.target.value)}
              placeholder="Nome / carimbo do docente"
              className={CAMPO}
            />
          </div>
        </div>

        <div>
          <label htmlFor="evolucao-intervencao" className={ROTULO}>
            Intervenção *
          </label>
          <textarea
            id="evolucao-intervencao"
            required
            rows={4}
            autoFocus
            value={intervencao}
            onChange={(e) => setIntervencao(e.target.value)}
            placeholder="Descreva a intervenção realizada."
            className={`${CAMPO} resize-y leading-relaxed`}
          />
        </div>

        {erro && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-900"
          >
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-800"
          >
            Salvar evolução
          </button>
        </div>
      </form>
    </div>
  );
}
