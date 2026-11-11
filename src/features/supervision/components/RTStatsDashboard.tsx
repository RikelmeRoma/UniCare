import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  api,
  ApiError,
  type ApiDocumentoFichaOdonto,
  type ApiRadiografiaOdonto,
  type RelatorioEstatisticas,
  type ApiLogAuditoria,
} from '../../../services/api';
import { useClinic, type DocumentoFichaOdonto } from '../../clinic/context/ClinicContext';
import { useAuth, type RoleType, type CourseType } from '../../auth/context/AuthContext';
import { SolicitacoesCadastro } from './SolicitacoesCadastro';
import { RelatorioImpressao } from '../../../shared/impressao/RelatorioImpressao';
import { RelatorioExecutivo } from '../report/RelatorioExecutivo';
import { DossieCustodia } from '../report/DossieCustodia';
import { InfoTooltip } from '../../../components/ui/InfoTooltip';
import { IndicadoresPrint } from '../print/IndicadoresPrint';
import { DossiePacientePrint } from '../print/DossiePacientePrint';
import {
  ChartBarIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  PrinterIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  BuildingOfficeIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  KeyIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
} from '../../../components/icons/CorporateIcons';

const ROTULOS_PERFIL: Record<string, string> = {
  rt: 'Responsável Técnico (RT)',
  coordenacao: 'Coordenação',
  supervisor: 'Supervisor Docente',
  estagiario: 'Acadêmico Estagiário',
  recepcao: 'Operador de Recepção',
};

interface RTStatsDashboardProps {
  modo?: 'rt' | 'coordenacao';
}

const mapearDocumentoOdonto = (
  doc: ApiDocumentoFichaOdonto,
  pacienteNome: string
): DocumentoFichaOdonto => ({
  id: doc.id,
  pacienteId: doc.paciente_id,
  pacienteNome,
  tipo: doc.tipo,
  duplaEstagiarios: doc.dupla_estagiarios,
  operadorMatricula: doc.operador_matricula,
  auxiliarMatricula: doc.auxiliar_matricula,
  status: doc.status,
  parecerSupervisor: doc.parecer_supervisor,
  supervisorNome: doc.supervisor_nome,
  versao: doc.versao,
  submetidoEm: doc.submetido_em ?? '',
  atualizadoEm: doc.atualizado_em,
  conteudo: doc.conteudo,
});

export function RTStatsDashboard({ modo = 'rt' }: RTStatsDashboardProps) {
  const { pacientes, agendamentos, evolucoesPsico, planosTratamento } = useClinic();
  const { allUsers, createUser, updateUser, deleteUser, carregarUsuarios, user } = useAuth();
  const [stats, setStats] = useState<RelatorioEstatisticas | null>(null);
  const [logs, setLogs] = useState<ApiLogAuditoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filtroLog, setFiltroLog] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'indicadores' | 'custodia' | 'auditoria' | 'usuarios'>('indicadores');
  const filtroCurso: 'psicologia' | 'odontologia' =
    user?.curso === 'odontologia' ? 'odontologia' : 'psicologia';

  // Documento impresso aberto. `null` = fechado. O relatório não é impresso
  // direto: primeiro abre em prévia A4, para a pessoa conferir antes de salvar
  // o PDF — e para o navegador imprimir o documento, não a tela do painel.
  const [relatorioAberto, setRelatorioAberto] = useState<'executivo' | 'dossie' | null>(null);

  // Estados de Criação e Gestão de Usuários RBAC pela RT Master
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formMatricula, setFormMatricula] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPerfil, setFormPerfil] = useState<RoleType>('supervisor');
  const [formRegistro, setFormRegistro] = useState('');
  // O backend exige senha no cadastro: antes a tela prometia "unicare123" sem
  // pedir nada e o banco nunca recebia hash nenhum.
  const [formSenha, setFormSenha] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSuccessMsg, setUserSuccessMsg] = useState('');
  const [userErrorMsg, setUserErrorMsg] = useState('');

  // Estados de Edição e Exclusão de Usuários
  const [editingUserKey, setEditingUserKey] = useState<string | null>(null);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPerfil, setEditPerfil] = useState<RoleType>('supervisor');
  const [editCurso, setEditCurso] = useState<CourseType>('psicologia');
  const [editRegistro, setEditRegistro] = useState('');
  const [userToDelete, setUserToDelete] = useState<{ key: string; nome: string } | null>(null);

  // Estado para busca de custódia de prontuários (RF-006)
  const [buscaPaciente, setBuscaPaciente] = useState<string>('');
  const [pacienteCustodiaId, setPacienteCustodiaId] = useState<number>(pacientes[0]?.id || 1);

  const [printTarget, setPrintTarget] = useState<'indicadores' | 'custodia' | null>(null);
  const [dossieLoading, setDossieLoading] = useState(false);
  const [dossieErro, setDossieErro] = useState('');
  const [dossieDocumento, setDossieDocumento] = useState<DocumentoFichaOdonto | null>(null);
  const [dossieRadiografias, setDossieRadiografias] = useState<ApiRadiografiaOdonto[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function carregarDados() {
      try {
        setLoading(true);
        const [statsData, logsData] = await Promise.allSettled([
          api.getEstatisticas(filtroCurso),
          api.getAuditoria(100, filtroCurso),
        ]);

        if (!isMounted) return;

        if (statsData.status === 'fulfilled') {
          setStats(statsData.value);
        }
        if (logsData.status === 'fulfilled') {
          setLogs(logsData.value);
        }
      } catch (err) {
        console.warn('Falha ao obter métricas da API, operando com cache corporativo local:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    carregarDados();
    return () => {
      isMounted = false;
    };
  }, [filtroCurso]);

  // Métricas calculadas
  const totalPacientesLocal = pacientes.length;
  const totalAgendamentosLocal = agendamentos.length;
  const faltasLocal = agendamentos.filter((a) => a.status === 'FALTOU').length;
  const taxaAbsenteismoLocal =
    totalAgendamentosLocal > 0 ? Math.round((faltasLocal / totalAgendamentosLocal) * 100) : 0;

  const totalPacientes = stats?.resumo_executivo?.total_pacientes ?? totalPacientesLocal;
  const totalAgendamentos = stats?.resumo_executivo?.total_agendamentos ?? totalAgendamentosLocal;
  const taxaComparecimento = stats?.resumo_executivo?.taxa_comparecimento_pct ?? (100 - taxaAbsenteismoLocal);
  const taxaAbsenteismo = stats?.resumo_executivo?.taxa_absenteismo_pct ?? taxaAbsenteismoLocal;

  // Vertical slice: o backend devolve distribuicao_cursos apenas com a chave da
  // clínica do solicitante. Ler .psicologia e .odontologia fixos mostraria
  // números de outro curso — ou cairia nos fallbacks inventados (?? 1, ?? 2).
  const cursoPainel = filtroCurso;
  const isCoordenacao = user?.perfil === 'coordenacao';
  const isPainelPsicologia =
    modo === 'coordenacao' ||
    (user?.perfil === 'rt' && user?.curso === 'psicologia');
  const gestaoLabel = isCoordenacao
    ? 'Coordenação de Psicologia'
    : 'Responsável Técnica (RT)';

  // Nome sugerido do PDF. O Chrome usa `document.title` no diálogo de
  // impressão; `RelatorioImpressao` troca o título só durante o diálogo.
  const agoraDoRelatorio = new Date();
  const dataDoArquivo = `${agoraDoRelatorio.getFullYear()}-${String(
    agoraDoRelatorio.getMonth() + 1
  ).padStart(2, '0')}-${String(agoraDoRelatorio.getDate()).padStart(2, '0')}`;
  const bloco = stats?.distribuicao_cursos?.[cursoPainel] as
    | Record<string, number>
    | undefined;
  // Sem API não se inventa número de tela docente.
  const num = (chave: string) => bloco?.[chave] ?? 0;

  // Antes, quando /relatorios/estatisticas falhava, `stats` ficava null em
  // silêncio e os cards caíam nos fallbacks locais — que ainda eram os mocks
  // INITIAL_*. Um painel gerencial exibindo número inventado sem nenhum aviso é
  // pior do que um painel explicitamente sem dado.
  const semRelatorio = !stats;

  // A barra tinha largura fixa ('60%', '40%') ao lado de um número real, então
  // o card mostrava duas verdades diferentes. Agora a largura é a participação
  // do item no total da própria clínica.
  const pct = (chave: string) => {
    const total = (bloco?.prontuarios_submetidos ?? 0) + (bloco?.fichas_clinicas_totais ?? 0);
    if (!total) return 0;
    return Math.round((num(chave) / total) * 100);
  };

  // A barra dos menores reflecte a proporção real de conformidade: o valor fixo
  // '100%' afirmava que todos os menores têm responsável, o que o relatório não
  // garante (conta só os que têm).
  const menoresTotal = pacientes.filter((p) => p.ehMenor).length;
  const pctMenoresConformidade =
    menoresTotal === 0
      ? 100
      : Math.round(((stats?.conformidade_legal?.pacientes_menores_com_responsavel ?? 0) / menoresTotal) * 100);

  const logsFiltrados = logs.filter(
    (l) =>
      l.usuario_nome.toLowerCase().includes(filtroLog.toLowerCase()) ||
      l.acao.toLowerCase().includes(filtroLog.toLowerCase()) ||
      l.tabela_afetada.toLowerCase().includes(filtroLog.toLowerCase())
  );

  // Pacientes filtrados para a Custódia Legal
  const pacientesFiltradosCustodia = pacientes.filter(
    (p) =>
      p.nome.toLowerCase().includes(buscaPaciente.toLowerCase()) ||
      p.cpf.includes(buscaPaciente)
  );

  const pacienteSelecionadoCustodia =
    pacientes.find((p) => p.id === pacienteCustodiaId) || pacientes[0];

  const evolucoesDoPaciente = evolucoesPsico.filter(
    (e) => e.pacienteId === pacienteSelecionadoCustodia?.id
  );

  const planosDoPaciente = planosTratamento.filter(
    (p) => p.pacienteId === pacienteSelecionadoCustodia?.id
  );

  const handleExportarDossie = async () => {
    const paciente = pacienteSelecionadoCustodia;
    if (!paciente) return;

    setDossieErro('');
    setDossieLoading(true);
    try {
      if (cursoPainel === 'odontologia') {
        let documento: DocumentoFichaOdonto | null = null;
        try {
          const apiDoc = await api.getDocumentoOdontoPaciente(paciente.id);
          documento = mapearDocumentoOdonto(apiDoc, paciente.nome);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 404) throw error;
        }
        const radiografias = await api.getRadiografiasOdonto(paciente.id);
        setDossieDocumento(documento);
        setDossieRadiografias(radiografias);
      } else {
        setDossieDocumento(null);
        setDossieRadiografias([]);
      }
      setPrintTarget('custodia');
    } catch (error) {
      setDossieErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o prontuário completo para o dossiê.'
      );
    } finally {
      setDossieLoading(false);
    }
  };

  useEffect(() => {
    if (!printTarget) return;

    const tituloAnterior = document.title;
    document.body.classList.add('rt-print-mode');
    document.title =
      printTarget === 'indicadores'
        ? 'Indicadores RT - UniCare'
        : `Dossiê - ${pacienteSelecionadoCustodia?.nome ?? 'Paciente'}`;

    const encerrar = () => {
      document.body.classList.remove('rt-print-mode');
      document.title = tituloAnterior;
      setPrintTarget(null);
    };

    window.addEventListener('afterprint', encerrar);
    const timer = window.setTimeout(() => window.print(), 250);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', encerrar);
      document.body.classList.remove('rt-print-mode');
      document.title = tituloAnterior;
    };
  }, [printTarget, pacienteSelecionadoCustodia?.nome]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserErrorMsg('');

    if (!formNome.trim() || !formMatricula.trim() || !formEmail.trim()) {
      setUserErrorMsg('Nome completo, Matrícula e E-mail institucional são obrigatórios.');
      return;
    }
    if (formSenha.length < 6) {
      setUserErrorMsg('A senha precisa de ao menos 6 caracteres.');
      return;
    }

    const cleanMatricula = formMatricula.trim();

    // O e-mail deixa de ser fabricado. Campo em branco virava
    // nome.matricula@uninassau.edu.br e ia para o banco como se a RT tivesse
    // digitado — e `UsuarioCreate.email` é EmailStr obrigatório, então o
    // servidor recusaria o vazio de qualquer forma.
    //
    // E o curso não é escolhido: o backend usa o da RT que está cadastrando
    // (`usuarios.py`, `curso=current_user.curso`). A tela mostrava um seletor
    // que não fazia nada, com "Psicologia" pré-selecionado para a RT de
    // odontologia. Agora a clínica aparece travada.
    const resultado = await createUser({
      nome: formNome.trim(),
      matricula: cleanMatricula,
      email: formEmail.trim(),
      perfil: formPerfil,
      registro_profissional: formRegistro.trim() || undefined,
      senha: formSenha,
    });

    // Falha de escrita não pode ser engolida: o modal só fecha com sucesso real.
    if (!resultado.success) {
      setUserErrorMsg(resultado.message);
      return;
    }

    setUserSuccessMsg(resultado.message);
    setFormNome('');
    setFormMatricula('');
    setFormEmail('');
    setFormRegistro('');
    setFormSenha('');
    setShowCreateUserModal(false);

    setTimeout(() => {
      setUserSuccessMsg('');
    }, 6000);
  };

  const handleOpenEditUserModal = (key: string, u: any) => {
    setEditingUserKey(key);
    setEditNome(u.nome);
    setEditMatricula(u.matricula);
    setEditEmail(u.email);
    setEditPerfil(u.perfil);
    setEditCurso(u.curso);
    setEditRegistro(u.registro_profissional || '');
    setUserErrorMsg('');
    setShowEditUserModal(true);
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserErrorMsg('');
    if (!editingUserKey || !editNome.trim() || !editMatricula.trim() || !editEmail.trim()) {
      setUserErrorMsg('Nome completo, Matrícula e E-mail institucional são obrigatórios.');
      return;
    }

    const resultado = await updateUser(editingUserKey, {
      nome: editNome.trim(),
      matricula: editMatricula.trim(),
      email: editEmail.trim(),
      registro_profissional: editRegistro.trim() || undefined,
    });

    if (!resultado.success) {
      setUserErrorMsg(resultado.message);
      return;
    }

    setUserSuccessMsg(resultado.message);
    setShowEditUserModal(false);
    setEditingUserKey(null);
    setTimeout(() => setUserSuccessMsg(''), 5000);
  };

  const handleExecuteDeleteUser = async () => {
    if (!userToDelete) return;
    setUserErrorMsg('');
    const resultado = await deleteUser(userToDelete.key);
    if (!resultado.success) {
      // O modal fica aberto com o motivo. Antes o erro era engolido (só os
      // modais de criar/editar renderizavam `userErrorMsg`), então a tela
      // parecia "não fazer nada".
      setUserErrorMsg(resultado.message);
      return;
    }
    setUserSuccessMsg(resultado.message);
    setUserToDelete(null);
    // Relê do servidor: o merge local do contexto não é fonte de verdade e uma
    // resposta fora do esperado deixava o badge como estava.
    await carregarUsuarios();
    setTimeout(() => setUserSuccessMsg(''), 5000);
  };

  /** Reativa um usuário desativado. `DELETE` só desativa; reativar é PATCH. */
  const handleAtivarUsuario = async (key: string) => {
    setUserErrorMsg('');
    const resultado = await updateUser(key, { ativo: true });

    if (!resultado.success) {
      setUserErrorMsg(resultado.message);
      return;
    }

    setUserSuccessMsg(resultado.message);
    await carregarUsuarios();
    setTimeout(() => setUserSuccessMsg(''), 5000);
  };

  const usersList = Object.entries(allUsers || {});
  const filteredUsers = usersList.filter(
    ([_, u]) =>
      u.nome.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.matricula.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.perfil.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.curso.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Feedback Toast de Sucesso da gestão */}
      {userSuccessMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 dark:text-emerald-200 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-semibold">{userSuccessMsg}</span>
          </div>
          <button
            onClick={() => setUserSuccessMsg('')}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho Corporativo Institucional (RF-006 & RN-003) */}
      <div className="bg-white dark:bg-[#0E1729] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/70 uppercase tracking-wider">
              {isCoordenacao
                ? 'Coordenação de Psicologia & Governança'
                : 'Controladoria Clínica & Responsabilidade Técnica'}
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/70 uppercase tracking-wider">
              LGPD Art. 11 Auditável
            </span>
            {loading && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 animate-pulse border border-blue-200 dark:border-blue-900/70">
                Sincronizando com API...
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-2 tracking-tight">
            Painel Executivo de Gestão, Indicadores & Custódia Legal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            UNINASSAU Aracaju • Sistema Integrado de Saúde Hospitalar —{' '}
            {cursoPainel === 'psicologia' ? 'Psicologia (SPA)' : 'Odontologia Integrada'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dois caminhos de PDF coexistem: este abre o relatório executivo
              completo (report/RelatorioExecutivo); o botão da aba Indicadores
              exporta o resumo (print/IndicadoresPrint). */}
          <button
            onClick={() => setRelatorioAberto('executivo')}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors shadow-xs"
          >
            <PrinterIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">Imprimir Relatório</span>
          </button>

          <div className="flex bg-slate-100 dark:bg-slate-900/90 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('indicadores')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'indicadores'
                  ? 'bg-white dark:bg-[#0E1729] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ChartBarIcon className="w-3.5 h-3.5" />
              <span>Indicadores</span>
            </button>
            <button
              onClick={() => setActiveTab('custodia')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'custodia'
                  ? 'bg-white dark:bg-[#0E1729] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
              <span>Custódia</span>
            </button>
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'auditoria'
                  ? 'bg-white dark:bg-[#0E1729] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              <span>Auditoria ({logs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'usuarios'
                  ? 'bg-[#002B49] dark:bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <UserGroupIcon className="w-3.5 h-3.5" />
              <span>Usuários RBAC ({usersList.length})</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'indicadores' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setPrintTarget('indicadores')}
              disabled={!stats}
              className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-[#0E1729] hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-colors shadow-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              <PrinterIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>Exportar Indicadores em PDF</span>
            </button>
          </div>

          {/* Grade de KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#0E1729] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Pacientes Registrados
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono tabular-nums">{totalPacientes}</p>
                </div>
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60 rounded-xl">
                  <UserGroupIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-3 font-semibold">
                Cadastro Único Compartilhado
              </p>
            </div>

            <div className="bg-white dark:bg-[#0E1729] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Atendimentos Totais
                  </p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1 font-mono tabular-nums">{totalAgendamentos}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/60 rounded-xl">
                  <CalendarIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-3 font-semibold tabular-nums">
                Comparecimento: {taxaComparecimento}%
              </p>
            </div>

            <div className="bg-white dark:bg-[#0E1729] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Taxa de Absenteísmo
                  </p>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1 font-mono tabular-nums">{taxaAbsenteismo}%</p>
                </div>
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/60 rounded-xl">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3">Tolerância Institucional: &lt; 15%</p>
            </div>

            <div className="bg-white dark:bg-[#0E1729] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Prontuários em Fila Docente
                  </p>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-1 font-mono tabular-nums">
{num('prontuarios_aguardando_visto')}
                  </p>
                </div>
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60 rounded-xl">
                  <DocumentTextIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-3 font-semibold">
                Homologação de Visto Pendente
              </p>
            </div>
          </div>

          {/* Comparativo Estrutural dos Módulos Clínicos */}
          <div className="grid grid-cols-1 gap-6">
            {cursoPainel === 'psicologia' && (
            <div className="bg-white dark:bg-[#0E1729] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Serviço de Psicologia Aplicada (SPA)
                </h2>
                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                  CFP 06/2019
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Prontuários Homologados com Visto Digital</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {num('prontuarios_validados')}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${pct('prontuarios_validados')}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Evoluções Aguardando Parecer Docente</span>
                    <span className="font-mono text-indigo-700 dark:text-indigo-400 tabular-nums">
                      {num('prontuarios_aguardando_visto')}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${pct('prontuarios_aguardando_visto')}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Pacientes Vinculados</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                    {num('pacientes_ativos')}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Sessões Realizadas</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                    {num('agendamentos_totais')}
                  </p>
                </div>
              </div>
            </div>
            )}

            {cursoPainel === 'odontologia' && (
            <div className="bg-white dark:bg-[#0E1729] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  Clínicas Odontológicas Integradas
                </h2>
                <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                  CFO / Duplas Clínicas
                </span>
              </div>

              <div className="space-y-3">
                {/* A "Taxa de Ocupação de Cadeiras" foi removida: o relatório não
                    tem campo nenhum de ocupação, cadeiras ou AMD. Os 85% eram
                    literais numa tela institucional de guarda legal. */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Fichas Odontológicas Homologadas</span>
                    <span className="font-mono text-blue-700 dark:text-blue-400 tabular-nums">{num('fichas_clinicas_totais')}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-blue-700 dark:bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${pct('fichas_clinicas_totais')}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    <span>Pacientes Menores sob Odontopediatria</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                      {semRelatorio
                        ? '—'
                        : `${stats?.conformidade_legal?.pacientes_menores_com_responsavel ?? 0} (Responsável Legal Vinculado)`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="bg-slate-700 dark:bg-slate-400 h-2 rounded-full transition-all" style={{ width: `${pctMenoresConformidade}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Pacientes Vinculados</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                    {num('pacientes_ativos')}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Procedimentos Registrados</span>
                  <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                    {planosTratamento.length}
                  </p>
                </div>
              </div>
            </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'custodia' && (
        /* ABA DE CUSTÓDIA LEGAL E DOSSIÊ DE PRONTUÁRIOS PARA GUARDA (RF-006 & RN-003) */
        <div className="bg-white dark:bg-[#0E1729] p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
                Salvaguarda Institucional
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1.5">
                Custódia Legal e Arquivamento Permanente de Prontuários
                <InfoTooltip texto={`Acesso exclusivo da ${gestaoLabel} para emissão de dossiê completo de guarda (prazo de guarda: 20 anos).`} />
              </h2>
            </div>

            <div className="w-full md:w-80 relative">
              <input
                type="text"
                placeholder="Buscar por CPF ou Nome do Paciente..."
                value={buscaPaciente}
                onChange={(e) => setBuscaPaciente(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Lista de Seleção Rápida de Pacientes */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pacientesFiltradosCustodia.map((p) => (
              <button
                key={p.id}
                onClick={() => setPacienteCustodiaId(p.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  pacienteCustodiaId === p.id
                    ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-500 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {p.nome}
              </button>
            ))}
          </div>

          {/* Visualização Formal do Dossiê Completo de Guarda */}
          {pacienteSelecionadoCustodia && (
            <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-6">
              {/* Cabeçalho do Dossiê */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">
                    REGISTRO DE CUSTÓDIA INSTITUCIONAL #CUST-2026-{pacienteSelecionadoCustodia.id.toString().padStart(4, '0')}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    Dossiê Clínico Unificado: {pacienteSelecionadoCustodia.nome}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300 mt-1 font-mono">
                    <span>Nascimento: {pacienteSelecionadoCustodia.dataNascimento}</span>
                    <span>Curso: {pacienteSelecionadoCustodia.curso.toUpperCase()}</span>
                    <span>Status: ATIVO EM TRATAMENTO</span>
                  </div>
                </div>

                <div className="sm:text-right space-y-1">
                  {/* O selo afirmava "Autenticidade Verificada (LGPD)" com um
                      SHA-256 fixo que não existe em nenhum lugar do sistema —
                      num dossiê de guarda legal. Trocado por identificação
                      verificável: registro do banco e trilha de auditoria real. */}
                  <span className="px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800/70 inline-block">
                    Registro Vinculado à Trilha de Auditoria
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    LGPD Art. 11
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    hash de integridade: não implementado
                  </p>
                </div>
              </div>

              {/* Cada seção aparece só para a clínica da RT que está olhando. Antes as duas
                  eram desenhadas sem condição: a RT de psicologia via uma seção
                  de odontologia permanentemente vazia, e a de odontologia via a
                  de psicologia quase vazia — o painel descrevia uma clínica
                  que a RT não gerencia. */}
              {cursoPainel === 'psicologia' && (
                <>
              {/* Histórico Unificado de Psicologia */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <DocumentTextIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  Evoluções Clínicas do Serviço de Psicologia Aplicada ({evolucoesDoPaciente.length} sessões registradas)
                </h4>

                {evolucoesDoPaciente.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic bg-white dark:bg-[#0E1729] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    Nenhum registro de psicologia para este paciente.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {evolucoesDoPaciente.map((ev) => (
                      <div key={ev.id} className="p-4 bg-white dark:bg-[#0E1729] rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                        <div className="flex flex-wrap justify-between items-center gap-2 font-semibold">
                          <span className="text-slate-900 dark:text-white font-mono">{ev.numeroSessao} • Data: {ev.dataSessao}</span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Estagiário: {ev.estagiarioNome} ({ev.estagiarioMatricula})
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-transparent dark:border-emerald-800/70">
                            {ev.status}
                          </span>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                          <p className="whitespace-pre-line"><strong className="text-slate-800 dark:text-slate-100">Síntese:</strong> {ev.redacaoTexto}</p>
                        </div>
                        {ev.parecerSupervisor && (
                          <p className="text-indigo-800 dark:text-indigo-300 font-medium text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                            Visto Docente ({ev.supervisorNome}): {ev.parecerSupervisor}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </>
              )}

              {/* Plano de Tratamento e Odontologia */}
              {cursoPainel === 'odontologia' && (
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  Registro de Procedimentos Odontológicos
                </h4>
                <div className="bg-white dark:bg-[#0E1729] rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Fase / Prioridade</th>
                        <th className="p-2.5">Dente / Região</th>
                        <th className="p-2.5">Procedimento Clínico</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Dupla Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {planosDoPaciente.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-2.5 font-semibold text-slate-900 dark:text-slate-100">{item.prioridade}</td>
                          <td className="p-2.5 font-mono">{item.denteRegiao}</td>
                          <td className="p-2.5">{item.procedimento}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-transparent dark:border-blue-800/60">
                              {item.status}
                            </span>
                          </td>
                          <td className="p-2.5">{item.estagiarioResponsavel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              )}

              {/* Carimbo de Custódia e Termo de Guarda.
                  Fora do bloco de odontologia: a psicologia também responde
                  pela guarda de 20 anos, e sem isso a aba Custódia dela ficava
                  sem nenhum botão para exportar o dossiê. */}
              <div className="p-4 bg-white dark:bg-[#0E1729] rounded-xl border border-indigo-200 dark:border-indigo-900/60 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Termo de Guarda e Custódia Definitiva (Resoluções CFP e CFO)
                    <InfoTooltip texto={`Certificamos a integridade deste prontuário para guarda legal pelo prazo mínimo de 20 anos sob responsabilidade da ${gestaoLabel}.`} />
                  </p>
                </div>
                {/* Duas gerações de dossiê coexistem no merge: o completo
                    (busca a ficha odonto, anamnese e radiografias na API) e o
                    de custódia da psicologia (monta a partir dos dados já
                    carregados). Consolidar é decisão de produto. */}
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    onClick={handleExportarDossie}
                    disabled={dossieLoading}
                    className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {dossieLoading ? 'Carregando prontuário...' : 'Exportar Dossiê do Paciente em PDF'}
                  </button>
                  <button
                    onClick={() => setRelatorioAberto('dossie')}
                    className="px-4 py-2 bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-800 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl font-bold text-xs shadow-xs transition-colors"
                  >
                    Dossiê de Custódia (A4)
                  </button>
                </div>
              </div>

              {dossieErro && (
                <p className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-800 dark:text-red-300">
                  {dossieErro}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'auditoria' && (
        /* ABA DE AUDITORIA LGPD ARTIGO 11 */
        <div className="bg-white dark:bg-[#0E1729] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-indigo-700 dark:text-indigo-400" />
                <span>Trilha de Auditoria e Rastreabilidade LGPD (Artigo 11)</span>
                <InfoTooltip texto="Registro criptográfico e imutável de autenticações, submissões clínicas e alterações de status de atendimento." />
              </h2>
            </div>

            <div className="w-full md:w-80 relative">
              <input
                type="text"
                placeholder="Filtrar por usuário, ação ou módulo..."
                value={filtroLog}
                onChange={(e) => setFiltroLog(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-y border-slate-200 dark:border-slate-800 font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora (UTC)</th>
                  <th className="py-2.5 px-3">Usuário</th>
                  <th className="py-2.5 px-3">Ação Registrada</th>
                  <th className="py-2.5 px-3">Módulo Afetado</th>
                  <th className="py-2.5 px-3">ID Registro</th>
                  <th className="py-2.5 px-3">Endereço IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      Nenhum registro de auditoria localizado para os critérios informados.
                    </td>
                  </tr>
                ) : (
                  logsFiltrados.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">{log.usuario_nome}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            log.acao.includes('LOGIN')
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70'
                              : log.acao.includes('CADASTRO')
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70'
                              : log.acao.includes('HOMOLOGACAO')
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {log.acao}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">{log.tabela_afetada}</td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono">{log.registro_id ?? '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400 dark:text-slate-500">{log.endereco_ip || '127.0.0.1'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: GESTÃO CORPORATIVA DE USUÁRIOS & CONTROLE RBAC (RT MASTER)         */}
      {/* ========================================================================= */}
      {activeTab === 'usuarios' && (
        <div className="bg-white dark:bg-[#0E1729] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6 transition-colors">
          {/* Fila de pedidos de credencial. Vem antes da tabela de usuários
              porque é o trabalho que chega agora: quem pede não tem conta, e a
              RT é quem autoriza. */}
          <SolicitacoesCadastro />

          {/* Falha de escrita fora dos modais (ex.: reativar pela tabela) não
              pode sumir: os modais de criar/editar têm o próprio aviso. */}
          {userErrorMsg && !showCreateUserModal && !showEditUserModal && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start justify-between gap-3 text-xs text-red-700 dark:text-red-300">
              <span>{userErrorMsg}</span>
              <button
                type="button"
                onClick={() => setUserErrorMsg('')}
                className="shrink-0 text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
                title="Fechar aviso"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-[#002B49] dark:text-blue-400" />
                <span>Gestão Corporativa de Perfis, Credenciais & Acessos RBAC</span>
                <InfoTooltip texto={`Painel executivo da ${gestaoLabel} para emissão de credenciais de Supervisores, Estagiários e Operadores de Recepção com disponibilidade instantânea no Login.`} />
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 min-w-[200px] md:w-72">
                <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por nome, matrícula, perfil..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#002B49] dark:focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserErrorMsg('');
                  setShowCreateUserModal(true);
                }}
                className="bg-[#002B49] hover:bg-[#001D33] dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border border-[#001D33] dark:border-blue-500 shrink-0"
              >
                <PlusIcon className="w-4 h-4 text-[#FFD100]" />
                <span>Cadastrar Usuário RBAC</span>
              </button>
            </div>
          </div>

          {/* Tabela de Usuários Registrados */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-y border-slate-200 dark:border-slate-800 font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-3">Identificação / Nome</th>
                  <th className="py-3 px-3">E-mail Institucional</th>
                  <th className="py-3 px-3">Perfil RBAC</th>
                  <th className="py-3 px-3">Curso / Módulo</th>
                  <th className="py-3 px-3">Registro Profissional</th>
                  <th className="py-3 px-3">Status de Autenticação</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                      Nenhum perfil de usuário localizado com os critérios informados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(([key, u]) => (
                    <tr key={key} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-2xs shrink-0 ${
                              u.perfil === 'coordenacao'
                                ? 'bg-blue-800'
                                : u.curso === 'psicologia' && u.perfil !== 'rt'
                                ? 'bg-blue-700'
                                : u.curso === 'odontologia' && u.perfil !== 'recepcao' && u.perfil !== 'rt'
                                ? 'bg-[#881337]'
                                : u.perfil === 'recepcao'
                                ? 'bg-[#B45309]'
                                : 'bg-[#002B49] dark:bg-slate-700'
                            }`}
                          >
                            {u.nome.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">{u.nome}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">Matrícula: {u.matricula}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">{u.email}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.perfil === 'rt'
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 text-[#002B49] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/70'
                              : u.perfil === 'coordenacao'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/70'
                              : u.perfil === 'supervisor'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/70'
                              : u.perfil === 'recepcao'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70'
                          }`}
                        >
                          {u.perfil === 'rt'
                            ? 'RT Master'
                            : u.perfil === 'coordenacao'
                            ? 'Coordenação'
                            : u.perfil === 'supervisor'
                            ? 'Supervisor'
                            : u.perfil === 'recepcao'
                            ? 'Recepção'
                            : 'Estagiário'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.perfil === 'recepcao' ? (
                          <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-400">
                            Geral (Triagem)
                          </span>
                        ) : u.curso === 'psicologia' ? (
                          <span className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-700 dark:bg-blue-400"></span>
                            <span>Psicologia (CFP)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[#881337] dark:text-rose-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#881337] dark:bg-rose-400"></span>
                            <span>Odontologia (CFO)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300 text-[11px]">
                        {u.registro_profissional || '—'}
                      </td>
                      {/* A coluna "Origem" saiu: prometia distinguir "Criado na
                          Sessão" de "Padrão UNINASSAU", mas o campo `custom`
                          nunca era definido pelo wire — então todo mundo
                          aparecia como "Padrão UNINASSAU", inclusive quem a RT
                          tinha acabado de cadastrar. Usuario não tem criado_em,
                          então não há dado real para substituí-la. */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                            u.ativo
                              ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70'
                              : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {u.ativo ? (
                            <CheckCircleIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <ExclamationTriangleIcon className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                          )}
                          {/* O "(Senha)" foi embora: a tabela não tem a senha e
                              não pode exibi-la. */}
                          <span>{u.ativo ? 'Habilitado' : 'Desativado'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {isCoordenacao &&
                        (u.perfil === 'rt' ||
                          u.perfil === 'coordenacao' ||
                          u.id === user?.id) ? (
                          <span
                            className="text-[10px] text-slate-400 dark:text-slate-500 font-mono"
                            title="Perfil fora da alçada da coordenação"
                          >
                            —
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUserModal(key, u)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#002B49] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Editar usuário"
                            >
                              <PencilSquareIcon className="w-4 h-4" />
                            </button>
                            {u.ativo ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setUserErrorMsg('');
                                  setUserToDelete({ key, nome: u.nome });
                                }}
                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                                title="Desativar acesso do usuário"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => void handleAtivarUsuario(key)}
                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-colors"
                                title="Reativar acesso do usuário"
                              >
                                <ArrowPathIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Criação de Usuários RBAC pela RT Master */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#0E1729] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#002B49] dark:bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <KeyIcon className="w-4 h-4 text-[#FFD100]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Cadastrar Usuário RBAC ({isCoordenacao ? 'Coordenação' : 'RT Master'})
                    <InfoTooltip texto="Crie credenciais para Supervisores, Estagiários ou Recepção com login automático." />
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Perfil RBAC *
                  </label>
                  <select
                    value={formPerfil}
                    onChange={(e) => setFormPerfil(e.target.value as RoleType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500"
                  >
                    <option value="supervisor">Supervisor Docente</option>
                    <option value="estagiario">Acadêmico Estagiário</option>
                    <option value="recepcao">Operador de Recepção</option>
                    {!isCoordenacao && user?.curso === 'psicologia' && (
                      <option value="coordenacao">Coordenação de Psicologia</option>
                    )}
                  </select>
                </div>

<div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Clínica de Atuação
              </label>
              {/* Antes era um <select> com "Psicologia" e "Odontologia" que não
                  fazia nada: o `curso` era descartado no cliente e o servidor
                  usa o da RT. A RT de odontologia via "Psicologia" marcado. */}
              <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-between">
                <span>{user?.curso === 'psicologia' ? 'Psicologia (SPA)' : 'Odontologia Integrada'}</span>
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  {isCoordenacao ? 'travada pela sua clínica' : 'travada pela sua RT'}
                </span>
              </div>
            </div>
          </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Profa. Claudia Martins Albuquerque"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#002B49]/20 dark:focus:ring-blue-500/30"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Matrícula Institucional *
                  </label>
                  <input
                    type="text"
                    value={formMatricula}
                    onChange={(e) => setFormMatricula(e.target.value)}
                    placeholder="Ex: DOC-7744 ou 16039912"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#002B49]/20 dark:focus:ring-blue-500/30 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Registro Profissional (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formRegistro}
                    onChange={(e) => setFormRegistro(e.target.value)}
                    placeholder={
                      formPerfil === 'supervisor' && user?.curso === 'psicologia'
                        ? 'Ex: CRP 19/1234'
                        : formPerfil === 'supervisor' && user?.curso === 'odontologia'
                        ? 'Ex: CRO-SE 5678'
                        : 'Ex: 9º Período / Cadeira 02'
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail Institucional *
                </label>
<input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Ex: claudia.martins@uninassau.edu.br"
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 font-mono text-[11px]"
                />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Senha Provisória *
                <InfoTooltip texto={`O usuário é gravado na clínica desta ${gestaoLabel} e já pode entrar com a senha definida acima. A senha é guardada com hash bcrypt — nem a ${gestaoLabel} consegue lê-la depois.`} />
              </label>
              <input
                type="text"
                value={formSenha}
                onChange={(e) => setFormSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 font-mono text-[11px]"
              />
            </div>

              {userErrorMsg && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs">
                  {userErrorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#002B49] hover:bg-[#001D33] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-xs border border-[#001D33] dark:border-blue-500 flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4 text-[#FFD100]" />
                  <span>Cadastrar e Habilitar Login</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Usuário RBAC */}
      {showEditUserModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#0E1729] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-xs shadow-xs">
                  <PencilSquareIcon className="w-4 h-4 text-[#002B49] dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Editar Perfil de Usuário
                    <InfoTooltip texto="Modifique dados cadastrais, perfil RBAC ou registro do profissional/estagiário." />
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Tipo de Perfil RBAC
                  </label>
                  {/* `UsuarioUpdate` não tem `perfil` e o `api.updateUsuario` nem
                      envia: o select era inerte e a tela prometia uma promoção
                      de cargo que nunca acontecia. Trocar perfil é ato próprio,
                      com regra e auditoria — não é edição de dado cadastral. */}
                  <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-between">
                    <span>{ROTULOS_PERFIL[editPerfil] ?? editPerfil}</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">não é editável</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clínica de Atuação
                  </label>
                  {/* Mesmo no editor: `UsuarioUpdate` não tem `curso` e o
                      `api.updateUsuario` nem envia. O seletor era inerte. */}
                  <div className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 font-semibold flex items-center justify-between">
                    <span>
                      {editCurso === 'psicologia' ? 'Psicologia (SPA)' : 'Odontologia Integrada'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">não é editável</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome completo do usuário"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#002B49]/20 dark:focus:ring-blue-500/30"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Matrícula Institucional *
                  </label>
                  <input
                    type="text"
                    value={editMatricula}
                    onChange={(e) => setEditMatricula(e.target.value)}
                    placeholder="Matrícula"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#002B49]/20 dark:focus:ring-blue-500/30 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Registro Profissional
                  </label>
                  <input
                    type="text"
                    value={editRegistro}
                    onChange={(e) => setEditRegistro(e.target.value)}
                    placeholder="CRP / CRO ou Período"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail Institucional
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="E-mail"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-[#002B49] dark:focus:border-blue-500 font-mono text-[11px]"
                />
              </div>

              {userErrorMsg && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs">
                  {userErrorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#002B49] hover:bg-[#001D33] dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-xs border border-[#001D33] dark:border-blue-500 flex items-center gap-1.5"
                >
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Desativação de Usuário */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-[#0E1729] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center shrink-0">
                <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Desativar Acesso
                  <InfoTooltip texto="Revogação imediata de credenciais. O cadastro e o histórico de auditoria são preservados, e a conta pode ser reativada depois." />
                </h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Desativar o acesso de <strong className="text-slate-900 dark:text-white">{userToDelete.nome}</strong>?
              Ele não entra mais no sistema, mas o cadastro continua no banco —
              a auditoria depende dele. Dá para reativar depois pela mesma tabela.
            </p>
            {userErrorMsg && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-xs">
                {userErrorMsg}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Desativar Acesso</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Documentos impressos.
          O portal vive em `document.body`, fora do `#root` — é isso que faz o
          navegador imprimir o papel A4 e não a tela do painel (ver
          `shared/impressao/relatorio.css` e `print/print.css`). */}
      {relatorioAberto === 'executivo' && (
        <RelatorioImpressao
          titulo="Relatório Executivo de Gestão"
          nomeArquivo={`UniCare-Relatorio-Executivo-${dataDoArquivo}`}
          onClose={() => setRelatorioAberto(null)}
        >
          <RelatorioExecutivo
            modo={modo}
            usuario={user}
            stats={stats}
            logs={logs}
            usuarios={Object.values(allUsers || {})}
            pacientes={pacientes}
            agendamentos={agendamentos}
            evolucoes={evolucoesPsico}
            cursoPainel={cursoPainel}
            gestaoLabel={gestaoLabel}
            isPainelPsicologia={isPainelPsicologia}
            resumo={{
              totalPacientes,
              totalAgendamentos,
              taxaComparecimento,
              taxaAbsenteismo,
            }}
          />
        </RelatorioImpressao>
      )}

      {relatorioAberto === 'dossie' && pacienteSelecionadoCustodia && (
        <RelatorioImpressao
          titulo={`Dossiê de Custódia — ${pacienteSelecionadoCustodia.nome}`}
          nomeArquivo={`UniCare-Dossie-Custodia-${pacienteSelecionadoCustodia.id}-${dataDoArquivo}`}
          onClose={() => setRelatorioAberto(null)}
        >
          <DossieCustodia
            paciente={pacienteSelecionadoCustodia}
            evolucoes={evolucoesDoPaciente}
            planos={planosDoPaciente}
            cursoPainel={cursoPainel}
            gestaoLabel={gestaoLabel}
            usuario={user}
          />
        </RelatorioImpressao>
      )}

      {printTarget === 'indicadores' &&
        createPortal(
          <IndicadoresPrint
            curso={cursoPainel}
            stats={stats}
            pacientes={pacientes}
            planosTratamento={planosTratamento}
            totalPacientes={totalPacientes}
            totalAgendamentos={totalAgendamentos}
            taxaComparecimento={taxaComparecimento}
            taxaAbsenteismo={taxaAbsenteismo}
            geradoEm={new Date().toLocaleString('pt-BR')}
          />,
          document.body
        )}

      {printTarget === 'custodia' &&
        pacienteSelecionadoCustodia &&
        createPortal(
          <DossiePacientePrint
            paciente={pacienteSelecionadoCustodia}
            curso={cursoPainel}
            evolucoes={evolucoesDoPaciente}
            planos={planosDoPaciente}
            documento={dossieDocumento}
            radiografias={dossieRadiografias}
          />,
          document.body
        )}
    </div>
  );
}
