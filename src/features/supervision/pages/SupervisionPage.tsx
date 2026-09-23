import { Sidebar } from '../../dental-record/components/Sidebar';
import { TeacherHeader } from '../components/TeacherHeader';
import { SupervisionStats } from '../components/SupervisionStats';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { PedagogicalHistory } from '../components/PedagogicalHistory'; // Nova importação
import { ClinicalPairs } from '../components/ClinicalPairs'; // Nova importação

export function SupervisionPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <span>Módulos Clínicos</span>
            <span>/</span>
            <span className="text-blue-600 font-medium">Supervisão Docente</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">Responsável Técnica (RT) da Clínica-Escola</p>
            <p className="text-xs text-gray-500">RT Geral Institucional - CRP/CRO</p>
          </div>
        </div>

        <TeacherHeader />
        <SupervisionStats />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <ApprovalQueue />
          </div>
          <div className="lg:col-span-1">
            <FeedbackPanel />
          </div>
        </div>

        {/* Integração dos novos componentes substituindo os placeholders */}
        <PedagogicalHistory />
        <ClinicalPairs />

      </main>
    </div>
  );
}