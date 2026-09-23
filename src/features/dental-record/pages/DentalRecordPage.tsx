import { Sidebar } from '../components/Sidebar';
import { PatientHeader } from '../components/PatientHeader';
import OdontogramApp from '../components/OdontogramaViewer';
import Periodograma from '../components/PeriodogramaViewer'; // <-- Importação do Periodograma

export function DentalRecordPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        {/* Navegação Superior */}
        <div className="text-sm text-gray-500 mb-6 flex items-center gap-2">
          <span>Módulos Clínicos</span>
          <span>/</span>
          <span className="text-blue-600 font-medium">Ficha Odonto</span>
        </div>

        {/* Cabeçalho do Paciente */}
        <PatientHeader />

        {/* Layout Principal: Coluna Esquerda + Área Central */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Coluna Esquerda (Resumo Clínico / Alertas) */}
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
                <span>❤️</span> Sinais Vitais (Hoje)
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

          {/* Área Principal (Odontograma + Periodograma) */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Bloco 1: Odontograma */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                <button className="px-4 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
                  Odontograma
                </button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Anamnese & Evolução
                </button>
                <button className="px-4 py-3 text-sm font-medium text-gray-500 hover:text-gray-700">
                  Plano de Tratamento
                </button>
              </div>
              <div className="relative -mx-6 -my-4 sm:m-0 rounded-lg overflow-hidden border border-gray-100">
                <OdontogramApp />
              </div>
            </div>

            {/* Bloco 2: Periodograma */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Periodograma />
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}