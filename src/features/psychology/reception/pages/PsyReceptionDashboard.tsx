import { useState } from 'react';
import { AppLayout } from '../../../../components/layout/AppLayout';
import { PsyReceptionStats } from '../components/PsyReceptionStats';
import { AppointmentTable } from '../../../reception/components/AppointmentTable';
import { StudentDemandPanel } from '../../../reception/components/StudentDemandPanel';
import { NewPatientModal } from '../../../reception/components/NewPatientModal';
import { NewAppointmentModal } from '../../../reception/components/NewAppointmentModal';
import {
  CalendarIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from '../../../../components/icons/CorporateIcons';

export function PsyReceptionDashboard() {
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);

  return (
    <AppLayout
      title="Recepção do Serviço de Psicologia Aplicada (SPA)"
      subtitle="Controle de acolhimento presencial, encaminhamento para consultórios e triagem sob conformidade com a Resolução CFP nº 06/2019"
      badge="Recepção SPA • CFP"
      badgeType="blue"
      actions={
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => setIsPatientModalOpen(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>Cadastrar Paciente SPA</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAppointmentModalOpen(true)}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <CalendarIcon className="w-4 h-4 text-slate-600" />
            <span>Agendar Sessão</span>
          </button>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <PsyReceptionStats />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <AppointmentTable />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <StudentDemandPanel cursoFiltro="psicologia" />

            {/* Painel Informativo de Ética e Sigilo */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 text-xs space-y-3">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <ShieldCheckIcon className="w-4 h-4 text-blue-700" />
                <span>Segurança e Sigilo no SPA</span>
              </h4>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                As anotações confidenciais de psicoterapia são de acesso exclusivo do estagiário e do orientador docente (CRP).
              </p>
              <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl text-[10px] text-slate-700 space-y-1 font-medium">
                <p>• <strong>Resolução CFP 06/2019:</strong> Vedação de citações diretas.</p>
                <p>• <strong>Art. 11 LGPD:</strong> Tratamento de dados sensíveis de saúde.</p>
                <p>• <strong>Custódia:</strong> Diretoria Técnica Master.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isPatientModalOpen && (
        <NewPatientModal
          onClose={() => setIsPatientModalOpen(false)}
          defaultCurso="psicologia"
        />
      )}

      {isAppointmentModalOpen && (
        <NewAppointmentModal
          onClose={() => setIsAppointmentModalOpen(false)}
          defaultCurso="psicologia"
        />
      )}
    </AppLayout>
  );
}