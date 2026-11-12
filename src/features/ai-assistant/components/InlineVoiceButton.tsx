import { useState } from 'react';
import { api } from '../../../services/api';
import {
  MicrophoneIcon,
  StopIcon,
  XMarkIcon,
} from '../../../components/icons/CorporateIcons';
import { formatarCronometro, useVoiceRecorder } from '../hooks/useVoiceRecorder';

interface InlineVoiceButtonProps {
  curso: 'psicologia' | 'odontologia';
  campoAlvo: string;
  pacienteId?: number;
  disabled?: boolean;
  label?: string;
  onTranscribed: (texto: string) => void;
}

export function InlineVoiceButton({
  curso,
  campoAlvo,
  pacienteId,
  disabled = false,
  label = 'Ditar com IA',
  onTranscribed,
}: InlineVoiceButtonProps) {
  const { gravando, segundos, erro, suportado, iniciar, parar, cancelar, limparErro } =
    useVoiceRecorder();
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [erroApi, setErroApi] = useState<string | null>(null);

  if (!suportado || disabled) return null;

  const lidarClique = async () => {
    setErroApi(null);
    limparErro();

    if (!gravando) {
      await iniciar();
      return;
    }

    const blob = await parar();
    if (!blob) return;

    setTranscrevendo(true);
    try {
      const res = await api.transcreverAudioIA({
        curso,
        campoAlvo,
        audioBlob: blob,
        pacienteId,
      });
      if (res.texto.trim()) {
        onTranscribed(res.texto.trim());
      }
    } catch (err) {
      setErroApi(
        err instanceof Error ? err.message : 'Falha ao transcrever o áudio.'
      );
    } finally {
      setTranscrevendo(false);
    }
  };

  const estiloCor = gravando
    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 animate-pulse'
    : curso === 'odontologia'
      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-700'
      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 dark:text-blue-200 dark:border-blue-700';

  const mensagemErro = erroApi || erro;

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={transcrevendo}
          onClick={() => void lidarClique()}
          title={
            gravando
              ? 'Clique para finalizar e inserir texto'
              : 'Gravar áudio e converter em texto clínico'
          }
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all shadow-2xs disabled:opacity-60 disabled:cursor-wait ${estiloCor}`}
        >
          {gravando ? (
            <>
              <StopIcon className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">
                Parar ({formatarCronometro(segundos)})
              </span>
            </>
          ) : (
            <>
              <MicrophoneIcon className="w-3.5 h-3.5" />
              <span>{transcrevendo ? 'Transcrevendo…' : label}</span>
            </>
          )}
        </button>

        {gravando && (
          <button
            type="button"
            onClick={cancelar}
            title="Cancelar gravação"
            aria-label="Cancelar gravação"
            className="p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-800"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {mensagemErro && (
        <span className="text-[10px] font-medium text-rose-700 dark:text-rose-300 max-w-[240px] text-right">
          {mensagemErro}
        </span>
      )}
    </div>
  );
}
