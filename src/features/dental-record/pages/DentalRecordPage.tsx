import { useEffect, useState } from 'react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { PatientHeader } from '../components/PatientHeader';
import OdontogramApp from '../components/OdontogramaViewer';
import Periograma from '../components/PeriogramaViewer';
import { DentalEvolutionTab } from '../components/DentalEvolutionTab';
import { TreatmentPlanTab } from '../components/TreatmentPlanTab';
import { DentalRadiologyTab } from '../components/DentalRadiologyTab';
import { AnamneseModal } from '../components/AnamneseModal';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  PhotoIcon,
  PlusIcon,
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

  const [activeTab, setActiveTab] = useState<'anamnese' | 'evolucao' | 'tratamento' | 'exames'>('anamnese');
  const [showAfericao, setShowAfericao] = useState(false);

  // A anamnese é por paciente: troca de paciente precisa recarregar o histórico.
  useEffect(() => {
    if (pacienteSelecionado?.id) {
      void carregarAnamneses(pacienteSelecionado.id);
    }
  }, [pacienteSelecionado?.id, carregarAnamneses]);

  const anamneses = pacienteSelecionado?.id ? (anamnesesPorPaciente[pacienteSelecionado.id] ?? []) : [];
  // O backend devolve do mais recente para o mais antigo.
  const ultima = anamneses[0];

  const mostrar = (valor?: string | number) => {
    if (valor === undefined || valor === null || valor === '') return 'Não registrado';
    return String(valor);
  };


  return (
    <AppLayout
      title="Ficha Clínica Odontológica"
      subtitle="Prontuário odontológico, mapeamento anatômico 2D, periograma, evolução clínica e plano de tratamento hierarquizado"
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
            <span>Odontograma 2D & Periograma</span>
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
            <span>Radiografias & Exames</span>
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
                  {/* Antes a ficha mostrava "Penicilina e derivados" e
                      "Hipertensão Arterial: Losartana 50mg" para QUALQUER
                      paciente selecionado. Agora vem da anamnese registrada. */}
                  {ultima?.alergias && (
                    <li className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200/80 font-medium">
                      <strong>Alergia:</strong> {ultima.alergias}
                    </li>
                  )}
                  {ultima?.condicoesCronicas && (
                    <li className="p-3 bg-amber-50 text-amber-800 rounded-xl border border-amber-200/80 font-medium">
                      <strong>Condições crônicas:</strong> {ultima.condicoesCronicas}
                    </li>
                  )}
                  {ultima?.medicacoesEmUso && (
                    <li className="p-3 bg-slate-50 text-slate-800 rounded-xl border border-slate-200/80 font-medium">
                      <strong>Medicações em uso:</strong> {ultima.medicacoesEmUso}
                    </li>
                  )}
                  {!ultima?.alergias && !ultima?.condicoesCronicas && !ultima?.medicacoesEmUso && (
                    <li className="p-3 bg-slate-50 text-slate-500 rounded-xl border border-slate-200/80 font-medium">
                      Anamnese sem alertas registrados.
                    </li>
                  )}
                </ul>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <ShieldCheckIcon className="w-4 h-4 text-slate-600" />
                  <span>Sinais Vitais da Sessão</span>
                </h3>
                <div className="space-y-2.5 text-xs text-slate-700">
                  {/* 120/80 mmHg, 98 mg/dL e 74 bpm eram literais: os mesmos para
                      todo paciente. Agora vêm da última aferição registrada. */}
<div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Pressão Arterial (P.A.)</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {mostrar(ultima?.pressaoArterial)}{ultima?.pressaoArterial ? ' mmHg' : ''}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Glicemia Capilar</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {mostrar(ultima?.glicemiaCapilar)}{ultima?.glicemiaCapilar ? ' mg/dL' : ''}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500">Frequência Cardíaca</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {mostrar(ultima?.frequenciaCardiaca)}{ultima?.frequenciaCardiaca ? ' bpm' : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Temperatura</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {mostrar(ultima?.temperatura)}{ultima?.temperatura ? ' °C' : ''}
                  </span>
                </div>
              </div>

              {ultima && (
                <p className="mt-3 text-[10px] text-slate-400 font-mono">
                  Última aferição: {new Date(ultima.afetidoEm).toLocaleString('pt-BR')} •{' '}
                  {ultima.responsavelNome} ({ultima.responsavelMatricula})
                </p>
              )}
              {anamneses.length > 1 && (
                <p className="mt-1 text-[10px] text-slate-400 font-mono">
                  {anamneses.length} aferições no histórico
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowAfericao(true)}
                className="mt-3 w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Registrar aferição
              </button>
            </div>

              <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl text-xs text-slate-800 space-y-1">
                <p className="font-bold text-slate-900">Diretriz Regulamentar CFO:</p>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  Atendimento em cadeira clínica conduzido obrigatoriamente por dupla sob supervisão contínua da docente responsável.
                </p>
              </div>
            </div>

            {/* Coluna Direita: Odontograma e Periograma */}
            <div className="lg:col-span-9 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <OdontogramApp />
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <Periograma />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'evolucao' && <DentalEvolutionTab pacienteId={pacienteSelecionado?.id} />}

        {activeTab === 'tratamento' && <TreatmentPlanTab />}

{activeTab === 'exames' && <DentalRadiologyTab />}
      </div>

      {showAfericao && pacienteSelecionado && (
        <AnamneseModal
          pacienteId={pacienteSelecionado.id}
          onClose={() => setShowAfericao(false)}
        />
      )}
    </AppLayout>
  );
}