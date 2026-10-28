import { AppLayout } from '../../../components/layout/AppLayout';
import { TeacherHeader } from '../components/TeacherHeader';
import { SupervisionStats } from '../components/SupervisionStats';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { PedagogicalHistory } from '../components/PedagogicalHistory';
import { ClinicalPairs } from '../components/ClinicalPairs';

export function SupervisionPage() {
  return (
    <AppLayout
      title="Supervisão Docente de Odontologia"
      subtitle="Homologação de procedimentos clínicos em cadeira, acompanhamento pedagógico de duplas e validação ética sob diretrizes do CFO"
      badge="Supervisão Clínica CFO"
      badgeType="emerald"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <TeacherHeader />
        <SupervisionStats />

        <ApprovalQueue />

        <PedagogicalHistory />
        <ClinicalPairs />
      </div>
    </AppLayout>
  );
}