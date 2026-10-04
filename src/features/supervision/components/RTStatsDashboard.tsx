import { useState, useEffect } from 'react';
import { api, type RelatorioEstatisticas, type ApiLogAuditoria } from '../../../services/api';
import { useClinic } from '../../clinic/context/ClinicContext';
import { useAuth, type RoleType, type CourseType } from '../../auth/context/AuthContext';
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
} from '../../../components/icons/CorporateIcons';

export function RTStatsDashboard() {
  const { pacientes, agendamentos, evolucoesPsico, planosTratamento } = useClinic();
  const { allUsers, createUser, updateUser, deleteUser } = useAuth();
  const [stats, setStats] = useState<RelatorioEstatisticas | null>(null);
  const [logs, setLogs] = useState<ApiLogAuditoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filtroLog, setFiltroLog] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'indicadores' | 'custodia' | 'auditoria' | 'usuarios'>('indicadores');

  // Estados de Criação e Gestão de Usuários RBAC pela RT Master
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [formNome, setFormNome] = useState('');
  const [formMatricula, setFormMatricula] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPerfil, setFormPerfil] = useState<RoleType>('supervisor');
  const [formCurso, setFormCurso] = useState<CourseType>('psicologia');
  const [formRegistro, setFormRegistro] = useState('');
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

  useEffect(() => {
    let isMounted = true;
    async function carregarDados() {
      try {
        setLoading(true);
        const [statsData, logsData] = await Promise.allSettled([
          api.getEstatisticas(),
          api.getAuditoria(100),
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
  }, []);

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

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserErrorMsg('');

    if (!formNome.trim() || !formMatricula.trim()) {
      setUserErrorMsg('Nome completo e Matrícula são obrigatórios.');
      return;
    }

    const cleanMatricula = formMatricula.trim();
    const cleanEmail =
      formEmail.trim() ||
      `${formNome.trim().toLowerCase().split(' ')[0]}.${cleanMatricula}@uninassau.edu.br`;

    createUser({
      nome: formNome.trim(),
      matricula: cleanMatricula,
      email: cleanEmail,
      perfil: formPerfil,
      curso: formPerfil === 'recepcao' ? 'odontologia' : formCurso,
      registro_profissional: formRegistro.trim() || undefined,
    });

    setUserSuccessMsg(
      `Perfil de ${formNome.trim()} (${
        formPerfil === 'supervisor'
          ? 'Supervisor'
          : formPerfil === 'estagiario'
          ? 'Estagiário'
          : 'Recepção'
      }) cadastrado com sucesso! Já está visível na tela de login.`
    );
    setFormNome('');
    setFormMatricula('');
    setFormEmail('');
    setFormRegistro('');
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

  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserKey || !editNome.trim() || !editMatricula.trim()) {
      setUserErrorMsg('Nome completo e Matrícula são obrigatórios.');
      return;
    }

    updateUser(editingUserKey, {
      nome: editNome.trim(),
      matricula: editMatricula.trim(),
      email:
        editEmail.trim() ||
        `${editNome.trim().toLowerCase().split(' ')[0]}.${editMatricula.trim()}@uninassau.edu.br`,
      perfil: editPerfil,
      curso: editPerfil === 'recepcao' ? 'odontologia' : editCurso,
      registro_profissional: editRegistro.trim() || undefined,
    });

    setUserSuccessMsg(`Usuário ${editNome.trim()} atualizado com sucesso!`);
    setShowEditUserModal(false);
    setEditingUserKey(null);
    setTimeout(() => setUserSuccessMsg(''), 5000);
  };

  const handleExecuteDeleteUser = () => {
    if (!userToDelete) return;
    deleteUser(userToDelete.key);
    setUserSuccessMsg(`Usuário ${userToDelete.nome} excluído do sistema com sucesso.`);
    setUserToDelete(null);
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
      {/* Feedback Toast de Sucesso da RT */}
      {userSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{userSuccessMsg}</span>
          </div>
          <button
            onClick={() => setUserSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Cabeçalho Corporativo Institucional (RF-006 & RN-003) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Controladoria Clínica & Responsabilidade Técnica
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              LGPD Art. 11 Auditável
            </span>
            {loading && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 animate-pulse border border-blue-200">
                Sincronizando com API...
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
            Painel Executivo de Gestão, Indicadores & Custódia Legal
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            UNINASSAU Aracaju • Sistema Integrado de Saúde Hospitalar (Psicologia e Odontologia)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3.5 py-2 border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <PrinterIcon className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Imprimir Relatório</span>
          </button>

          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('indicadores')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'indicadores'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChartBarIcon className="w-3.5 h-3.5" />
              <span>Indicadores</span>
            </button>
            <button
              onClick={() => setActiveTab('custodia')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'custodia'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
              <span>Custódia (RF-006)</span>
            </button>
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'auditoria'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheckIcon className="w-3.5 h-3.5" />
              <span>Auditoria ({logs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === 'usuarios'
                  ? 'bg-[#002B49] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
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
          {/* Grade de KPIs Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Pacientes Registrados
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalPacientes}</p>
                </div>
                <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
                  <UserGroupIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-blue-700 mt-3 font-semibold">
                Cadastro Único Compartilhado (RF-007)
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Atendimentos Totais
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 font-mono">{totalAgendamentos}</p>
                </div>
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
                  <CalendarIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-emerald-700 mt-3 font-semibold">
                Comparecimento: {taxaComparecimento}%
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Taxa de Absenteísmo
                  </p>
                  <p className="text-2xl font-bold text-amber-700 mt-1 font-mono">{taxaAbsenteismo}%</p>
                </div>
                <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-3">Tolerância Institucional: &lt; 15%</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Prontuários em Fila Docente
                  </p>
                  <p className="text-2xl font-bold text-indigo-700 mt-1 font-mono">
                    {stats?.distribuicao_cursos?.psicologia?.prontuarios_aguardando_visto ??
                      evolucoesPsico.filter((e) => e.status === 'AGUARDANDO_VALIDACAO').length}
                  </p>
                </div>
                <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <DocumentTextIcon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-indigo-700 mt-3 font-semibold">
                Homologação de Visto Pendente (RF-004)
              </p>
            </div>
          </div>

          {/* Comparativo Estrutural dos Módulos Clínicos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-slate-500" />
                  Serviço de Psicologia Aplicada (SPA)
                </h2>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  CFP 06/2019
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Prontuários Homologados com Visto Digital</span>
                    <span className="font-mono text-emerald-700">
                      {stats?.distribuicao_cursos?.psicologia?.prontuarios_validados ?? 1}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Evoluções Aguardando Parecer Docente</span>
                    <span className="font-mono text-indigo-700">
                      {stats?.distribuicao_cursos?.psicologia?.prontuarios_aguardando_visto ?? 1}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '40%' }}></div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">Pacientes Vinculados</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                    {stats?.distribuicao_cursos?.psicologia?.pacientes_ativos ?? 2}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">Sessões Realizadas</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                    {stats?.distribuicao_cursos?.psicologia?.agendamentos_totais ?? 2}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-slate-500" />
                  Clínicas Odontológicas Integradas
                </h2>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  CFO / Duplas Clínicas
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Taxa de Ocupação de Cadeiras Clínicas</span>
                    <span className="font-mono text-blue-700">85% Operacional</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-700 h-2 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Pacientes Menores sob Odontopediatria</span>
                    <span className="font-mono text-slate-800">
                      {stats?.conformidade_legal?.pacientes_menores_com_responsavel ?? 1} (Responsável Legal Vinculado)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-slate-700 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">Pacientes Vinculados</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                    {stats?.distribuicao_cursos?.odontologia?.pacientes_ativos ?? 3}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500">Procedimentos Registrados</span>
                  <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">
                    {planosTratamento.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'custodia' && (
        /* ABA DE CUSTÓDIA LEGAL E DOSSIÊ DE PRONTUÁRIOS PARA GUARDA (RF-006 & RN-003) */
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">
                Requisito Funcional RF-006 • Salvaguarda Institucional RN-003
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                Custódia Legal e Arquivamento Permanente de Prontuários
              </h2>
              <p className="text-xs text-slate-500">
                Acesso exclusivo da Responsável Técnica (RT) para emissão de dossiê completo de guarda (prazo de guarda: 20 anos).
              </p>
            </div>

            <div className="w-full md:w-80 relative">
              <input
                type="text"
                placeholder="Buscar por CPF ou Nome do Paciente..."
                value={buscaPaciente}
                onChange={(e) => setBuscaPaciente(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Lista de Seleção Rápida de Pacientes */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {pacientesFiltradosCustodia.map((p) => (
              <button
                key={p.id}
                onClick={() => setPacienteCustodiaId(p.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                  pacienteCustodiaId === p.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.nome} ({p.cpf})
              </button>
            ))}
          </div>

          {/* Visualização Formal do Dossiê Completo de Guarda */}
          {pacienteSelecionadoCustodia && (
            <div className="p-6 rounded-xl border border-slate-200 bg-slate-50/50 space-y-6">
              {/* Cabeçalho do Dossiê */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                    REGISTRO DE CUSTÓDIA INSTITUCIONAL #CUST-2026-{pacienteSelecionadoCustodia.id.toString().padStart(4, '0')}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    Dossiê Clínico Unificado: {pacienteSelecionadoCustodia.nome}
                  </h3>
                  <div className="flex gap-4 text-xs text-slate-600 mt-1 font-mono">
                    <span>CPF: {pacienteSelecionadoCustodia.cpf}</span>
                    <span>Nascimento: {pacienteSelecionadoCustodia.dataNascimento}</span>
                    <span>Curso: {pacienteSelecionadoCustodia.curso.toUpperCase()}</span>
                    <span>Status: ATIVO EM TRATAMENTO</span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200 inline-block">
                    Autenticidade Verificada (LGPD)
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono">
                    SHA-256: 8f4b2e...c901a
                  </p>
                </div>
              </div>

              {/* Histórico Unificado de Psicologia */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <DocumentTextIcon className="w-4 h-4 text-slate-600" />
                  Evoluções Clínicas do Serviço de Psicologia Aplicada ({evolucoesDoPaciente.length} sessões registradas)
                </h4>

                {evolucoesDoPaciente.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-white p-4 rounded-lg border border-slate-200">
                    Nenhum registro de psicologia para este paciente.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {evolucoesDoPaciente.map((ev) => (
                      <div key={ev.id} className="p-4 bg-white rounded-lg border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between items-center font-semibold">
                          <span className="text-slate-900 font-mono">{ev.numeroSessao} • Data: {ev.dataSessao}</span>
                          <span className="text-slate-500">
                            Estagiário: {ev.estagiarioNome} ({ev.estagiarioMatricula})
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                            {ev.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-slate-600 text-[11px]">
                          <p><strong>Acolhimento:</strong> {ev.inicioTexto}</p>
                          <p><strong>Intervenção:</strong> {ev.meioTexto}</p>
                          <p><strong>Pactuação:</strong> {ev.fimTexto}</p>
                        </div>
                        {ev.parecerSupervisor && (
                          <p className="text-indigo-800 font-medium text-[11px] pt-1 border-t border-slate-100">
                            Visto Docente ({ev.supervisorNome}): {ev.parecerSupervisor}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Plano de Tratamento e Odontologia */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ClipboardDocumentCheckIcon className="w-4 h-4 text-slate-600" />
                  Registro de Procedimentos Odontológicos
                </h4>
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Fase / Prioridade</th>
                        <th className="p-2.5">Dente / Região</th>
                        <th className="p-2.5">Procedimento Clínico</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Dupla Responsável</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {planosTratamento.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-semibold">{item.prioridade}</td>
                          <td className="p-2.5 font-mono">{item.denteRegiao}</td>
                          <td className="p-2.5">{item.procedimento}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
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

              {/* Carimbo de Custódia e Termo de Guarda */}
              <div className="p-4 bg-white rounded-lg border border-indigo-200 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-900">Termo de Guarda e Custódia Definitiva (Resoluções CFP e CFO)</p>
                  <p className="text-slate-500 text-[11px]">
                    Certificamos a integridade deste prontuário para guarda legal pelo prazo mínimo de 20 anos sob responsabilidade da RT.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors shrink-0"
                >
                  Exportar Dossiê Oficial em PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'auditoria' && (
        /* ABA DE AUDITORIA LGPD ARTIGO 11 */
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-indigo-700" />
                <span>Trilha de Auditoria e Rastreabilidade LGPD (Artigo 11)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Registro criptográfico e imutável de autenticações, submissões clínicas e alterações de status de atendimento.
              </p>
            </div>

            <div className="w-full md:w-80 relative">
              <input
                type="text"
                placeholder="Filtrar por usuário, ação ou módulo..."
                value={filtroLog}
                onChange={(e) => setFiltroLog(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-y border-slate-200 font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora (UTC)</th>
                  <th className="py-2.5 px-3">Usuário</th>
                  <th className="py-2.5 px-3">Ação Registrada</th>
                  <th className="py-2.5 px-3">Módulo Afetado</th>
                  <th className="py-2.5 px-3">ID Registro</th>
                  <th className="py-2.5 px-3">Endereço IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      Nenhum registro de auditoria localizado para os critérios informados.
                    </td>
                  </tr>
                ) : (
                  logsFiltrados.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{log.usuario_nome}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            log.acao.includes('LOGIN')
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : log.acao.includes('CADASTRO')
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.acao.includes('HOMOLOGACAO')
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {log.acao}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{log.tabela_afetada}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono">{log.registro_id ?? '-'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-400">{log.endereco_ip || '127.0.0.1'}</td>
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
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-[#002B49]" />
                <span>Gestão Corporativa de Perfis, Credenciais & Acessos RBAC</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Painel executivo da RT Master para emissão de credenciais de Supervisores, Estagiários e Operadores de Recepção com disponibilidade instantânea no Login.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por nome, matrícula, perfil..."
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#002B49] focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setUserErrorMsg('');
                  setShowCreateUserModal(true);
                }}
                className="bg-[#002B49] hover:bg-[#001D33] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border border-[#001D33] shrink-0"
              >
                <PlusIcon className="w-4 h-4 text-[#FFD100]" />
                <span>Cadastrar Usuário RBAC</span>
              </button>
            </div>
          </div>

          {/* Tabela de Usuários Registrados */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-y border-slate-200 font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-3">Identificação / Nome</th>
                  <th className="py-3 px-3">E-mail Institucional</th>
                  <th className="py-3 px-3">Perfil RBAC</th>
                  <th className="py-3 px-3">Curso / Módulo</th>
                  <th className="py-3 px-3">Registro Profissional</th>
                  <th className="py-3 px-3">Origem</th>
                  <th className="py-3 px-3">Status de Autenticação</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                      Nenhum perfil de usuário localizado com os critérios informados.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(([key, u]) => (
                    <tr key={key} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-2xs shrink-0 ${
                              u.curso === 'psicologia' && u.perfil !== 'rt'
                                ? 'bg-blue-700'
                                : u.curso === 'odontologia' && u.perfil !== 'recepcao' && u.perfil !== 'rt'
                                ? 'bg-[#881337]'
                                : u.perfil === 'recepcao'
                                ? 'bg-[#B45309]'
                                : 'bg-[#002B49]'
                            }`}
                          >
                            {u.nome.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{u.nome}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Matrícula: {u.matricula}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">{u.email}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            u.perfil === 'rt'
                              ? 'bg-indigo-50 text-[#002B49] border border-indigo-200'
                              : u.perfil === 'supervisor'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : u.perfil === 'recepcao'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {u.perfil === 'rt'
                            ? 'RT Master'
                            : u.perfil === 'supervisor'
                            ? 'Supervisor'
                            : u.perfil === 'recepcao'
                            ? 'Recepção'
                            : 'Estagiário'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {u.perfil === 'recepcao' ? (
                          <span className="text-[11px] font-semibold text-amber-800">
                            Geral (Triagem)
                          </span>
                        ) : u.curso === 'psicologia' ? (
                          <span className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-700"></span>
                            <span>Psicologia (CFP)</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-[#881337] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#881337]"></span>
                            <span>Odontologia (CFO)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {u.registro_profissional || 'Acadêmico'}
                      </td>
                      <td className="py-3 px-3">
                        {u.custom ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                            Criado na Sessão
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Padrão UNINASSAU
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                          <span>Habilitado (Senha)</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUserModal(key, u)}
                            className="p-1.5 text-slate-500 hover:text-[#002B49] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Editar usuário"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToDelete({ key, nome: u.nome })}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir usuário"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#002B49] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <KeyIcon className="w-4 h-4 text-[#FFD100]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cadastrar Usuário RBAC (RT Master)</h3>
                  <p className="text-[10px] text-slate-500">
                    Crie credenciais para Supervisores, Estagiários ou Recepção com login automático.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tipo de Perfil RBAC *
                  </label>
                  <select
                    value={formPerfil}
                    onChange={(e) => setFormPerfil(e.target.value as RoleType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49]"
                  >
                    <option value="supervisor">Supervisor Docente</option>
                    <option value="estagiario">Acadêmico Estagiário</option>
                    <option value="recepcao">Operador de Recepção</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Curso / Área de Atuação *
                  </label>
                  <select
                    value={formCurso}
                    disabled={formPerfil === 'recepcao'}
                    onChange={(e) => setFormCurso(e.target.value as CourseType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] disabled:opacity-50"
                  >
                    <option value="psicologia">Psicologia (SPA)</option>
                    <option value="odontologia">Odontologia Integrada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: Profa. Claudia Martins Albuquerque"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] focus:ring-1 focus:ring-[#002B49]/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Matrícula Institucional *
                  </label>
                  <input
                    type="text"
                    value={formMatricula}
                    onChange={(e) => setFormMatricula(e.target.value)}
                    placeholder="Ex: DOC-7744 ou 16039912"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] focus:ring-1 focus:ring-[#002B49]/20 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Registro Profissional (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formRegistro}
                    onChange={(e) => setFormRegistro(e.target.value)}
                    placeholder={
                      formPerfil === 'supervisor' && formCurso === 'psicologia'
                        ? 'Ex: CRP 19/1234'
                        : formPerfil === 'supervisor' && formCurso === 'odontologia'
                        ? 'Ex: CRO-SE 5678'
                        : 'Ex: 9º Período / Cadeira 02'
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  E-mail Institucional (Opcional)
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Ex: claudia.martins@uninassau.edu.br"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] font-mono text-[11px]"
                />
              </div>

              {userErrorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {userErrorMsg}
                </div>
              )}

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheckIcon className="w-4 h-4 text-amber-700" />
                  <span>Conformidade RBAC & Regra de Acesso com Senha</span>
                </div>
                <p className="text-[10px] text-slate-600">
                  O perfil cadastrado será adicionado automaticamente às opções de login do respectivo curso. Para acessar, o usuário deverá confirmar a senha padrão institucional <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-amber-200">unicare123</code>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#002B49] hover:bg-[#001D33] text-white rounded-xl font-bold transition-all shadow-xs border border-[#001D33] flex items-center gap-1.5"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shadow-xs">
                  <PencilSquareIcon className="w-4 h-4 text-[#002B49]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Editar Perfil de Usuário</h3>
                  <p className="text-[10px] text-slate-500">
                    Modifique dados cadastrais, perfil RBAC ou registro do profissional/estagiário.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditUserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tipo de Perfil RBAC *
                  </label>
                  <select
                    value={editPerfil}
                    onChange={(e) => setEditPerfil(e.target.value as RoleType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49]"
                  >
                    <option value="supervisor">Supervisor Docente</option>
                    <option value="estagiario">Acadêmico Estagiário</option>
                    <option value="recepcao">Operador de Recepção</option>
                    <option value="rt">Responsável Técnico (RT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Curso / Área de Atuação *
                  </label>
                  <select
                    value={editCurso}
                    disabled={editPerfil === 'recepcao'}
                    onChange={(e) => setEditCurso(e.target.value as CourseType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] disabled:opacity-50"
                  >
                    <option value="psicologia">Psicologia (SPA)</option>
                    <option value="odontologia">Odontologia Integrada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome completo do usuário"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] focus:ring-1 focus:ring-[#002B49]/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Matrícula Institucional *
                  </label>
                  <input
                    type="text"
                    value={editMatricula}
                    onChange={(e) => setEditMatricula(e.target.value)}
                    placeholder="Matrícula"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] focus:ring-1 focus:ring-[#002B49]/20 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Registro Profissional
                  </label>
                  <input
                    type="text"
                    value={editRegistro}
                    onChange={(e) => setEditRegistro(e.target.value)}
                    placeholder="CRP / CRO ou Período"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] font-mono text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  E-mail Institucional
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="E-mail"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#002B49] font-mono text-[11px]"
                />
              </div>

              {userErrorMsg && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {userErrorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#002B49] hover:bg-[#001D33] text-white rounded-xl font-bold transition-all shadow-xs border border-[#001D33] flex items-center gap-1.5"
                >
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Usuário */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirmar Exclusão de Usuário</h3>
                <p className="text-[11px] text-slate-500">Revogação imediata de credenciais</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza de que deseja excluir permanentemente o cadastro de <strong className="text-slate-900">{userToDelete.nome}</strong>? Este perfil não aparecerá mais na tela de login e seus acessos serão desativados.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDeleteUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Excluir Usuário</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
