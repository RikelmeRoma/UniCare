import { useState } from 'react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { PatientHeader } from '../components/PatientHeader';
import OdontogramApp from '../components/OdontogramaViewer';
import Periodograma from '../components/PeriodogramaViewer';
import { DentalEvolutionTab } from '../components/DentalEvolutionTab';
import { TreatmentPlanTab } from '../components/TreatmentPlanTab';
import { DentalRadiologyTab } from '../components/DentalRadiologyTab';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  PhotoIcon,
} from '../../../components/icons/CorporateIcons';

export function DentalRecordPage() {
  const { pacientes } = useClinic();
  const pacientesOdonto = pacientes.filter(
    (p) => p.curso === 'odontologia' || p.curso === 'ambos'
  );

  const [selectedPatientId, setSelectedPatientId] = useState<number>(
    pacientesOdonto[0]?.id || 2
  );
  const pacienteSelecionado =
    pacientesOdonto.find((p) => p.id === selectedPatientId) || pacientesOdonto[0];

  const [activeTab, setActiveTab] = useState<'anamnese' | 'evolucao' | 'tratamento' | 'exames'>('anamnese');


  return (
    <AppLayout
      title="Ficha Clínica Odontológica"
      subtitle="Prontuário odontológico, mapeamento anatômico 2D, periodograma, evolução clínica e plano de tratamento hierarquizado"
      badge="Supervisão Clínica CFO"
      badgeType="emerald"
      actions={
        <div className="w-64 sm:w-72">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Paciente da Clínica
          </label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
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
        <div className="bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs flex">
          <button
            onClick={() => setActiveTab('anamnese')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'anamnese'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Odontograma 2D & Periodograma</span>
          </button>

          <button
            onClick={() => setActiveTab('evolucao')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'evolucao'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Evolução Clínica Diária (PDR-05)</span>
          </button>

          <button
            onClick={() => setActiveTab('tratamento')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
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
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'exames'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PhotoIcon className="w-4 h-4" />
            <span>Radiografias & Exames (RF02)</span>
          </button>
        </div>

        {/* Conteúdo Renderizado Condicionalmente */}
        {activeTab === 'anamnese' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Coluna Esquerda: Alertas Clínicos & Sinais Vitais */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                  <span>Alertas Clínicos & Alergias</span>
                </h3>
                <ul className="space-y-2 text-xs">
                  <li className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200/80 font-medium">
                    <strong>Alergia Medicamentosa:</strong> Penicilina e derivados.
                  </li>
                  <li className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200/80 font-medium">
                    <strong>Hipertensão Arterial:</strong> Controlada (Losartana 50mg).
                  </li>
                </ul>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <ShieldCheckIcon className="w-4 h-4 text-slate-600" />
                  <span>Sinais Vitais da Sessão</span>
                </h3>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Pressão Arterial (P.A.)</span>
                    <span className="font-bold text-slate-900 font-mono">120/80 mmHg</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-500">Glicemia Capilar</span>
                    <span className="font-bold text-slate-900 font-mono">98 mg/dL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Frequência Cardíaca</span>
                    <span className="font-bold text-slate-900 font-mono">74 bpm</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl text-xs text-slate-800 space-y-1">
                <p className="font-bold text-slate-900">Diretriz Regulamentar CFO:</p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Atendimento em cadeira clínica conduzido obrigatoriamente por dupla sob supervisão contínua da docente responsável.
                </p>
              </div>
            </div>

            {/* Coluna Direita: Odontograma e Periodograma */}
            <div className="lg:col-span-9 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <OdontogramApp />
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <Periodograma />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'evolucao' && <DentalEvolutionTab />}

        {activeTab === 'tratamento' && <TreatmentPlanTab />}

        {activeTab === 'exames' && <DentalRadiologyTab />}
      </div>
    </AppLayout>

  );
}