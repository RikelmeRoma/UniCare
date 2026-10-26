import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Paciente } from '../../clinic/context/ClinicContext';

interface UseDraftOptions<T> {
  paciente?: Paciente;
  criar: (paciente?: Paciente) => T;
  carregar: (pacienteId: number) => T | null;
  salvar: (pacienteId: number, dados: T) => boolean;
  remover: (pacienteId: number) => void;
}

export interface UseDraftResult<T> {
  dados: T;
  setDados: Dispatch<SetStateAction<T>>;
  mensagem: { tipo: 'ok' | 'alerta'; texto: string } | null;
  setMensagem: Dispatch<
    SetStateAction<{ tipo: 'ok' | 'alerta'; texto: string } | null>
  >;
  confirmandoLimpeza: boolean;
  setConfirmandoLimpeza: Dispatch<SetStateAction<boolean>>;
  conteudoOculto: boolean;
  setConteudoOculto: Dispatch<SetStateAction<boolean>>;
  salvarManual: () => void;
  limpar: () => void;
}

export function useDraft<T>({
  paciente,
  criar,
  carregar,
  salvar,
  remover,
}: UseDraftOptions<T>): UseDraftResult<T> {
  const [dados, setDados] = useState<T>(() => {
    if (!paciente) return criar();
    return carregar(paciente.id) ?? criar(paciente);
  });
  const [mensagem, setMensagem] = useState<{
    tipo: 'ok' | 'alerta';
    texto: string;
  } | null>(null);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const [conteudoOculto, setConteudoOculto] = useState(false);
  const pularAutosave = useRef(false);
  const dadosIniciais = useRef(dados);

  useEffect(() => {
    if (dados === dadosIniciais.current) return;
    if (pularAutosave.current) {
      pularAutosave.current = false;
      return;
    }
    if (paciente?.id) {
      salvar(paciente.id, dados);
    }
  }, [dados, paciente?.id, salvar]);

  const salvarManual = () => {
    if (!paciente?.id) {
      setMensagem({
        tipo: 'alerta',
        texto: 'Selecione um paciente antes de salvar o rascunho.',
      });
      return;
    }

    const salvo = salvar(paciente.id, dados);
    setMensagem(
      salvo
        ? { tipo: 'ok', texto: 'Rascunho salvo neste navegador.' }
        : {
            tipo: 'alerta',
            texto:
              'Não foi possível salvar neste navegador. O armazenamento pode estar cheio ou bloqueado.',
          }
    );
  };

  const limpar = () => {
    if (!paciente?.id) return;

    pularAutosave.current = true;
    remover(paciente.id);
    setDados(criar(paciente));
    setConfirmandoLimpeza(false);
    setMensagem({
      tipo: 'alerta',
      texto: 'Todos os campos foram limpos. O rascunho anterior foi descartado.',
    });
  };

  return {
    dados,
    setDados,
    mensagem,
    setMensagem,
    confirmandoLimpeza,
    setConfirmandoLimpeza,
    conteudoOculto,
    setConteudoOculto,
    salvarManual,
    limpar,
  };
}
