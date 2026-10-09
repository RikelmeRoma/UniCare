import { useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '../../../components/icons/CorporateIcons';

interface NewPatientModalProps {
  onClose: () => void;
  defaultCurso?: 'psicologia' | 'odontologia' | 'ambos';
}

export function NewPatientModal({ onClose, defaultCurso = 'odontologia' }: NewPatientModalProps) {
  const { pacientes, cadastrarPaciente } = useClinic();

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [dataNascimento, setDataNascimento] = useState('1998-04-12');
  const [telefone, setTelefone] = useState('(79) 99882-1200');
  const [curso, setCurso] = useState<'psicologia' | 'odontologia' | 'ambos'>(defaultCurso);
  const [ehMenor, setEhMenor] = useState(false);
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [contatoResponsavel, setContatoResponsavel] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validação Anti-Duplicidade de CPF
    const cpfLimpo = cpf.replace(/\D/g, '');
    const duplicado = pacientes.some(
      (p) => p.cpf.replace(/\D/g, '') === cpfLimpo
    );

    if (duplicado) {
      setErrorMsg('Já existe um paciente cadastrado com este número de CPF na base unificada.');
      return;
    }

    if (ehMenor && !nomeResponsavel.trim()) {
      setErrorMsg('Para pacientes menores de idade, o nome do responsável legal é obrigatório.');
      return;
    }

    setIsSaving(true);
    const res = await cadastrarPaciente({
      nome,
      cpf,
      dataNascimento,
      telefone,
      curso,
      ehMenor,
      nomeResponsavel: ehMenor ? nomeResponsavel : undefined,
      contatoResponsavel: ehMenor ? contatoResponsavel : undefined,
    });
    setIsSaving(false);

    if (res.success) {
      setSuccessMsg('Paciente cadastrado com sucesso na base compartilhada!');
      setTimeout(() => {
        onClose();
        setSuccessMsg('');
      }, 1000);
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
              Triagem de Recepção • UC-03
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Novo Cadastro de Paciente</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo *</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Maria das Graças Oliveira"
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CPF (Anti-Duplicidade) *</label>
              <input
                type="text"
                required
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-600 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Nascimento *</label>
              <input
                type="date"
                required
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / WhatsApp *</label>
              <input
                type="text"
                required
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Serviço de Destino *</label>
              {/* A recepção cadastra paciente da própria clínica. "Ambos" segue
                  disponível: paciente compartilhado atende nas duas. A outra
                  clínica não aparece — o servidor recusaria com 403. */}
              <select
                value={curso}
                onChange={(e) => setCurso(e.target.value as 'psicologia' | 'odontologia' | 'ambos')}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none"
              >
                {defaultCurso !== 'odontologia' && <option value="odontologia">Odontologia</option>}
                {defaultCurso !== 'psicologia' && <option value="psicologia">Psicologia (SPA)</option>}
                <option value="ambos">Clínicas Integradas (Ambos)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ehMenor}
                onChange={(e) => setEhMenor(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                Paciente Menor de Idade (requer dados do Responsável Legal)
              </span>
            </label>

            {ehMenor && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Responsável *</label>
                  <input
                    type="text"
                    required
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    placeholder="Nome completo do pai, mãe ou tutor"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contato do Responsável</label>
                  <input
                    type="text"
                    value={contatoResponsavel}
                    onChange={(e) => setContatoResponsavel(e.target.value)}
                    placeholder="(79) 99999-9999"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white outline-none font-mono"
                  />
                </div>
              </div>
            )}
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
                  {isSaving ? 'Salvando...' : 'Cadastrar Paciente'}
                </button>
          </div>
        </form>
      </div>
    </div>
  );
}
