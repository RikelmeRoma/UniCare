import type { RelatorioEstatisticas } from '../../../services/api';
import type {
  ItemPlanoTratamento,
  Paciente,
} from '../../clinic/context/ClinicContext';

interface IndicadoresPrintProps {
  curso: 'psicologia' | 'odontologia';
  stats: RelatorioEstatisticas | null;
  pacientes: Paciente[];
  planosTratamento: ItemPlanoTratamento[];
  totalPacientes: number;
  totalAgendamentos: number;
  taxaComparecimento: number;
  taxaAbsenteismo: number;
  geradoEm: string;
}

const nomeCurso = (curso: 'psicologia' | 'odontologia') =>
  curso === 'psicologia' ? 'Psicologia (SPA)' : 'Odontologia Integrada';

export function IndicadoresPrint({
  curso,
  stats,
  pacientes,
  planosTratamento,
  totalPacientes,
  totalAgendamentos,
  taxaComparecimento,
  taxaAbsenteismo,
  geradoEm,
}: IndicadoresPrintProps) {
  const bloco = stats?.distribuicao_cursos?.[curso] as
    | Record<string, number>
    | undefined;
  const menoresTotal = pacientes.filter((p) => p.ehMenor).length;

  const numero = (valor: number | undefined) =>
    stats && valor !== undefined ? String(valor) : '—';
  const doBloco = (chave: string) => {
    if (!stats) return '—';
    const valor = bloco?.[chave];
    return valor === undefined ? '—' : String(valor);
  };

  return (
    <div id="rt-print" className="bg-white text-slate-900 font-sans text-[11px] leading-relaxed">
      <header className="border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              UNINASSAU Aracaju • Sistema Integrado de Saúde Hospitalar
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
              Relatório Executivo de Indicadores
            </h1>
            <p className="mt-1 text-[11px] text-slate-600">
              Clínica de {nomeCurso(curso)} • Emitido em {geradoEm}
            </p>
          </div>
          <div className="rounded-lg border border-slate-300 px-3 py-2 text-right text-[10px]">
            <p className="font-bold uppercase tracking-wider text-slate-500">
              Responsabilidade Técnica
            </p>
            <p className="mt-0.5 font-bold text-slate-900">Painel RT</p>
            <p className="text-slate-500">LGPD Art. 11</p>
          </div>
        </div>
      </header>

      {!stats && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
          Relatório indisponível no momento da emissão. Os campos abaixo não
          foram preenchidos para não exibir número inventado.
        </div>
      )}

      <section className="print-section">
        <h2 className="mb-3 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
          1. Resumo executivo
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Pacientes registrados
            </p>
            <p className="mt-1 text-xl font-bold font-mono text-slate-900">
              {numero(totalPacientes)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Agendamentos totais
            </p>
            <p className="mt-1 text-xl font-bold font-mono text-slate-900">
              {numero(totalAgendamentos)}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Taxa de comparecimento
            </p>
            <p className="mt-1 text-xl font-bold font-mono text-slate-900">
              {stats ? `${taxaComparecimento}%` : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Taxa de absenteísmo
            </p>
            <p className="mt-1 text-xl font-bold font-mono text-slate-900">
              {stats ? `${taxaAbsenteismo}%` : '—'}
            </p>
          </div>
        </div>
      </section>

      <section className="print-section">
        <h2 className="mb-3 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
          2. Indicadores da clínica
        </h2>
        {curso === 'psicologia' ? (
          <table className="w-full border-collapse text-left">
            <tbody className="divide-y divide-slate-200">
              {[
                ['Pacientes ativos', doBloco('pacientes_ativos')],
                ['Sessões realizadas', doBloco('agendamentos_totais')],
                ['Prontuários submetidos', doBloco('prontuarios_submetidos')],
                ['Aguardando visto docente', doBloco('prontuarios_aguardando_visto')],
                ['Validados com visto digital', doBloco('prontuarios_validados')],
                ['Devolvidos para ajuste', doBloco('prontuarios_devolvidos')],
              ].map(([rotulo, valor]) => (
                <tr key={rotulo}>
                  <th className="py-1.5 pr-4 font-semibold text-slate-700">{rotulo}</th>
                  <td className="py-1.5 text-right font-mono text-slate-900">{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full border-collapse text-left">
            <tbody className="divide-y divide-slate-200">
              {[
                ['Pacientes ativos', doBloco('pacientes_ativos')],
                ['Atendimentos registrados', doBloco('agendamentos_totais')],
                ['Fichas odontológicas', doBloco('fichas_clinicas_totais')],
                ['Procedimentos registrados', stats ? String(planosTratamento.length) : '—'],
                [
                  'Menores com responsável legal',
                  stats
                    ? `${stats.conformidade_legal.pacientes_menores_com_responsavel} de ${menoresTotal}`
                    : '—',
                ],
              ].map(([rotulo, valor]) => (
                <tr key={rotulo}>
                  <th className="py-1.5 pr-4 font-semibold text-slate-700">{rotulo}</th>
                  <td className="py-1.5 text-right font-mono text-slate-900">{valor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="print-section">
        <h2 className="mb-3 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
          3. Conformidade legal e rastreabilidade
        </h2>
        <div className="rounded-lg border border-slate-200 p-3">
          <p>
            <strong>Logs de auditoria rastreados:</strong>{' '}
            {numero(stats?.conformidade_legal.total_logs_rastreados_lgpd)}
          </p>
          <p className="mt-1">
            <strong>Normas atendidas:</strong>{' '}
            {stats?.conformidade_legal.normas_atendidas?.length
              ? stats.conformidade_legal.normas_atendidas.join('; ')
              : '—'}
          </p>
        </div>
      </section>

      <footer className="mt-6 border-t border-slate-300 pt-3 text-[10px] text-slate-500">
        Documento gerado pelo UniCare a partir dos registros do banco de dados.
        A autenticidade deve ser conferida na trilha de auditoria institucional.
      </footer>
    </div>
  );
}
