import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useClinic } from '../../clinic/context/ClinicContext';
import {
  DocumentTextIcon,
  ArrowPathIcon,
  CheckIcon,
} from '../../../components/icons/CorporateIcons';

/**
 * Fila de homologação das fichas clínicas odontológicas completas.
 *
 * A unidade homologada é o documento enviado pela dupla (anamnese, odontograma,
 * periograma, índices e plano), não um procedimento isolado.
 */
export function ApprovalQueue() {
  const { documentosOdonto, homologarDocumentoOdonto, sincronizar, sync } = useClinic();

  const [idEmEdicao, setIdEmEdicao] = useState<number | null>(null);
  const [parecer, setParecer] = useState('');
  const [erro, setErro] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fila = documentosOdonto.filter((d) => d.status === 'AGUARDANDO_VALIDACAO');
  const devolvidas = documentosOdonto.filter(
    (d) => d.status === 'DEVOLVIDO_PARA_AJUSTE'
  );

  const abrirParecer = (id: number) => {
    setIdEmEdicao(id);
    setParecer('');
    setErro('');
  };

  const decidir = async (id: number, decisao: 'VALIDADO' | 'DEVOLVIDO_PARA_AJUSTE') => {
    setIsSaving(true);
    setErro('');
    const resultado = await homologarDocumentoOdonto(id, decisao, parecer.trim());
    setIsSaving(false);

    if (!resultado.success) {
      setErro(resultado.message);
      return;
    }
    setIdEmEdicao(null);
    setParecer('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-emerald-800" />
            <span>Fila de Homologação das Fichas Clínicas Odontológicas</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Fichas completas submetidas pelas duplas do estágio para visto digital
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full">
            {fila.length} pendente{fila.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => void sincronizar()}
            disabled={sync.estado === 'sincronizando'}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar fila"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {erro && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {erro}
        </div>
      )}

      <div className="space-y-4">
        {sync.estado === 'sincronizando' && fila.length === 0 && (
          <p className="text-xs text-slate-500">Carregando fila do servidor...</p>
        )}

        {sync.estado !== 'sincronizando' && fila.length === 0 && devolvidas.length === 0 && (
          <p className="text-xs text-slate-500">
            Nenhuma ficha aguardando visto docente nesta clínica.
          </p>
        )}

        {fila.map((documento) => (
          <div
            key={documento.id}
            className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h4 className="font-bold text-slate-900 text-sm">
                  Paciente: {documento.pacienteNome}{' '}
                  <span className="text-slate-400 font-mono text-xs font-normal">
                    Ficha #{documento.id} · v{documento.versao}
                  </span>
                </h4>
              </div>
              <div className="text-right text-xs text-slate-500 font-mono">
                <p>Submetida em</p>
                <p className="font-bold text-slate-700">{documento.submetidoEm}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs">
              <div>
                <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">
                  Dupla Clínica Responsável:
                </p>
                <p className="font-semibold text-slate-900">
                  {documento.duplaEstagiarios}
                </p>
              </div>
              <div>
                <p className="text-slate-400 font-bold uppercase text-[10px] mb-1">
                  Tipo de ficha:
                </p>
                <p className="font-medium text-slate-800">
                  {documento.tipo === 'infantil' ? 'Odontopediatria' : 'Adulto e Idoso'}
                </p>
              </div>
            </div>

            {idEmEdicao === documento.id && (
              <div className="mb-4 p-3.5 bg-white border border-emerald-300 rounded-xl space-y-2">
                <label
                  htmlFor={`parecer-${documento.id}`}
                  className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                >
                  Parecer docente (obrigatório)
                </label>
                <textarea
                  id={`parecer-${documento.id}`}
                  rows={3}
                  value={parecer}
                  onChange={(e) => setParecer(e.target.value)}
                  placeholder="Avaliação técnica da conduta e do registro clínico."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3.5 border-t border-slate-200/60">
              <Link
                to={`/ficha-odonto?paciente=${documento.pacienteId}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-900"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>Abrir ficha completa</span>
              </Link>

              {idEmEdicao !== documento.id ? (
                <button
                  type="button"
                  onClick={() => abrirParecer(documento.id)}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <DocumentTextIcon className="w-3.5 h-3.5" />
                  <span>Emitir Parecer</span>
                </button>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIdEmEdicao(null)}
                    disabled={isSaving}
                    className="text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void decidir(documento.id, 'DEVOLVIDO_PARA_AJUSTE')}
                    disabled={isSaving || parecer.trim().length === 0}
                    className="text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                    <span>Devolver para Ajuste</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void decidir(documento.id, 'VALIDADO')}
                    disabled={isSaving || parecer.trim().length === 0}
                    className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'Enviando...' : 'Confirmar Visto'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {devolvidas.length > 0 && (
          <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-rose-900">
              Devolvidas para ajuste ({devolvidas.length})
            </h4>
            {devolvidas.map((documento) => (
              <div key={documento.id} className="text-xs text-rose-800">
                <span className="font-semibold">
                  Paciente: {documento.pacienteNome} · Ficha #{documento.id}
                </span>
                {documento.parecerSupervisor && (
                  <p className="text-rose-700">
                    Parecer
                    {documento.supervisorNome ? ` — ${documento.supervisorNome}` : ''}:{' '}
                    {documento.parecerSupervisor}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
