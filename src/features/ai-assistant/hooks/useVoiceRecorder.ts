import { useCallback, useEffect, useRef, useState } from 'react';

const CANDIDATOS_MIME = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function selecionarMimeSuportado(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const mime of CANDIDATOS_MIME) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export function formatarCronometro(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

export function dataHojeLocalIso(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function useVoiceRecorder() {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const canceladoRef = useRef(false);

  const suportado =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== 'undefined';

  const liberarRecursos = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => liberarRecursos();
  }, [liberarRecursos]);

  const iniciar = useCallback(async () => {
    setErro(null);
    if (!suportado) {
      setErro('Gravação de áudio não suportada neste navegador.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = selecionarMimeSuportado();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      canceladoRef.current = false;

      recorder.ondataavailable = (evento) => {
        if (evento.data && evento.data.size > 0) {
          chunksRef.current.push(evento.data);
        }
      };

      recorder.start(250);
      setGravando(true);
      setSegundos(0);
      timerRef.current = window.setInterval(() => {
        setSegundos((prev) => prev + 1);
      }, 1000);
      return true;
    } catch (err) {
      liberarRecursos();
      setGravando(false);
      const nome = err instanceof Error ? err.name : '';
      if (nome === 'NotAllowedError' || nome === 'PermissionDeniedError') {
        setErro('Permissão do microfone negada. Libere o acesso no navegador.');
      } else if (nome === 'NotFoundError') {
        setErro('Nenhum microfone conectado neste dispositivo.');
      } else {
        setErro('Não foi possível iniciar o microfone.');
      }
      return false;
    }
  }, [liberarRecursos, suportado]);

  const parar = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setGravando(false);
        liberarRecursos();
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const foiCancelado = canceladoRef.current;
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mime });
        chunksRef.current = [];
        setGravando(false);
        setSegundos(0);
        liberarRecursos();
        if (foiCancelado || blob.size < 400) {
          if (!foiCancelado) {
            setErro('Áudio muito curto. Fale por pelo menos 1 segundo.');
          }
          resolve(null);
          return;
        }
        resolve(blob);
      };

      recorder.stop();
    });
  }, [liberarRecursos]);

  const cancelar = useCallback(() => {
    canceladoRef.current = true;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    } else {
      setGravando(false);
      setSegundos(0);
      liberarRecursos();
    }
    setErro(null);
  }, [liberarRecursos]);

  return {
    gravando,
    segundos,
    erro,
    suportado,
    iniciar,
    parar,
    cancelar,
    limparErro: () => setErro(null),
  };
}
