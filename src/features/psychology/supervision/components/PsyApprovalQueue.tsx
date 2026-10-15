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
    classe: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  DEVOLVIDO_PARA_AJUSTE: {
    texto: 'Devolvido para ajuste',
    classe: 'bg-amber-50 text-amber-900 border-amber-200',
  },
  EM_ELABORACAO: {
    texto: 'Em elaboração',
    classe: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  AGUARDANDO_VALIDACAO: {
    texto: 'Aguardando',
    classe: 'bg-slate-100 text-slate-700 border-slate-200',
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
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
            <span>{feedbackMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg('')}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid Principal: Fila à Esquerda + Devolutiva Pedagógica à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Fila de Homologação */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-blue-700" />
                <span>Fila de Homologação de Prontuários SPA</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evoluções clínicas submetidas pelos estagiários de psicologia para visto docente
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full font-mono">
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
                className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                title="Recarregar a fila do servidor"
              >
                <ArrowPathIcon className={iconeRecarregar} />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {pendentes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircleIcon className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Fila em conformidade</p>
                <p className="text-[11px] text-slate-400">Todos os prontuários foram revisados e homologados sob a Resolução CFP nº 06/2019.</p>
              </div>
            ) : (
              pendentes.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelecionado(item)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selecionado?.id === item.id
                      ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                      : 'border-slate-200/80 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <h4 className="font-bold text-slate-900 text-sm">
                        Paciente: {item.pacienteNome}
                      </h4>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-mono">
                        {item.numeroSessao}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{item.dataSessao}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                    <p>
                      <strong>Estagiário:</strong> {item.estagiarioNome} ({item.estagiarioMatricula})
                    </p>
                    <p className="text-right">
                      {temAspas(item) ? (
                        <span
                          className="text-amber-900 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px] inline-flex items-center gap-1"
                          title="A síntese contém aspas. O servidor recusa por RN-002."
                        >
                          <ExclamationTriangleIcon className="w-3 h-3 text-amber-700" />
                          Aspas na síntese — reprovada no servidor (RN-002)
                        </span>
                      ) : (
                        <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] inline-flex items-center gap-1">
                          <CheckIcon className="w-3 h-3 text-emerald-600" />
                          Conformidade Anti-Aspas CFP
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200/70 rounded-xl text-xs text-slate-700">
                    <p>
                      <strong className="text-blue-900">Síntese:</strong>{' '}
                      <span className="whitespace-pre-line">{item.redacaoTexto}</span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Coluna Direita: Painel de Devolutiva Pedagógica (Prof. Dr. Robert) */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
                <ShieldCheckIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Devolutiva Pedagógica</h3>
                <p className="text-[10px] text-slate-400">Homologação com Visto Digital (CRP)</p>
              </div>
            </div>

            {selecionado ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-slate-900">{selecionado.pacienteNome}</p>
                  <p className="text-slate-500 text-[11px] font-mono">
                    {selecionado.numeroSessao} • Estagiário: {selecionado.estagiarioNome}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Parecer Técnico do Supervisor *
                  </label>
                  <textarea
                    rows={6}
                    value={parecer}
                    onChange={(e) => setParecer(e.target.value)}
                    placeholder="Escreva as orientações formativas ou aprovação do registro..."
                    className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:border-blue-600 outline-none leading-relaxed transition-colors"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Selecione uma evolução na fila para avaliar.
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            {feedbackErro && (
              <p className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-semibold">
                {feedbackErro}
              </p>
            )}
            {parecerVazio && selecionado && !feedbackErro && (
              <p className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px]">
                O parecer é obrigatório: sem ele a decisão fica sem autoria docente no prontuário.
              </p>
            )}
            <button
              type="button"
              onClick={() => void decidir('VALIDADO')}
              disabled={!selecionado || selecionado.status === 'VALIDADO' || isSaving}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>{isSaving ? 'Enviando…' : 'Homologar com Visto Eletrônico'}</span>
            </button>
            <button
              type="button"
              onClick={() => void decidir('DEVOLVIDO_PARA_AJUSTE')}
              disabled={!selecionado || selecionado.status === 'VALIDADO' || isSaving}
              className="w-full bg-white hover:bg-red-50 text-red-700 border border-red-200 font-bold py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              <span>Devolver para Ajuste do Aluno</span>
            </button>
          </div>
        </div>
      </div>

      {/* Histórico de Atendimentos Homologados */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
        <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <ShieldCheckIcon className="w-4 h-4 text-blue-700" />
          {/* Sem "na Semana": `historico` não filtra por período, e `dataSessao` é texto
          livre. O título afirmava um recorte que a lista não faz. Também não é
          só de homologados — traz também as devolvidas. */}
          <span>Histórico de Decisões de Homologação (Custódia RT)</span>
        </h4>
        <div className="divide-y divide-slate-100 text-xs">
          {historico.map((h) => (
            <div key={h.id} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <span className="font-bold text-slate-900">{h.pacienteNome}</span>
                <span className="text-slate-300 mx-2">•</span>
                <span className="text-slate-600 font-mono">{h.numeroSessao} ({h.dataSessao})</span>
                <span className="text-slate-300 mx-2">•</span>
                <span className="text-slate-500">Estagiário: {h.estagiarioNome}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`border text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1 ${ROTULO_STATUS[h.status].classe}`}>
                  {ROTULO_STATUS[h.status].texto}
                </span>
                {/* Autoridade real: o nome gravado na homologação (Bloco 7). O
                    antigo "(CRP)" prometia assinatura digital sem registro. */}
                {h.supervisorNome && (
                  <span className="text-[10px] text-slate-500 font-semibold">
                    por {h.supervisorNome}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setVisualizarParecerId(visualizarParecerId === h.id ? null : h.id)
                  }
                  className="text-blue-700 hover:underline font-semibold text-[11px]"
                >
                  {visualizarParecerId === h.id ? 'Fechar' : 'Ver Parecer'}
                </button>
              </div>

              {visualizarParecerId === h.id && (
                <div className="w-full mt-2 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-blue-900 italic">
                  {h.parecerSupervisor || 'Sem parecer registrado pelo supervisor.'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
