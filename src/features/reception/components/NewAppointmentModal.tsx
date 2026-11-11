import { useEffect, useMemo, useRef, useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import { api, type ApiEstagiario } from '../../../services/api';
import { XMarkIcon } from '../../../components/icons/CorporateIcons';
import { CONSULTORIOS_SPA, TOTAL_CONSULTORIOS_SPA } from '../../psychology/constants/psico';

interface NewAppointmentModalProps {
  onClose: () => void;
  defaultCurso?: 'psicologia' | 'odontologia';
}

/** `YYYY-MM-DD` no fuso local.
 *
 * `toISOString()` converte para UTC antes de formatar, e em Aracaju (UTC-3) uma
 * data local de fim de dia saía como o dia seguinte. O backend espera `Date`,
 * que também não tem fuso — o mesmo cuidado dos dois lados. */
function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export function NewAppointmentModal({ onClose, defaultCurso = 'odontologia' }: NewAppointmentModalProps) {
  const { pacientes, agendamentos, adicionarAgendamento, atribuicoes, recarregarAtribuicoes } =
    useClinic();

  // Só psicologia tem vínculo paciente-estagiário, e é por ele que o select
  // acompanha o responsável do paciente. A sessão psicológica é de um
  // estagiário só; a dupla (operador + auxiliar) é regra da cadeira
  // odontológica.
  const ehPsico = defaultCurso === 'psicologia';

  const [pacienteId, setPacienteId] = useState<number>(pacientes[0]?.id || 1);
  const [curso, setCurso] = useState<'psicologia' | 'odontologia'>(defaultCurso);
  const [horario, setHorario] = useState('14:00');
  const [turno, setTurno] = useState<'manha' | 'tarde' | 'noite'>('tarde');
  // Sessão sem dia não existe, e quem atende precisa saber quando: o campo é
  // obrigatório na API (`AgendamentoCreate.data_sessao`). O `min` impede marcar
  // ontem — a recepção erra o mês, e uma sessão no passado não aparece em
  // nenhum filtro de "próxima semana".
  //
  // SEM `value` de propósito. `<input type="date">` controlado tem um defeito
  // conhecido no React: ao digitar dia e mês dígito a dígito, o Chrome dispara
  // `onChange` com um valor incompleto, o React reescreve o campo com o estado
  // antigo e a digitação volta para o valor anterior. Em tela de agenda isso
  // grava a data errada sem que ninguém perceba — que é exatamente o tipo de
  // falha que a pessoa só descobre depois, olhando a agenda do dia seguinte.
  // uncontrolled + ref: o navegador dono do campo, e o que é enviado é
  // literalmente o que está escrito nele.
  const dataSessaoRef = useRef<HTMLInputElement>(null);
  const [dataDisponibilidade, setDataDisponibilidade] = useState(hojeIso);
  const [salaOuCadeira, setSalaOuCadeira] = useState(
    defaultCurso === 'psicologia' ? CONSULTORIOS_SPA[0] : 'Cadeira Odonto 04'
  );

  const salasOcupadasNoSlot = useMemo(() => {
    const mapa = new Map<string, (typeof agendamentos)[number]>();
    if (curso !== 'psicologia' || !dataDisponibilidade) return mapa;
    for (const ag of agendamentos) {
      if (
        ag.curso === 'psicologia' &&
        ag.dataSessao === dataDisponibilidade &&
        ag.horario === horario &&
        (ag.status === 'AGENDADO' || ag.status === 'PRESENTE' || ag.status === 'EM_ATENDIMENTO')
      ) {
        mapa.set(ag.salaOuCadeira, ag);
      }
    }
    return mapa;
  }, [agendamentos, curso, dataDisponibilidade, horario]);
  const [tipoConsulta, setTipoConsulta] = useState(
    defaultCurso === 'psicologia' ? 'Psicoterapia Individual' : 'Dentística Restauradora'
  );
  const [estagiarioMatricula, setEstagiarioMatricula] = useState('');
  const [auxiliarMatricula, setAuxiliarMatricula] = useState('');
  // O responsável é o do paciente até a recepção escolher outro. Guardar um
  // "escolheu na mão" e derivar o valor é o que faz o campo acompanhar a troca
  // de paciente sem um efeito que reescreva o estado a cada render.
  const [escolheuEstagiario, setEscolheuEstagiario] = useState(false);
  const [observacaoLogistica, setObservacaoLogistica] = useState('Paciente confirmado por WhatsApp');

  const [estagiarios, setEstagiarios] = useState<ApiEstagiario[]>([]);
  const [carregandoEstagiarios, setCarregandoEstagiarios] = useState(true);
  const [erroEstagiarios, setErroEstagiarios] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Antes a matrícula era uma constante no submit ('16032935' na psicologia,
  // '01498231' na odontologia) e o nome vinha de um texto livre: quem digitasse
  // "João Silva" gravava o nome do João com a matrícula de outra pessoa. A lista
  // vem do servidor — o `GET /usuarios` é gestão de usuário e devolve 403 para a
  // recepção, por isso existe `GET /usuarios/estagiarios`.
  //
  // As duas clínicas usam a lista: na psicologia o único responsável e na
  // odontologia os dois da dupla saem do cadastro, não de texto digitado.
  useEffect(() => {
    let cancelado = false;
    api
      .getEstagiarios()
      .then((lista) => {
        if (!cancelado) setEstagiarios(lista);
      })
      .catch((err: unknown) => {
        if (cancelado) return;
        setErroEstagiarios(
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar a lista de estagiários.'
        );
      })
      .finally(() => {
        if (!cancelado) setCarregandoEstagiarios(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Quem já é o responsável ativo deste paciente. O agendamento cria o vínculo
  // quando não existe e transfere quando o escolhido é outro, então a tela
  // precisa saber o estado atual para avisar antes de confirmar.
  const responsavelAtual = useMemo(
    () =>
      atribuicoes.find((a) => a.pacienteId === pacienteId && a.situacao === 'ATIVA'),
    [atribuicoes, pacienteId]
  );
  const matriculaDoResponsavel = responsavelAtual?.estagiarioMatricula ?? '';

  const matriculaOperador = ehPsico
    ? escolheuEstagiario
      ? estagiarioMatricula
      : matriculaDoResponsavel
    : estagiarioMatricula;

  const estagiarioSelecionado = useMemo(
    () => estagiarios.find((e) => e.matricula === matriculaOperador),
    [estagiarios, matriculaOperador]
  );
  const auxiliarSelecionado = useMemo(
    () => estagiarios.find((e) => e.matricula === auxiliarMatricula),
    [estagiarios, auxiliarMatricula]
  );
  // Psicologia: basta o responsável. Odontologia: a dupla só fecha com dois
  // estagiários diferentes — o backend recusa o mesmo aluno duas vezes.
  const duplaValida = ehPsico
    ? Boolean(estagiarioSelecionado)
    : Boolean(
        estagiarioSelecionado &&
          auxiliarSelecionado &&
          estagiarioSelecionado.matricula !== auxiliarSelecionado.matricula
      );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const paciente = pacientes.find((p) => p.id === pacienteId);
    if (!paciente) return;

    if (!estagiarioSelecionado) {
      setErrorMsg(
        ehPsico
          ? 'Escolha o estagiário responsável pela sessão.'
          : 'Escolha o estagiário operador da dupla.'
      );
      return;
    }
    if (!ehPsico) {
      if (!auxiliarSelecionado) {
        setErrorMsg('Escolha o segundo estagiário da dupla.');
        return;
      }
      if (auxiliarSelecionado.matricula === estagiarioSelecionado.matricula) {
        setErrorMsg('Os dois estagiários da dupla precisam ser diferentes.');
        return;
      }
    }

    // Lido do DOM, e não de um estado do React: o que está escrito no campo é o
    // que vai para o banco. `defaultValue` deixa o campo começar em hoje, então
    // o caso de Receber vazio é só a pessoa ter limpado.
    const dataSessao = dataSessaoRef.current?.value ?? '';
    if (!dataSessao) {
      setErrorMsg('Escolha a data da sessão.');
      return;
    }

    if (curso === 'psicologia' && salasOcupadasNoSlot.has(salaOuCadeira)) {
      setErrorMsg('Este consultório já possui sessão agendada para esta data e horário. Escolha outro dos 6 consultórios disponíveis.');
      return;
    }

    setIsSaving(true);
    const res = await adicionarAgendamento({
      pacienteId,
      pacienteNome: paciente.nome,
      estagiarioNome: estagiarioSelecionado.nome,
      estagiarioMatricula: estagiarioSelecionado.matricula,
      // Psicologia não manda auxiliar: o backend recusa o campo com 422 em vez
      // de ignorar, para não gravar uma dupla que a clínica não tem.
      auxiliarMatricula: ehPsico ? undefined : auxiliarSelecionado?.matricula,
      curso,
      dataSessao,
      horario,
      turno,
      salaOuCadeira,
      tipoConsulta,
      status: 'AGENDADO',
      observacaoLogistica,
    });
    setIsSaving(false);

    // Antes, o modal fechava sem esperar resposta nenhuma: uma falha de FK
    // virava 500 engolido por console.warn e o agendamento sumia ao recarregar.
    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    if (ehPsico) {
      // O servidor criou ou trocou o vínculo junto com a sessão. Sem isto, o
      // painel de atribuição ao lado continuaria dizendo que o paciente não tem
      // responsável — e pareceria que a funcionalidade não funcionou.
      await recarregarAtribuicoes();
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white dark:bg-[#0E1729] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Novo Agendamento Clínico</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Selecione o Paciente Cadastrado *</label>
            <select
              value={pacienteId}
              onChange={(e) => {
                const novoPacienteId = Number(e.target.value);
                setPacienteId(novoPacienteId);
                // Volta a seguir o responsável do novo paciente em vez da escolha
                // da tela anterior.
                setEscolheuEstagiario(false);
                const novoResponsavel = atribuicoes.find(
                  (a) =>
                    a.pacienteId === novoPacienteId && a.situacao === 'ATIVA'
                )?.estagiarioMatricula;
                if (novoResponsavel && auxiliarMatricula === novoResponsavel) {
                  setAuxiliarMatricula('');
                }
              }}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 outline-none"
            >
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — CPF: {p.cpf} {p.ehMenor ? '(Menor de Idade)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Especialidade</label>
              <select
                value={curso}
                onChange={(e) => {
                  const val = e.target.value as 'psicologia' | 'odontologia';
                  setCurso(val);
                  setEstagiarioMatricula('');
                  setAuxiliarMatricula('');
                  setEscolheuEstagiario(false);
                  setSalaOuCadeira(
                    val === 'psicologia' ? CONSULTORIOS_SPA[0] : 'Cadeira Odonto 03'
                  );
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
              >
                {/* A recepção concilia a agenda da própria clínica: oferecer a
                    outra aqui só geraria um 403 na hora de salvar. */}
                <option value={defaultCurso}>
                  {defaultCurso === 'psicologia' ? 'Psicologia (SPA)' : 'Odontologia Integrada'}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Horário Previsto</label>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data da Sessão *
              </label>
              <input
                ref={dataSessaoRef}
                type="date"
                defaultValue={hojeIso()}
                min={hojeIso()}
                onChange={(e) => setDataDisponibilidade(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Turno</label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value as 'manha' | 'tarde' | 'noite')}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
              >
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
          </div>

          {curso === 'psicologia' ? (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Local / Consultório SPA (6 disponíveis)
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {Math.max(TOTAL_CONSULTORIOS_SPA - salasOcupadasNoSlot.size, 0)} de {TOTAL_CONSULTORIOS_SPA} livre(s) às {horario}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {CONSULTORIOS_SPA.map((sala) => {
                    const ocupacao = salasOcupadasNoSlot.get(sala);
                    const selecionada = salaOuCadeira === sala;
                    return (
                      <button
                        key={sala}
                        type="button"
                        disabled={Boolean(ocupacao)}
                        onClick={() => setSalaOuCadeira(sala)}
                        title={
                          ocupacao
                            ? `Ocupado por ${ocupacao.estagiarioNome} (${ocupacao.pacienteNome})`
                            : `${sala} disponível`
                        }
                        className={`px-2.5 py-2 rounded-xl border text-left ${
                          ocupacao
                            ? 'bg-red-50/70 dark:bg-red-950/40 border-red-200 dark:border-red-800/70 text-red-400 dark:text-red-300/70 cursor-not-allowed'
                            : selecionada
                              ? 'bg-blue-700 dark:bg-blue-600 border-blue-700 dark:border-blue-500 text-white shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-400 hover:bg-white dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="block text-[11px] font-bold">
                          {sala.replace('Consultório ', '')}
                        </span>
                        <span
                          className={`block text-[10px] truncate ${
                            ocupacao
                              ? 'text-red-500 dark:text-red-400'
                              : selecionada
                                ? 'text-blue-100'
                                : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {ocupacao ? `Ocupada (${ocupacao.estagiarioNome.split(' ')[0]})` : 'Disponível'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Procedimento ou Demanda Prevista</label>
                <input
                  type="text"
                  value={tipoConsulta}
                  onChange={(e) => setTipoConsulta(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Local / Box Clínico</label>
                <input
                  type="text"
                  value={salaOuCadeira}
                  onChange={(e) => setSalaOuCadeira(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Procedimento ou Demanda Prevista</label>
                <input
                  type="text"
                  value={tipoConsulta}
                  onChange={(e) => setTipoConsulta(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {ehPsico ? 'Estagiário Responsável *' : 'Dupla de Estagiários *'}
            </label>

            {carregandoEstagiarios ? (
              <p className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500">
                Carregando estagiários…
              </p>
            ) : erroEstagiarios ? (
              // Select vazio aqui pareceria "não existe estagiário na
              // clínica", que é uma mentira — a clínica tem, a lista é que
              // não chegou. A pessoa precisa saber qual dos dois é.
              <p className="w-full text-xs p-2.5 rounded-xl border border-red-200 dark:border-red-800/70 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-200 leading-relaxed">
                Não foi possível carregar os estagiários: {erroEstagiarios}{' '}
                Feche e abra o modal para tentar de novo.
              </p>
            ) : (
              <>
                <div className={ehPsico ? '' : 'grid grid-cols-2 gap-3'}>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {ehPsico ? 'Responsável *' : 'Operador *'}
                    </label>
                    <select
                      value={matriculaOperador}
                      onChange={(e) => {
                        const valor = e.target.value;
                        setEstagiarioMatricula(valor);
                        if (ehPsico) setEscolheuEstagiario(true);
                        if (valor === auxiliarMatricula) setAuxiliarMatricula('');
                      }}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 outline-none"
                    >
                      <option value="">
                        {ehPsico
                          ? 'Selecione o responsável…'
                          : 'Selecione o operador…'}
                      </option>
                      {estagiarios.map((e) => (
                        <option key={e.matricula} value={e.matricula}>
                          {e.nome} — {e.matricula}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!ehPsico && (
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Auxiliar *
                      </label>
                      <select
                        value={auxiliarMatricula}
                        onChange={(e) => setAuxiliarMatricula(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 outline-none"
                      >
                        <option value="">Selecione o auxiliar…</option>
                        {estagiarios
                          .filter((e) => e.matricula !== matriculaOperador)
                          .map((e) => (
                            <option key={e.matricula} value={e.matricula}>
                              {e.nome} — {e.matricula}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                {ehPsico &&
                  estagiarioSelecionado &&
                  responsavelAtual &&
                  matriculaDoResponsavel !== matriculaOperador && (
                    <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 rounded-lg px-2.5 py-1.5">
                      Hoje este paciente é de{' '}
                      <strong>{responsavelAtual.estagiarioNome}</strong>. Ao
                      confirmar, o responsável passa a ser{' '}
                      {estagiarioSelecionado.nome} — o vínculo anterior fica
                      guardado no histórico.
                    </p>
                  )}

                {ehPsico && estagiarioSelecionado && !responsavelAtual && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/70 rounded-lg px-2.5 py-1.5">
                    Este paciente ainda não tem responsável. Ao confirmar, passa
                    a ser de {estagiarioSelecionado.nome} — e é isso que permite
                    ao aluno abrir o prontuário dele.
                  </p>
                )}

                {!ehPsico && estagiarios.length < 2 && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/70 rounded-lg px-2.5 py-1.5">
                    A clínica precisa de dois estagiários ativos para montar a
                    dupla. Cadastre o segundo aluno antes de agendar.
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Observações Logísticas</label>
            <input
              type="text"
              value={observacaoLogistica}
              onChange={(e) => setObservacaoLogistica(e.target.value)}
              placeholder="Ex: Paciente cadeirante, contato prévio confirmado..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !duplaValida}
              className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
        {errorMsg && (
          <p className="mt-3 text-xs text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/70 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
