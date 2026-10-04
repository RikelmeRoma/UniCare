import { useState } from 'react';
import { AppLayout } from '../../../components/layout/AppLayout';
import { ReceptionStats } from '../components/ReceptionStats';
import { AppointmentTable } from '../components/AppointmentTable';
import { StudentDemandPanel } from '../components/StudentDemandPanel';
import { NewPatientModal } from '../components/NewPatientModal';
import { NewAppointmentModal } from '../components/NewAppointmentModal';
import {
  CalendarIcon,
  UserPlusIcon,
} from '../../../components/icons/CorporateIcons';

export function ReceptionDashboard() {
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  return (
    <AppLayout
      title="Recepção Odontológica Integrada"
      subtitle="Controle de acolhimento presencial, confirmação de agendamentos e alocação de cadeiras sob salvaguarda da norma RN-001"
      badge="Recepção & Triagem CFO"
      badgeType="emerald"
      actions={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setIsPatientModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>Cadastrar Paciente</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAppointmentModalOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <ReceptionStats />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <AppointmentTable />
          </div>
          <div className="lg:col-span-1">
            <StudentDemandPanel cursoFiltro="odontologia" />
          </div>
        </div>
      </div>

      {isPatientModalOpen && (
        <NewPatientModal
          onClose={() => setIsPatientModalOpen(false)}
          defaultCurso="odontologia"
        />
      )}

      {isAppointmentModalOpen && (
        <NewAppointmentModal
          onClose={() => setIsAppointmentModalOpen(false)}
          defaultCurso="odontologia"
        />
      )}
    </AppLayout>
  );
}