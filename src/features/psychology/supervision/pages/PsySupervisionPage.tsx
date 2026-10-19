import { useState } from 'react';
import { AppLayout } from '../../../../components/layout/AppLayout';
import { PsyTeacherHeader } from '../components/PsyTeacherHeader';
import { PsySupervisionStats } from '../components/PsySupervisionStats';
import { PsyApprovalQueue } from '../components/PsyApprovalQueue';
import {
  UserGroupIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '../../../../components/icons/CorporateIcons';
import { useAuth, type User } from '../../../auth/context/AuthContext';

export function PsySupervisionPage() {
  const { user } = useAuth();
  const isRT = user?.perfil === 'rt';
  const { allUsers, createUser, updateUser, deleteUser } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [email, setEmail] = useState('');
  // Senha obrigatoria: o backend grava com bcrypt e nao aceita usuario sem ela.
  const [senha, setSenha] = useState('');
  const [periodo, setPeriodo] = useState('9º Período');
  // Antes vinha preenchida com 'Turma Terça Tarde (SPA)' e era gravada em
  // registro_profissional: um nome de turma que ninguém escolheu, e que ainda
  // aparecia no cabeçalho como se fosse a turma real da clínica.
  const [turma, setTurma] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [validationError, setValidationError] = useState('');
  const [busca, setBusca] = useState('');

  // Estados de Edição e Exclusão de Estagiários
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRegistro, setEditRegistro] = useState('');
  const [internToDelete, setInternToDelete] = useState<{ key: string; nome: string } | null>(null);

  // Estagiários de Psicologia registrados no sistema. O supervisor vê apenas
  // os que estão vinculados a ele (RF-005); a RT vê todos da clínica.
  const psicoInterns = Object.entries(allUsers || {}).filter(
    ([, u]) =>
      u.curso === 'psicologia' &&
      u.perfil === 'estagiario' &&
      (isRT || u.supervisor_matricula === user?.matricula)
  );

  // Busca por nome ou matrícula: mesmo controle que a tela de duplas
  // (ClinicalPairs) já usava, e que faltava aqui.
  const buscaIntern = busca.trim().toLowerCase();
  const psicoInternsFiltrados = buscaIntern
    // O primeiro elemento da tupla (a chave) não é usado: omitido com `[, u]`
    // em vez de `([_, u])`, que o eslint marca como variável declarada e não
    // usada. A linha equivalente em `psicoInterns` acima segue com o padrão
    // antigo — é um erro de lint preexistente, fora do escopo deste bloco.
    ? psicoInterns.filter(([, u]) =>
        u.nome.toLowerCase().includes(buscaIntern) ||
        u.matricula.toLowerCase().includes(buscaIntern)
      )
    : psicoInterns;

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

    // O e-mail deixa de ser fabricado: antes, campo em branco virava
    // nome.matricula@uninassau.edu.br e ia para o banco como se o supervisor
    // tivesse digitado. Endereço que ninguém preencheu e que ninguém consegue
    // distinguir de real é dado falso persistido.
    const resultado = await createUser({
      nome: nome.trim(),
      matricula: cleanMatricula,
      email: email.trim(),
      perfil: 'estagiario',
      // Anotação livre do supervisor. Só entra o que ele preencheu: campo vazio
      // não vira "Turma Terça Tarde (SPA)" na base.
      registro_profissional: [periodo.trim(), turma.trim()].filter(Boolean).join(' • ') || undefined,
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
    setSenha('');
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

    // Antes disparava o update e anunciava sucesso na sequência, sem esperar:
    // a tela dizia "atualizado com sucesso" para uma gravação que o servidor
    // podia ter recusado.
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

    // Não é exclusão: DELETE /usuarios/{id} marca ativo = false e preserva a
    // linha para a trilha de auditoria. A mensagem vem do contexto, que já
    // dizia a coisa certa — a tela sobrescrevia com "excluído".
    const resultado = await deleteUser(internToDelete.key);

    if (!resultado.success) {
      setValidationError(resultado.message);
      return;
    }

    setFeedbackSuccess(resultado.message);
    setInternToDelete(null);
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  return (
    <AppLayout
      title="Supervisão Docente de Psicologia (SPA)"
      subtitle="Fila de homologação de prontuários eletrônicos, vistos digitais e devolutivas formativas sob a Resolução CFP nº 06/2019"
      badge="Resolução CFP nº 06/2019"
      badgeType="blue"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <PsyTeacherHeader />
        <PsySupervisionStats />

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

        {/* Fila de Homologação Real e Devolutiva Pedagógica */}
        <PsyApprovalQueue />

        {/* Estagiários sob Orientação Docente */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 uppercase tracking-wider">
                <UserGroupIcon className="w-4 h-4 text-blue-700" />
                <span>Estagiários sob Orientação Docente (Clínica de Psicologia • RF-004)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {isRT
                  ? 'A Referência Técnica vê todos os estagiários da clínica e pode atribuir supervisor. O supervisor vê apenas os vinculados a ele (RF-005).'
                  : 'Você vê apenas os estagiários vinculados a você.'}
              </p>
            </div>

<div className="flex items-center gap-2">
            <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold px-3 py-1 rounded-full">
                {psicoInternsFiltrados.length === psicoInterns.length
                  ? `${psicoInterns.length} acadêmicos vinculados`
                  : `${psicoInternsFiltrados.length} de ${psicoInterns.length} acadêmicos`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setValidationError('');
                  setShowCreateModal(true);
                }}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border border-blue-900"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Cadastrar Estagiário</span>
              </button>
            </div>
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar estagiário por nome ou matrícula..."
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          {psicoInternsFiltrados.length === 0 ? (
            <p className="text-xs text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
              {psicoInterns.length === 0
                ? 'Nenhum estagiário de psicologia cadastrado.'
                : 'Nenhum estagiário corresponde à busca.'}
            </p>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {psicoInternsFiltrados.map(([key, intern]) => (
              <div
                key={key}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  intern.ativo
                    ? 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50'
                    : 'border-slate-200/80 bg-white opacity-70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-slate-900 truncate">{intern.nome}</p>
                  </div>
                  <p className="text-slate-500 text-[11px] font-mono">
                    Matrícula: {intern.matricula}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {intern.registro_profissional || '—'}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                  <div
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono inline-block ${
                      intern.ativo
                        ? 'text-blue-700 bg-blue-50 border-blue-200'
                        : 'text-slate-500 bg-slate-100 border-slate-300'
                    }`}
                  >
                    {intern.ativo ? 'Habilitado' : 'Desativado'}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(key, intern)}
                      className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                      title="Editar estagiário"
                    >
                      <PencilSquareIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternToDelete({ key, nome: intern.nome })}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Excluir estagiário"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Modal de Criação de Estagiário (SPA Psicologia) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  SPA
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Cadastrar Estagiário (Psicologia)</h3>
                  <p className="text-[10px] text-slate-500">
                    O estagiário será criado com a senha institucional
                    Unicare123, que ele troca no primeiro acesso.
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
                  placeholder="Ex: Beatriz Lima Ribeiro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
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
                    placeholder="Ex: 16038910"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Período do Curso
                  </label>
                  <select
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600"
                  >
                    <option value="9º Período">9º Período</option>
                    <option value="10º Período">10º Período</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  E-mail Institucional
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ex: beatriz.ribeiro@uninassau.edu.br"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono text-[11px]"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Turma de Orientação Docente
                </label>
                <input
                  type="text"
                  value={turma}
                  onChange={(e) => setTurma(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 font-mono text-[11px]"
                />
              </div>

              {validationError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {validationError}
                </div>
              )}

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheckIcon className="w-4 h-4 text-blue-700" />
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
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-xs border border-blue-900 flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Cadastrar e Habilitar Login</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Estagiário (Psicologia) */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-xs">
                  <PencilSquareIcon className="w-4 h-4 text-blue-800" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Editar Estagiário (Psicologia)</h3>
                  <p className="text-[10px] text-slate-500">
                    Atualize os dados acadêmicos ou credenciais do estagiário.
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Período / Turma
                  </label>
                  <input
                    type="text"
                    value={editRegistro}
                    onChange={(e) => setEditRegistro(e.target.value)}
                    placeholder="Ex: 9º Período • Turma A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 font-mono text-[11px]"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 font-mono text-[11px]"
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
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-xs border border-blue-900 flex items-center gap-1.5"
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
                <h3 className="text-sm font-bold text-slate-900">Desativar Estagiário</h3>
                <p className="text-[11px] text-slate-500">Revogação de acesso de estagiário</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Deseja realmente remover o estagiário <strong className="text-slate-900">{internToDelete.nome}</strong>? Ele não conseguirá mais efetuar login no módulo de Psicologia.
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
                <span>Desativar Estagiário</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
