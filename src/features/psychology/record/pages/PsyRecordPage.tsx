import { PsySidebar } from '../../components/PsySidebar';

export function PsyRecordPage() {
  return (
    <div className="min-h-screen bg-[#1e293b] flex font-sans">
      <PsySidebar />
      
      <main className="flex-1 ml-64 flex flex-col h-screen overflow-hidden bg-gray-50">
        
        {/* Barra Superior */}
        <header className="bg-gray-100 border-b border-gray-200 px-8 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-700 font-medium">
            <span>🏢</span> Unidade Aracaju - Serviço de Psicologia Aplicada (SPA)
          </div>
          <div className="flex items-center gap-4">
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <span>✔️</span> Resolução CFP nº 06/2019
            </span>
            <button className="text-gray-500 hover:text-gray-700">❔</button>
            <button className="text-gray-500 hover:text-gray-700">🔔</button>
          </div>
        </header>

        {/* Área de Conteúdo Rolável */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            
            {/* Título do Documento */}
            <div className="text-center mb-8">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                Manual Orientativo de Registro e Elaboração de Documentos Psicológicos (CFP)
              </p>
              <h1 className="text-2xl font-bold text-[#0a1526] mb-1">
                Prontuário Psicológico / Registro Documental
              </h1>
              <p className="text-sm text-gray-500">
                Serviço de Psicologia Aplicada • Clínica-Escola UNINASSAU
              </p>
            </div>

            {/* Corpo do Prontuário */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-24">
              
              {/* 1. Identificação */}
              <section className="mb-10">
                <h2 className="text-sm font-bold text-gray-800 mb-4 uppercase">1. Identificação do Paciente</h2>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Nome Completo do Paciente</label>
                    <input type="text" readOnly value="Marcos Aurélio Silveira (M.A.S.)" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 outline-none" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Data de Nascimento</label>
                    <input type="text" readOnly value="14/08/1998 (28 anos)" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 outline-none" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">CPF</label>
                    <input type="text" readOnly value="***.482.915-**" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm text-gray-700 outline-none" />
                  </div>
                </div>
              </section>

              {/* 2. Avaliação de Demanda */}
              <section className="mb-10">
                <div className="flex justify-between items-end mb-4">
                  <h2 className="text-sm font-bold text-gray-800 uppercase">2. Avaliação de Demanda e Plano de Trabalho</h2>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Registro técnico objetivo</span>
                </div>
                <textarea 
                  placeholder="Descreva a avaliação de demanda, queixas principais e o plano de trabalho estabelecido para o paciente..."
                  className="w-full h-24 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 outline-none resize-none focus:bg-white focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </section>

              {/* 3. Evolução */}
              <section className="mb-10">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 uppercase">3. Evolução do Trabalho e Procedimentos</h2>
                    <p className="text-[10px] text-gray-500 mt-1">Histórico cronológico de atendimentos e registro da sessão em andamento</p>
                  </div>
                  <button className="text-xs font-bold text-blue-700 bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2">
                    <span>+</span> Adicionar Sessão
                  </button>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f8fafc] border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase w-32">Data / Período & Horário</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase">Evolução de Trabalho e Procedimentos Clínicos</th>
                        <th className="py-3 px-4 text-[10px] font-bold text-gray-500 uppercase w-48">Profissional Responsável & Registro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      
                      <tr className="bg-white">
                        <td className="py-4 px-4 align-top">
                          <p className="font-bold text-gray-900">01/09/2026</p>
                          <p className="text-xs text-gray-500 mb-2">14:00 às 14:50</p>
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">Sessão 02</span>
                        </td>
                        <td className="py-4 px-4 align-top text-gray-700 text-xs leading-relaxed">
                          Acolhimento e continuidade da caracterização da demanda. Realizada psicoeducação sobre o ciclo cognitivo da ansiedade e identificação dos primeiros gatilhos diários de sobrecarga. Paciente demonstrou compreensão ativa e comprometeu-se com o registro de automonitoramento.
                        </td>
                        <td className="py-4 px-4 align-top text-xs">
                          <p className="font-bold text-gray-900">Estagiário Clínico</p>
                          <p className="text-gray-500 mb-2">Matrícula: 014982201 • 9º P.</p>
                          <p className="text-green-600 flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-green-600 flex items-center justify-center text-[8px]">✓</span> Validado por Supervisor (CRP)</p>
                        </td>
                      </tr>

                      <tr className="bg-white">
                        <td className="py-4 px-4 align-top">
                          <p className="font-bold text-gray-900">08/09/2026</p>
                          <p className="text-xs text-gray-500 mb-2">14:00 às 14:50</p>
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded">Sessão 03</span>
                        </td>
                        <td className="py-4 px-4 align-top text-gray-700 text-xs leading-relaxed">
                          Revisão das tarefas de automonitoramento. Intervenção focalizada em pensamentos automáticos de autocobrança em ambiente acadêmico. Aplicação de questionamento socrático com identificação de distorção de catastrofização. Ausência de indicadores de risco.
                        </td>
                        <td className="py-4 px-4 align-top text-xs">
                          <p className="font-bold text-gray-900">Estagiário Clínico</p>
                          <p className="text-gray-500 mb-2">Matrícula: 014982201 • 9º P.</p>
                          <p className="text-green-600 flex items-center gap-1"><span className="w-3 h-3 rounded-full border border-green-600 flex items-center justify-center text-[8px]">✓</span> Validado por Supervisor (CRP)</p>
                        </td>
                      </tr>

                      <tr className="bg-blue-50/30">
                        <td className="py-4 px-4 align-top">
                          <p className="font-bold text-blue-700 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600"></span> 15/09/2026 (Hoje)</p>
                          <p className="text-xs text-gray-500 mb-2">14:00 às 14:50</p>
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded">Sessão 04 - Atual</span>
                        </td>
                        <td className="py-4 px-4 align-top">
                          <textarea 
                            className="w-full h-32 bg-white border border-gray-300 rounded-lg p-3 text-xs text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            defaultValue="Início com acolhimento pontual e receptivo. No desenvolvimento, realizou-se a técnica de reestruturação cognitiva voltada ao manejo da autoexigência e regulação emocional pré avaliações. Paciente externalizou estratégias prévias adaptativas com boa adesão às reflexões conjuntas."
                          />
                        </td>
                        <td className="py-4 px-4 align-top text-xs">
                          <p className="font-bold text-gray-900">Estagiário Clínico</p>
                          <p className="text-gray-500">Matrícula: 014982201</p>
                          <p className="text-gray-500 mb-3">Supervisor: Prof. Dr. Orientador</p>
                          <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[10px] font-bold px-2 py-1 rounded">Rascunho pendente de supervisão</span>
                        </td>
                      </tr>

                    </tbody>
                  </table>
                </div>
              </section>

              {/* 4. Encerramento */}
              <section>
                <div className="flex justify-between items-end mb-4">
                  <h2 className="text-sm font-bold text-gray-800 uppercase">4. Registro de Encaminhamento ou Encerramento</h2>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Preencher em caso de alta, transferência ou desligamento</span>
                </div>
                <textarea 
                  placeholder="Caso aplicável, registre as providências de encaminhamento intersetorial/médico, alta clínica fundamentada ou encerramento do processo psicoterápico..."
                  className="w-full h-20 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500 outline-none resize-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </section>

            </div>
          </div>
        </div>

        {/* Rodapé Fixo (Ações) */}
        <footer className="bg-white border-t border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="text-blue-600">🛡️</span>
            Documento em sigilo institucional e conformidade ética com o Conselho Federal de Psicologia.
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-6 py-2.5 rounded-lg flex items-center gap-2">
              <span>💾</span> Salvar Rascunho
            </button>
            <button className="text-sm font-bold text-white bg-[#0a1526] hover:bg-black px-6 py-2.5 rounded-lg flex items-center gap-2">
              <span>➤</span> Salvar e Enviar para Supervisão
            </button>
          </div>
        </footer>

      </main>
    </div>
  );
}