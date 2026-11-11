import { useEffect, useState, type FormEvent } from 'react';
import { api, type ApiEstagiario, type TipoOcorrenciaPsico } from '../../../../services/api';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '../../../../components/icons/CorporateIcons';
import {
  formatarDataBr,
  LABEL_TIPO_OCORRENCIA_PSICO,
  TIPOS_OCORRENCIA_PSICO,
} from '../../constants/psico';
import { useClinic } from '../../../clinic/context/ClinicContext';

function hojeIso(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

export function StudentOccurrencesPanel() {
  const { ocorrenciasPsico, registrarOcorrenciaPsico } = useClinic();
  const [estagiarios, setEstagiarios] = useState<ApiEstagiario[]>([]);
  const [estagiarioMatricula, setEstagiarioMatricula] = useState('');
  const [tipo, setTipo] = useState<TipoOcorrenciaPsico>('ATRASO');
  const [dataOcorrencia, setDataOcorrencia] = useState(hojeIso);
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  useEffect(() => {
    let ativo = true;
    api
      .getEstagiarios()
      .then((lista) => {
        if (!ativo) return;
        setEstagiarios(lista);
        if (lista.length > 0) {
          setEstagiarioMatricula((prev) => prev || lista[0].matricula);
        }
      })
      .catch((err) => {
        if (!ativo) return;
        console.error('[UniCare] falha ao carregar estagiários para ocorrências:', err);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    if (!estagiarioMatricula) {
      setErro('Selecione o estagiário para registrar a ocorrência.');
      return;
    }
    if (!dataOcorrencia) {
      setErro('Informe a data da ocorrência.');
      return;
    }
    if (!descricao.trim()) {
      setErro('Descreva objetivamente o ocorrido.');
      return;
    }

    setSalvando(true);
    const res = await registrarOcorrenciaPsico({
      estagiarioMatricula,
      tipo,
      dataOcorrencia,
      descricao: descricao.trim(),
    });
    setSalvando(false);

    if (!res.success) {
      setErro(res.message);
      return;
    }

    setDescricao('');
    setSucesso(res.message);
  };

  return (
    <div className="bg-white dark:bg-[#0E1729] rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-6 space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Ocorrências Operacionais de Estagiários</span>
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Registro administrativo da recepção do SPA sobre atrasos, faltas ou intercorrências de atendimento.
          </p>
        </div>
        <span className="self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70 tabular-nums">
          {ocorrenciasPsico.length} registrada(s)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Estagiário *
            </label>
            <select
              value={estagiarioMatricula}
              onChange={(e) => setEstagiarioMatricula(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 outline-none"
            >
              {estagiarios.length === 0 ? (
                <option value="">Nenhum estagiário ativo encontrado</option>
              ) : (
                estagiarios.map((est) => (
                  <option key={est.matricula} value={est.matricula}>
                    {est.nome} ({est.matricula})
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tipo de Ocorrência *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoOcorrenciaPsico)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 outline-none"
            >
              {TIPOS_OCORRENCIA_PSICO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Data *
            </label>
            <input
              type="date"
              value={dataOcorrencia}
              onChange={(e) => setDataOcorrencia(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-blue-600 outline-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Descrição Objetiva da Ocorrência *
          </label>
          <textarea
            rows={2}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva o ocorrido (ex.: atraso de 25 minutos sem comunicação prévia, ausência no plantão, remanejamento necessário)..."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 outline-none resize-none"
          />
        </div>

        {erro && (
          <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/70 text-xs text-red-700 dark:text-red-200">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
            <CheckCircleIcon className="w-4 h-4 shrink-0" />
            <span>{sucesso}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={salvando || estagiarios.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white transition-colors"
          >
            {salvando ? 'Registrando...' : 'Registrar Ocorrência'}
          </button>
        </div>
      </form>

      {ocorrenciasPsico.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Histórico Recente na Recepção
          </p>
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {ocorrenciasPsico.map((oc) => (
              <li
                key={oc.id}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 p-3 text-xs bg-white dark:bg-slate-900/70 space-y-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white">{oc.estagiarioNome}</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      {oc.estagiarioMatricula}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/70">
                      {LABEL_TIPO_OCORRENCIA_PSICO[oc.tipo] ?? oc.tipo}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                    {formatarDataBr(oc.dataOcorrencia)}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{oc.descricao}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Registrado por {oc.registradoPorNome}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
