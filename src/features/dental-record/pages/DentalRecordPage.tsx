import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { PatientHeader } from '../components/PatientHeader';
import OdontogramApp from '../components/OdontogramaViewer';
import Periodograma from '../components/PeriodogramaViewer';

export function DentalRecordPage() {
  // Estado para controlar a aba ativa (começa na anamnese)
  const [activeTab, setActiveTab] = useState('anamnese');

  // Função auxiliar para aplicar o estilo correto no botão da aba ativa
  const getTabStyle = (tabName: string) => {
    return `px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
      activeTab === tabName 
        ? 'text-blue-600 border-blue-600' 
        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
    }`;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <span>Módulos Clínicos</span>
          <span>/</span>
          <span className="text-blue-600 font-medium">Ficha Odonto</span>
        </div>

        <PatientHeader />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Coluna Esquerda */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-red-500">⚠️</span> Alertas Clínicos
              </h3>
              <ul className="space-y-3 text-sm">
                <li className="p-3 bg-red-50 text-red-700 rounded-md border border-red-100">
                  <strong>Alergia:</strong> Penicilina e derivados.
                </li>
                <li className="p-3 bg-orange-50 text-orange-700 rounded-md border border-orange-100">
                  <strong>Hipertensão:</strong> Controlada (Losartana 50mg).
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>❤️</span> Sinais Vitais
              </h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">P.A.</span>
                  <span className="font-medium">120/80 mmHg</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-gray-500">Glicemia</span>
                  <span className="font-medium">98 mg/dL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Área Principal (Abas e Conteúdo) */}
          <div className="lg:col-span-9">
            
            {/* Menu de Abas */}
            <div className="bg-white px-4 pt-2 rounded-xl border border-gray-200 shadow-sm mb-6 flex overflow-x-auto">
              <button 
                onClick={() => setActiveTab('anamnese')} 
                className={getTabStyle('anamnese')}
              >
                Anamnese & Exame Clínico
              </button>
              <button 
                onClick={() => setActiveTab('evolucao')} 
                className={getTabStyle('evolucao')}
              >
                Evolução
              </button>
              <button 
                onClick={() => setActiveTab('tratamento')} 
                className={getTabStyle('tratamento')}
              >
                Plano de Tratamento
              </button>
            </div>

            {/* Conteúdo Renderizado Condicionalmente */}
            
            {/* 1. Aba Anamnese (Mostra os dois gráficos) */}
            {activeTab === 'anamnese' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <OdontogramApp />
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <Periodograma />
                </div>
              </div>
            )}

            {/* 2. Aba Evolução */}
            {activeTab === 'evolucao' && (
              <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-gray-400 border-dashed">
                <span className="text-4xl mb-3">📝</span>
                <p>Histórico de evolução será renderizado aqui.</p>
              </div>
            )}

            {/* 3. Aba Plano de Tratamento */}
            {activeTab === 'tratamento' && (
              <div className="bg-white p-12 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-gray-400 border-dashed">
                <span className="text-4xl mb-3">📋</span>
                <p>O plano de tratamento do paciente será renderizado aqui.</p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}