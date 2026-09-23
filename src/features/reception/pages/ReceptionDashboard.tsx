import { Sidebar } from '../components/Sidebar';
import { ReceptionStats } from '../components/ReceptionStats';

export function ReceptionDashboard() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      <Sidebar />
      
      {/* Área Principal - Tem margem à esquerda para não ficar por baixo da Sidebar fixa */}
      <main className="flex-1 ml-64 p-8">
        
        {/* Cabeçalho da Página */}
        <header className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-green-600 mb-2 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Terminal de Recepção Integrada
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Agenda Diária da Recepção • Odontologia</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
              <span>📅 Terça-feira, 15 de Setembro de 2026</span>
              <span className="text-gray-300">|</span>
              <span>Horário Atual: 14:57:18</span>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">Responsável Técnica (RT) da Clínica-Escola</p>
            <p className="text-xs text-gray-500">Gestão Técnica Geral • CRP/CRO</p>
          </div>
        </header>

        {/* Estatísticas */}
        <ReceptionStats />

        {/* Botões de Ação */}
        <div className="flex gap-4 mb-8">
          <button className="bg-[#0a1526] hover:bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
            <span>👤+</span> Novo Cadastro
          </button>
          <button className="bg-[#0056b3] hover:bg-blue-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
            <span>📅+</span> Novo Agendamento
          </button>
        </div>

        {/* Tabela de Atendimentos entrará aqui no próximo passo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[300px] flex items-center justify-center text-gray-400 border-dashed">
          Área reservada para a Tabela "Grade de Atendimentos do Turno"
        </div>

      </main>
    </div>
  );
}