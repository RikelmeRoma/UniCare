import { useState } from 'react';
import { useClinic } from '../../../clinic/context/ClinicContext';
import type { EvolucaoPsico, StatusProntuario } from '../../../clinic/context/ClinicContext';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '../../../../components/icons/CorporateIcons';
import { InfoTooltip } from '../../../../components/ui/InfoTooltip';
import { META_TIPO_REGISTRO_PSICO } from '../../constants/psico';

// RN-002 / CFP nº 06/2019: o mesmo teste que a ficha do estagiário usa na
// digitação. A fila exibia "Conformidade Anti-Aspas CFP" em verde sem rodar
// teste nenhum — era um selo fixo, não uma verificação.
// Escrita com escapes porque a diferença é a regra inteira: o backend usa
// /["“”«»]/. Perder “ e ” aqui faria a tela dar selo verde de conformidade
// numa síntese que o servidor recusa.
const ASPAS = /["“”«»]/;
const temAspas = (e: EvolucaoPsico) => ASPAS.test(e.redacaoTexto);

// O histórico NÃO é só de homologados: `historico` é tudo que saiu da fila de
// pendentes, e isso inclui DEVOLVIDO_PARA_AJUSTE. Com o rótulo fixo, uma
// evolução devolvida aparecia ao supervisor como "Homologado (CRP)" — o item
// mais perigoso da tela, porque é a decisão que o supervisor precisa confiar.
const ROTULO_STATUS: Record<StatusProntuario, { texto: string; classe: string }> = {
  VALIDADO: {
    texto: 'Homologado',
    classe: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/70',
  },
  DEVOLVIDO_PARA_AJUSTE: {
    texto: 'Devolvido para ajuste',
    classe: 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800/70',
  },
  EM_ELABORACAO: {
    texto: 'Em elaboração',
    classe: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  },
  AGUARDANDO_VALIDACAO: {
    texto: 'Aguardando',
    classe: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
  },
};

export function PsyApprovalQueue() {
  const { evolucoesPsico, homologarEvolucaoPsico, sincronizar } = useClinic();

  const [selecionado, setSelecionado] = useState<EvolucaoPsico | null>(
    evolucoesPsico.find((e) => e.status === 'AGUARDANDO_VALIDACAO') || evolucoesPsico[0] || null
  );

  // Antes abria com um parecer já redigido ("Evolução estruturada com rigor
  // técnico..."), e esse texto ia para o PATCH /homologar como se fosse do
  // supervisor: gravava parecer falso no prontuário. O campo começa vazio e o
  // servidor exige texto não vazio (RF-004).
const [parecer, setParecer] = useState('');
const [feedbackMsg, setFeedbackMsg] = useState('');
const [feedbackErro, setFeedbackErro] = useState('');
const [isSaving, setIsSaving] = useState(false);
const [visualizarParecerId, setVisualizarParecerId] = useState<number | null>(null);

const [isRecarregando, setIsRecarregando] = useState(false);

const recarregarFila = async () => {
    setIsRecarregando(true);
    try {
      await sincronizar();
      setFeedbackErro("");
    } finally {
      setIsRecarregando(false);
    }
  };

const iconeRecarregar = isRecarregando ? "w-4 h-4 animate-spin" : "w-4 h-4";

const pendentes = evolucoesPsico.filter((e) => e.status === 'AGUARDANDO_VALIDACAO');
const historico = evolucoesPsico.filter((e) => e.status !== 'AGUARDANDO_VALIDACAO');

const parecerVazio = parecer.trim().length === 0;

const decidir = async (decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE') => {
    if (!selecionado) return;

    if (parecerVazio) {
      setFeedbackErro('Escreva o parecer antes de decidir: a homologação exige autoria docente.');
      return;
    }

    setIsSaving(true);
    setFeedbackErro('');
    setFeedbackMsg('');

    const resultado = await homologarEvolucaoPsico(selecionado.id, decisao, parecer.trim());
    setIsSaving(false);

    if (!resultado.success) {
      setFeedbackErro(resultado.message);
      return;
    }

    setFeedbackMsg(
      decisao === 'VALIDADO'
        ? `Evolução do paciente ${selecionado.pacienteNome} APROVADA com Visto Eletrônico.`
        : `Evolução devolvida para ajuste do estagiário ${selecionado.estagiarioNome}.`
    );
    setParecer('');
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  return (
    <div className="space-y-6 font-sans">
      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200 text-xs font-bold shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg('')}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 p-1"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid Principal: Fila à Esquerda + Devolutiva Pedagógica à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Fila de Homologação */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0E1729] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-blue-700 dark:text-blue-400" />
                <span>Fila de Homologação de Prontuários SPA</span>
                <InfoTooltip texto="Evoluções clínicas submetidas pelos estagiários de psicologia para visto docente." />
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 text-xs font-bold px-3 py-1 rounded-full font-mono tabular-nums">
                {pendentes.length} pendentes
              </span>
              {/* Recarregar: a fila vive no ClinicContext e so muda no login. Um
                  estagiario que submete uma evolucao em outra aba deixava a fila
                  desatualizada ate o proximo F5, e o supervisor via 0 pendentes
                  sem nenhuma explicacao. */}
              <button
                type="button"
                onClick={recarregarFila}
                disabled={isRecarregando}
                className="p-1.5 text-slate-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                title="Recarregar a fila do servidor"
              >
                <ArrowPathIcon className={iconeRecarregar} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {pendentes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <CheckCircleIcon className="w-8 h-8 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Fila em conformidade</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-400">Todos os prontuários foram revisados e homologados sob a Resolução CFP nº 06/2019.</p>
              </div>
            ) : (
              pendentes.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelecionado(item)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selecionado?.id === item.id
                      ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/35 shadow-xs ring-1 ring-blue-600'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                        Paciente: {item.pacienteNome}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          META_TIPO_REGISTRO_PSICO[item.tipoRegistro]?.classeBadge ??
                          'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800/70'
                        }`}
                      >
                        {META_TIPO_REGISTRO_PSICO[item.tipoRegistro]?.badge ?? 'Sessão Clínica'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono">
                        {item.numeroSessao}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-400 font-mono">{item.dataSessao}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 mb-3">
                    <p>
                      <strong>Estagiário:</strong> {item.estagiarioNome} ({item.estagiarioMatricula})
                    </p>
                    <p className="text-right">
                      {temAspas(item) ? (
                        <span
                          className="text-amber-900 dark:text-amber-200 font-semibold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/70 text-[10px] inline-flex items-center gap-1"
                          title="A síntese contém aspas. O servidor recusa aspas."
                        >
                          <ExclamationTriangleIcon className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                          Aspas na síntese — reprovada no servidor
                        </span>
                      ) : (
                        <span className="text-emerald-800 dark:text-emerald-200 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/70 text-[10px] inline-flex items-center gap-1">
                          <CheckIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          Conformidade Anti-Aspas CFP
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-950/70 border border-slate-200/70 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-200">
                    <p>
                      <strong className="text-blue-900 dark:text-blue-300">Síntese:</strong>{' '}
                      <span className="whitespace-pre-line">{item.redacaoTexto}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna Direita: Painel de Devolutiva Pedagógica (Prof. Dr. Robert) */}
        <div className="lg:col-span-1 bg-white dark:bg-[#0E1729] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  Devolutiva Pedagógica
                  <InfoTooltip texto="Homologação com Visto Digital (CRP)." />
                </h3>
              </div>
            </div>

            {selecionado ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white">{selecionado.pacienteNome}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                    {META_TIPO_REGISTRO_PSICO[selecionado.tipoRegistro]?.titulo ?? 'Sessão Clínica'} · {selecionado.numeroSessao} • Estagiário: {selecionado.estagiarioNome}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Parecer Técnico do Supervisor *
                  </label>
                  <textarea
                    rows={6}
                    value={parecer}
                    onChange={(e) => setParecer(e.target.value)}
                    placeholder="Escreva as orientações formativas ou aprovação do registro..."
                    className="w-full p-3 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 outline-none leading-relaxed transition-colors"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 py-6 text-center">
                Selecione uma evolução na fila para avaliar.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {feedbackErro && (
              <p className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/70 rounded-xl text-rose-800 dark:text-rose-200 text-[11px] font-semibold">
                {feedbackErro}
              </p>
            )}
            {parecerVazio && selecionado && !feedbackErro && (
              <p className="p-2.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 rounded-xl text-amber-800 dark:text-amber-200 text-[11px]">
                O parecer é obrigatório: sem ele a decisão fica sem autoria docente no prontuário.
              </p>
            )}
            <button
              type="button"
              onClick={() => void decidir('VALIDADO')}
              disabled={!selecionado || selecionado.status === 'VALIDADO' || isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:bg-slate-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>{isSaving ? 'Enviando…' : 'Homologar com Visto Eletrônico'}</span>
            </button>
            <button
              type="button"
              onClick={() => void decidir('DEVOLVIDO_PARA_AJUSTE')}
              disabled={!selecionado || selecionado.status === 'VALIDADO' || isSaving}
              className="w-full bg-white dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/70 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Devolver para Ajuste do Aluno</span>
            </button>
          </div>
        </div>
      </div>

      {/* Histórico de Atendimentos Homologados */}
      <div className="bg-white dark:bg-[#0E1729] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 transition-colors">
        <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          {/* Sem "na Semana": `historico` não filtra por período, e `dataSessao` é texto
          livre. O título afirmava um recorte que a lista não faz. Também não é
          só de homologados — traz também as devolvidas. */}
          <span>Histórico de Decisões de Homologação (Custódia da Gestão)</span>
        </h4>
        {/* Tabela em vez de lista inline: o supervisor precisa comparar linha a linha
            quem foi aprovado e quem foi devolvido. Empilhado, o nome ficava acima
            da decisão e o olho tinha que ir e voltar.

            O parecer continua expansível numa linha própria (`colSpan`), porque
            texto longo dentro de célula estreita quebra o alinhamento das
            colunas — que é justamente o que a tabela veio para dar. */}
        {historico.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-900/70 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center">
            Nenhuma decisão registrada ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-2.5">Paciente</th>
                  <th className="p-2.5">Sessão</th>
                  <th className="p-2.5">Estagiário</th>
                  <th className="p-2.5">Decisão</th>
                  <th className="p-2.5">Visto de</th>
                  <th className="p-2.5 text-right">Parecer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {historico.map((h) => (
                  <tr key={h.id} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">{h.pacienteNome}</td>
                    <td className="p-2.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {h.numeroSessao}
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500">{h.dataSessao}</span>
                    </td>
                    <td className="p-2.5">{h.estagiarioNome}</td>
                    <td className="p-2.5">
                      <span
                        className={`border text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${ROTULO_STATUS[h.status].classe}`}
                      >
                        {ROTULO_STATUS[h.status].texto}
                      </span>
                    </td>
                    {/* Autoridade real: o nome gravado na homologação (Bloco 7). O
                        antigo "(CRP)" prometia assinatura digital sem registro. */}
                    <td className="p-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {h.supervisorNome || '—'}
                    </td>
                    <td className="p-2.5 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setVisualizarParecerId(visualizarParecerId === h.id ? null : h.id)
                        }
                        className="text-blue-700 dark:text-blue-400 hover:underline font-semibold text-[11px]"
                      >
                        {visualizarParecerId === h.id ? 'Fechar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                ))}
                {historico.some((h) => h.id === visualizarParecerId) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-2.5 bg-blue-50/70 dark:bg-blue-950/50 border-t border-blue-200/80 dark:border-blue-800/70 text-blue-900 dark:text-blue-200 italic"
                    >
                      {historico.find((h) => h.id === visualizarParecerId)?.parecerSupervisor ||
                        'Sem parecer registrado pelo supervisor.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
