import { useState, type FormEvent } from 'react';
import { useClinic, type Agendamento } from '../../clinic/context/ClinicContext';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
} from '../../../components/icons/CorporateIcons';

interface RegistrarFaltaModalProps {
  agendamento: Agendamento;
  onClose: () => void;
}

/** `17/10/2026`, ou `—` quando a sessão é anterior à coluna de data. */
function rotuloData(iso?: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return '—';
  return `${dia}/${mes}/${ano}`;
}

/**
 * Captura o motivo no mesmo ato em que a recepção registra a falta.
 *
 * O motivo é opcional: falta sem justificativa continua sendo falta. O campo
 * fica separado de `observacaoLogistica` para não apagar a nota logística que
 * já existia na sessão.
 */
export function RegistrarFaltaModal({
  agendamento,
  onClose,
}: RegistrarFaltaModalProps) {
  const { atualizarStatusAgendamento } = useClinic();
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const confirmar = async (e: FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    setErro('');

    const res = await atualizarStatusAgendamento(
      agendamento.id,
      'FALTOU',
      motivo
    );
    setSalvando(false);

    if (!res.success) {
      setErro(res.message);
      return;
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-registrar-falta"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex justify-between items-start gap-4 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-700 flex items-center justify-center shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="titulo-registrar-falta"
                className="text-lg font-bold text-slate-900"
              >
                Registrar falta
              </h2>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {agendamento.pacienteNome}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-1">
                {rotuloData(agendamento.dataSessao)} · {agendamento.horario} ·{' '}
                {agendamento.salaOuCadeira}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
            aria-label="Fechar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={confirmar}>
          <label
            htmlFor="motivo-falta"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Motivo da falta{' '}
            <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            id="motivo-falta"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Ex.: paciente avisou que não poderia comparecer por motivo de trabalho."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-slate-900 resize-none"
          />
          <div className="flex items-start justify-between gap-3 mt-1.5">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              O motivo aparece para o estagiário responsável em “Meus
              Agendamentos”.
            </p>
            <span className="text-[10px] text-slate-400 font-mono shrink-0">
              {motivo.length}/500
            </span>
          </div>

          {erro && (
            <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 text-xs font-bold bg-red-700 hover:bg-red-800 text-white rounded-xl shadow-xs disabled:opacity-50"
            >
              {salvando ? 'Registrando...' : 'Registrar falta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
