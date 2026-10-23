import { useEffect, useRef, useState } from 'react';
import type { Paciente } from '../../clinic/context/ClinicContext';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
} from '../../../components/icons/CorporateIcons';
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
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <DocumentTextIcon className="h-4 w-4" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900">
                    Anamnese e Exame Físico — Adulto e Idoso
                  </h2>
                  <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-900">
                    CLI-FOR-45
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {paciente.nome} • CPF {paciente.cpf} •{' '}
                  {idadeCalculada ? `${idadeCalculada} anos` : 'idade não informada'}
                </p>
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-[11px] leading-relaxed text-slate-500">
              Ficha completa conforme o instrumento físico. Nesta fase o preenchimento fica
              <strong className="text-slate-700"> apenas neste navegador</strong> (sessionStorage)
              e pode ser exportado em JSON; nada é enviado ao servidor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={salvar}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-slate-800"
            >
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Salvar rascunho
            </button>
            <button
              type="button"
              onClick={exportar}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <DocumentTextIcon className="h-3.5 w-3.5" />
              Exportar JSON
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoLimpeza(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-500 transition-colors hover:border-rose-300 hover:text-rose-900"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Limpar
            </button>
          </div>
        </div>

        {confirmandoLimpeza && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-semibold text-rose-900">
              Limpar todos os campos deste rascunho? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoLimpeza(false)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={limpar}
                className="rounded-lg bg-rose-900 px-3 py-1.5 text-[11px] font-bold text-white"
              >
                Sim, limpar
              </button>
            </div>
          </div>
        )}

        {mensagem && (
          <div
            role="status"
            aria-live="polite"
            className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
              mensagem.tipo === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <InformationCircleIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{mensagem.texto}</span>
          </div>
        )}
      </div>

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
  );
}
