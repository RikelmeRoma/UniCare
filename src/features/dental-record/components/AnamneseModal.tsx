import { useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import { XMarkIcon, PlusIcon, ShieldCheckIcon } from '../../../components/icons/CorporateIcons';

interface AnamneseModalProps {
  pacienteId: number;
  onClose: () => void;
}

/** Modal de aferição de sinais vitais e atualização da anamnese.
 *
 * A autoria não entra no formulário: vem do token no backend, então um
 * cliente não registra aferição em nome de outra pessoa.
 */
export function AnamneseModal({ pacienteId, onClose }: AnamneseModalProps) {
  const { registrarAnamnese } = useClinic();

  const [pressao, setPressao] = useState('');
  const [glicemia, setGlicemia] = useState('');
  const [frequencia, setFrequencia] = useState('');
  const [temperatura, setTemperatura] = useState('');
  const [alergias, setAlergias] = useState('');
  const [condicoes, setCondicoes] = useState('');
  const [medicacoes, setMedicacoes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState('');

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setOk('');

    // Ao menos um campo preenchido: uma linha de anamnese totalmente vazia é
    // ruído na linha do tempo do paciente.
    if (![pressao, glicemia, frequencia, temperatura, alergias, condicoes, medicacoes].some((v) => v.trim())) {
      setErro('Preencha ao menos um campo da aferição.');
      return;
    }

    setIsSaving(true);
    const resultado = await registrarAnamnese(pacienteId, {
      pressaoArterial: pressao.trim() || undefined,
      glicemiaCapilar: glicemia ? Number(glicemia) : undefined,
      frequenciaCardiaca: frequencia ? Number(frequencia) : undefined,
      temperatura: temperatura ? Number(temperatura) : undefined,
      alergias: alergias.trim() || undefined,
      condicoesCronicas: condicoes.trim() || undefined,
      medicacoesEmUso: medicacoes.trim() || undefined,
    });
    setIsSaving(false);

    // Falha de escrita não pode ser engolida: o modal fica aberto com o que
    // foi digitado para o usuário corrigir.
    if (!resultado.success) {
      setErro(resultado.message);
      return;
    }

    setOk(resultado.message);
    setTimeout(onClose, 900);
  };

  const campo = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-600 text-xs font-mono';
  const rotulo = 'block text-[11px] font-bold text-slate-700 mb-1';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <form
        onSubmit={handleSalvar}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registrar aferição</h3>
              <p className="text-[11px] text-slate-500">Sinais vitais e anamnese do paciente</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={rotulo} htmlFor="anm-pa">Pressão arterial (mmHg)</label>
            <input
              id="anm-pa"
              className={campo}
              value={pressao}
              onChange={(e) => setPressao(e.target.value)}
              placeholder="120/80"
            />
          </div>
          <div>
            <label className={rotulo} htmlFor="anm-fc">Freq. cardíaca (bpm)</label>
            <input
              id="anm-fc"
              className={campo}
              value={frequencia}
              onChange={(e) => setFrequencia(e.target.value)}
              placeholder="74"
            />
          </div>
          <div>
            <label className={rotulo} htmlFor="anm-glic">Glicemia (mg/dL)</label>
            <input
              id="anm-glic"
              className={campo}
              value={glicemia}
              onChange={(e) => setGlicemia(e.target.value)}
              placeholder="98"
            />
          </div>
          <div>
            <label className={rotulo} htmlFor="anm-temp">Temperatura (°C)</label>
            <input
              id="anm-temp"
              className={campo}
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value)}
              placeholder="36.5"
            />
          </div>
        </div>

        <div>
          <label className={rotulo} htmlFor="anm-alergias">Alergias</label>
          <textarea
            id="anm-alergias"
            rows={2}
            className={campo}
            value={alergias}
            onChange={(e) => setAlergias(e.target.value)}
            placeholder="Nenhuma conhecida"
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="anm-condicoes">Condições crônicas</label>
          <textarea
            id="anm-condicoes"
            rows={2}
            className={campo}
            value={condicoes}
            onChange={(e) => setCondicoes(e.target.value)}
            placeholder="Hipertensão controlada"
          />
        </div>
        <div>
          <label className={rotulo} htmlFor="anm-medicacoes">Medicações em uso</label>
          <textarea
            id="anm-medicacoes"
            rows={2}
            className={campo}
            value={medicacoes}
            onChange={(e) => setMedicacoes(e.target.value)}
            placeholder="Losartana 50mg"
          />
        </div>

        {erro && (
          <p className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] font-semibold">
            {erro}
          </p>
        )}
        {ok && (
          <p className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] font-semibold">
            {ok}
          </p>
        )}

        <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 disabled:opacity-60"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            {isSaving ? 'Registrando…' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
}