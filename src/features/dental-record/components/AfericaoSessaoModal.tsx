import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Paciente } from '../../clinic/context/ClinicContext';
import { adicionarAfericaoRascunho } from '../anamnese/estado';
import { ShieldCheckIcon, XMarkIcon } from '../../../components/icons/CorporateIcons';

interface AfericaoSessaoModalProps {
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

export function AfericaoSessaoModal({
  paciente,
  onClose,
  onSalvo,
}: AfericaoSessaoModalProps) {
  const [sistolica, setSistolica] = useState('');
  const [diastolica, setDiastolica] = useState('');
  const [fc, setFc] = useState('');
  const [fr, setFr] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [dia, setDia] = useState(hojeLocal);
  const [erro, setErro] = useState('');

  const handleSalvar = (e: FormEvent) => {
    e.preventDefault();

    const sinaisVitais = [sistolica, diastolica, fc, fr, temperatura].some(
      (valor) => valor.trim() !== ''
    );
    if (!sinaisVitais) {
      setErro('Preencha ao menos um sinal vital.');
      return;
    }

    const resultado = adicionarAfericaoRascunho(paciente, {
      sistolica: sistolica.trim(),
      diastolica: diastolica.trim(),
      fc: fc.trim(),
      fr: fr.trim(),
      temperatura: temperatura.trim(),
      dia,
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
        aria-labelledby="afericao-sessao-titulo"
        className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              <ShieldCheckIcon className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="afericao-sessao-titulo"
                className="text-sm font-bold text-slate-900"
              >
                Registrar aferição
              </h3>
              <p className="text-[11px] text-slate-500">
                Sinais vitais da sessão (rascunho local)
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

        <div>
          <span className={ROTULO}>Pressão arterial (mmHg)</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={sistolica}
              onChange={(e) => setSistolica(e.target.value)}
              aria-label="Pressão arterial sistólica"
              placeholder="120"
              className={CAMPO}
            />
            <span className="text-xs font-bold text-slate-400">x</span>
            <input
              type="text"
              inputMode="numeric"
              value={diastolica}
              onChange={(e) => setDiastolica(e.target.value)}
              aria-label="Pressão arterial diastólica"
              placeholder="80"
              className={CAMPO}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="afericao-fc" className={ROTULO}>
              FC (bpm)
            </label>
            <input
              id="afericao-fc"
              type="text"
              inputMode="numeric"
              value={fc}
              onChange={(e) => setFc(e.target.value)}
              placeholder="72"
              className={CAMPO}
            />
          </div>
          <div>
            <label htmlFor="afericao-fr" className={ROTULO}>
              FR (rpm)
            </label>
            <input
              id="afericao-fr"
              type="text"
              inputMode="numeric"
              value={fr}
              onChange={(e) => setFr(e.target.value)}
              placeholder="16"
              className={CAMPO}
            />
          </div>
          <div>
            <label htmlFor="afericao-temperatura" className={ROTULO}>
              Temperatura (°C)
            </label>
            <input
              id="afericao-temperatura"
              type="text"
              inputMode="decimal"
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
              placeholder="36.4"
              className={CAMPO}
            />
          </div>
        </div>

        <div className="sm:max-w-[180px]">
          <label htmlFor="afericao-dia" className={ROTULO}>
            Dia
          </label>
          <input
            id="afericao-dia"
            type="date"
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            className={CAMPO}
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
            Salvar aferição
          </button>
        </div>
      </form>
    </div>
  );
}
