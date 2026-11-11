import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AppLayout } from '../../../../components/layout/AppLayout';
import { useAuth } from '../../../auth/context/AuthContext';
import { useClinic, type EvolucaoPsico } from '../../../clinic/context/ClinicContext';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PrinterIcon,
} from '../../../../components/icons/CorporateIcons';
import { RelatorioImpressao } from '../../../../shared/impressao/RelatorioImpressao';
import { ProntuarioPsicoPrint } from '../components/ProntuarioPsicoPrint';
import {
  calcularIdade,
  formatarDataBr,
  META_TIPO_REGISTRO_PSICO,
  MOTIVOS_ENCERRAMENTO_PSICO,
} from '../../constants/psico';

/** Converte `dd/mm/aaaa` para `YYYY-MM-DD` para que a comparação de strings
 *  ordene por dia real. Devolve `null` quando a string não é uma data válida
 *  (sessões anteriores à validação, ou campo vazio) — aí a sessão vai para o
 *  fim da lista, não vira a mais antiga. */
function parseDataPt(s?: string | null): string | null {
  if (!s) return null;
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  return `${ano}-${mes}-${dia}`;
}

function historicoOrdenado(lista: EvolucaoPsico[]): EvolucaoPsico[] {
  return [...lista].sort((a, b) => {
    const da = parseDataPt(a.dataSessao);
    const db = parseDataPt(b.dataSessao);
    if (da === null && db === null) return a.id - b.id;
    if (da === null) return 1;
    if (db === null) return -1;
    if (da !== db) return da < db ? -1 : 1;
    return a.id - b.id;
  });
}

export function PsyRecordPage() {
  const { user } = useAuth();
  const { pacientes, evolucoesPsico, adicionarEvolucaoPsico, atribuicoes, sync } =
    useClinic();

  const isEstagiario = user?.perfil === 'estagiario';

  // O vínculo decide quem o estagiário atende (RF-001). Supervisor, RT e
  // coordenação abrem esta tela apenas para consultar a linha do tempo — o
  // vínculo é de responsabilidade do aluno — então para eles a clínica
  // continua inteira. O servidor recusa a escrita desses perfis em
  // `POST /prontuarios/psico`; `_validar_vinculo_estagiario` só roda para o
  // perfil ESTAGIÁRIO.
  const pacientesPsico = useMemo(() => {
    const daClinica = pacientes.filter(
      (p) => p.curso === 'psicologia' || p.curso === 'ambos'
    );
    if (!isEstagiario) return daClinica;
    const meus = new Set(atribuicoes.map((a) => a.pacienteId));
    return daClinica.filter((p) => meus.has(p.id));
  }, [pacientes, atribuicoes, isEstagiario]);

  // A API do vínculo não éfiltrada por clínica no cliente, e `atribuicoes` só
  // recebe a lista de quem está chamando. Estagiário sem nenhum vínculo
  // recebe 403 com a orientação de procurar a recepção — a tela repete a
  // instrução em vez de mostrar um <select> vazio sem explicação.
  const vinculoIndisponivel =
    isEstagiario &&
    (sync.estado === 'erro' || sync.estado === 'aguardando-login');
  const semVinculo = isEstagiario && !vinculoIndisponivel && pacientesPsico.length === 0;

  // `?? 1` era id fixo: no primeiro render a lista real ainda não tinha chegado,
  // então o <select> ficava sem opção correspondente quando os ids do banco eram
  // outros. O valor exibido é derivado do paciente resolvido, não do estado cru.
  //
  // "Meus Agendamentos" manda o paciente escolhido pelo `state` da navegação.
  // Lido uma vez, na montagem: depois disso quem muda o paciente é o <select>,
  // pelo caminho de sempre.
  const location = useLocation();
  const pacienteDaNavegacao = (location.state as { pacienteId?: number } | null)
    ?.pacienteId;

  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(
    pacienteDaNavegacao ?? undefined
  );


  const pacienteSelecionado =
    pacientesPsico.find((p) => p.id === selectedPatientId) || pacientesPsico[0];

  const [activeTab, setActiveTab] = useState<'registro' | 'demanda' | 'encerramento' | 'historico'>('registro');
  const [showImpressao, setShowImpressao] = useState(false);

  // A escrita é exclusiva do estagiário. Para os demais perfis, a tela sempre
  // abre na linha do tempo, mesmo que o estado da aba ainda seja o inicial.
  const abaAtiva = isEstagiario ? activeTab : 'historico';

  // Histórico de registros do paciente atual (Demanda, Sessões e Encerramento).
  // A ordenação é feita a partir de `dataSessao`, que chega como `dd/mm/aaaa`:
  // converte para ISO antes de comparar. Registros sem data ficam no fim.
  const historicoSessoes = historicoOrdenado(
    evolucoesPsico.filter((e) => e.pacienteId === pacienteSelecionado?.id)
  );

  // Parâmetros da sessão
  const totalSessoesClinicas = historicoSessoes.filter((e) => e.tipoRegistro === 'SESSAO').length;
  const proximaSessaoNumero = `Sessão ${(totalSessoesClinicas + 1).toString().padStart(2, '0')}`;
  const [numeroSessao, setNumeroSessao] = useState(proximaSessaoNumero);
  // `new Date().toISOString()` vira UTC e, em Aracaju (UTC-3), entre 21h e 24h
  // sai como o dia seguinte. O mesmo cuidado que o modal de agendamento e o
  // `rotuloData` de `PsyAppointmentsPage` já tomam.
  const hojeLocal = new Date();
  const mes = String(hojeLocal.getMonth() + 1).padStart(2, '0');
  const dia = String(hojeLocal.getDate()).padStart(2, '0');
  const hojeIsoLocal = `${hojeLocal.getFullYear()}-${mes}-${dia}`;
  const [dataSessao, setDataSessao] = useState(hojeIsoLocal);

  // Parametros da sessao e o texto redigido abaixo.
  // Nascem VAZIOS de propósito.
  const [redacao, setRedacao] = useState('');

  // Campos da folha Avaliação da Demanda (UNINASSAU-AJU)
  const [dataDemanda, setDataDemanda] = useState(hojeIsoLocal);
  const [avaliacaoDemanda, setAvaliacaoDemanda] = useState('');
  const [objetivosIntervencao, setObjetivosIntervencao] = useState('');
  const [hipoteseDiagnostica, setHipoteseDiagnostica] = useState('');

  // Campos da folha Registro de Encerramento (UNINASSAU-AJU)
  const [dataEncerramento, setDataEncerramento] = useState(hojeIsoLocal);
  const [avaliacaoFinal, setAvaliacaoFinal] = useState('');
  const [motivosEncerramento, setMotivosEncerramento] = useState<string[]>([]);
  const [informacoesAdicionais, setInformacoesAdicionais] = useState('');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registroGerado, setRegistroGerado] = useState<number | null>(null);
  const [ultimoTipoSubmetido, setUltimoTipoSubmetido] = useState<'SESSAO' | 'DEMANDA' | 'ENCERRAMENTO'>('SESSAO');
  const [isSaving, setIsSaving] = useState(false);
  const [erroMsg, setErroMsg] = useState('');

  // Detecção estrita de aspas (RN-002 / CFP nº 06/2019) na aba em preenchimento
  const quoteRegex = /["“”«»]/;
  const temAspas =
    abaAtiva === 'registro'
      ? quoteRegex.test(redacao)
      : abaAtiva === 'demanda'
        ? quoteRegex.test(avaliacaoDemanda) ||
          quoteRegex.test(objetivosIntervencao) ||
          quoteRegex.test(hipoteseDiagnostica)
        : abaAtiva === 'encerramento'
          ? quoteRegex.test(avaliacaoFinal) || quoteRegex.test(informacoesAdicionais)
          : false;

  // A redacao e obrigatoria. O servidor tambem recusa texto em branco
  // (validar_texto_clinico) - a tela avisa antes para o estagiario nao tomar
  // 422 depois de escrever tudo.
  const faltaSintese = redacao.trim().length === 0;
  const faltaDemanda =
    !avaliacaoDemanda.trim() || !objetivosIntervencao.trim() || !hipoteseDiagnostica.trim();
  const faltaEncerramento = !avaliacaoFinal.trim() || motivosEncerramento.length === 0;

  const removerAspasAutomaticamente = () => {
    const limpar = (v: string) => v.replace(/[“”«»"]/g, '');
    if (abaAtiva === 'registro') {
      setRedacao(limpar);
    } else if (abaAtiva === 'demanda') {
      setAvaliacaoDemanda(limpar);
      setObjetivosIntervencao(limpar);
      setHipoteseDiagnostica(limpar);
    } else if (abaAtiva === 'encerramento') {
      setAvaliacaoFinal(limpar);
      setInformacoesAdicionais(limpar);
    }
  };

  const alternarMotivoEncerramento = (motivo: string) => {
    setMotivosEncerramento((prev) =>
      prev.includes(motivo) ? prev.filter((m) => m !== motivo) : [...prev, motivo]
    );
  };

  const enviarRegistro = async (
    payload: Parameters<typeof adicionarEvolucaoPsico>[0],
    tipo: 'SESSAO' | 'DEMANDA' | 'ENCERRAMENTO',
    aoConcluir: () => void
  ) => {
    if (!isEstagiario || temAspas || !pacienteSelecionado || isSaving) return;

    setIsSaving(true);
    setErroMsg('');
    const resultado = await adicionarEvolucaoPsico(payload);
    setIsSaving(false);

    if (!resultado.success || !resultado.evolucao) {
      setErroMsg(resultado.message);
      return;
    }

    aoConcluir();
    setUltimoTipoSubmetido(tipo);
    setRegistroGerado(resultado.evolucao.id);
    setShowSuccessModal(true);
  };

  const handleSalvarEnviar = () => {
    if (faltaSintese || !pacienteSelecionado) return;
    void enviarRegistro(
      {
        pacienteId: pacienteSelecionado.id,
        pacienteNome: pacienteSelecionado.nome,
        estagiarioNome: user?.nome || '',
        estagiarioMatricula: user?.matricula || '',
        supervisorNome: '',
        dataSessao: formatarDataBr(dataSessao),
        numeroSessao,
        tipoRegistro: 'SESSAO',
        redacaoTexto: redacao,
      },
      'SESSAO',
      () => {
        setRedacao('');
      }
    );
  };

  const handleSalvarDemanda = () => {
    if (faltaDemanda || !pacienteSelecionado) return;
    void enviarRegistro(
      {
        pacienteId: pacienteSelecionado.id,
        pacienteNome: pacienteSelecionado.nome,
        estagiarioNome: user?.nome || '',
        estagiarioMatricula: user?.matricula || '',
        supervisorNome: '',
        dataSessao: formatarDataBr(dataDemanda),
        numeroSessao: 'Avaliação da Demanda',
        tipoRegistro: 'DEMANDA',
        redacaoTexto: '',
        avaliacaoDemanda,
        objetivosIntervencao,
        hipoteseDiagnostica,
      },
      'DEMANDA',
      () => {
        setAvaliacaoDemanda('');
        setObjetivosIntervencao('');
        setHipoteseDiagnostica('');
      }
    );
  };

  const handleSalvarEncerramento = () => {
    if (faltaEncerramento || !pacienteSelecionado) return;
    void enviarRegistro(
      {
        pacienteId: pacienteSelecionado.id,
        pacienteNome: pacienteSelecionado.nome,
        estagiarioNome: user?.nome || '',
        estagiarioMatricula: user?.matricula || '',
        supervisorNome: '',
        dataSessao: formatarDataBr(dataEncerramento),
        numeroSessao: 'Encerramento',
        tipoRegistro: 'ENCERRAMENTO',
        redacaoTexto: '',
        avaliacaoFinal,
        motivosEncerramento,
        informacoesAdicionais,
      },
      'ENCERRAMENTO',
      () => {
        setAvaliacaoFinal('');
        setMotivosEncerramento([]);
        setInformacoesAdicionais('');
      }
    );
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
      info="Registro estruturado de psicoterapia e histórico longitudinal sob conformidade com a Resolução CFP nº 06/2019 e LGPD Artigo 11"
      actions={
        <div className="w-64 sm:w-72">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            {isEstagiario ? 'Meus Pacientes (SPA)' : 'Paciente Ativo (SPA)'}
          </label>
          {semVinculo || vinculoIndisponivel ? (
            // <select> vazio sem explicação deixava o aluno achando que o
            // sistema quebrou. O que ele precisa fazer é falar com a recepção.
            <p className="text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {vinculoIndisponivel
                ? 'Não foi possível carregar seus pacientes.'
                : 'Nenhum paciente vinculado a você. Procure a recepção da clínica para ser atribuído.'}
            </p>
          ) : (
            <select
              value={pacienteSelecionado?.id ?? ''}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
            >
              {pacientesPsico.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          )}
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
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registros na linha do tempo</p>
              <p className="text-xs font-semibold text-slate-800 font-mono">
                {historicoSessoes.length}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {isEstagiario ? 'Responsável pelo registro' : 'Consulta de prontuário'}
              </p>
              <p className="text-xs font-semibold text-slate-800 truncate max-w-[14rem]">
                {user?.nome || '—'}
              </p>
            </div>
            <button
              type="button"
              disabled={!pacienteSelecionado}
              onClick={() => setShowImpressao(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs transition-colors"
            >
              <PrinterIcon className="w-4 h-4" />
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>

        {/* Menu de Abas Segmentadas */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap gap-1">
          {isEstagiario && (
            <>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('registro');
                  setErroMsg('');
                }}
                className={`flex-1 min-w-[190px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  abaAtiva === 'registro'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>Registrar Nova Sessão Clínica</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('demanda');
                  setErroMsg('');
                }}
                className={`flex-1 min-w-[140px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  abaAtiva === 'demanda'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>Demanda</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('encerramento');
                  setErroMsg('');
                }}
                className={`flex-1 min-w-[150px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                  abaAtiva === 'encerramento'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>Encerramento</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab('historico');
              setErroMsg('');
            }}
            className={`flex-1 min-w-[200px] py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              abaAtiva === 'historico'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ClockIcon className="w-4 h-4" />
            <span>Linha do Tempo Cronológica</span>

            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                abaAtiva === 'historico' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {historicoSessoes.length}
            </span>
          </button>
        </div>

        {/* ALERTA NORMATIVO ANTI-ASPAS (RN-002 / CFP nº 06/2019) */}
        {temAspas && abaAtiva !== 'historico' && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs flex items-start gap-3.5">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                  Inconformidade Técnica
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

        {abaAtiva === 'registro' ? (
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
                  Ordem Cronológica
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
                    value="Preenchido na homologação pelo supervisor docente"
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-500 outline-none font-medium cursor-not-allowed italic"
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
                  placeholder="Descreva a sessao em ordem cronologica, do acolhimento ao fechamento: o que trouxe o paciente (3ª pessoa), o que foi trabalhado e como a sessao terminou..."
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
        ) : abaAtiva === 'demanda' ? (
          /* ABA 2: FOLHA DE AVALIAÇÃO DA DEMANDA (UNINASSAU-AJU) */
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Avaliação da Demanda — Estágio Supervisionado Psicologia
                </h3>
                <p className="text-xs text-slate-500">
                  Ficha inicial do Prontuário Psicológico UNINASSAU-AJU integrada à linha do tempo.
                </p>
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Data do Registro
                </label>
                <input
                  type="date"
                  value={dataDemanda}
                  onChange={(e) => setDataDemanda(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white font-mono"
                />
              </div>
            </div>

            {/* Quadro cadastral padrão UNINASSAU-AJU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Cliente</span>
                <span className="font-semibold text-slate-800">{pacienteSelecionado?.nome || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Nascimento / Idade</span>
                <span className="font-mono text-slate-800">
                  {formatarDataBr(pacienteSelecionado?.dataNascimento)} · {calcularIdade(pacienteSelecionado?.dataNascimento)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Estagiário</span>
                <span className="font-semibold text-slate-800">{user?.nome || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Responsável / CPF</span>
                <span className="text-slate-800">
                  {pacienteSelecionado?.nomeResponsavel || 'Não aplicável'} ·{' '}
                  <span className="font-mono">{pacienteSelecionado?.cpf || '—'}</span>
                </span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Avaliação da Demanda ou Queixa: *
                </label>
                <textarea
                  rows={4}
                  value={avaliacaoDemanda}
                  onChange={(e) => setAvaliacaoDemanda(e.target.value)}
                  placeholder="Descreva a queixa apresentada, contexto clínico e demanda inicial sem utilizar aspas literais..."
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-none focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Definição dos Objetivos da Intervenção: *
                </label>
                <textarea
                  rows={4}
                  value={objetivosIntervencao}
                  onChange={(e) => setObjetivosIntervencao(e.target.value)}
                  placeholder="Informe os objetivos terapêuticos e plano de intervenção proposto..."
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-none focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Hipótese Diagnóstica Inicial: *
                </label>
                <textarea
                  rows={3}
                  value={hipoteseDiagnostica}
                  onChange={(e) => setHipoteseDiagnostica(e.target.value)}
                  placeholder="Registre a hipótese diagnóstica inicial e observações clínicas..."
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-none focus:bg-white focus:border-blue-600 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAvaliacaoDemanda('');
                  setObjetivosIntervencao('');
                  setHipoteseDiagnostica('');
                  setErroMsg('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Limpar Folha de Demanda
              </button>
              <button
                type="button"
                disabled={temAspas || faltaDemanda || !pacienteSelecionado || isSaving}
                onClick={handleSalvarDemanda}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs ${
                  temAspas || faltaDemanda || !pacienteSelecionado || isSaving
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {isSaving ? 'Enviando…' : 'Registrar Demanda na Linha do Tempo'}
              </button>
            </div>

            {faltaDemanda && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl">
                Preencha os três campos da Avaliação da Demanda antes de enviar para homologação.
              </div>
            )}

            {erroMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                Não foi possível submeter a Avaliação da Demanda: {erroMsg}
              </div>
            )}
          </div>
        ) : abaAtiva === 'encerramento' ? (
          /* ABA 3: FOLHA DE REGISTRO DE ENCERRAMENTO (UNINASSAU-AJU) */
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Registro de Encerramento — Estágio Supervisionado Psicologia
                </h3>
                <p className="text-xs text-slate-500">
                  Desfecho clínico do Prontuário Psicológico UNINASSAU-AJU integrado à linha do tempo.
                </p>
              </div>
              <div className="w-full sm:w-48">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Data do Encerramento
                </label>
                <input
                  type="date"
                  value={dataEncerramento}
                  onChange={(e) => setDataEncerramento(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white font-mono"
                />
              </div>
            </div>

            {/* Quadro cadastral padrão UNINASSAU-AJU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Cliente</span>
                <span className="font-semibold text-slate-800">{pacienteSelecionado?.nome || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Nascimento / Idade</span>
                <span className="font-mono text-slate-800">
                  {formatarDataBr(pacienteSelecionado?.dataNascimento)} · {calcularIdade(pacienteSelecionado?.dataNascimento)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Estagiário</span>
                <span className="font-semibold text-slate-800">{user?.nome || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Responsável / CPF</span>
                <span className="text-slate-800">
                  {pacienteSelecionado?.nomeResponsavel || 'Não aplicável'} ·{' '}
                  <span className="font-mono">{pacienteSelecionado?.cpf || '—'}</span>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Avaliação Final do Caso: *
              </label>
              <textarea
                rows={4}
                value={avaliacaoFinal}
                onChange={(e) => setAvaliacaoFinal(e.target.value)}
                placeholder="Descreva a evolução global do processo terapêutico e avaliação final sem citações entre aspas..."
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-none focus:bg-white focus:border-blue-600 transition-all"
              />
            </div>

            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-slate-800">
                Registro de Encerramento *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {MOTIVOS_ENCERRAMENTO_PSICO.map((motivo) => {
                  const selecionado = motivosEncerramento.includes(motivo);
                  return (
                    <label
                      key={motivo}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        selecionado
                          ? 'bg-blue-50/80 border-blue-500 text-blue-950 font-semibold'
                          : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selecionado}
                        onChange={() => alternarMotivoEncerramento(motivo)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                      />
                      <span>{motivo}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Informações Adicionais:
              </label>
              <textarea
                rows={3}
                value={informacoesAdicionais}
                onChange={(e) => setInformacoesAdicionais(e.target.value)}
                placeholder="Encaminhamentos, recomendações de continuidade ou observações complementares (opcional)..."
                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed outline-none focus:bg-white focus:border-blue-600 transition-all"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setAvaliacaoFinal('');
                  setMotivosEncerramento([]);
                  setInformacoesAdicionais('');
                  setErroMsg('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Limpar Folha de Encerramento
              </button>
              <button
                type="button"
                disabled={temAspas || faltaEncerramento || !pacienteSelecionado || isSaving}
                onClick={handleSalvarEncerramento}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs ${
                  temAspas || faltaEncerramento || !pacienteSelecionado || isSaving
                    ? 'bg-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                {isSaving ? 'Enviando…' : 'Registrar Encerramento na Linha do Tempo'}
              </button>
            </div>

            {faltaEncerramento && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl">
                Informe a Avaliação Final do Caso e selecione ao menos uma opção em Registro de Encerramento.
              </div>
            )}

            {erroMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                Não foi possível submeter o Registro de Encerramento: {erroMsg}
              </div>
            )}
          </div>
        ) : (
           /* ABA 4: LINHA DO TEMPO CRONOLÓGICA UNIFICADA (Demanda + Sessões + Encerramento) */

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Histórico Unificado do Prontuário
                </h3>
                <p className="text-xs text-slate-500">
                  Paciente: <strong className="text-slate-800">{pacienteSelecionado?.nome}</strong> •{' '}
                  Demanda, Sessões Clínicas e Encerramento em ordem cronológica
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                  {historicoSessoes.length} registro(s)
                </span>
                <button
                  type="button"
                  disabled={!pacienteSelecionado}
                  onClick={() => setShowImpressao(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold transition-colors"
                >
                  <PrinterIcon className="w-3.5 h-3.5" />
                  <span>Exportar PDF</span>
                </button>
              </div>
            </div>

            {historicoSessoes.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <DocumentTextIcon className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">Nenhum registro clínico anterior para este paciente.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historicoSessoes.map((sessao, index) => {
                  const meta = META_TIPO_REGISTRO_PSICO[sessao.tipoRegistro] ?? META_TIPO_REGISTRO_PSICO.SESSAO;
                  const est = (sessao.conteudoEstruturado ?? {}) as Record<string, unknown>;

                  return (
                    <div
                      key={sessao.id || index}
                      className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2.5 border-b border-slate-200/60">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${meta.classeBadge}`}
                          >
                            {meta.badge}
                          </span>
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
                          ) : sessao.status === 'DEVOLVIDO_PARA_AJUSTE' ? (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5">
                              <ExclamationTriangleIcon className="w-3.5 h-3.5 text-amber-700" />
                              Devolvido para Ajuste
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                              <ClockIcon className="w-3.5 h-3.5 text-purple-600" />
                              Aguardando Visto Docente
                            </span>
                          )}
                        </div>
                      </div>

                      {sessao.tipoRegistro === 'DEMANDA' && sessao.conteudoEstruturado ? (
                        <div className="space-y-2.5 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Avaliação da Demanda ou Queixa
                            </p>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                              {String(est.avaliacao_demanda ?? '')}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Definição dos Objetivos da Intervenção
                            </p>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                              {String(est.objetivos_intervencao ?? '')}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Hipótese Diagnóstica Inicial
                            </p>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                              {String(est.hipotese_diagnostica ?? '')}
                            </p>
                          </div>
                        </div>
                      ) : sessao.tipoRegistro === 'ENCERRAMENTO' && sessao.conteudoEstruturado ? (
                        <div className="space-y-2.5 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                              Avaliação Final do Caso
                            </p>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                              {String(est.avaliacao_final ?? '')}
                            </p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                              Registro de Encerramento
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(Array.isArray(est.motivos_encerramento)
                                ? est.motivos_encerramento.map(String)
                                : []
                              ).map((motivo) => (
                                <span
                                  key={motivo}
                                  className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-[11px] font-semibold"
                                >
                                  {motivo}
                                </span>
                              ))}
                            </div>
                          </div>
                          {typeof est.informacoes_adicionais === 'string' &&
                            est.informacoes_adicionais.trim() !== '' && (
                              <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                  Informações Adicionais
                                </p>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                                  {est.informacoes_adicionais}
                                </p>
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            Síntese da Sessão
                          </p>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                            {sessao.redacaoTexto}
                          </p>
                        </div>
                      )}

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
                  );
                })}
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
                  {ultimoTipoSubmetido === 'DEMANDA'
                    ? 'Avaliação da Demanda Registrada'
                    : ultimoTipoSubmetido === 'ENCERRAMENTO'
                      ? 'Registro de Encerramento Submetido'
                      : 'Evolução Clínica Submetida com Sucesso'}
                </h3>
                <p className="text-xs text-slate-500">
                  O registro entrou na linha do tempo do paciente e foi encaminhado para homologação docente.
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

        {showImpressao && pacienteSelecionado && (
          <RelatorioImpressao
            titulo={`Prontuário Psicológico · ${pacienteSelecionado.nome}`}
            nomeArquivo={`prontuario-psicologico-${pacienteSelecionado.nome.toLowerCase().replace(/\s+/g, '-')}`}
            onClose={() => setShowImpressao(false)}
          >
            <ProntuarioPsicoPrint
              paciente={pacienteSelecionado}
              registros={historicoSessoes}
              estagiarioResponsavel={isEstagiario ? user?.nome : undefined}
              supervisorExibicao={!isEstagiario ? user?.nome : undefined}
            />
          </RelatorioImpressao>
        )}
      </div>
    </AppLayout>
  );
}
