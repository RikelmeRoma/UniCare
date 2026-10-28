import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  TrashIcon,
  UserPlusIcon,
  ArrowPathIcon,
} from '../../../components/icons/CorporateIcons';
import { useAuth, type User } from '../../auth/context/AuthContext';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  api,
  type ApiDuplaOdonto,
  type ApiEstagiarioDisponivel,
} from '../../../services/api';

interface ContadoresDupla {
  total: number;
  homologadas: number;
  pendentes: number;
}

interface ResultadoCarga {
  duplas?: ApiDuplaOdonto[];
  disponiveis?: ApiEstagiarioDisponivel[];
  falhas: string[];
}

const chaveDupla = (operador: string, auxiliar: string) =>
  [operador, auxiliar].sort().join('|');

const mensagemDeErro = (err: unknown, padrao: string) =>
  err instanceof Error && err.message ? err.message : padrao;

export function ClinicalPairs() {
  const { user, allUsers, vincularSupervisor, updateUser, deleteUser } = useAuth();
  const { documentosOdonto } = useClinic();
  const isRT = user?.perfil === 'rt';

  const [duplas, setDuplas] = useState<ApiDuplaOdonto[]>([]);
  const [disponiveis, setDisponiveis] = useState<ApiEstagiarioDisponivel[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [disponivelEscolhido, setDisponivelEscolhido] = useState('');
  const [showPairModal, setShowPairModal] = useState(false);
  const [operador, setOperador] = useState('');
  const [auxiliar, setAuxiliar] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [validationError, setValidationError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editMatricula, setEditMatricula] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [internToDelete, setInternToDelete] = useState<{ key: string; nome: string } | null>(null);
  const [duplaToDelete, setDuplaToDelete] = useState<ApiDuplaOdonto | null>(null);

  const buscarDados = useCallback(async (): Promise<ResultadoCarga> => {
    const [resultadoDuplas, resultadoDisponiveis] = await Promise.allSettled([
      api.getDuplasOdonto(),
      api.getEstagiariosDisponiveis('odontologia'),
    ]);

    const falhas: string[] = [];
    const resultado: ResultadoCarga = { falhas };

    if (resultadoDuplas.status === 'fulfilled') {
      resultado.duplas = resultadoDuplas.value;
    } else {
      falhas.push(
        `duplas: ${mensagemDeErro(resultadoDuplas.reason, 'falha ao carregar')}`
      );
    }

    if (resultadoDisponiveis.status === 'fulfilled') {
      resultado.disponiveis = resultadoDisponiveis.value;
    } else {
      falhas.push(
        `estagiários disponíveis: ${mensagemDeErro(
          resultadoDisponiveis.reason,
          'falha ao carregar'
        )}`
      );
    }

    return resultado;
  }, []);

  const aplicarResultado = useCallback((resultado: ResultadoCarga) => {
    if (resultado.duplas) setDuplas(resultado.duplas);
    if (resultado.disponiveis) setDisponiveis(resultado.disponiveis);
    setErroCarga(resultado.falhas.join(' · '));
  }, []);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    const resultado = await buscarDados();
    aplicarResultado(resultado);
    setCarregando(false);
  }, [buscarDados, aplicarResultado]);

  useEffect(() => {
    let ativo = true;
    void buscarDados().then((resultado) => {
      if (!ativo) return;
      aplicarResultado(resultado);
      setCarregando(false);
    });
    return () => {
      ativo = false;
    };
  }, [buscarDados, aplicarResultado]);

  const odontoInterns = useMemo(
    () =>
      Object.entries(allUsers || {}).filter(
        ([, u]) =>
          u.curso === 'odontologia' &&
          u.perfil === 'estagiario' &&
          (isRT || u.supervisor_matricula === user?.matricula)
      ),
    [allUsers, isRT, user?.matricula]
  );

  const duplaPorMatricula = useMemo(() => {
    const mapa = new Map<string, ApiDuplaOdonto>();
    for (const dupla of duplas) {
      mapa.set(dupla.operador_matricula, dupla);
      mapa.set(dupla.auxiliar_matricula, dupla);
    }
    return mapa;
  }, [duplas]);

  const contadoresPorDupla = useMemo(() => {
    const mapa = new Map<string, ContadoresDupla>();
    for (const documento of documentosOdonto) {
      const chave = chaveDupla(
        documento.operadorMatricula,
        documento.auxiliarMatricula
      );
      const atual = mapa.get(chave) ?? {
        total: 0,
        homologadas: 0,
        pendentes: 0,
      };
      atual.total += 1;
      if (documento.status === 'VALIDADO') atual.homologadas += 1;
      if (documento.status === 'AGUARDANDO_VALIDACAO') atual.pendentes += 1;
      mapa.set(chave, atual);
    }
    return mapa;
  }, [documentosOdonto]);

  const busca = searchTerm.trim().toLowerCase();

  const internosFiltrados = useMemo(
    () =>
      odontoInterns.filter(
        ([, u]) =>
          !busca ||
          u.nome.toLowerCase().includes(busca) ||
          u.matricula.toLowerCase().includes(busca)
      ),
    [odontoInterns, busca]
  );

  const duplasFiltradas = useMemo(
    () =>
      duplas.filter(
        (dupla) =>
          !busca ||
          dupla.operador_nome.toLowerCase().includes(busca) ||
          dupla.auxiliar_nome.toLowerCase().includes(busca) ||
          dupla.operador_matricula.toLowerCase().includes(busca) ||
          dupla.auxiliar_matricula.toLowerCase().includes(busca)
      ),
    [duplas, busca]
  );

  const alunosSemDupla = useMemo(() => {
    const matriculasEmDupla = new Set(
      duplas.flatMap((dupla) => [
        dupla.operador_matricula,
        dupla.auxiliar_matricula,
      ])
    );
    return odontoInterns.filter(
      ([, u]) => u.ativo && !matriculasEmDupla.has(u.matricula)
    );
  }, [duplas, odontoInterns]);

  const disponiveisParaVincular = useMemo(
    () =>
      disponiveis.filter((estagiario) => !duplaPorMatricula.has(estagiario.matricula)),
    [disponiveis, duplaPorMatricula]
  );

  const abrirModalVinculo = () => {
    setValidationError('');
    setDisponivelEscolhido('');
    setShowLinkModal(true);
  };

  const abrirModalDupla = () => {
    setValidationError('');
    setOperador('');
    setAuxiliar('');
    setShowPairModal(true);
  };

  const handleVincular = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const alvo = disponiveisParaVincular.find(
      (estagiario) => estagiario.matricula === disponivelEscolhido
    );
    if (!alvo) {
      setValidationError('Escolha o estagiário que você vai assumir.');
      return;
    }

    setSalvando(true);
    const resultado = await vincularSupervisor(String(alvo.id));
    setSalvando(false);

    if (!resultado.success) {
      setValidationError(resultado.message);
      return;
    }

    setDisponiveis((prev) =>
      prev.filter((estagiario) => estagiario.matricula !== alvo.matricula)
    );
    setShowLinkModal(false);
    setFeedbackSuccess(resultado.message);
    await carregarDados();
    setTimeout(() => setFeedbackSuccess(''), 6000);
  };

  const handleCriarDupla = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!operador || !auxiliar) {
      setValidationError('Escolha os dois estagiários da dupla.');
      return;
    }
    if (operador === auxiliar) {
      setValidationError('Um estagiário não pode formar dupla consigo mesmo.');
      return;
    }

    setSalvando(true);
    try {
      const criada = await api.criarDuplaOdonto({
        operador_matricula: operador,
        auxiliar_matricula: auxiliar,
      });
      setDuplas((prev) => [criada, ...prev]);
      setShowPairModal(false);
      setFeedbackSuccess(
        `Dupla montada: ${criada.operador_nome} e ${criada.auxiliar_nome}.`
      );
      setTimeout(() => setFeedbackSuccess(''), 6000);
    } catch (err) {
      setValidationError(
        mensagemDeErro(err, 'Falha ao montar a dupla no servidor.')
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleOpenEdit = (key: string, intern: User) => {
    setEditingKey(key);
    setEditNome(intern.nome);
    setEditMatricula(intern.matricula);
    setEditEmail(intern.email);
    setValidationError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError('');
    if (!editingKey || !editNome.trim() || !editMatricula.trim() || !editEmail.trim()) {
      setValidationError('Nome completo, matrícula e e-mail institucional são obrigatórios.');
      return;
    }

    const resultado = await updateUser(editingKey, {
      nome: editNome.trim(),
      matricula: editMatricula.trim(),
      email: editEmail.trim(),
    });

    if (!resultado.success) {
      setValidationError(resultado.message);
      return;
    }

    setFeedbackSuccess(resultado.message);
    setShowEditModal(false);
    setEditingKey(null);
    await carregarDados();
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  const handleConfirmDelete = async () => {
    if (!internToDelete) return;
    setValidationError('');

    const resultado = await deleteUser(internToDelete.key);

    if (!resultado.success) {
      setValidationError(resultado.message);
      return;
    }

    setFeedbackSuccess(resultado.message);
    setInternToDelete(null);
    await carregarDados();
    setTimeout(() => setFeedbackSuccess(''), 5000);
  };

  const handleDesativarDupla = async () => {
    if (!duplaToDelete) return;
    setValidationError('');
    setSalvando(true);

    try {
      await api.desativarDuplaOdonto(duplaToDelete.id);
      setDuplas((prev) => prev.filter((dupla) => dupla.id !== duplaToDelete.id));
      setFeedbackSuccess(
        `Dupla de ${duplaToDelete.operador_nome} e ${duplaToDelete.auxiliar_nome} desfeita.`
      );
      setDuplaToDelete(null);
      setTimeout(() => setFeedbackSuccess(''), 5000);
    } catch (err) {
      setValidationError(
        mensagemDeErro(err, 'Falha ao desfazer a dupla no servidor.')
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
      {feedbackSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-800 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackSuccess('')}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {erroCarga && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-xs text-red-700">
          <span>Não foi possível carregar tudo: {erroCarga}</span>
          <button
            type="button"
            onClick={() => void carregarDados()}
            className="font-bold underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-emerald-800" />
            <span>Duplas Clínicas sob Orientação Docente ({duplas.length} ativas)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            O supervisor vincula alunos já cadastrados e monta a dupla que atende em cadeira.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 min-w-[180px] md:w-64">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar aluno ou dupla..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-full focus:outline-none focus:bg-white focus:border-emerald-600 transition-colors"
            />
          </div>

          {!isRT && (
            <>
              <button
                type="button"
                onClick={abrirModalVinculo}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border border-emerald-900 shrink-0"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span>Vincular Aluno</span>
              </button>
              <button
                type="button"
                onClick={abrirModalDupla}
                className="bg-[#881337] hover:bg-[#6e0f2c] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 border border-[#4c0519] shrink-0"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Montar Dupla</span>
              </button>
            </>
          )}
        </div>
      </div>

      {carregando ? (
        <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
          Carregando duplas e alunos...
        </div>
      ) : (
        <>
          <div className="p-4 bg-rose-50/40 border border-rose-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#881337] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#881337]" />
                <span>Acadêmicos Estagiários Vinculados à Clínica de Odontologia</span>
              </span>
              <span className="text-[10px] bg-rose-100 text-[#881337] font-bold px-2 py-0.5 rounded">
                {odontoInterns.length} acadêmico(s)
              </span>
            </div>

            {internosFiltrados.length === 0 ? (
              <p className="text-xs text-slate-500 italic bg-white border border-dashed border-rose-200 rounded-xl p-4 text-center">
                {odontoInterns.length === 0
                  ? 'Nenhum estagiário vinculado a você. Use "Vincular Aluno" para assumir um cadastro existente.'
                  : 'Nenhum estagiário corresponde à busca.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {internosFiltrados.map(([key, intern]) => {
                  const dupla = duplaPorMatricula.get(intern.matricula);
                  return (
                    <div
                      key={key}
                      className="bg-white p-3.5 rounded-xl border border-rose-200/90 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-bold text-slate-900 truncate">{intern.nome}</p>
                          <span
                            className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono shrink-0 ${
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
                          {dupla
                            ? `Dupla com ${
                                dupla.operador_matricula === intern.matricula
                                  ? dupla.auxiliar_nome
                                  : dupla.operador_nome
                              }`
                            : 'Sem dupla ativa'}
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
                  );
                })}
              </div>
            )}
          </div>

          {duplasFiltradas.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              {duplas.length === 0
                ? 'Nenhuma dupla montada ainda. Use "Montar Dupla" para unir dois alunos vinculados.'
                : 'Nenhuma dupla corresponde à busca.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {duplasFiltradas.map((dupla) => {
                const contadores = contadoresPorDupla.get(
                  chaveDupla(dupla.operador_matricula, dupla.auxiliar_matricula)
                ) ?? { total: 0, homologadas: 0, pendentes: 0 };
                const status =
                  contadores.pendentes > 0
                    ? 'Pendente'
                    : contadores.total === 0
                      ? 'Sem ficha'
                      : 'Em Dia';
                return (
                  <div
                    key={dupla.id}
                    className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex gap-3 items-start mb-4">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 ${
                          contadores.pendentes > 0
                            ? 'bg-slate-900 text-white'
                            : 'bg-emerald-700 text-white'
                        }`}
                      >
                        D{dupla.id}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900">Dupla {dupla.id}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {dupla.operador_nome} + {dupla.auxiliar_nome}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">
                          {dupla.operador_matricula} · {dupla.auxiliar_matricula}
                        </p>
                        {isRT && dupla.supervisor_nome && (
                          <p className="text-[9px] text-slate-400 mt-0.5 truncate">
                            Supervisor: {dupla.supervisor_nome}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setValidationError('');
                          setDuplaToDelete(dupla);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
                        title="Desfazer dupla"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-[10px] border-t border-slate-200/60 pt-3 flex justify-between items-center">
                      <div>
                        <p className="text-slate-400 uppercase font-semibold">Procedimentos</p>
                        <p className="font-bold text-slate-900 font-mono">
                          Homologados:{' '}
                          <span className="text-emerald-700">
                            {contadores.homologadas} / {contadores.total}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500">{contadores.total} ficha(s)</p>
                        <p
                          className={`font-bold ${
                            status === 'Em Dia'
                              ? 'text-emerald-700'
                              : status === 'Pendente'
                                ? 'text-amber-700'
                                : 'text-slate-500'
                          }`}
                        >
                          {status}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Exibindo {duplasFiltradas.length} dupla(s) ativa(s)
            </p>
            <button
              type="button"
              onClick={() => void carregarDados()}
              className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 border border-emerald-200/70"
            >
              <ArrowPathIcon className="w-3.5 h-3.5" />
              <span>Atualizar</span>
            </button>
          </div>
        </>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <UserPlusIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Vincular Aluno</h3>
                  <p className="text-[10px] text-slate-500">
                    O cadastro é da RT; aqui você assume um aluno já existente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVincular} className="space-y-3.5 text-xs">
              {disponiveisParaVincular.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-3">
                  Nenhum estagiário ativo de odontologia sem supervisor. A RT precisa
                  cadastrar o aluno antes.
                </p>
              ) : (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Estagiário disponível *
                  </label>
                  <select
                    value={disponivelEscolhido}
                    onChange={(e) => setDisponivelEscolhido(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-600 text-xs"
                  >
                    <option value="">Selecione o estagiário</option>
                    {disponiveisParaVincular.map((estagiario) => (
                      <option key={estagiario.id} value={estagiario.matricula}>
                        {estagiario.nome} ({estagiario.matricula})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {validationError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {validationError}
                </div>
              )}

              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheckIcon className="w-4 h-4 text-emerald-700" />
                  <span>Vínculo sob sua responsabilidade</span>
                </div>
                <p className="text-[10px] text-slate-600">
                  O aluno passa a aparecer na sua supervisão. A criação de conta e a troca
                  de responsável continuam sendo atos da Referência Técnica.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando || disponiveisParaVincular.length === 0}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold transition-all shadow-xs border border-emerald-900 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <UserPlusIcon className="w-4 h-4" />
                  <span>{salvando ? 'Vinculando...' : 'Vincular Aluno'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPairModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#881337] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <UserGroupIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Montar Dupla</h3>
                  <p className="text-[10px] text-slate-500">
                    Cada aluno só pode estar em uma dupla ativa.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPairModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCriarDupla} className="space-y-3.5 text-xs">
              {alunosSemDupla.length < 2 ? (
                <p className="text-[11px] text-slate-500 italic bg-slate-50 border border-dashed border-slate-200 rounded-xl px-3 py-3">
                  São necessários dois alunos vinculados e sem dupla ativa. Vincule mais
                  alguém ou desfaça uma dupla existente.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Operador *
                    </label>
                    <select
                      value={operador}
                      onChange={(e) => setOperador(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] text-xs"
                    >
                      <option value="">Selecione</option>
                      {alunosSemDupla.map(([, aluno]) => (
                        <option key={aluno.matricula} value={aluno.matricula}>
                          {aluno.nome} ({aluno.matricula})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Auxiliar *
                    </label>
                    <select
                      value={auxiliar}
                      onChange={(e) => setAuxiliar(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#881337] text-xs"
                    >
                      <option value="">Selecione</option>
                      {alunosSemDupla.map(([, aluno]) => (
                        <option key={aluno.matricula} value={aluno.matricula}>
                          {aluno.nome} ({aluno.matricula})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {validationError && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                  {validationError}
                </div>
              )}

              <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl text-[11px] text-[#881337] space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheckIcon className="w-4 h-4 text-[#881337]" />
                  <span>Dupla vinculada ao seu cadastro</span>
                </div>
                <p className="text-[10px] text-slate-600">
                  A dupla fica persistida e é a mesma referência usada pela ficha clínica
                  odontológica. Desfazer não apaga o histórico.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPairModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando || alunosSemDupla.length < 2}
                  className="px-4 py-2 bg-[#881337] hover:bg-[#6e0f2c] text-white rounded-xl font-bold transition-all shadow-xs border border-[#4c0519] flex items-center gap-1.5 disabled:opacity-50"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>{salvando ? 'Montando...' : 'Montar Dupla'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-[#881337] flex items-center justify-center font-bold text-xs shadow-xs">
                  <PencilSquareIcon className="w-4 h-4 text-[#881337]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Editar Estagiário</h3>
                  <p className="text-[10px] text-slate-500">
                    Atualize os dados acadêmicos do aluno vinculado.
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
              A dupla ativa dele será encerrada e ele não entrará mais no módulo de
              Odontologia. O cadastro e o histórico de auditoria são preservados.
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

      {duplaToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <UserGroupIcon className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Desfazer Dupla</h3>
                <p className="text-[11px] text-slate-500">A dupla será encerrada, não apagada</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Desfazer a dupla de{' '}
              <strong className="text-slate-900">
                {duplaToDelete.operador_nome} e {duplaToDelete.auxiliar_nome}
              </strong>
              ? Os dois ficam livres para montar outra dupla. O histórico de fichas é
              preservado.
            </p>
            {validationError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
                {validationError}
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={salvando}
                onClick={() => {
                  setDuplaToDelete(null);
                  setValidationError('');
                }}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvando}
                onClick={() => void handleDesativarDupla()}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                <TrashIcon className="w-4 h-4" />
                <span>{salvando ? 'Desfazendo...' : 'Desfazer Dupla'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
