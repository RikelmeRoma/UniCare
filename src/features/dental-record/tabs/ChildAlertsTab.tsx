import type { Paciente } from '../../clinic/context/ClinicContext';
import type { AnamneseInfantil } from '../anamnese-infantil/tipos';
import {
  ExclamationTriangleIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
} from '../../../components/icons/CorporateIcons';

interface ChildAlertsTabProps {
  paciente?: Paciente;
  dados: AnamneseInfantil;
  onIrParaAnamnese: () => void;
}

const mostrar = (valor?: string) => (valor && valor.trim() !== '' ? valor : '—');

export function ChildAlertsTab({
  paciente,
  dados,
  onIrParaAnamnese,
}: ChildAlertsTabProps) {
  if (!paciente) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-xs font-semibold text-amber-900">
        Nenhum paciente odontológico selecionado.
      </div>
    );
  }

  const saude = dados.posNatalSaude;
  const alergia =
    saude.alergia === 'sim'
      ? saude.alergiaQuais || 'Sim'
      : saude.alergia === 'nao'
        ? 'Nega alergias'
        : 'Não informado';
  const medicacao =
    saude.medicacao === 'sim'
      ? saude.medicacaoQual || 'Sim'
      : saude.medicacao === 'nao'
        ? 'Nega uso de medicação'
        : 'Não informado';
  const doencas =
    saude.doencasInfancia.length > 0
      ? saude.doencasInfancia.join(', ')
      : 'Não informadas';
  const hospitalizacao =
    saude.hospitalizado === 'sim'
      ? [saude.hospitalizadoMotivo, saude.hospitalizadoData]
          .filter(Boolean)
          .join(' — ') || 'Sim'
      : saude.hospitalizado === 'nao'
        ? 'Nega hospitalização'
        : 'Não informado';

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
              <span>Alertas Clínicos & Alergias</span>
            </h3>
            <button
              type="button"
              onClick={onIrParaAnamnese}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <PencilSquareIcon className="h-3.5 w-3.5" />
              Editar na Anamnese
            </button>
          </div>

          <ul className="space-y-2 text-xs">
            <li
              className={`rounded-xl border p-3 font-medium ${
                saude.alergia === 'sim'
                  ? 'border-red-200/80 bg-red-50 text-red-800'
                  : 'border-slate-200/80 bg-slate-50 text-slate-700'
              }`}
            >
              <strong>Alergia:</strong> {alergia}
            </li>
            <li className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 font-medium text-slate-800">
              <strong>Medicação em uso:</strong> {medicacao}
            </li>
            <li className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 font-medium text-slate-800">
              <strong>Doenças da infância:</strong> {doencas}
            </li>
            <li className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 font-medium text-slate-800">
              <strong>Hospitalização:</strong> {hospitalizacao}
            </li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-900">
              <ShieldCheckIcon className="h-4 w-4 text-slate-900" />
              <span>Saúde Geral</span>
            </h3>
            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-900">
              Rascunho local
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Estado de saúde</span>
              <span className="text-right font-bold text-slate-900">
                {mostrar(saude.estadoSaude)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
              <span className="text-slate-500">Último exame médico</span>
              <span className="text-right font-bold text-slate-900">
                {mostrar(saude.ultimoExame)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Tratamento médico</span>
              <span className="text-right font-bold text-slate-900">
                {mostrar(saude.tratamentoMedico)}
              </span>
            </div>
          </div>

          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-500">
            A ficha infantil não registra sinais vitais nesta etapa. As informações
            acima são editadas na aba Anamnese.
          </p>
        </div>

        <div className="space-y-1 rounded-2xl border border-slate-200 bg-slate-100 p-4 text-xs text-slate-800 lg:col-span-2">
          <p className="font-bold text-slate-900">Diretriz Regulamentar CFO:</p>
          <p className="text-[11px] leading-relaxed text-slate-600">
            Atendimento em cadeira clínica conduzido obrigatoriamente por dupla sob
            supervisão contínua da docente responsável.
          </p>
        </div>
      </div>
    </div>
  );
}
