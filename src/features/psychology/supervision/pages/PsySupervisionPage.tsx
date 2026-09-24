import { PsySidebar } from '../../components/PsySidebar';
import { PsyTeacherHeader } from '../components/PsyTeacherHeader';
import { PsySupervisionStats } from '../components/PsySupervisionStats';

export function PsySupervisionPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      <PsySidebar />
      
      <main className="flex-1 ml-64 p-8">
        
        {/* Topo / Breadcrumb */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-xs font-bold text-blue-600 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">SPA / Psicologia Clínica</span>
            <span>•</span>
            <span className="text-gray-500">Clínica-Escola Aracaju • Serviço de Psicologia Aplicada</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-gray-400 hover:text-gray-600">🔔</button>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-900">Prof. Dr. Orientador</p>
              <p className="text-[10px] text-gray-500">Supervisor CRP 19/0844</p>
            </div>
            <div className="w-8 h-8 bg-gray-200 rounded-full border border-gray-300"></div>
          </div>
        </div>

        <PsyTeacherHeader />
        <PsySupervisionStats />

        {/* Layout Duplo: Fila e Devolutiva (Placeholders por agora) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[500px] flex items-center justify-center text-gray-400 border-dashed">
            Área para a "Fila de Homologação de Prontuários & Evoluções"
          </div>
          <div className="lg:col-span-1 bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[500px] flex items-center justify-center text-gray-400 border-dashed">
            Área para a "Devolutiva Pedagógica e Homologação"
          </div>
        </div>

        {/* Histórico e Estagiários (Placeholders) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[200px] flex items-center justify-center text-gray-400 border-dashed mb-6">
          Área para o "Histórico de Atendimentos Homologados"
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-[200px] flex items-center justify-center text-gray-400 border-dashed">
          Área para "Estagiários sob Orientação Docente"
        </div>

      </main>
    </div>
  );
}