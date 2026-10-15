import { useState } from 'react';
import { AppLayout } from '../../../../components/layout/AppLayout';
import { useAuth } from '../../../auth/context/AuthContext';
import { useClinic } from '../../../clinic/context/ClinicContext';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '../../../../components/icons/CorporateIcons';

export function PsyRecordPage() {
  const { user } = useAuth();
  const { pacientes, evolucoesPsico, adicionarEvolucaoPsico } = useClinic();

  // Filtrar apenas pacientes com prontuário de psicologia ativo
  const pacientesPsico = pacientes.filter(
    (p) => p.curso === 'psicologia' || p.curso === 'ambos'
  );

  // `?? 1` era id fixo: no primeiro render a lista real ainda não tinha chegado,
// então o <select> ficava sem opção correspondente quando os ids do banco eram
// outros. O valor exibido é derivado do paciente resolvido, não do estado cru.
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(
    undefined
  );

  const pacienteSelecionado =
    pacientesPsico.find((p) => p.id === selectedPatientId) || pacientesPsico[0];

  const [activeTab, setActiveTab] = useState<'registro' | 'historico'>('registro');

  // Histórico de sessões do paciente atual (RF-008 & RN-005)
  const historicoSessoes = evolucoesPsico.filter(
    (e) => e.pacienteId === pacienteSelecionado?.id
  );

  // Parâmetros da sessão
  const proximaSessaoNumero = `Sessão ${(historicoSessoes.length + 1).toString().padStart(2, '0')}`;
  const [numeroSessao, setNumeroSessao] = useState(proximaSessaoNumero);
  const [dataSessao, setDataSessao] = useState(new Date().toISOString().split('T')[0]);

  // Parametros da sessao e o texto redigido abaixo.
  // Nascem VAZIOS de propósito. Antes cada textarea vinha com uma evolução
  // clínica redigida ("paciente relata manutenção do quadro de sobrecarga…",
  // "sem indicadores de risco autolesivo") e handleSalvarEnviar gravava
  // exatamente esse texto: dado clínico falso, escrevido por quem não
  // acompanhou a sessão, seguindo para a fila de homologação. Quem redige a
  // síntese é o estagiário, a partir do que aconteceu.
  // A redacao e uma caixa unica. Antes eram tres (inicio, meio e fim): a tela
  // exigia que o estagiario separasse por fase, mas o que ele conhece e a ordem
  // em que as coisas aconteceram, e escreve isso em paragrafos.
  //
  // Nasce VAZIO de proposito. Antes o campo vinha com uma evolucao clinica
  // redigida ('paciente relata manutencao do quadro de sobrecarga.', 'sem
  // indicadores de risco autolesivo') e handleSalvarEnviar gravava exatamente
  // esse texto: dado clinico falso, escrito por quem nao acompanhou a sessao,
  // seguindo para a fila de homologacao. Quem redige a sintese e o estagiario,
  // a partir do que aconteceu.
  const [redacao, setRedacao] = useState('');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registroGerado, setRegistroGerado] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

  // Detecção estrita de aspas (RN-002 / CFP nº 06/2019)
  const quoteRegex = /["“”«»]/;
  const temAspas = quoteRegex.test(redacao);

  // A redacao e obrigatoria. O servidor tambem recusa texto em branco
  // (validar_texto_clinico) - a tela avisa antes para o estagiario nao tomar
  // 422 depois de escrever tudo.
  const faltaSintese = redacao.trim().length === 0;

  const removerAspasAutomaticamente = () => {
    setRedacao((prev) => prev.replace(/[“”«»"]/g, ''));
  };

  const handleSalvarEnviar = async () => {
    if (temAspas || faltaSintese || !pacienteSelecionado || isSaving) return;

    setIsSaving(true);
    setErroMsg('');

    // O retorno { success, message } é justamente o que impede perda de dado:
    // abrir o modal de sucesso antes da resposta do servidor fazia a clínica
    // acreditar que a síntese foi gravada quando o servidor pode ter recusado.
    const resultado = await adicionarEvolucaoPsico({
      pacienteId: pacienteSelecionado.id,
      pacienteNome: pacienteSelecionado.nome,
      estagiarioNome: user?.nome || '',
      estagiarioMatricula: user?.matricula || '',
      // Não existe vínculo estagiário↔supervisor no schema. Antes era gravado um
      // nome literal, que virava dado falso dentro do prontuário.
      supervisorNome: '',
      dataSessao: new Date(dataSessao).toLocaleDateString('pt-BR'),
      numeroSessao: numeroSessao,
      redacaoTexto: redacao,
    });

    setIsSaving(false);

    if (!resultado.success || !resultado.evolucao) {
      setErroMsg(resultado.message);
      return;
    }

    // Id real devolvido pelo banco — não um "protocolo" montado no cliente com
    // Date.now(), que não existe em lugar nenhum.
    setRegistroGerado(resultado.evolucao.id);
    setShowSuccessModal(true);
  };

  const iniciaisPaciente = (pacienteSelecionado?.nome || 'Paciente')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <AppLayout
      title="Prontuário Psicológico Individual"
      subtitle="Registro estruturado de psicoterapia e histórico longitudinal sob conformidade com a Resolução CFP nº 06/2019 e LGPD Artigo 11"
      badge="Resolução CFP nº 06/2019"
      badgeType="blue"
      actions={
        <div className="w-64 sm:w-72">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Paciente Ativo (SPA)
          </label>
          <select
            value={pacienteSelecionado?.id ?? ''}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            {pacientesPsico.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.cpf})
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Banner do Paciente Selecionado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 bg-blue-700 text-white rounded-xl flex items-center justify-center text-sm font-bold shadow-xs">
              {iniciaisPaciente}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  {pacienteSelecionado?.nome}
                </h2>
                <span className="bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-blue-200 uppercase tracking-wider">
                  Prontuário SPA Ativo
                </span>
                {/* `eh_menor` e `nome_responsavel` já vêm do backend (RF-007, RN-004) e estavam
                   sem sinalização na tela: nada indicava ao estagiário que a
                    sessão era com menor e que a responsável acompanha. */}
                {pacienteSelecionado?.ehMenor && (
                  <span
                    className="bg-amber-50 text-amber-800 text-[10px] px-2 py-0.5 rounded-md font-bold border border-amber-200 uppercase tracking-wider"
                    title={
                      pacienteSelecionado.nomeResponsavel
                        ? `Responsável legal: ${pacienteSelecionado.nomeResponsavel}`
                        : 'Responsável legal não informado no cadastro'
                    }
                  >
                    Menor de idade
                    {pacienteSelecionado.nomeResponsavel
                      ? ` · resp. ${pacienteSelecionado.nomeResponsavel}`
                      : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                Nasc: {pacienteSelecionado?.dataNascimento} • CPF: {pacienteSelecionado?.cpf} •{' '}
                {pacienteSelecionado?.telefone}
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-right">
              {/* "#SPA-2026-0104" era literal no JSX: mesmo número para todo
                  paciente, sempre. Protocolo que não existe na base é dado
                  fabricado. Trocado pela contagem real de evoluções. */}
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Evoluções registradas</p>
              <p className="text-xs font-semibold text-slate-800 font-mono">
                {historicoSessoes.length}
              </p>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div className="text-right">
              {/* "Prof. Dr. Robert Santos" também era literal. Não existe
                  vínculo estagiário↔supervisor no schema, então o docente
                  correto aqui é quem está autenticado — e isso vem do token. */}
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Responsável pelo registro</p>
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[14rem]">
                {user?.nome || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Menu de Abas Segmentadas */}
        <div className="bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs flex">
          <button
            onClick={() => setActiveTab('registro')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'registro'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>Registrar Nova Sessão Clínica</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'historico'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ClockIcon className="w-4 h-4" />
            <span>Linha do Tempo Cronológica (RF-008)</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                activeTab === 'historico' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {historicoSessoes.length}
            </span>
          </button>
        </div>

        {/* ALERTA NORMATIVO ANTI-ASPAS (RN-002 / CFP nº 06/2019) */}
        {temAspas && activeTab === 'registro' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs flex items-start gap-3.5">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                  Inconformidade Técnica • RN-002
                </span>
                <span className="text-xs font-bold text-amber-900">
                  Uso de Citações / Aspas Identificado
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                A Resolução CFP nº 06/2019 veda expressamente transcrições literais do paciente com uso de aspas.
                O prontuário eletrônico requer exclusivamente uma síntese técnica conceitual redigida pelo estagiário.
              </p>
            </div>
            <button
              onClick={removerAspasAutomaticamente}
              className="bg-amber-700 hover:bg-amber-800 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 shadow-xs"
            >
              Sanitizar Citações Automaticamente
            </button>
          </div>
        )}

        {activeTab === 'registro' ? (
          /* ABA 1: FORMULÁRIO DE REGISTRO ESTRUTURADO */
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-8 shadow-xs">
            {/* Parâmetros da Sessão */}
            <section>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-700"></span>
                  <span>1. Parâmetros da Sessão Psicoterápica</span>
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ordem Cronológica (RF-008)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Número do Atendimento
                  </label>
                  <input
                    type="text"
                    value={numeroSessao}
                    onChange={(e) => setNumeroSessao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Data da Sessão
                  </label>
                  <input
                    type="date"
                    value={dataSessao}
                    onChange={(e) => setDataSessao(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Supervisor Docente Responsável
                  </label>
                  <input
                    type="text"
                    readOnly
                    value="Prof. Dr. Robert Santos do Carmo (CRP 19/0844)"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 outline-none font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </section>

            {/* Redacao da sessao */}
            <section className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-700"></span>
                  <span>2. Registro da Sintese Clinica</span>
                </h3>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                  Texto livre, sem aspas (RN-002)
                </span>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Relato da sessao em paragrafos, do acolhimento ao fechamento
                  </label>
                  {temAspas && (
                    <span className="text-[10px] text-amber-700 font-bold">Aspas identificadas</span>
                  )}
                </div>
                <textarea
                  rows={14}
                  value={redacao}
                  onChange={(e) => setRedacao(e.target.value)}
                  placeholder="Descreva a sessao em ordem cronologica, do acolhimento ao fechamento: o que trouxe o paciente, o que foi trabalhado e como a sessao terminou..."
                  className={`w-full p-3 text-xs leading-relaxed rounded-xl border outline-none transition-colors ${
                    temAspas
                      ? 'border-amber-400 bg-amber-50/40'
                      : 'border-slate-200 bg-slate-50/50 focus:bg-white focus:border-blue-600'
                  }`}
                />
              </div>
            </section>

            {/* Ações de Submissão */}
            <div className="pt-4 border-t border-slate-200 flex justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setRedacao('');
                  setErroMsg('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Limpar Rascunho
              </button>
              <button
                type="button"
                disabled={temAspas || faltaSintese || !pacienteSelecionado || isSaving}
                onClick={handleSalvarEnviar}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs ${
                  temAspas || faltaSintese || !pacienteSelecionado || isSaving
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {isSaving ? 'Enviando…' : 'Submeter para Homologação Docente'}
              </button>
            </div>

            {/* Dizer o que falta e melhor que so travar o botao. */}
            {faltaSintese && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl">
                A sintese clinica e obrigatoria: o campo acima precisa descrever a sessao de
                quem a conductuiu.
              </div>
            )}

            {/* Falha de escrita não pode ser engolida: o rascunho continua na tela
                para o estagiário corrigir e tentar de novo. */}
            {erroMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                Não foi possível submeter a síntese: {erroMsg}
              </div>
            )}
          </div>
        ) : (
          /* ABA 2: LINHA DO TEMPO CRONOLÓGICA (RF-008 & RN-005) */
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Histórico de Atendimentos do Prontuário
                </h3>
                <p className="text-xs text-slate-500">
                  Paciente: <strong className="text-slate-800">{pacienteSelecionado?.nome}</strong> •{' '}
                  Custódia Legal Ativa
                </p>
              </div>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                {historicoSessoes.length} registros cronológicos
              </span>
            </div>

            {historicoSessoes.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <DocumentTextIcon className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Nenhum atendimento anterior registrado para este paciente.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historicoSessoes.map((sessao, index) => (
                  <div
                    key={sessao.id || index}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2.5 border-b border-slate-200/60">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-700 text-white font-mono">
                          {sessao.numeroSessao}
                        </span>
                        <span className="text-xs font-semibold text-slate-900">
                          Data: {sessao.dataSessao}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-600">
                          Autor: <strong>{sessao.estagiarioNome}</strong> ({sessao.estagiarioMatricula})
                        </span>
                      </div>

                      <div>
                        {sessao.status === 'VALIDADO' ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600" />
                            Homologado com Visto Digital
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 text-purple-600" />
                            Aguardando Visto Docente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sintese registrada, em paragrafos como foi escrita */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Sintese da sessao
                      </p>
                      <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                        {sessao.redacaoTexto}
                      </p>
                    </div>

                    {/* Parecer do Supervisor se houver */}
                    {sessao.parecerSupervisor && (
                      <div className="p-3 bg-purple-50 border border-purple-200/80 rounded-xl text-xs">
                        <p className="font-bold text-purple-900 mb-0.5 flex items-center gap-1.5">
                          <ShieldCheckIcon className="w-3.5 h-3.5 text-purple-700" />
                          <span>Parecer Pedagógico do Supervisor ({sessao.supervisorNome}):</span>
                        </p>
                        <p className="text-purple-800 italic">{sessao.parecerSupervisor}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Corporativo de Protocolo */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Evolução Clínica Submetida com Sucesso
                </h3>
                <p className="text-xs text-slate-500">
                  O registro foi encaminhado para a fila de homologação e visto digital do orientador docente.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 font-mono text-center">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider">Registro no banco de dados</p>
                <p className="text-slate-900 font-bold text-sm">#{registroGerado}</p>
                <p className="text-slate-500 text-[10px]">Autoria: {user?.nome} ({user?.matricula})</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  setActiveTab('historico');
                }}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Visualizar na Linha do Tempo
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
