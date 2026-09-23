import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importação das Páginas (Features)
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ReceptionDashboard } from './features/reception/pages/ReceptionDashboard';
import { DentalRecordPage } from './features/dental-record/pages/DentalRecordPage';
import { SupervisionPage } from './features/supervision/pages/SupervisionPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirecionamento inicial para o Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Rotas de Autenticação */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        
        {/* Rotas dos Módulos Clínicos */}
        <Route path="/recepcao" element={<ReceptionDashboard />} />
        <Route path="/ficha-odonto" element={<DentalRecordPage />} />
        <Route path="/supervisao" element={<SupervisionPage />} />
      </Routes>
    </BrowserRouter>
  );
}