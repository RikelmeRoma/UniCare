import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ClinicProvider } from './features/clinic/context/ClinicContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';

// Importação das Páginas (Features)
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { UnauthorizedPage } from './features/auth/pages/UnauthorizedPage';
import { AlterarSenhaPage } from './features/auth/pages/AlterarSenhaPage';

// Odontologia
import { ReceptionDashboard } from './features/reception/pages/ReceptionDashboard';
import { DentalRecordPage } from './features/dental-record/pages/DentalRecordPage';
import { OdontoAppointmentsPage } from './features/dental-record/appointments/pages/OdontoAppointmentsPage';
import { SupervisionPage } from './features/supervision/pages/SupervisionPage';
import { RTManagementPage } from './features/supervision/pages/RTManagementPage';

// Psicologia
import { PsyReceptionDashboard } from './features/psychology/reception/pages/PsyReceptionDashboard';
import { PsyRecordPage } from './features/psychology/record/pages/PsyRecordPage';
import { PsyAppointmentsPage } from './features/psychology/appointments/pages/PsyAppointmentsPage';
import { PsySupervisionPage } from './features/psychology/supervision/pages/PsySupervisionPage';

export default function App() {
  return (
    <AuthProvider>
      <ClinicProvider>
        <BrowserRouter>
          <Routes>
            {/* Redirecionamento inicial para o Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Rotas Públicas de Autenticação */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/cadastro" element={<RegisterPage />} />
            <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
            <Route path="/nao-autorizado" element={<UnauthorizedPage />} />

            {/* Recepção Odontológica Integrada (REC-001). A recepção é uma conta por clínica. */}
            <Route
              path="/recepcao"
              element={
                <ProtectedRoute allowedRoles={['recepcao', 'supervisor', 'rt']} allowedCourses={['odontologia']}>
                  <ReceptionDashboard />
                </ProtectedRoute>
              }
            />

            {/* Ficha Clínica Odontológica (Estagiário Odonto, Supervisor e RT - Recepção estritamente bloqueada) */}
            <Route
              path="/ficha-odonto"
              element={
                <ProtectedRoute allowedRoles={['estagiario', 'supervisor', 'rt']} allowedCourses={['odontologia']}>
                  <DentalRecordPage />
                </ProtectedRoute>
              }
            />

            {/* Agenda da clínica odontológica. O estagiário vê as sessões em
                que é operador ou auxiliar; supervisor e RT veem o escopo que o
                servidor devolve (duplas supervisionadas / clínica inteira). */}
            <Route
              path="/odonto/agendamentos"
              element={
                <ProtectedRoute allowedRoles={['estagiario', 'supervisor', 'rt']} allowedCourses={['odontologia']}>
                  <OdontoAppointmentsPage />
                </ProtectedRoute>
              }
            />

            {/* Painel de Supervisão Odontologia (Docente e RT) */}
            <Route
              path="/supervisao"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'rt']} allowedCourses={['odontologia']}>
                  <SupervisionPage />
                </ProtectedRoute>
              }
            />

            {/* Recepção do Serviço de Psicologia Aplicada (SPA) */}
            <Route
              path="/psi/recepcao"
              element={
                <ProtectedRoute allowedRoles={['recepcao', 'rt']} allowedCourses={['psicologia']}>
                  <PsyReceptionDashboard />
                </ProtectedRoute>
              }
            />

            {/* Agenda do próprio estagiário de psicologia. Só ele: a lista é
                filtrada pela matrícula de quem chama, e supervisor e RT já têm a
                agenda da clínica inteira em /psi/recepcao. */}
            <Route
              path="/psi/agendamentos"
              element={
                <ProtectedRoute allowedRoles={['estagiario']} allowedCourses={['psicologia']}>
                  <PsyAppointmentsPage />
                </ProtectedRoute>
              }
            />

            {/* Prontuário Psicológico (Estagiário Psico, Supervisor e RT - Recepção estritamente bloqueada RN-001) */}
            <Route
              path="/psi/prontuario"
              element={
                <ProtectedRoute allowedRoles={['estagiario', 'supervisor', 'rt']} allowedCourses={['psicologia']}>
                  <PsyRecordPage />
                </ProtectedRoute>
              }
            />

            {/* Supervisão Docente de Psicologia */}
            <Route
              path="/psi/supervisao"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'rt']} allowedCourses={['psicologia']}>
                  <PsySupervisionPage />
                </ProtectedRoute>
              }
            />

            {/* Painel Gerencial & Relatórios da RT (RF-006 & RN-003) */}
            <Route
              path="/rt/relatorios"
              element={
                <ProtectedRoute allowedRoles={['rt', 'supervisor']}>
                  <RTManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Conta do próprio usuário, nas duas clínicas. Sem allowedRoles e
                sem allowedCourses de propósito: trocar a própria senha é
                direito de qualquer perfil logado, e o servidor exige a senha
                atual antes de gravar. */}
            <Route
              path="/conta/senha"
              element={
                <ProtectedRoute>
                  <AlterarSenhaPage />
                </ProtectedRoute>
              }
            />

            {/* Rota coringa */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ClinicProvider>
    </AuthProvider>
  );
}