import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/context/AuthContext';
import { ClinicProvider } from './features/clinic/context/ClinicContext';
import { ProtectedRoute } from './features/auth/components/ProtectedRoute';

// Importação das Páginas (Features)
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { UnauthorizedPage } from './features/auth/pages/UnauthorizedPage';

// Odontologia
import { ReceptionDashboard } from './features/reception/pages/ReceptionDashboard';
import { DentalRecordPage } from './features/dental-record/pages/DentalRecordPage';
import { SupervisionPage } from './features/supervision/pages/SupervisionPage';
import { RTManagementPage } from './features/supervision/pages/RTManagementPage';

// Psicologia
import { PsyReceptionDashboard } from './features/psychology/reception/pages/PsyReceptionDashboard';
import { PsyRecordPage } from './features/psychology/record/pages/PsyRecordPage';
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

            {/* Rotas de Recepção Geral / Odonto (Acesso Restrito: Recepção e RT - Bloqueio RN-001 de Prontuários) */}
            <Route
              path="/recepcao"
              element={
                <ProtectedRoute allowedRoles={['recepcao', 'rt']}>
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
                <ProtectedRoute allowedRoles={['recepcao', 'rt']}>
                  <PsyReceptionDashboard />
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

            {/* Rota coringa */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ClinicProvider>
    </AuthProvider>
  );
}