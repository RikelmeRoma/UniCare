import type { Paciente } from '../../clinic/context/ClinicContext';
import { carregarRascunho } from '../anamnese/estado';
import { CAMPO, ROTULO } from '../anamnese/estilos';
import { SectionCard } from '../anamnese/FormularioBase';

interface TreatmentPlanTabProps {
  paciente?: Paciente;
}

export function TreatmentPlanTab({ paciente }: TreatmentPlanTabProps) {
  if (!paciente) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-xs font-semibold text-amber-900">
        Nenhum paciente odontológico selecionado.
      </div>
    );
  }

  const planejamentos = (
    carregarRascunho(paciente.id)?.exameDental.planejamento ?? []
  )
    .map((texto, indice) => ({ texto, indice }))
    .filter(({ texto }) => texto.trim() !== '');

  return (
    <div className="space-y-6 font-sans">
      <SectionCard numero={2} titulo="Tratamento Programado">
        {planejamentos.length === 0 ? (
          <p className="text-[11px] leading-relaxed text-slate-400">
            Nenhum planejamento registrado. Adicione na aba Anamnese (CLI-FOR-45), em
            Tratamento Programado.
          </p>
        ) : (
          planejamentos.map(({ texto, indice }) => (
            <div key={indice}>
              <span className={ROTULO}>Planejamento {indice + 1}</span>
              <textarea
                readOnly
                rows={3}
                value={texto}
                aria-label={`Planejamento ${indice + 1}`}
                className={`${CAMPO} resize-y leading-relaxed`}
              />
            </div>
          ))
        )}

        <p className="text-[10px] leading-relaxed text-slate-400">
          Espelho somente leitura do rascunho local da Anamnese (CLI-FOR-45). Para
          adicionar ou editar, use a aba Anamnese.
        </p>
      </SectionCard>
    </div>
  );
}
