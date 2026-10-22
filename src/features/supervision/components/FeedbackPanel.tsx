import { useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import { useAuth } from '../../auth/context/AuthContext';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '../../../components/icons/CorporateIcons';

const CHECKLIST = [
  {
    chave: 'anamnese',
    titulo: 'Anamnese e Risco Sistêmico:',
    descricao: 'Verificação de PA, glicemia, alergias, medicamentos e termo de consentimento.',
  },
  {
    chave: 'odontograma',
    titulo: 'Odontograma FDI & Periograma:',
    descricao: 'Preenchimento anatômico correto e indicação de faces restauradas.',
  },
  {
    chave: 'anestesia',
    titulo: 'Técnica Anestésica & Materiais:',
    descricao: 'Descrição do sal anestésico, vasoconstritor, tubetes e lote dos biomateriais.',
  },
  {
    chave: 'assinatura',
    titulo: 'Assinatura da Dupla:',
    descricao: 'Validação do Operador Titular e Auxiliar Clínico.',
  },
] as const;

/**
 * Devolutiva pedagógica do supervisor de odontologia.
 *
 * Antes os quatro checkboxes eram `defaultChecked` (nunca persistiam), o textarea
 * não tinha estado e os dois botões não tinham handler. O checklist agora é
 * enviado dentro do parecer, e a decisão grava em `homologarFichaOdonto`.
 */
export function FeedbackPanel() {
  const { fichasOdonto, homologarFichaOdonto, sync } = useClinic();
  const { user } = useAuth();

  const [parecer, setParecer] = useState('');
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // A devolutiva se refere à primeira ficha que ainda espera decisão. Sem
  // ficha pendente não há o queChecker.
  const alvo = fichasOdonto.find((f) => f.status === 'AGUARDANDO_VALIDACAO');
  const checklistTexto = CHECKLIST.filter((c) => marcados[c.chave])
    .map((c) => c.titulo.replace(':', ''))
    .join('; ');

  const registrar = async (decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE') => {
    if (!alvo) return;

    const texto = [
      parecer.trim(),
      checklistTexto && `Checklist CFO conferido: ${checklistTexto}.`,
    ]
      .filter(Boolean)
      .join(' ');

    if (texto.length === 0) {
      setFeedback({ tipo: 'erro', texto: 'Escreva o parecer ou marque o checklist antes de decidir.' });
      return;
    }

    setIsSaving(true);
    const resultado = await homologarFichaOdonto(alvo.id, decisao, texto);
    setIsSaving(false);

    if (!resultado.success) {
      setFeedback({ tipo: 'erro', texto: resultado.message });
      return;
    }

    setFeedback({ tipo: 'ok', texto: resultado.message });
    setParecer('');
    setMarcados({});
  };

  const semAlvo = !alvo || sync.estado === 'aguardando-login';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-emerald-800" />
          <span>Devolutiva Pedagógica</span>
        </h3>
        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          Supervisão CFO
        </span>
      </div>

      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-6">
        {alvo ? (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="col-span-1 text-slate-500 font-medium">Dupla da ficha:</div>
            <div className="col-span-2 font-bold text-slate-900">{alvo.duplaEstagiarios}</div>

            <div className="col-span-1 text-slate-500 font-medium mt-1.5">Ficha / Dente:</div>
            <div className="col-span-2 font-mono text-slate-800 mt-1.5">
              #{alvo.id} ({alvo.denteRegiao})
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Nenhuma ficha aguardando devolutiva no momento.
          </p>
        )}
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
          Checklist Normativo & Clínico (CFO)
        </p>
        <div className="space-y-3 text-xs text-slate-700">
          {CHECKLIST.map((c) => (
            <label key={c.chave} className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(marcados[c.chave])}
                onChange={(e) =>
                  setMarcados((prev) => ({ ...prev, [c.chave]: e.target.checked }))
                }
                className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="font-bold block text-slate-900">{c.titulo}</span>
                <span className="text-slate-500">{c.descricao}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex-1 mb-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Parecer do Supervisor / Orientações Clínicas:
        </p>
        <textarea
          rows={3}
          value={parecer}
          onChange={(e) => setParecer(e.target.value)}
          className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-emerald-600 outline-none resize-none bg-slate-50/50 text-slate-700"
          placeholder="Registre apontamentos sobre técnica restauradora, biossegurança e validação pedagógica..."
        ></textarea>

        {feedback && (
          <div
            className={`mt-3 rounded-xl p-2.5 text-xs font-semibold ${
              feedback.tipo === 'ok'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.texto}
          </div>
        )}

        <div className="mt-3 bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 flex items-center gap-2 text-xs text-emerald-900">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-700 shrink-0" />
          <div>
            <span className="font-bold block text-[11px]">Assinatura e Visto Eletrônico Docente</span>
            {/* O CRO vinha hardcoded ("CRO-SE 4512") mesmo quando o usuário
                logado era outro. registro_profissional só chega com o RF-008. */}
            <span className="text-[10px] text-emerald-700 font-mono">
              {user?.nome || 'Supervisor'}, orientador(a) clínico(a)
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 mt-auto">
        <button
          type="button"
          onClick={() => void registrar('VALIDADO')}
          disabled={semAlvo || isSaving}
          className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3 rounded-xl flex justify-center items-center gap-2 transition-colors shadow-xs disabled:opacity-50"
        >
          <CheckCircleIcon className="w-4 h-4" />
          <span>Homologar Procedimento com Visto Digital</span>
        </button>
        <button
          type="button"
          onClick={() => void registrar('DEVOLVIDO_PARA_AJUSTE')}
          disabled={semAlvo || isSaving}
          className="w-full bg-white hover:bg-amber-50 text-amber-800 border border-amber-200/80 font-semibold text-xs py-2.5 rounded-xl flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
        >
          <ExclamationTriangleIcon className="w-4 h-4 text-amber-600" />
          <span>Solicitar Ajuste ou Reavaliação à Dupla</span>
        </button>
      </div>
    </div>
  );
}