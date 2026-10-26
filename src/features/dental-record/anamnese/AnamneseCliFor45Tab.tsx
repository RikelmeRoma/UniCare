import { useEffect, useRef, useState } from 'react';
import type { Paciente } from '../../clinic/context/ClinicContext';
import { ExclamationTriangleIcon } from '../../../components/icons/CorporateIcons';
import { AnamneseHeader } from './AnamneseHeader';
import {
  criarAnamneseVazia,
  carregarRascunho,
  salvarRascunho,
  removerRascunho,
  exportarJson,
  calcularIdade,
} from './estado';
import type { AnamneseCliFor45 } from './tipos';
import { Pagina1IdentificacaoHistoria } from './Pagina1IdentificacaoHistoria';
import { Pagina2ExameFisico } from './Pagina2ExameFisico';
import { Pagina3DentesPlano } from './Pagina3DentesPlano';

interface AnamneseCliFor45TabProps {
  paciente?: Paciente;
}

export function AnamneseCliFor45Tab({ paciente }: AnamneseCliFor45TabProps) {
  const [dados, setDados] = useState<AnamneseCliFor45>(() => {
    if (!paciente) return criarAnamneseVazia();
    return carregarRascunho(paciente.id) ?? criarAnamneseVazia(paciente);
  });
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'alerta'; texto: string } | null>(
    null
  );
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
      salvarRascunho(paciente.id, dados);
    }
  }, [paciente?.id, dados]);

  if (!paciente) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-xs font-semibold text-amber-900">
        <div className="mb-1 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>Nenhum paciente odontológico selecionado.</span>
        </div>
        <p className="font-medium text-amber-800">
          Selecione um paciente no topo da página para iniciar a ficha CLI-FOR-45.
        </p>
      </div>
    );
  }

  const salvar = () => {
    const salvo = salvarRascunho(paciente.id, dados);
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

  const exportar = () => {
    exportarJson(paciente, dados);
    setMensagem({
      tipo: 'ok',
      texto: 'Arquivo JSON exportado. O rascunho continua salvo neste navegador.',
    });
  };

  const limpar = () => {
    pularAutosave.current = true;
    removerRascunho(paciente.id);
    setDados(criarAnamneseVazia(paciente));
    setConfirmandoLimpeza(false);
    setMensagem({
      tipo: 'alerta',
      texto: 'Todos os campos foram limpos. O rascunho anterior foi descartado.',
    });
  };

  const idadeCalculada = calcularIdade(dados.identificacao.dataNascimento);

  return (
    <div className="space-y-4 font-sans">
      <AnamneseHeader
        titulo="Anamnese e Exame Físico — Adulto e Idoso"
        selo="CLI-FOR-45"
        paciente={paciente}
        idade={idadeCalculada}
        idConteudo="anamnese-cli-for-45-conteudo"
        conteudoOculto={conteudoOculto}
        onAlternarConteudo={() => setConteudoOculto((oculto) => !oculto)}
        onSalvar={salvar}
        onExportar={exportar}
        onLimpar={() => setConfirmandoLimpeza(true)}
        confirmandoLimpeza={confirmandoLimpeza}
        onCancelarLimpeza={() => setConfirmandoLimpeza(false)}
        onConfirmarLimpeza={limpar}
        mensagem={mensagem}
        descricao={
          <>
            Ficha completa conforme o instrumento físico. Nesta fase o preenchimento fica
            <strong className="text-slate-700"> apenas neste navegador</strong>{' '}
            (sessionStorage) e pode ser exportado em JSON; nada é enviado ao servidor.
          </>
        }
      />

      <div
        id="anamnese-cli-for-45-conteudo"
        className={conteudoOculto ? 'hidden' : 'space-y-4'}
      >
        <Pagina1IdentificacaoHistoria
          identificacao={dados.identificacao}
          historiaMedica={dados.historiaMedica}
          historiaOdontologica={dados.historiaOdontologica}
          habitos={dados.habitos}
          declaracao={dados.declaracao}
          setDados={setDados}
        />

        <Pagina2ExameFisico exameFisico={dados.exameFisico} setDados={setDados} />

        <Pagina3DentesPlano exameDental={dados.exameDental} setDados={setDados} />

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-[10px] leading-relaxed text-slate-500">
          <p className="font-bold text-slate-700">Sobre esta ficha</p>
          <p className="mt-1">
            A CLI-FOR-45 convive com os registros já existentes no prontuário. As aferições
            de sinais vitais ficam neste navegador e aparecem tanto na Página 2 quanto na aba{' '}
            <strong>Alertas Clínicos & Alergias</strong>. O botão{' '}
            <strong>Atualizar anamnese</strong>, nessa aba, continua gravando alergias,
            condições crônicas e medicações no servidor. As linhas da Folha de Evolução também
            são rascunho local. As fichas PDR-05 existentes permanecem no servidor para a
            supervisão e a homologação; esta ficha inteira só vai ao servidor quando o modelo
            de dados do backend for definido.
          </p>
        </div>
      </div>
    </div>
  );
}
