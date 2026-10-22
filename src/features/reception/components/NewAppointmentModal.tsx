import { useEffect, useMemo, useRef, useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import { api, type ApiEstagiario } from '../../../services/api';
import { XMarkIcon } from '../../../components/icons/CorporateIcons';

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
  const { pacientes, adicionarAgendamento, atribuicoes, recarregarAtribuicoes } =
    useClinic();

  //só psicologia tem vínculo paciente-estagiário, e é por ele que a lista de
  //estagiários faz sentido. Odontologia segue com o campo de texto.
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
  const [salaOuCadeira, setSalaOuCadeira] = useState(
    defaultCurso === 'psicologia' ? 'Consultório SPA-01' : 'Cadeira Odonto 04'
  );
  const [tipoConsulta, setTipoConsulta] = useState(
    defaultCurso === 'psicologia' ? 'Psicoterapia Individual' : 'Dentística Restauradora'
  );
  const [estagiarioNome, setEstagiarioNome] = useState(
    defaultCurso === 'psicologia' ? 'Rikelme Roma Santos' : 'Lucas Vasconcelos'
  );
  const [estagiarioMatricula, setEstagiarioMatricula] = useState('');
  // O responsável é o do paciente até a recepção escolher outro. Guardar um
  // "escolheu na mão" e derivar o valor é o que faz o campo acompanhar a troca
  // de paciente sem um efeito que reescreva o estado a cada render.
  const [escolheuEstagiario, setEscolheuEstagiario] = useState(false);
  const [observacaoLogistica, setObservacaoLogistica] = useState('Paciente confirmado por WhatsApp');

  const [estagiarios, setEstagiarios] = useState<ApiEstagiario[]>([]);
  const [carregandoEstagiarios, setCarregandoEstagiarios] = useState(ehPsico);
  const [erroEstagiarios, setErroEstagiarios] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Antes a matrícula era uma constante no submit ('16032935' na psicologia,
  // '01498231' na odontologia) e o nome vinha de um texto livre: quem digitasse
  // "João Silva" gravava o nome do João com a matrícula de outra pessoa. A lista
  // vem do servidor — o `GET /usuarios` é gestão de usuário e devolve 403 para a
  // recepção, por isso existe `GET /usuarios/estagiarios`.
  useEffect(() => {
    if (!ehPsico) return;
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
  }, [ehPsico]);

  // Quem já é o responsável ativo deste paciente. O agendamento cria o vínculo
  // quando não existe e transfere quando o escolhido é outro, então a tela
  // precisa saber o estado atual para avisar antes de confirmar.
  const responsavelAtual = useMemo(
    () =>
      atribuicoes.find((a) => a.pacienteId === pacienteId && a.situacao === 'ATIVA'),
    [atribuicoes, pacienteId]
  );
  const matriculaDoResponsavel = responsavelAtual?.estagiarioMatricula ?? '';

  const matriculaEscolhida = ehPsico
    ? escolheuEstagiario
      ? estagiarioMatricula
      : matriculaDoResponsavel
    : '';

  const estagiarioSelecionado = useMemo(
    () => estagiarios.find((e) => e.matricula === matriculaEscolhida),
    [estagiarios, matriculaEscolhida]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const paciente = pacientes.find((p) => p.id === pacienteId);
    if (!paciente) return;

    if (ehPsico && !estagiarioSelecionado) {
      setErrorMsg('Escolha o estagiário responsável pela sessão.');
      return;
    }

    // Lido do DOM, e não de um estado do React: o que está escrito no campo é o
    // que vai para o banco. `defaultValue` deixa o campo começar em hoje, então
    // o caso de Receber vazio é só a pessoa ter limpado.
    const dataSessao = dataSessaoRef.current?.value ?? '';
    if (!dataSessao) {
      setErrorMsg('Escolha a data da sessão.');
      return;
    }

    setIsSaving(true);
    const res = await adicionarAgendamento({
      pacienteId,
      pacienteNome: paciente.nome,
      estagiarioNome: ehPsico
        ? (estagiarioSelecionado?.nome ?? '')
        : estagiarioNome,
      estagiarioMatricula: ehPsico ? matriculaEscolhida : '01498231',
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
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Novo Agendamento Clínico</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Selecione o Paciente Cadastrado *</label>
            <select
              value={pacienteId}
              onChange={(e) => {
                setPacienteId(Number(e.target.value));
                // Volta a seguir o responsável do novo paciente em vez da escolha
                // da tela anterior.
                setEscolheuEstagiario(false);
              }}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Especialidade</label>
              <select
                value={curso}
                onChange={(e) => {
                  const val = e.target.value as 'psicologia' | 'odontologia';
                  setCurso(val);
                  if (val === 'psicologia') {
                    setSalaOuCadeira('Consultório SPA-02');
                    setEstagiarioNome('Rikelme Roma Santos');
                  } else {
                    setSalaOuCadeira('Cadeira Odonto 03');
                    setEstagiarioNome('Augusto Cesar Farias');
                  }
                }}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              >
                {/* A recepção concilia a agenda da própria clínica: oferecer a
                    outra aqui só geraria um 403 na hora de salvar. */}
                <option value={defaultCurso}>
                  {defaultCurso === 'psicologia' ? 'Psicologia (SPA)' : 'Odontologia Integrada'}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Horário Previsto</label>
              <input
                type="time"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data da Sessão *
              </label>
              <input
                ref={dataSessaoRef}
                type="date"
                defaultValue={hojeIso()}
                min={hojeIso()}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Turno</label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value as 'manha' | 'tarde' | 'noite')}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              >
                <option value="manha">Manhã</option>
                <option value="tarde">Tarde</option>
                <option value="noite">Noite</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Local / Box Clínico</label>
              <input
                type="text"
                value={salaOuCadeira}
                onChange={(e) => setSalaOuCadeira(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Procedimento ou Demanda Prevista</label>
              <input
                type="text"
                value={tipoConsulta}
                onChange={(e) => setTipoConsulta(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Estagiário Responsável{ehPsico ? ' *' : ''}
            </label>

            {ehPsico ? (
              <>
                {carregandoEstagiarios ? (
                  <p className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
                    Carregando estagiários…
                  </p>
                ) : erroEstagiarios ? (
                  // Select vazio aqui pareceria "não existe estagiário na
                  // clínica", que é uma mentira — a clínica tem, a lista é que
                  // não chegou. A pessoa precisa saber qual dos dois é.
                  <p className="w-full text-xs p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 leading-relaxed">
                    Não foi possível carregar os estagiários: {erroEstagiarios}{' '}
                    Feche e abra o modal para tentar de novo.
                  </p>
                ) : (
                  <select
                    value={matriculaEscolhida}
                    onChange={(e) => {
                      setEstagiarioMatricula(e.target.value);
                      setEscolheuEstagiario(true);
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
                  >
                    <option value="">Selecione o estagiário responsável…</option>
                    {estagiarios.map((e) => (
                      <option key={e.matricula} value={e.matricula}>
                        {e.nome} — {e.matricula}
                      </option>
                    ))}
                  </select>
                )}

                {estagiarioSelecionado && responsavelAtual && matriculaDoResponsavel !== matriculaEscolhida && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    Hoje este paciente é de <strong>{responsavelAtual.estagiarioNome}</strong>.
                    Ao confirmar, o responsável passa a ser {estagiarioSelecionado.nome} — o
                    vínculo anterior fica guardado no histórico.
                  </p>
                )}

                {estagiarioSelecionado && !responsavelAtual && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5">
                    Este paciente ainda não tem responsável. Ao confirmar, passa a ser de{' '}
                    {estagiarioSelecionado.nome} — e é isso que permite ao aluno abrir o
                    prontuário dele.
                  </p>
                )}
              </>
            ) : (
              <input
                type="text"
                value={estagiarioNome}
                onChange={(e) => setEstagiarioNome(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações Logísticas</label>
            <input
              type="text"
              value={observacaoLogistica}
              onChange={(e) => setObservacaoLogistica(e.target.value)}
              placeholder="Ex: Paciente cadeirante, contato prévio confirmado..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || (ehPsico && !estagiarioSelecionado)}
              className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs disabled:opacity-50"
            >
              {isSaving ? 'Salvando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
        {errorMsg && (
          <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}
