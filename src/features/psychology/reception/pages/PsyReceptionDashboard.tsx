import { PsySidebar } from '../../components/PsySidebar';
import { PsyReceptionStats } from '../components/PsyReceptionStats';

export function PsyReceptionDashboard() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      <PsySidebar />
      
      <main className="flex-1 ml-64 p-8">
        
        {/* Cabeçalho Superior - Tags SPA */}
        <header className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded">SPA • SERVIÇO DE PSICOLOGIA APLICADA</span>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded">TERMINAL RECEPÇÃO SPA-01</span>
          </div>
          <div className="text-right flex items-center gap-4">
            <div className="flex items-center gap-2 bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100">
              <span className="text-blue-600">🕒</span>
              <span className="font-bold text-gray-900 text-sm">15:59:38</span>
              <span className="text-xs text-gray-500">Terça-feira, 15 de Setembro de 2026</span>
            </div>
          </div>
        </header>

        {/* Título e Turnos */}
        <div className="flex justify-between items-end mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agenda Diária da Recepção • Psicologia</h1>
            <p className="text-sm text-gray-500 mt-1">Monitoramento de salas, recepção e acolhimento presencial da Clínica-Escola UNINASSAU</p>
          </div>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-white rounded">Manhã (07h - 12h)</button>
            <button className="px-4 py-2 text-xs font-bold text-white bg-[#0a1526] rounded shadow-sm">Tarde (13h - 18h) • Atual</button>
            <button className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-white rounded">Noite (18h - 22h)</button>
          </div>
        </div>

        <p className="text-[10px] text-gray-400 mb-6">Resolução CFP nº 06/2019 • Gestão Operacional de Fluxo sem Acesso a Anotações Clínicas</p>

        {/* Estatísticas */}
        <PsyReceptionStats />

        {/* Barra de Ações e Filtros */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button className="bg-[#0a1526] text-white px-4 py-2 rounded-lg text-xs font-medium">Todos os Atendimentos (28)</button>
            <button className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-lg text-xs font-medium">Avaliação Psic.</button>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input type="text" className="w-8 bg-gray-50 border border-gray-200 rounded-lg py-2 pl-8 focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="bg-[#0056b3] hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>👤+</span> Cadastro
            </button>
            <button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>📅+</span> Agendar Retorno
            </button>
            <button className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>⏳</span> Fila de Espera (34)
            </button>
          </div>
        </div>

        {/* Layout Grid (Tabela Esquerda + Painéis Direita) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[400px] flex items-center justify-center text-gray-400 border-dashed">
            Área reservada para a Tabela "Sessões do Turno da Tarde"
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[300px] flex items-center justify-center text-gray-400 border-dashed">
              Área para "Demandas de Estágio"
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[150px] flex items-center justify-center text-gray-400 border-dashed">
              Área para "Segurança e Ética no SPA"
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}