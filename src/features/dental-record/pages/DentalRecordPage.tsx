import { useEffect, useState } from 'react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { PatientHeader } from '../components/PatientHeader';
import OdontogramApp from '../components/OdontogramaViewer';
import Periograma from '../components/PeriogramaViewer';
import { DentalEvolutionTab } from '../components/DentalEvolutionTab';
import { TreatmentPlanTab } from '../components/TreatmentPlanTab';
import { DentalRadiologyTab } from '../components/DentalRadiologyTab';
import { AnamneseCliFor45Tab } from '../anamnese/AnamneseCliFor45Tab';
import { IndicesGengivaisCard } from '../indices/IndicesGengivaisCard';
import { DentalAlertsTab } from '../components/DentalAlertsTab';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
} from '../../../components/icons/CorporateIcons';

export function DentalRecordPage() {
  const { pacientes, anamnesesPorPaciente, carregarAnamneses } = useClinic();
  const pacientesOdonto = pacientes.filter(
    (p) => p.curso === 'odontologia' || p.curso === 'ambos'
  );

  // Mesmo caso do prontuário psicológico: `|| 2` era id fixo e o <select> ficava
  // sem opção correspondente até a lista real chegar.
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(
    undefined
  );
  const pacienteSelecionado =
    pacientesOdonto.find((p) => p.id === selectedPatientId) || pacientesOdonto[0];

  const [activeTab, setActiveTab] = useState<
    'anamnese' | 'alertas' | 'odontograma' | 'evolucao' | 'tratamento' | 'exames'
  >('anamnese');

  // A anamnese é por paciente: troca de paciente precisa recarregar o histórico.
  useEffect(() => {
    if (pacienteSelecionado?.id) {
      void carregarAnamneses(pacienteSelecionado.id);
    }
  }, [pacienteSelecionado?.id, carregarAnamneses]);

  const anamneses = pacienteSelecionado?.id ? (anamnesesPorPaciente[pacienteSelecionado.id] ?? []) : [];
  // O backend devolve do mais recente para o mais antigo.
  const ultima = anamneses[0];

  return (
    <AppLayout
      title="Ficha Clínica Odontológica"
      subtitle="Prontuário odontológico, mapeamento anatômico 2D, periograma, evolução clínica e plano de tratamento"
      badge="Supervisão Clínica CFO"
      badgeType="emerald"
      actions={
        <div className="w-64 sm:w-72">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Paciente da Clínica
          </label>
          <select
            value={pacienteSelecionado?.id ?? ''}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-800 focus:outline-none"
          >
            {pacientesOdonto.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.cpf})
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <PatientHeader paciente={pacienteSelecionado} />

        {/* Menu de Abas Segmentadas */}
        <div className="bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('anamnese')}
            className={`flex-1 whitespace-nowrap py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'anamnese'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ClipboardDocumentCheckIcon className="w-4 h-4" />
            <span>Anamnese</span>
          </button>

          <button
            onClick={() => setActiveTab('alertas')}
            className={`flex-1 whitespace-nowrap py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'alertas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span>Alertas Clínicos & Alergias</span>
          </button>

          <button
            onClick={() => setActiveTab('odontograma')}
            className={`flex-1 whitespace-nowrap py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'odontograma'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Odontograma 2D & Periograma</span>
          </button>

          <button
            onClick={() => setActiveTab('evolucao')}
            className={`flex-1 whitespace-nowrap py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'evolucao'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Evolução Clínica Diária</span>
          </button>

          <button
            onClick={() => setActiveTab('tratamento')}
            className={`flex-1 whitespace-nowrap py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'tratamento'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ClipboardDocumentCheckIcon className="w-4 h-4" />
            <span>Plano de Tratamento</span>
          </button>

          <button
            onClick={() => setActiveTab('exames')}
            className={`flex-1 whitespace-nowrap py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'exames'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PhotoIcon className="w-4 h-4" />
            <span>Radiografias & Exames</span>
          </button>
        </div>

        {/* Conteúdo Renderizado Condicionalmente */}
        {activeTab === 'anamnese' && (
          <AnamneseCliFor45Tab
            key={pacienteSelecionado?.id ?? 'sem-paciente'}
            paciente={pacienteSelecionado}
          />
        )}

        {activeTab === 'alertas' && (
          <DentalAlertsTab
            key={pacienteSelecionado?.id ?? 'sem-paciente'}
            paciente={pacienteSelecionado}
            ultima={ultima}
          />
        )}

        {activeTab === 'odontograma' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <OdontogramApp />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <Periograma />
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <IndicesGengivaisCard
                key={pacienteSelecionado?.id ?? 'sem-paciente'}
                pacienteId={pacienteSelecionado?.id}
              />
            </div>
          </div>
        )}

        {activeTab === 'evolucao' && (
          <DentalEvolutionTab
            key={pacienteSelecionado?.id ?? 'sem-paciente'}
            paciente={pacienteSelecionado}
          />
        )}

        {activeTab === 'tratamento' && (
          <TreatmentPlanTab
            key={pacienteSelecionado?.id ?? 'sem-paciente'}
            paciente={pacienteSelecionado}
          />
        )}

{activeTab === 'exames' && <DentalRadiologyTab />}
      </div>
    </AppLayout>
  );
}