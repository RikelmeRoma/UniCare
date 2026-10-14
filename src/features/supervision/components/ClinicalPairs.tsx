import { useMemo, useState } from 'react';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
} from '../../../components/icons/CorporateIcons';
import { useAuth, type User } from '../../auth/context/AuthContext';
import { useClinic } from '../../clinic/context/ClinicContext';

export function ClinicalPairs() {
  const { allUsers, createUser, updateUser, deleteUser } = useAuth();
  const { fichasOdonto } = useClinic();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [email, setEmail] = useState('');
  // Antes vinha preenchida com 'Cadeira 05 • Dupla 09' e ia para a base como
  // se o supervisor tivesse escolhido aquela cadeira.
  const [cadeira, setCadeira] = useState('');
  // Senha é obrigatória no cadastro: o backend grava com bcrypt e não aceita
  // usuário sem senha.
  const [senha, setSenha] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [validationError, setValidationError] = useState('');

  // Estados de Edição e Exclusão de Estagiários (Odonto)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRegistro, setEditRegistro] = useState('');
  const [internToDelete, setInternToDelete] = useState<{ key: string; nome: string } | null>(null);

  // Estagiários de Odontologia registrados no sistema
  const odontoInterns = Object.entries(allUsers || {}).filter(
    ([_, u]) => u.curso === 'odontologia' && u.perfil === 'estagiario'
  );

  const handleCreateIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!nome.trim() || !matricula.trim() || !email.trim()) {
      setValidationError('Nome completo, Matrícula e E-mail institucional são obrigatórios.');
      return;
    }
    if (senha.length < 6) {
      setValidationError('A senha precisa de ao menos 6 caracteres.');
      return;
    }

    const cleanMatricula = matricula.trim();

    // Sem fabricação de e-mail: campo em branco não vira
    // nome.matricula@uninassau.edu.br na base. Mesma regra da psicologia.
    const resultado = await createUser({
      nome: nome.trim(),
      matricula: cleanMatricula,
      email: email.trim(),
      perfil: 'estagiario',
      curso: 'odontologia',
      registro_profissional: cadeira.trim() || undefined,
      senha,
    });

    if (!resultado.success) {
      setValidationError(resultado.message);
      return;
    }

    setFeedbackSuccess(resultado.message);
    setNome('');
    setMatricula('');
    setEmail('');
    setShowCreateModal(false);

    setTimeout(() => {
      setFeedbackSuccess('');
    }, 6000);
  };

  const handleOpenEdit = (key: string, intern: User) => {
    setEditingKey(key);
    setEditNome(intern.nome);
    setEditMatricula(intern.matricula);
    setEditEmail(intern.email);
    setEditRegistro(intern.registro_profissional || '');
    setValidationError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    if (!editingKey || !editNome.trim() || !editMatricula.trim() || !editEmail.trim()) {
      setValidationError('Nome completo, Matrícula e E-mail institucional são obrigatórios.');
      return;
    }

    // Esperava o retorno antes de anunciar sucesso: a tela confirmava
    // atualização que o servidor podia ter recusado.
    const resultado = await updateUser(editingKey, {
      nome: editNome.trim(),
      matricula: editMatricula.trim(),
      email: editEmail.trim(),
      registro_profissional: editRegistro.trim() || undefined,
    });

    if (!resultado.success) {
      setValidationError(resultado.message);
      return;
    }

    setFeedbackSuccess(resultado.message);
    setShowEditModal(false);
    setEditingKey(null);
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  const handleConfirmDelete = async () => {
    if (!internToDelete) return;
    setValidationError('');

    // DELETE /usuarios/{id} desativa e preserva a linha para auditoria; não
    // exclui. A mensagem vem do contexto em vez de "excluído(a) com sucesso".
    const resultado = await deleteUser(internToDelete.key);

    if (!resultado.success) {
      setValidationError(resultado.message);
      return;
    }

    setFeedbackSuccess(resultado.message);
    setInternToDelete(null);
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  // Antes eram oito duplas fictícias com "14 / 20" procedimentos e status fixo.
// Agora cada dupla é derivada das fichas reais: quantas viu e quantas tem
// homologadas. Dupla que ainda não registrou ficha não entra na grade.
const duplasReais = useMemo(() => {
  const porDupla = new Map<string, { homologadas: number; total: number; pendentes: number; pacientes: number }>();

  for (const ficha of fichasOdonto) {
    const atual = porDupla.get(ficha.duplaEstagiarios) ?? { homologadas: 0, total: 0, pendentes: 0, pacientes: 0 };
    atual.total += 1;
    if (ficha.status === 'VALIDADO') atual.homologadas += 1;
    if (ficha.status === 'AGUARDANDO_VALIDACAO') atual.pendentes += 1;
    porDupla.set(ficha.duplaEstagiarios, atual);
  }

  return Array.from(porDupla.entries()).map(([nome, contadores], idx) => ({
    id: `D${idx + 1}`,
    name: nome,
    proc: `${contadores.homologadas} / ${contadores.total}`,
    status: contadores.pendentes > 0 ? 'Pendente' : 'Em Dia',
    patients: `${contadores.total} ficha(s)`,
    color: contadores.pendentes > 0 ? 'bg-slate-900 text-white' : 'bg-emerald-700 text-white',
  }));
}, [fichasOdonto]);

const pairs = duplasReais;

const filteredPairs = pairs.filter(
  (p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      {/* Feedback Toast de Sucesso */}
      {feedbackSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackSuccess}</span>
          </div>
          <button
            onClick={() => setFeedbackSuccess('')}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header do Bloco com Botão de Criação */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-emerald-800" />
            <span>Duplas Clínicas sob Orientação Docente ({pairs.length} com ficha registrada)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhamento de carga horária prática, procedimentos odontológicos homologados e biossegurança.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar aluno ou dupla..." 
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full focus:outline-none focus:bg-white focus:border-emerald-600 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setValidationError('');
              setShowCreateModal(true);
            }}
            className="bg-[#881337] hover:bg-[#6e0f2c] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border border-[#4c0519] shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastrar Estagiário</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>
      </div>

      {/* Seção de Estagiários sob Supervisão de Odontologia */}
      <div className="p-4 bg-rose-50/40 border border-rose-200/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#881337] uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#881337]"></span>
            <span>Acadêmicos Estagiários Vinculados à Clínica de Odontologia</span>
          </span>
          <span className="text-[10px] bg-rose-100 text-[#881337] font-bold px-2 py-0.5 rounded">
            {odontoInterns.length} acadêmico(s) registrado(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          {odontoInterns
            .filter(
              ([_, u]) =>
                u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.matricula.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map(([key, intern]) => (
              <div
                key={key}
                className="bg-white p-3.5 rounded-xl border border-rose-200/90 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-900 truncate">{intern.nome}</p>
                    {/* Vem de `ativo`, que o wire já trazia e o estado descartava:
                        o cartão dizia "Ativo" mesmo depois de desativar. */}
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        intern.ativo
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {intern.ativo ? 'Ativo' : 'Desativado'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Matrícula: {intern.matricula}
                  </p>
                  <p className="text-[10px] text-[#881337] font-semibold mt-1 truncate">
                    {intern.registro_profissional || '—'}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      intern.ativo
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-slate-500 bg-slate-100 border-slate-300'
                    }`}
                  >
                    {intern.ativo ? 'Habilitado' : 'Desativado'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(key, intern)}
                      className="p-1 text-slate-400 hover:text-[#881337] hover:bg-rose-50 rounded-md transition-colors"
                      title="Editar estagiário"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternToDelete({ key, nome: intern.nome })}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Desativar acesso do estagiário"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Grade de Duplas Clínicas Padrão */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredPairs.map((pair, idx) => (
          <div key={idx} className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between hover:bg-slate-50 transition-colors">
            <div className="flex gap-3 items-start mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs ${pair.color}`}>
                {pair.id}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Dupla {pair.id}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{pair.name}</p>
              </div>
            </div>
            <div className="text-[10px] border-t border-slate-200/60 pt-3 flex justify-between items-center">
              <div>
                <p className="text-slate-400 uppercase font-semibold">Procedimentos</p>
                <p className="font-bold text-slate-900 font-mono">Homologados: <span className="text-emerald-700">{pair.proc}</span></p>
              </div>
              <div className="text-right">
                <p className="text-slate-500">{pair.patients}</p>
                <p className={`font-bold ${pair.status === 'Em Dia' ? 'text-emerald-700' : pair.status === 'Pendente' ? 'text-amber-700' : pair.status === 'Correção' ? 'text-red-700' : 'text-blue-700'}`}>
                  {pair.status}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de Paginação Inferior */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          Exibindo {filteredPairs.length} dupla(s) com ficha registrada
        </p>
        <button
          type="button"
          className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 border border-emerald-200/70"
        >
          <span>Visualizar Matriz Completa</span>
          <ChevronRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal de Cadastro de Estagiário (Odontologia) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#881337] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  ODO
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cadastrar Estagiário (Odontologia)</h3>
                  <p className="text-[10px] text-slate-500">
                    O perfil será gerado e exibido automaticamente na tela de login.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIntern} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nome Completo do Acadêmico *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Letícia Lima Barbosa"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Matrícula Acadêmica *
                  </label>
                  <input
                    type="text"
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="Ex: 16029944"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/20 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cadeira / Dupla
                  </label>
                  <input
                    type="text"
                    value={cadeira}
                    onChange={(e) => setCadeira(e.target.value)}
                    placeholder="Ex: Cadeira 05 • Dupla 09"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  E-mail Institucional (Opcional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: leticia.barbosa@uninassau.edu.br"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Senha de Acesso *
                </label>
                <input
                  type="text"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] font-mono text-[11px]"
                />
              </div>

              {validationError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {validationError}
                </div>
              )}

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-[11px] text-[#881337] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheckIcon className="w-4 h-4 text-[#881337]" />
                  <span>Autenticação & Segurança (RBAC)</span>
                </div>
                <p className="text-[10px] text-slate-600">
                  A senha é a que você definir agora: o servidor grava com bcrypt e ela
                  não fica visível depois. Passe ao estagiário — ele entra com a matrícula e
                  essa senha.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#881337] hover:bg-[#6e0f2c] text-white rounded-xl font-bold transition-all shadow-xs border border-[#4c0519] flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Cadastrar e Habilitar Login</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Estagiário (Odontologia) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-[#881337] flex items-center justify-center font-bold text-xs shadow-xs">
                  <PencilSquareIcon className="w-4 h-4 text-[#881337]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Editar Estagiário (Odontologia)</h3>
                  <p className="text-[10px] text-slate-500">
                    Atualize os dados acadêmicos ou cadeira clínica do estagiário.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  placeholder="Nome do estagiário"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Matrícula Acadêmica *
                  </label>
                  <input
                    type="text"
                    value={editMatricula}
                    onChange={(e) => setEditMatricula(e.target.value)}
                    placeholder="Matrícula"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/20 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Cadeira / Dupla
                  </label>
                  <input
                    type="text"
                    value={editRegistro}
                    onChange={(e) => setEditRegistro(e.target.value)}
                    placeholder="Ex: Cadeira 05 • Dupla 09"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] text-[11px]"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] font-mono text-[11px]"
                />
              </div>

              {validationError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {validationError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#881337] hover:bg-[#6e0f2c] text-white rounded-xl font-bold transition-all shadow-xs border border-[#4c0519] flex items-center gap-1.5"
                >
                  <CheckCircleIcon className="w-4 h-4 text-emerald-300" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Estagiário */}
      {internToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <TrashIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Desativar Acesso</h3>
                <p className="text-[11px] text-slate-500">Revogação de acesso de estagiário</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Desativar o acesso de <strong className="text-slate-900">{internToDelete.nome}</strong>?
              Ele não conseguirá mais entrar no módulo de Odontologia. O cadastro e o
              histórico de auditoria são preservados — a conta pode ser reativada depois.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInternToDelete(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Desativar Acesso</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}