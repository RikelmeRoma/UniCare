import { useEffect, useMemo, useRef, useState } from 'react';
import { api, type ApiIaAssistenteResponse } from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import type { Paciente } from '../../clinic/context/ClinicContext';
import {
  CheckIcon,
  ClipboardIcon,
  ExclamationTriangleIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StopIcon,
  TrashIcon,
  XMarkIcon,
} from '../../../components/icons/CorporateIcons';
import { formatarCronometro, useVoiceRecorder } from '../hooks/useVoiceRecorder';
import {
  carregarConversaIa,
  limparConversaIa,
  montarChaveConversaIa,
  salvarConversaIa,
  type MensagemChat,
} from '../utils/chatStorage';

export interface ClinicalAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  curso: 'psicologia' | 'odontologia';
  paciente?: Paciente;
  abaAtual: string;
  rascunhoAtual?: string;
  fichaResumo?: Record<string, unknown>;
  somenteLeitura?: boolean;
  onApplyFields?: (
    campos: Record<string, string>,
    modo: 'substituir' | 'acrescentar'
  ) => void;
}

const ROTULOS_CAMPOS: Record<string, string> = {
  redacao_texto: 'Síntese da Sessão (CFP)',
  avaliacao_demanda: 'Avaliação da Demanda / Queixa',
  objetivos_intervencao: 'Objetivos da Intervenção',
  hipotese_diagnostica: 'Hipótese Diagnóstica Inicial',
  avaliacao_final: 'Avaliação Final do Caso',
  informacoes_adicionais: 'Informações Adicionais',
  historia_doenca: 'História da Doença Atual',
  plano_tratamento: 'Plano de Tratamento Programado',
  evolucao_procedimento: 'Folha de Evolução (Sessão de Hoje)',
  observacoes_exame: 'Observações do Exame / Complementares',
};

const ROTULOS_ABA: Record<string, string> = {
  registro: 'Sessão Clínica',
  demanda: 'Avaliação da Demanda',
  encerramento: 'Registro de Encerramento',
  historico: 'Linha do Tempo',
  anamnese: 'Anamnese / Ficha Clínica',
  alertas: 'Alertas Clínicos',
  exame: 'Exame Clínico & Odontograma',
  plano: 'Plano de Tratamento',
  evolucao: 'Folha de Evolução',
  exames: 'Exames & Radiografias',
};

interface AtalhoRapido {
  rotulo: string;
  modo: 'resumo' | 'rascunho' | 'chat';
  prompt: string;
}

const IA_CHAT_MODULO_SEQ = { valor: 0 };

function gerarIdMensagem(prefixo: string): string {
  IA_CHAT_MODULO_SEQ.valor += 1;
  return `${prefixo}-${Date.now()}-${IA_CHAT_MODULO_SEQ.valor}`;
}

export function ClinicalAssistantDrawer(props: ClinicalAssistantDrawerProps) {
  const { user } = useAuth();
  const chaveStorage = montarChaveConversaIa(user?.id, props.curso, props.paciente?.id);

  return (
    <ClinicalAssistantDrawerContent
      key={chaveStorage ?? `sem-paciente:${props.curso}`}
      chaveStorage={chaveStorage}
      {...props}
    />
  );
}

interface ClinicalAssistantDrawerContentProps extends ClinicalAssistantDrawerProps {
  chaveStorage: string | null;
}

function ClinicalAssistantDrawerContent({
  chaveStorage,
  open,
  onClose,
  curso,
  paciente,
  abaAtual,
  rascunhoAtual = '',
  fichaResumo,
  somenteLeitura = false,
  onApplyFields,
}: ClinicalAssistantDrawerContentProps) {
  const estadoInicial = useMemo(() => carregarConversaIa(chaveStorage), [chaveStorage]);
  const [mensagens, setMensagens] = useState<MensagemChat[]>(estadoInicial.mensagens);
  const [entrada, setEntrada] = useState(estadoInicial.entrada ?? '');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);

  const listaRef = useRef<HTMLDivElement | null>(null);

  const {
    gravando,
    segundos,
    erro: erroMic,
    suportado: micSuportado,
    iniciar,
    parar,
    cancelar,
    limparErro,
  } = useVoiceRecorder();

  useEffect(() => {
    salvarConversaIa(chaveStorage, mensagens, entrada);
  }, [chaveStorage, mensagens, entrada]);

  useEffect(() => {
    if (!open && gravando) {
      cancelar();
    }
  }, [open, gravando, cancelar]);

  // Fecha com Escape quando aberto.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open && listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }
  }, [mensagens, carregando, open]);

  const atalhos = useMemo<AtalhoRapido[]>(() => {
    if (curso === 'psicologia') {
      const lista: AtalhoRapido[] = [
        {
          rotulo: 'Resumir paciente',
          modo: 'resumo',
          prompt:
            'Faça um resumo clínico cronológico das sessões deste paciente, destacando demanda inicial, evolução, faltas ou lacunas de informação.',
        },
        {
          rotulo: 'Revisar sem aspas (CFP)',
          modo: 'rascunho',
          prompt:
            'Revise o rascunho atual garantindo 3ª pessoa, linguagem técnica psicológica e conformidade rigorosa com a Resolução CFP nº 06/2019 (sem aspas literais).',
        },
      ];
      if (abaAtual === 'demanda') {
        lista.push({
          rotulo: 'Estruturar Demanda',
          modo: 'rascunho',
          prompt:
            'Com base nas informações enviadas e no histórico disponível, estruture os campos de Avaliação da Demanda, Objetivos da Intervenção e Hipótese Diagnóstica Inicial.',
        });
      } else if (abaAtual === 'encerramento') {
        lista.push({
          rotulo: 'Rascunhar Encerramento',
          modo: 'rascunho',
          prompt:
            'Com base na trajetória clínica registrada, rascunhe a Avaliação Final do Caso e encaminhamentos pertinentes para o encerramento.',
        });
      } else {
        lista.push({
          rotulo: 'Rascunhar Síntese',
          modo: 'rascunho',
          prompt:
            'Estruture o rascunho atual (ou as notas informadas) em uma síntese clínica de sessão completa, do acolhimento ao fechamento.',
        });
      }
      return lista;
    }

    const listaOdonto: AtalhoRapido[] = [
      {
        rotulo: 'Resumir caso e alertas',
        modo: 'resumo',
        prompt:
          'Resuma os dados clínicos do paciente, alergias, condições crônicas, medicações em uso, sinais vitais e histórico de procedimentos realizados.',
      },
      {
        rotulo: 'Checar riscos e anestesia',
        modo: 'chat',
        prompt:
          'Avalie os alertas sistêmicos, alergias e sinais vitais atuais deste paciente e indique cuidados clínicos antes de anestesia ou procedimento invasivo.',
      },
    ];
    if (abaAtual === 'plano') {
      listaOdonto.push({
        rotulo: 'Organizar Plano',
        modo: 'rascunho',
        prompt:
          'Estruture uma linha clara para o Plano de Tratamento Programado com base nos achados e anotações atuais da ficha.',
      });
    } else {
      listaOdonto.push({
        rotulo: 'Gerar Evolução de Hoje',
        modo: 'rascunho',
        prompt:
          'Estruture um registro técnico conciso para a Folha de Evolução odontológica com base no rascunho ou relato informado.',
      });
    }
    return listaOdonto;
  }, [curso, abaAtual]);

  if (!open) return null;

  const corPrimaria =
    curso === 'odontologia'
      ? 'bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500'
      : 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500';

  const enviar = async (
    textoOverride?: string,
    modo: 'chat' | 'resumo' | 'rascunho' = 'chat',
    audioBlob?: Blob | null
  ) => {
    if (!paciente || carregando) return;
    const texto = (textoOverride ?? entrada).trim();
    if (!texto && !audioBlob) return;

    setErro(null);
    limparErro();

    const msgUsuario: MensagemChat = {
      id: gerarIdMensagem('u'),
      papel: 'user',
      texto: audioBlob
        ? texto || 'Áudio clínico enviado pelo microfone para o assistente.'
        : texto,
    };
    const historicoParaApi = mensagens.slice(-8).map((m) => ({
      papel: m.papel,
      texto: m.texto,
    }));

    setMensagens((prev) => [...prev, msgUsuario]);
    if (!textoOverride) setEntrada('');
    setCarregando(true);

    try {
      const resp: ApiIaAssistenteResponse = await api.consultarAssistenteIA({
        pacienteId: paciente.id,
        curso,
        modo,
        abaAtual,
        mensagem: texto,
        rascunhoAtual,
        fichaResumo,
        historico: historicoParaApi,
        audioBlob,
      });

      const msgIa: MensagemChat = {
        id: gerarIdMensagem('a'),
        papel: 'assistant',
        texto: resp.resposta,
        transcricao: resp.transcricao,
        camposSugeridos: resp.campos_sugeridos,
        alertasClinicos: resp.alertas_clinicos,
        avisosConformidade: resp.avisos_conformidade,
        modeloUtilizado: resp.modelo_utilizado,
      };
      setMensagens((prev) => [...prev, msgIa]);
    } catch (err) {
      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível consultar o assistente no momento.'
      );
    } finally {
      setCarregando(false);
    }
  };

  const alternarGravacao = async () => {
    setErro(null);
    limparErro();
    if (!gravando) {
      await iniciar();
      return;
    }
    const blob = await parar();
    if (!blob) return;
    await enviar(entrada.trim(), 'rascunho', blob);
  };

  const aplicarCamposMensagem = (
    msgId: string,
    campos: Record<string, string>,
    modo: 'substituir' | 'acrescentar'
  ) => {
    if (!onApplyFields) return;
    onApplyFields(campos, modo);
    setMensagens((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, aplicado: true } : m))
    );
  };

  const copiarTexto = async (msgId: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiadoId(msgId);
      window.setTimeout(() => setCopiadoId(null), 1800);
    } catch {
      // Fallback silencioso se clipboard API não estiver disponível
    }
  };

  const erroExibir = erro || erroMic;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Assistente Clínico IA"
    >
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="relative z-10 flex flex-col w-full max-w-lg h-full bg-white dark:bg-[#0E1729] border-l border-slate-300 dark:border-slate-700 shadow-2xl">
        {/* Cabeçalho */}
        <header className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`p-1.5 rounded-lg text-white ${
                  curso === 'odontologia' ? 'bg-emerald-600' : 'bg-blue-600'
                }`}
              >
                <SparklesIcon className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Assistente Clínico IA
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                Voz & Texto
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">
              Paciente:{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {paciente?.nome || 'Selecione um paciente'}
              </span>{' '}
              · Aba: {ROTULOS_ABA[abaAtual] || abaAtual}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheckIcon className="w-3 h-3" />
                LGPD · Dados Anonimizados
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                {curso === 'psicologia' ? 'CFP 06/2019 (Sem aspas)' : 'CFO · Segurança Clínica'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {mensagens.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMensagens([]);
                  setEntrada('');
                  setErro(null);
                  limparConversaIa(chaveStorage);
                }}
                title="Limpar conversa"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-300 dark:hover:bg-rose-950/40 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar assistente"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Ações rápidas */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1729] flex flex-wrap gap-1.5">
          {atalhos.map((atalho) => (
            <button
              key={atalho.rotulo}
              type="button"
              disabled={!paciente || carregando || gravando}
              onClick={() => void enviar(atalho.prompt, atalho.modo)}
              className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              {atalho.rotulo}
            </button>
          ))}
        </div>

        {/* Lista de mensagens */}
        <div
          ref={listaRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-slate-50/70 dark:bg-[#08101E]"
        >
          {!paciente ? (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
              Selecione um paciente no prontuário para consultar o assistente clínico.
            </div>
          ) : mensagens.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#0E1729] border border-slate-300 dark:border-slate-800 space-y-2.5 shadow-2xs">
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Como o assistente pode ajudar neste atendimento:
              </p>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>
                  Clique no <strong>microfone</strong> e fale livremente o que aconteceu ou o procedimento feito — a IA transcreve, organiza em linguagem técnica e prepara os campos para você revisar.
                </li>
                <li>
                  Use os botões rápidos acima para <strong>resumir o histórico do paciente</strong> ou checar pontos pendentes.
                </li>
                <li>
                  Nada é salvo ou enviado à supervisão automaticamente: você sempre revisa e aplica nos campos antes de salvar.
                </li>
              </ul>
              {somenteLeitura && (
                <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300 pt-1">
                  Modo consulta (Supervisão/RT): você pode resumir e tirar dúvidas sobre o prontuário; a edição de rascunho é restrita ao estagiário responsável.
                </p>
              )}
            </div>
          ) : null}

          {mensagens.map((msg) => {
            const ehUsuario = msg.papel === 'user';
            const entriesCampos = Object.entries(msg.camposSugeridos || {}).filter(
              ([, valor]) => Boolean(valor?.trim())
            );
            const blocoCompletoCopiar = entriesCampos
              .map(([chave, valor]) => `${ROTULOS_CAMPOS[chave] || chave}:\n${valor}`)
              .join('\n\n');

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${ehUsuario ? 'items-end' : 'items-start'} space-y-2`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                    ehUsuario
                      ? `${
                          curso === 'odontologia'
                            ? 'bg-emerald-700 text-white'
                            : 'bg-blue-700 text-white'
                        }`
                      : 'bg-white dark:bg-[#0E1729] text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {msg.transcricao && (
                    <div className="mb-2.5 pb-2 border-b border-slate-200 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-bold uppercase tracking-wider text-[10px] block mb-0.5">
                        Transcrição do áudio:
                      </span>
                      <span className="italic">{msg.transcricao}</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.texto}</div>

                  {!ehUsuario && msg.alertasClinicos && msg.alertasClinicos.length > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Alertas Clínicos Identificados</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-900 dark:text-amber-100">
                        {msg.alertasClinicos.map((alerta, i) => (
                          <li key={i}>{alerta}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!ehUsuario && entriesCampos.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Sugestão pronta para os campos da ficha:
                      </p>

                      <div className="space-y-2">
                        {entriesCampos.map(([chave, valor]) => (
                          <div
                            key={chave}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700"
                          >
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                              {ROTULOS_CAMPOS[chave] || chave}
                            </span>
                            <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                              {valor}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {!somenteLeitura && onApplyFields && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                aplicarCamposMensagem(
                                  msg.id,
                                  msg.camposSugeridos || {},
                                  'substituir'
                                )
                              }
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-colors ${corPrimaria}`}
                            >
                              <CheckIcon className="w-3.5 h-3.5" />
                              <span>
                                {msg.aplicado ? 'Aplicado nos campos' : 'Aplicar nos campos'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                aplicarCamposMensagem(
                                  msg.id,
                                  msg.camposSugeridos || {},
                                  'acrescentar'
                                )
                              }
                              className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              Acrescentar ao rascunho
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => void copiarTexto(msg.id, blocoCompletoCopiar || msg.texto)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <ClipboardIcon className="w-3.5 h-3.5" />
                          <span>{copiadoId === msg.id ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {!ehUsuario && msg.modeloUtilizado && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                      <span>Modelo: {msg.modeloUtilizado}</span>
                      {msg.avisosConformidade?.[0] && (
                        <span className="truncate" title={msg.avisosConformidade.join(' ')}>
                          Revise antes de salvar
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {carregando && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-[#0E1729] border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 w-fit">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>Analisando prontuário e gerando resposta clínica…</span>
            </div>
          )}
        </div>

        {/* Rodapé / Input Multimodal */}
        <footer className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1729] space-y-2.5">
          {erroExibir && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-[11px] text-rose-800 dark:text-rose-200">
              {erroExibir}
            </div>
          )}

          {gravando && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-center gap-2 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                <span>Gravando áudio clínico</span>
                <span className="font-mono tabular-nums">
                  {formatarCronometro(segundos)}
                </span>
              </div>
              <button
                type="button"
                onClick={cancelar}
                className="text-[11px] font-bold underline hover:no-underline"
              >
                Cancelar
              </button>
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              rows={2}
              value={entrada}
              disabled={!paciente || carregando}
              onChange={(e) => setEntrada(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void enviar();
                }
              }}
              placeholder={
                gravando
                  ? 'Gravando... clique no botão vermelho ao lado para enviar.'
                  : 'Pergunte sobre o paciente ou dite o atendimento (Enter envia)...'
              }
              className="flex-1 resize-none rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 transition-colors"
            />

            {micSuportado && (
              <button
                type="button"
                disabled={!paciente || carregando}
                onClick={() => void alternarGravacao()}
                title={
                  gravando
                    ? 'Finalizar gravação e enviar para a IA'
                    : 'Falar no microfone para a IA escrever/responder'
                }
                aria-label={gravando ? 'Parar e enviar áudio' : 'Gravar áudio'}
                className={`p-2.5 rounded-xl border transition-all shrink-0 disabled:opacity-50 ${
                  gravando
                    ? 'bg-rose-600 hover:bg-rose-700 border-rose-700 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
              >
                {gravando ? (
                  <StopIcon className="w-4 h-4" />
                ) : (
                  <MicrophoneIcon className="w-4 h-4" />
                )}
              </button>
            )}

            <button
              type="button"
              disabled={!paciente || carregando || gravando || !entrada.trim()}
              onClick={() => void enviar()}
              aria-label="Enviar mensagem"
              className={`p-2.5 rounded-xl text-white transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${corPrimaria}`}
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
