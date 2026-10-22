import { useState } from 'react';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  CheckIcon,
} from '../../../components/icons/CorporateIcons';

interface DentalEvolutionTabProps {
  pacienteId?: number;
}

export function DentalEvolutionTab({ pacienteId }: DentalEvolutionTabProps) {
  // Antes os registros viviam em `useState` com `id: Date.now()` e `data` fixa,
  // e a tela anunciava "submetida para homologação docente" sem chamar a API.
  // Agora a ficha é gravada no Postgres e a linha do tempo vem dela.
  const { fichasOdonto, adicionarFichaOdonto, sync } = useClinic();

  const [showNovo, setShowNovo] = useState(false);
  const [dupla, setDupla] = useState('');
  const [denteRegiao, setDenteRegiao] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [materiais, setMateriais] = useState('');
  const [anestesico, setAnestesico] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');
  const [erroMsg, setErroMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const registros = fichasOdonto.filter((f) => f.pacienteId === pacienteId);

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId || isSaving) return;

    setIsSaving(true);
    setErroMsg('');
    setSucessoMsg('');

    const resultado = await adicionarFichaOdonto({
      pacienteId,
      pacienteNome: '',
      duplaEstagiarios: dupla,
      denteRegiao,
      procedimentoRealizado: procedimento,
      materiaisUtilizados: materiais,
      anestesico,
    });

    setIsSaving(false);

    if (!resultado.success) {
      // Falha de escrita não pode ser engolida: o formulário continua aberto
      // com o que o estagiário digitou.
      setErroMsg(resultado.message);
      return;
    }

    setDupla('');
    setDenteRegiao('');
    setProcedimento('');
    setMateriais('');
    setAnestesico('');
    setShowNovo(false);
    setSucessoMsg(
      `Ficha #${resultado.ficha?.id} registrada e encaminhada à homologação docente.`
    );
    setTimeout(() => setSucessoMsg(''), 5000);
  };

  const rotuloStatus = (status: string) =>
    status === 'VALIDADO'
      ? 'Visto Concedido'
      : status === 'DEVOLVIDO_PARA_AJUSTE'
        ? 'Devolvida para Ajuste'
        : 'Aguardando Visto Docente';

  const corStatus = (status: string) =>
    status === 'VALIDADO'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'DEVOLVIDO_PARA_AJUSTE'
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : 'bg-amber-50 text-amber-800 border-amber-200';

  const corIcone = (status: string) =>
    status === 'VALIDADO' ? 'text-emerald-600' : status === 'DEVOLVIDO_PARA_AJUSTE' ? 'text-rose-600' : 'text-amber-600';

  return (
    <div className="space-y-6 font-sans">
      {sucessoMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {erroMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shadow-2xs">
          Não foi possível registrar a ficha: {erroMsg}
        </div>
      )}

      {/* Cabeçalho da Aba */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <DocumentTextIcon className="w-4 h-4 text-emerald-800" />
            <span>Evolução Clínica Diária • Atendimento em Dupla (PDR-05)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro formal de procedimentos, dentes/região e insumos utilizados conforme exigência do CFO
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowNovo(!showNovo);
            setErroMsg('');
          }}
          disabled={!pacienteId}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
        >
          {showNovo ? <XMarkIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
          <span>{showNovo ? 'Fechar Formulário' : 'Nova Evolução'}</span>
        </button>
      </div>

      {/* Formulário de Registro Clínico */}
      {showNovo && pacienteId && (
        <form onSubmit={handleSalvar} className="bg-white p-6 rounded-2xl border border-emerald-500/50 shadow-sm space-y-4 text-xs ring-1 ring-emerald-500/20">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm">Registrar Procedimento do Dia</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              Dupla Obrigatória (CFO)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Dupla de Estagiários (Operador & Auxiliar - PDR-05) *
              </label>
              <input
                type="text"
                required
                value={dupla}
                onChange={(e) => setDupla(e.target.value)}
                placeholder="Ex: Operador & Auxiliar"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Dente / Região Anatômica *
              </label>
              <input
                type="text"
                required
                value={denteRegiao}
                onChange={(e) => setDenteRegiao(e.target.value)}
                placeholder="Ex: Dente 16 ou Sextante Anterior"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Conduta Clínica e Procedimento Executado *
            </label>
            <textarea
              required
              rows={3}
              value={procedimento}
              onChange={(e) => setProcedimento(e.target.value)}
              placeholder="Descreva o procedimento executado."
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Materiais e Resinas Utilizadas *
              </label>
              <textarea
                required
                rows={2}
                value={materiais}
                onChange={(e) => setMateriais(e.target.value)}
                placeholder="Ex: Resina composta A2, adesivo universal."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Anestésico e Volume Injetado
              </label>
              <input
                type="text"
                value={anestesico}
                onChange={(e) => setAnestesico(e.target.value)}
                placeholder="Ex: Lidocaína 2% (infiltrativa) — ou 'sem anestesia'"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowNovo(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition-colors disabled:opacity-60"
            >
              {isSaving ? 'Enviando…' : 'Gravar Procedimento e Enviar à Supervisora'}
            </button>
          </div>
        </form>
      )}

      {/* Linha do Tempo de Atendimentos Anteriores (RF-008) */}
      <div className="space-y-4">
        {sync.estado === 'sincronizando' && (
          <p className="text-xs text-slate-500">Carregando fichas do servidor…</p>
        )}

        {sync.estado !== 'sincronizando' && registros.length === 0 && (
          <p className="text-xs text-slate-500">
            Nenhuma ficha registrada para este paciente no servidor.
          </p>
        )}

        {registros.map((reg) => (
          <div
            key={reg.id}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">{reg.procedimentoRealizado}</span>
                  <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                    {reg.denteRegiao}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  Atendimento em: <strong className="text-slate-700">{reg.submetidoEm}</strong> • Dupla: {reg.duplaEstagiarios}
                </p>
              </div>

              <span className={`border text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shrink-0 ${corStatus(reg.status)}`}>
                <ClockIcon className={`w-3.5 h-3.5 ${corIcone(reg.status)}`} />
                <span>{rotuloStatus(reg.status)}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Materiais:</span>
                <p className="text-slate-700 mt-0.5">{reg.materiaisUtilizados}</p>
              </div>
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px]">Anestesia:</span>
                <p className="text-slate-700 mt-0.5">{reg.anestesico || 'Não informado'}</p>
              </div>
            </div>

            {reg.parecerSupervisor && (
              <p className="text-[11px] text-slate-700 font-semibold flex items-start gap-1.5 pt-1">
                {reg.status === 'VALIDADO' ? (
                  <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                ) : (
                  <CheckIcon className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                )}
                <span>
                  Parecer docente: {reg.parecerSupervisor}
                  {reg.status === 'VALIDADO' && ' • Assinado digitalmente.'}
                </span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}