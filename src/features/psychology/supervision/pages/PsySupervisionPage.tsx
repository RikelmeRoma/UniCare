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
} from '../../../../components/icons/CorporateIcons';
import { useAuth, type User } from '../../../auth/context/AuthContext';

export function PsySupervisionPage() {
  const { allUsers, createUser, updateUser, deleteUser } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nome, setNome] = useState('');
  const [matricula, setMatricula] = useState('');
  const [email, setEmail] = useState('');
  // Senha obrigatoria: o backend grava com bcrypt e nao aceita usuario sem ela.
  const [senha, setSenha] = useState('');
  const [periodo, setPeriodo] = useState('9º Período');
  const [turma, setTurma] = useState('Turma Terça Tarde (SPA)');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [validationError, setValidationError] = useState('');

  // Estados de Edição e Exclusão de Estagiários
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRegistro, setEditRegistro] = useState('');
  const [internToDelete, setInternToDelete] = useState<{ key: string; nome: string } | null>(null);

  // Estagiários de Psicologia registrados no sistema
  const psicoInterns = Object.entries(allUsers || {}).filter(
    ([_, u]) => u.curso === 'psicologia' && u.perfil === 'estagiario'
  );

  const handleCreateIntern = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!nome.trim() || !matricula.trim()) {
      setValidationError('Nome completo e Matrícula são obrigatórios.');
      return;
    }
    if (senha.length < 6) {
      setValidationError('A senha precisa de ao menos 6 caracteres.');
      return;
    }

    const cleanMatricula = matricula.trim();
    const cleanEmail =
      email.trim() ||
      `${nome.trim().toLowerCase().split(' ')[0]}.${cleanMatricula}@uninassau.edu.br`;

    const resultado = await createUser({
      nome: nome.trim(),
      matricula: cleanMatricula,
      email: cleanEmail,
      perfil: 'estagiario',
      curso: 'psicologia',
      registro_profissional: `${periodo} • ${turma}`,
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
    setEditRegistro(intern.registro_profissional || '9º Período • Turma Terça Tarde (SPA)');
    setValidationError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey || !editNome.trim() || !editMatricula.trim()) {
      setValidationError('Nome completo e Matrícula são obrigatórios.');
      return;
    }

    updateUser(editingKey, {
      nome: editNome.trim(),
      matricula: editMatricula.trim(),
      email:
        editEmail.trim() ||
        `${editNome.trim().toLowerCase().split(' ')[0]}.${editMatricula.trim()}@uninassau.edu.br`,
      registro_profissional: editRegistro.trim() || undefined,
    });

    setFeedbackSuccess(`Estagiário ${editNome.trim()} atualizado com sucesso!`);
    setShowEditModal(false);
    setEditingKey(null);
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  const handleConfirmDelete = () => {
    if (!internToDelete) return;
    deleteUser(internToDelete.key);
    setFeedbackSuccess(`Estagiário ${internToDelete.nome} excluído com sucesso.`);
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
                <span>Estagiários sob Orientação Docente ({turma} • RF-004)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Segregação por orientação: o supervisor visualiza e valida exclusivamente prontuários dos acadêmicos vinculados à sua turma.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 font-mono font-bold px-3 py-1 rounded-full">
                {psicoInterns.length} acadêmicos vinculados
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {psicoInterns.map(([key, intern]) => (
              <div
                key={key}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  intern.custom
                    ? 'border-blue-300 bg-blue-50/40 shadow-2xs'
                    : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-slate-900 truncate">{intern.nome}</p>
                    {intern.custom && (
                      <span className="text-[8px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                        Novo
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px] font-mono">
                    Matrícula: {intern.matricula}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {intern.registro_profissional || '9º Período • Turma Terça'}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 inline-block font-mono">
                    Habilitado
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
                  E-mail Institucional (Opcional)
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
                  O estagiário será criado com a senha padrão <code className="font-mono font-bold bg-white px-1 py-0.5 rounded border border-blue-200">unicare123</code>. Ele aparecerá no card rápido de Psicologia, mas precisará digitar a senha para acessar.
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
                <h3 className="text-sm font-bold text-slate-900">Excluir Estagiário</h3>
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
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Excluir Estagiário</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}