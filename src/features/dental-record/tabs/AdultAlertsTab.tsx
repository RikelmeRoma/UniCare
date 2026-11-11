import { useState } from 'react';
import type { Anamnese, Paciente } from '../../clinic/context/ClinicContext';
import type { AnamneseCliFor45, Afericao } from '../anamnese/tipos';
import { AnamneseModal } from '../components/AnamneseModal';
import {
  ExclamationTriangleIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
} from '../../../components/icons/CorporateIcons';

interface AdultAlertsTabProps {
  paciente?: Paciente;
  ultima?: Anamnese;
  dados: AnamneseCliFor45;
  onIrParaExame: () => void;
}

const mostrar = (valor?: string) => (valor && valor.trim() !== '' ? valor : '—');

function formatarDataAfericao(dia: string) {
  if (!dia) return 'Data não informada';
  const parsed = new Date(`${dia}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? dia
    : parsed.toLocaleDateString('pt-BR');
}

function afericaoPreenchida(afericao: Afericao) {
  return [
    afericao.sistolica,
    afericao.diastolica,
    afericao.fc,
    afericao.fr,
    afericao.temperatura,
    afericao.dia,
  ].some((valor) => valor.trim() !== '');
}

export function AdultAlertsTab({
  paciente,
  ultima,
  dados,
  onIrParaExame,
}: AdultAlertsTabProps) {
  const [showAnamnese, setShowAnamnese] = useState(false);

  if (!paciente) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-6 text-xs font-semibold text-amber-900 dark:text-amber-300">
        Nenhum paciente odontológico selecionado.
      </div>
    );
  }

  const afericoes = dados.exameFisico.afericoes.filter(afericaoPreenchida);
  const ultimaAfericao = afericoes[afericoes.length - 1];
  const pressao =
    ultimaAfericao && (ultimaAfericao.sistolica || ultimaAfericao.diastolica)
      ? `${mostrar(ultimaAfericao.sistolica)} x ${mostrar(ultimaAfericao.diastolica)} mmHg`
      : 'Não registrado';

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E1729] p-5 shadow-xs transition-colors">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>Alertas Clínicos & Alergias</span>
            </h3>
            <button
              type="button"
              onClick={() => setShowAnamnese(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white"
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
              Atualizar anamnese
            </button>
          </div>
          <ul className="space-y-2 text-xs">
            {ultima?.alergias && (
              <li className="rounded-xl border border-red-200/80 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 font-medium text-red-800 dark:text-red-300">
                <strong>Alergia:</strong> {ultima.alergias}
              </li>
            )}
            {ultima?.condicoesCronicas && (
              <li className="rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3 font-medium text-amber-800 dark:text-amber-300">
                <strong>Condições crônicas:</strong> {ultima.condicoesCronicas}
              </li>
            )}
            {ultima?.medicacoesEmUso && (
              <li className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3 font-medium text-slate-800 dark:text-slate-200">
                <strong>Medicações em uso:</strong> {ultima.medicacoesEmUso}
              </li>
            )}
            {!ultima?.alergias &&
              !ultima?.condicoesCronicas &&
              !ultima?.medicacoesEmUso && (
                <li className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-3 font-medium text-slate-500 dark:text-slate-400">
                  Anamnese sem alertas registrados.
                </li>
              )}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E1729] p-5 shadow-xs transition-colors">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              <ShieldCheckIcon className="h-4 w-4 text-slate-900 dark:text-slate-200" />
              <span>Sinais Vitais da Sessão</span>
            </h3>
            <span className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Na ficha
            </span>
          </div>

          {ultimaAfericao ? (
            <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Pressão Arterial (P.A.)</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {pressao}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Frequência Cardíaca</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {mostrar(ultimaAfericao.fc)}
                  {ultimaAfericao.fc ? ' bpm' : ''}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Frequência Respiratória</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {mostrar(ultimaAfericao.fr)}
                  {ultimaAfericao.fr ? ' rpm' : ''}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-slate-500 dark:text-slate-400">Temperatura</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {mostrar(ultimaAfericao.temperatura)}
                  {ultimaAfericao.temperatura ? ' °C' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Dia</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {formatarDataAfericao(ultimaAfericao.dia)}
                </span>
              </div>

              {afericoes.length > 1 && (
                <p className="pt-1 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {afericoes.length} aferições nesta sessão
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/60 px-4 py-6 text-center">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Nenhuma aferição registrada na sessão
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                As linhas do Exame Clínico aparecem aqui.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onIrParaExame}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-700 py-2 text-[11px] font-bold text-white transition-colors hover:bg-slate-800 dark:hover:bg-slate-600"
          >
            Editar no Exame Clínico
          </button>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
            A aferição faz parte da ficha clínica e é editada na aba Exame Clínico.
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 p-4 text-xs text-slate-800 dark:text-slate-200 lg:col-span-2">
          <p className="font-bold text-slate-900 dark:text-white">Diretriz Regulamentar CFO:</p>
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            Atendimento em cadeira clínica conduzido obrigatoriamente por dupla sob
            supervisão contínua da docente responsável.
          </p>
        </div>
      </div>

      {showAnamnese && (
        <AnamneseModal
          pacienteId={paciente.id}
          anamnese={ultima}
          onClose={() => setShowAnamnese(false)}
        />
      )}
    </div>
  );
}
