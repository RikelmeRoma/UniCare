import { useEffect, useState } from 'react';
import { AppLayout } from '../../../../components/layout/AppLayout';
import { PsyTeacherHeader } from '../components/PsyTeacherHeader';
import { PsySupervisionStats } from '../components/PsySupervisionStats';
import { PsyApprovalQueue } from '../components/PsyApprovalQueue';
import {
  UserGroupIcon,
  XMarkIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '../../../../components/icons/CorporateIcons';
import { useAuth, type User } from '../../../auth/context/AuthContext';
import { api, type ApiEstagiarioDisponivel } from '../../../../services/api';
import { InfoTooltip } from '../../../../components/ui/InfoTooltip';

export function PsySupervisionPage() {
  const {
    user,
    allUsers,
    updateUser,
    deleteUser,
    vincularSupervisor,
    carregarUsuarios,
  } = useAuth();
  const isGestor = user?.perfil === 'rt' || user?.perfil === 'coordenacao';
  const [showVincularModal, setShowVincularModal] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [validationError, setValidationError] = useState('');
  const [busca, setBusca] = useState('');

  // Estagiários que já estão no sistema e ainda não têm supervisor. É o que
  // permite ao supervisor assumir um aluno que a gestão cadastrou — antes ele só
  // enxergava quem ele mesmo criou.
  const [disponiveis, setDisponiveis] = useState<ApiEstagiarioDisponivel[]>([]);
  const [disponivelEscolhido, setDisponivelEscolhido] = useState('');
  const [supervisorEscolhido, setSupervisorEscolhido] = useState('');
  const [vinculando, setVinculando] = useState(false);
  const [vincularErro, setVincularErro] = useState('');

  // Estados de Edição e Exclusão de Estagiários
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRegistro, setEditRegistro] = useState('');
  const [internToDelete, setInternToDelete] = useState<{ key: string; nome: string } | null>(null);

  // Estagiários de Psicologia registrados no sistema. O supervisor vê apenas
  // os que estão vinculados a ele (RF-005); a gestão vê todos da clínica.
  const psicoInterns = Object.entries(allUsers || {}).filter(
    ([, u]) =>
      u.curso === 'psicologia' &&
      u.perfil === 'estagiario' &&
      (isGestor || u.supervisor_matricula === user?.matricula)
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

  const supervisores = Object.values(allUsers || {})
    .filter(
      (u) =>
        u.perfil === 'supervisor' &&
        u.curso === 'psicologia' &&
        u.ativo
    )
    .sort((a, b) => a.nome.localeCompare(b.nome));

  useEffect(() => {
    void carregarUsuarios();
  }, [carregarUsuarios]);

  // A lista de quem ainda não tem supervisor. O filtro é do servidor: aqui só
  // chega quem de fato pode ser assumido, e a tela não precisa saber de onde
  // veio o critério.
  useEffect(() => {
    let cancelado = false;
    api
      .getEstagiariosDisponiveis('psicologia')
      .then((lista) => {
        if (!cancelado) setDisponiveis(lista);
      })
      .catch(() => {
        // Sem a lista não há como escolher quem vincular; a falha fica visível
        // como estado vazio, não como erro de sistema.
        if (!cancelado) setDisponiveis([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const handleVincular = async () => {
    if (!disponivelEscolhido) {
      setVincularErro('Escolha o estagiário que será vinculado.');
      return;
    }
    if (isGestor && !supervisorEscolhido) {
      setVincularErro('Escolha o supervisor responsável.');
      return;
    }
    const alvo = disponiveis.find((e) => e.matricula === disponivelEscolhido);
    if (!alvo) {
      setVincularErro('Não foi possível localizar esse estagiário.');
      return;
    }
    const supervisorAlvo = supervisores.find(
      (s) => s.matricula === supervisorEscolhido
    );

    setVincularErro('');
    setVinculando(true);

    // O supervisor se vincula a si mesmo — a matrícula vem do token. A gestão
    // escolhe a quem vincular, e aí a matrícula do supervisor vai no corpo.
    const resultado = await vincularSupervisor(
      String(alvo.id),
      isGestor ? supervisorEscolhido : undefined
    );
    setVinculando(false);

    if (!resultado.success) {
      setVincularErro(resultado.message);
      return;
    }

    setDisponiveis((prev) => prev.filter((e) => e.matricula !== disponivelEscolhido));
    setDisponivelEscolhido('');
    setSupervisorEscolhido('');
    setShowVincularModal(false);
    setFeedbackSuccess(
      isGestor
        ? `${alvo.nome} vinculado a ${supervisorAlvo?.nome ?? 'supervisor selecionado'}.`
        : resultado.message
    );
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

  const handleAtivarEstagiario = async (key: string) => {
    setValidationError('');

    // Reativa um estagiário desativado: PATCH /usuarios/{id} com ativo = true.
    const resultado = await updateUser(key, { ativo: true });

    if (!resultado.success) {
      setValidationError(resultado.message);
      return;
    }

    setFeedbackSuccess(resultado.message);
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  return (
    <AppLayout
      title="Supervisão Docente de Psicologia (SPA)"
      info="Fila de homologação de prontuários eletrônicos, vistos digitais e devolutivas formativas sob a Resolução CFP nº 06/2019"
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
                <span>Estagiários sob Orientação Docente (Clínica de Psicologia)</span>
                <InfoTooltip
                  texto={
                    isGestor
                      ? 'A gestão (RT ou coordenação) vê todos os estagiários da clínica e pode atribuir supervisor. O supervisor vê apenas os vinculados a ele.'
                      : 'Você vê apenas os estagiários vinculados a você.'
                  }
                />
              </h4>
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
                  setVincularErro('');
                  setDisponivelEscolhido('');
                  setSupervisorEscolhido('');
                  setShowVincularModal(true);
                }}
                className="bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border border-blue-900"
              >
                <UserGroupIcon className="w-4 h-4" />
                <span>Vincular Estagiário</span>
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
                ? isGestor
                  ? 'Nenhum estagiário de psicologia cadastrado.'
                  : 'Nenhum estagiário vinculado a você. Use "Vincular Estagiário" para assumir um aluno já cadastrado pela gestão.'
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
                    {intern.ativo ? (
                      <button
                        type="button"
                        onClick={() => setInternToDelete({ key, nome: intern.nome })}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Desativar estagiário"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAtivarEstagiario(key)}
                        className="p-1 text-slate-400 hover:bg-blue-100 hover:text-blue-700 rounded-md transition-colors"
                        title="Ativar estagiário"
                      >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Modal de Vínculo de Estagiário (SPA Psicologia) */}
      {showVincularModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  SPA
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Vincular Estagiário (Psicologia)
                    <InfoTooltip
                      texto={
                        isGestor
                          ? 'Selecione o estagiário e o supervisor responsável. A troca posterior de supervisor é ato da gestão.'
                          : 'Selecione um estagiário ativo da clínica que ainda não tenha supervisor. O aluno passará a ficar sob sua orientação.'
                      }
                    />
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVincularModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Assumir um estagiário que já está no sistema. É outra ação que
                  criar um acadêmico novo: o aluno cadastrado pela gestão não
                  aparece na lista de ninguém, e sem isto o supervisor só
                  enxerga quem ele mesmo criou. */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                  Vincular estagiário já cadastrado
                  <InfoTooltip
                    align="left"
                    texto={
                      isGestor
                        ? 'Estagiários ativos da clínica que ainda não têm supervisor. Escolha o supervisor responsável; a troca posterior é ato da gestão.'
                        : 'Estagiários ativos da clínica que ainda não têm supervisor. Assumir um aluno alheio não é permitido — a troca de responsável é ato da Referência Técnica.'
                    }
                  />
                </p>

                {disponiveis.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-lg px-3 py-2">
                    Nenhum estagiário ativo sem supervisor nesta clínica.
                  </p>
                ) : (
                  <>
                    {isGestor && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Supervisor Responsável *
                        </label>
                        <select
                          value={supervisorEscolhido}
                          onChange={(e) => setSupervisorEscolhido(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 text-xs"
                        >
                          <option value="">Selecione o supervisor…</option>
                          {supervisores.map((s) => (
                            <option key={s.matricula} value={s.matricula}>
                              {s.nome} ({s.matricula})
                            </option>
                          ))}
                        </select>
                        {supervisores.length === 0 && (
                          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mt-1">
                            Nenhum supervisor ativo nesta clínica.
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Estagiário *
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={disponivelEscolhido}
                          onChange={(e) => setDisponivelEscolhido(e.target.value)}
                          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-blue-600 text-xs"
                        >
                          <option value="">Selecione o estagiário…</option>
                          {disponiveis.map((e) => (
                            <option key={e.id} value={e.matricula}>
                              {e.nome} ({e.matricula})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void handleVincular()}
                          disabled={
                            vinculando ||
                            !disponivelEscolhido ||
                            (isGestor && !supervisorEscolhido)
                          }
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {vinculando ? 'Vinculando...' : 'Vincular'}
                        </button>
                      </div>
                    </div>

                    {vincularErro && (
                      <p className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                        {vincularErro}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVincularModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
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
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    Editar Estagiário (Psicologia)
                    <InfoTooltip texto="Atualize os dados acadêmicos ou credenciais do estagiário." />
                  </h3>
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
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  Desativar Estagiário
                  <InfoTooltip texto="Revogação de acesso de estagiário." />
                </h3>
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
