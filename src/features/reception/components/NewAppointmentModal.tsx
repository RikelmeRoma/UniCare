import { useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import { XMarkIcon } from '../../../components/icons/CorporateIcons';

interface NewAppointmentModalProps {
  onClose: () => void;
  defaultCurso?: 'psicologia' | 'odontologia';
}

export function NewAppointmentModal({ onClose, defaultCurso = 'odontologia' }: NewAppointmentModalProps) {
  const { pacientes, adicionarAgendamento } = useClinic();

  const [pacienteId, setPacienteId] = useState<number>(pacientes[0]?.id || 1);
  const [curso, setCurso] = useState<'psicologia' | 'odontologia'>(defaultCurso);
  const [horario, setHorario] = useState('14:00');
  const [turno, setTurno] = useState<'manha' | 'tarde' | 'noite'>('tarde');
  const [salaOuCadeira, setSalaOuCadeira] = useState(
    defaultCurso === 'psicologia' ? 'Consultório SPA-01' : 'Cadeira Odonto 04'
  );
  const [tipoConsulta, setTipoConsulta] = useState(
    defaultCurso === 'psicologia' ? 'Psicoterapia Individual' : 'Dentística Restauradora'
  );
  const [estagiarioNome, setEstagiarioNome] = useState(
    defaultCurso === 'psicologia' ? 'Rikelme Roma Santos' : 'Lucas Vasconcelos'
  );
  const [observacaoLogistica, setObservacaoLogistica] = useState('Paciente confirmado por WhatsApp');

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const paciente = pacientes.find((p) => p.id === pacienteId);
    if (!paciente) return;

    setIsSaving(true);
    const res = await adicionarAgendamento({
      pacienteId,
      pacienteNome: paciente.nome,
      estagiarioNome,
      estagiarioMatricula: curso === 'psicologia' ? '16032935' : '01498231',
      curso,
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

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Logística de Recepção • UC-02 / RF-002
            </span>
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
              onChange={(e) => setPacienteId(Number(e.target.value))}
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Local / Box Clínico</label>
              <input
                type="text"
                value={salaOuCadeira}
                onChange={(e) => setSalaOuCadeira(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              />
            </div>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Estagiário Responsável</label>
            <input
              type="text"
              value={estagiarioNome}
              onChange={(e) => setEstagiarioNome(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Observações Logísticas (RN-001)</label>
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
              disabled={isSaving}
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
