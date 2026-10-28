import type { ReactNode } from 'react';
import type { Paciente } from '../../clinic/context/ClinicContext';
import {
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon,
  TrashIcon,
} from '../../../components/icons/CorporateIcons';

interface AnamneseHeaderProps {
  titulo: string;
  selo: string;
  paciente?: Paciente;
  idade?: string;
  descricao: ReactNode;
  conteudoOculto: boolean;
  idConteudo: string;
  onAlternarConteudo: () => void;
  mostrarAlternar?: boolean;
  rotuloAlternar?: string;
  onSalvar: () => void;
  onExportar: () => void;
  onLimpar: () => void;
  confirmandoLimpeza: boolean;
  onCancelarLimpeza: () => void;
  onConfirmarLimpeza: () => void;
  mensagem: { tipo: 'ok' | 'alerta'; texto: string } | null;
}

export function AnamneseHeader({
  titulo,
  selo,
  paciente,
  idade,
  descricao,
  conteudoOculto,
  idConteudo,
  onAlternarConteudo,
  mostrarAlternar = true,
  rotuloAlternar,
  onSalvar,
  onExportar,
  onLimpar,
  confirmandoLimpeza,
  onCancelarLimpeza,
  onConfirmarLimpeza,
  mensagem,
}: AnamneseHeaderProps) {
  return (
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
                  {titulo}
                </h2>
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-900">
                  {selo}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {paciente?.nome ?? 'Paciente não selecionado'} • CPF{' '}
                {paciente?.cpf ?? 'não informado'} •{' '}
                {idade ? `${idade} anos` : 'idade não informada'}
              </p>
            </div>
          </div>

          <div className="mt-3 max-w-2xl text-[11px] leading-relaxed text-slate-500">
            {descricao}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {mostrarAlternar && (
            <button
              type="button"
              onClick={onAlternarConteudo}
              aria-expanded={!conteudoOculto}
              aria-controls={idConteudo}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              {conteudoOculto ? (
                <EyeIcon className="h-3.5 w-3.5" />
              ) : (
                <EyeSlashIcon className="h-3.5 w-3.5" />
              )}
              {conteudoOculto
                ? `Mostrar ${rotuloAlternar ?? 'ficha'}`
                : `Ocultar ${rotuloAlternar ?? 'ficha'}`}
            </button>
          )}
          <button
            type="button"
            onClick={onSalvar}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-slate-800"
          >
            <CheckCircleIcon className="h-3.5 w-3.5" />
            Salvar progresso
          </button>
          <button
            type="button"
            onClick={onExportar}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[11px] font-bold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            <DocumentTextIcon className="h-3.5 w-3.5" />
            Baixar cópia
          </button>
          <button
            type="button"
            onClick={onLimpar}
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
            Limpar todos os campos desta ficha? Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancelarLimpeza}
              className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-bold text-rose-900"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmarLimpeza}
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
  );
}
