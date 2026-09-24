import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importação das Páginas (Features)
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ReceptionDashboard } from './features/reception/pages/ReceptionDashboard';
import { DentalRecordPage } from './features/dental-record/pages/DentalRecordPage';
import { SupervisionPage } from './features/supervision/pages/SupervisionPage';
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';


import { PsyReceptionDashboard } from './features/psychology/reception/pages/PsyReceptionDashboard';
import { PsyRecordPage } from './features/psychology/record/pages/PsyRecordPage';
import { PsySupervisionPage } from './features/psychology/supervision/pages/PsySupervisionPage';


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirecionamento inicial para o Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Rotas de Autenticação */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        
        {/* Rotas dos Módulos Clínicos (Odontologia) */}
        <Route path="/recepcao" element={<ReceptionDashboard />} />
        <Route path="/ficha-odonto" element={<DentalRecordPage />} />
        <Route path="/supervisao" element={<SupervisionPage />} />

        {/* Rotas Exclusivas de Psicologia */}
        <Route path="/psi/recepcao" element={<PsyReceptionDashboard />} />
        <Route path="/psi/prontuario" element={<PsyRecordPage />} />
        <Route path="/psi/supervisao" element={<PsySupervisionPage />} />
      </Routes>
    </BrowserRouter>
  );
}