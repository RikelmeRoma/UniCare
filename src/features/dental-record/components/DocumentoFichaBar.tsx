import { useEffect, useMemo, useState } from 'react';
import { api, type ApiEstagiario } from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import { useClinic, type DocumentoFichaOdonto } from '../../clinic/context/ClinicContext';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '../../../components/icons/CorporateIcons';

interface DocumentoFichaBarProps {
  pacienteId?: number;
  pacienteNome?: string;
  tipo: 'adulto' | 'infantil';
  documento?: DocumentoFichaOdonto | null;
  montarConteudo: () => Record<string, unknown>;
  somenteLeitura?: boolean;
}

const ROTULOS_STATUS: Record<string, string> = {
  EM_ELABORACAO: 'Em elaboração',
  AGUARDANDO_VALIDACAO: 'Aguardando validação da supervisão',
  VALIDADO: 'Homologada pela supervisão',
  DEVOLVIDO_PARA_AJUSTE: 'Devolvida para ajuste',
};

export function DocumentoFichaBar({
  pacienteId,
  pacienteNome,
  tipo,
  documento,
  montarConteudo,
  somenteLeitura = false,
}: DocumentoFichaBarProps) {
  const { user } = useAuth();
  const { salvarDocumentoOdonto, reenviarDocumentoOdonto } = useClinic();
  const [estagiarios, setEstagiarios] = useState<ApiEstagiario[]>([]);
  const [operadorEscolhido, setOperadorEscolhido] = useState<string | null>(null);
  const [auxiliarEscolhido, setAuxiliarEscolhido] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'alerta'; texto: string } | null>(
    null
  );

  useEffect(() => {
    let cancelado = false;
    api
      .getEstagiarios()
      .then((lista) => {
        if (!cancelado) setEstagiarios(lista);
      })
      .catch(() => {
        if (!cancelado) setEstagiarios([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const operador =
    operadorEscolhido ??
    documento?.operadorMatricula ??
    (user?.perfil === 'estagiario' ? user.matricula : '');
  const auxiliar = auxiliarEscolhido ?? documento?.auxiliarMatricula ?? '';

  const estagiariosDaClinica = useMemo(() => estagiarios, [estagiarios]);

  const podeEnviar =
    !somenteLeitura &&
    Boolean(pacienteId) &&
    Boolean(operador) &&
    Boolean(auxiliar) &&
    operador !== auxiliar &&
    (!documento || Boolean(documento.conteudo)) &&
    documento?.status !== 'AGUARDANDO_VALIDACAO' &&
    documento?.status !== 'VALIDADO';

  const enviar = async () => {
    if (!pacienteId) return;
    setEnviando(true);
    setMensagem(null);
    const conteudo = montarConteudo();
    const resultado =
      documento && documento.status === 'DEVOLVIDO_PARA_AJUSTE'
        ? await reenviarDocumentoOdonto(documento.id, conteudo)
        : await salvarDocumentoOdonto({
            pacienteId,
            pacienteNome: pacienteNome ?? `Paciente #${pacienteId}`,
            operadorMatricula: operador,
            auxiliarMatricula: auxiliar,
            tipo,
            conteudo,
          });
    setEnviando(false);
    setMensagem({
      tipo: resultado.success ? 'ok' : 'alerta',
      texto: resultado.message,
    });
  };

  const status = documento?.status;
  const badgeStatus = status
    ? status === 'VALIDADO'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'DEVOLVIDO_PARA_AJUSTE'
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : 'bg-amber-50 text-amber-800 border-amber-200'
    : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ficha clínica no servidor
            </span>
            <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${badgeStatus}`}>
              {status ? ROTULOS_STATUS[status] ?? status : 'Ainda não enviada'}
            </span>
            {documento && (
              <span className="font-mono text-[10px] text-slate-500">
                versão {documento.versao}
              </span>
            )}
          </div>
          {documento?.parecerSupervisor && (
            <p className="text-[11px] text-slate-600">
              <strong>Parecer da supervisão:</strong> {documento.parecerSupervisor}
              {documento.supervisorNome ? ` — ${documento.supervisorNome}` : ''}
            </p>
          )}
          {!documento && !somenteLeitura && (
            <p className="text-[11px] text-slate-500">
              O preenchimento abaixo ainda não foi enviado para a supervisão.
            </p>
          )}
        </div>

        {!somenteLeitura && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Operador
              <select
                value={operador}
                onChange={(e) => setOperadorEscolhido(e.target.value)}
                disabled={Boolean(documento)}
                className="mt-1 block w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-800"
              >
                <option value="">Selecione</option>
                {estagiariosDaClinica.map((e) => (
                  <option key={e.matricula} value={e.matricula}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Auxiliar
              <select
                value={auxiliar}
                onChange={(e) => setAuxiliarEscolhido(e.target.value)}
                disabled={Boolean(documento)}
                className="mt-1 block w-40 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-semibold text-slate-800"
              >
                <option value="">Selecione</option>
                {estagiariosDaClinica
                  .filter((e) => e.matricula !== operador)
                  .map((e) => (
                    <option key={e.matricula} value={e.matricula}>
                      {e.nome}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void enviar()}
              disabled={!podeEnviar || enviando}
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-3.5 w-3.5" />
              {enviando
                ? 'Enviando...'
                : documento?.status === 'DEVOLVIDO_PARA_AJUSTE'
                  ? 'Reenviar para supervisão'
                  : 'Enviar para supervisão'}
            </button>
          </div>
        )}
      </div>

      {status === 'DEVOLVIDO_PARA_AJUSTE' && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-900">
          <ExclamationTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Corrija os pontos indicados no parecer e reenvie a ficha.</span>
        </div>
      )}

      {mensagem && (
        <div
          role="status"
          className={`mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
            mensagem.tipo === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          <InformationCircleIcon className="h-3.5 w-3.5 shrink-0" />
          <span>{mensagem.texto}</span>
        </div>
      )}
    </div>
  );
}
