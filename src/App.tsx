import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './features/auth/pages/LoginPage';
import { RegisterPage } from './features/auth/pages/RegisterPage';
import { ReceptionDashboard } from './features/reception/pages/ReceptionDashboard';
import { DentalRecordPage } from './features/dental-record/pages/DentalRecordPage'; // <-- Importe aqui

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/recepcao" element={<ReceptionDashboard />} />
        
        {/* Nova Rota da Ficha Odontológica */}
        <Route path="/ficha-odonto" element={<DentalRecordPage />} />
      </Routes>
    </BrowserRouter>
  );
}