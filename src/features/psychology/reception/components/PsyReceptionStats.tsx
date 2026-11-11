import { useMemo } from 'react';
import { useClinic } from '../../../clinic/context/ClinicContext';
import { CONSULTORIOS_SPA, TOTAL_CONSULTORIOS_SPA } from '../../constants/psico';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '../../../../components/icons/CorporateIcons';

/**
 * Contadores da recepção de psicologia.
 *
 * Antes os quatro números eram literais (`28`, `04`, `07`, `02`) e o rodapé do
 * terceiro cartão afirmava "7 de 10 consultórios em uso": não existe cadastro
 * de consultórios no schema, então o 10 era inventado. Agora saem dos
 * agendamentos reais da clínica, com o mesmo `—` em falta de dado que a
 * recepção de odontologia já usa.
 *
 * Os rótulos não dizem "Hoje" nem "do Dia". `Agendamento` não tem campo de
 * data — só `horario` e `turno` —, então qualquer contagem diária seria falsa.
 * Dá para voltar a usar "Hoje" quando houver data de agendamento no schema.
 */
export function PsyReceptionStats() {
  const { agendamentos, sync } = useClinic();

  const indicadores = useMemo(() => {
    // Filtro por clínica. Conferido contra `visivel_a_clinica` em
    // routers/relatorios.py, que aceita `(clinica, "ambos")`: os dois discordariam
    // se existisse agendamento de clínica dupla, mas não existe e não pode
    // existir — agendamento tem cadeira fixa, então não é `ambos` como o
    // paciente. Se algum dia o tipo `Agendamento.curso` ganhar `"ambos"`, é
    // aqui que este filtro volta a divergir do relatório.
    const spa = agendamentos.filter((a) => a.curso === 'psicologia');
    const porStatus = (s: string) => spa.filter((a) => a.status === s).length;
    const emAtendimento = spa.filter((a) => a.status === 'EM_ATENDIMENTO');

    const faltas = porStatus('FALTOU');
    // Mesma conta de routers/relatorios.py:57-59, para que o cartão e o
    // relatório gerencial não mostrem números diferentes.
    const atendidosOuPresentes =
      porStatus('PRESENTE') + porStatus('EM_ATENDIMENTO') + porStatus('CONCLUIDO');
    const finalizados = atendidosOuPresentes + faltas;
    const taxaAbsenteismo = finalizados > 0 ? (faltas / finalizados) * 100 : 0;

    return {
      total: spa.length,
      emEspera: porStatus('PRESENTE'),
      emAtendimento: emAtendimento.length,
      cancelados: porStatus('CANCELADO'),
      faltas,
      taxaAbsenteismo,
      // Salas distintas ocupadas agora. O denominador "de 10" saiu: não
      // há cadastro de consultórios que diga quantos existem.
      salasEmUso: new Set(emAtendimento.map((a) => a.salaOuCadeira)).size,
    };
  }, [agendamentos]);

  // Dado clínico ausente é melhor que número inventado: se a API falhou, a tela
  // mostra travessão e diz que não sabe.
  const semDado = sync.estado === 'erro' || sync.estado === 'aguardando-login';

  // Sem anotação explícita no tipo dos cartões: o TS infere, e o `React.ReactNode`
  // exigiria trazer o namespace React para dentro do arquivo à toa.
  const cartoes = [
    {
      rotulo: 'Agendamentos',
      valor: indicadores.total,
      rodape: 'Sessões individuais SPA',
      numero: 'text-slate-900 dark:text-white',
      rodapeClass: 'text-slate-400 dark:text-slate-400',
      icone: <CalendarIcon className="w-4 h-4" />,
      iconeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700',
    },
    {
      rotulo: 'Sala de Espera SPA',
      valor: indicadores.emEspera,
      rodape: 'Pacientes aguardando acolhimento',
      numero: 'text-blue-700 dark:text-blue-400',
      rodapeClass: 'text-blue-700 dark:text-blue-300',
      icone: <ClockIcon className="w-4 h-4" />,
      iconeClass: 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60',
    },
    {
      rotulo: 'Em Psicoterapia',
      valor: indicadores.emAtendimento,
      rodape: `${indicadores.salasEmUso} de ${TOTAL_CONSULTORIOS_SPA} consultórios em uso (${Math.max(TOTAL_CONSULTORIOS_SPA - indicadores.salasEmUso, 0)} disponíveis)`,
      numero: 'text-emerald-800 dark:text-emerald-400',
      rodapeClass: 'text-emerald-800 dark:text-emerald-300',
      icone: <UserGroupIcon className="w-4 h-4" />,
      iconeClass: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800/60',
    },
    {
      rotulo: 'Cancelamentos',
      valor: indicadores.cancelados,
      rodape: 'Vagas liberadas para remanejamento',
      numero: 'text-amber-700 dark:text-amber-400',
      rodapeClass: 'text-amber-800 dark:text-amber-300',
      icone: <XMarkIcon className="w-4 h-4" />,
      iconeClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-800/60',
    },
    {
      // Não substitui "Cancelamentos": as duas dizem coisas diferentes. Falta é
      // sessão que existiu e o paciente não veio; cancelamento é vaga liberada
      // para remanejar. A recepção precisa das duas.
      rotulo: 'Faltas',
      valor: `${indicadores.taxaAbsenteismo.toFixed(1)}%`,
      rodape: `${indicadores.faltas} sessão(ões) sem comparecimento`,
      numero: 'text-rose-700 dark:text-rose-400',
      rodapeClass: 'text-rose-700 dark:text-rose-300',
      icone: <ExclamationTriangleIcon className="w-4 h-4" />,
      iconeClass: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-800/60',
    },
  ];

  // Distingue dado real do Postgres de mock. Sem isso não há como saber, na tela,
  // se os números vêm do banco ou do fallback local — o mesmo rótulo que a
  // recepção de odontologia já mostra (ReceptionStats.tsx).
  const origemLabel =
    sync.estado === 'sincronizando'
      ? { texto: 'Sincronizando...', classe: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' }
      : sync.estado === 'sincronizado'
        ? { texto: 'Dados da API', classe: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60' }
        : sync.estado === 'parcial'
          ? { texto: 'Dados parciais da API', classe: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/60' }
          : sync.estado === 'erro'
            ? { texto: 'Falha na API', classe: 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/70 dark:border-red-800/60' }
            : { texto: 'Aguardando login', classe: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' };

  // A recepção leva 403 em prontuários e fichas odonto **por desenho** — a RN-001
  // bloqueia dado clínico. O `ClinicContext` não conta esse 403 como falha, então
  // ele nem chega aqui: o que aparece é falha de verdade, e ela aparece crua.
  // Esconder uma falha real seria o erro oposto.
  const detalheFalha =
    sync.estado === 'parcial' && sync.falhas.length > 0 ? sync.falhas[0] : null;

  return (
    <>
      <div className="flex items-center justify-between mb-4 text-[11px]">
        <span className={`px-2 py-1 rounded-md font-bold ${origemLabel.classe}`}>
          {origemLabel.texto}
        </span>
        {detalheFalha && (
          <span
            className="text-amber-700 dark:text-amber-400 text-[10px] font-mono truncate ml-3"
            title={sync.falhas.join(' | ')}
          >
            {detalheFalha}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {cartoes.map((c) => (
          <div
            key={c.rotulo}
            className="bg-white dark:bg-[#0E1729] p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs hover:shadow-sm transition-all flex justify-between items-start"
          >
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${c.numero}`}>
                {c.rotulo}
              </p>
              <h3 className={`text-3xl font-bold font-mono tabular-nums ${c.numero}`}>
                {semDado
                  ? '—'
                  : typeof c.valor === 'number'
                    ? String(c.valor).padStart(2, '0')
                    : c.valor}
              </h3>
              <p className={`text-[10px] font-medium mt-1 ${c.rodapeClass}`}>
                {semDado ? 'sem dado da API' : c.rodape}
              </p>
            </div>
            <span className={`p-2.5 rounded-xl ${c.iconeClass}`}>{c.icone}</span>
          </div>
        ))}
      </div>

      {/* Mapa rápido dos 6 consultórios disponíveis no SPA */}
      <div className="bg-white dark:bg-[#0E1729] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-4 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Consultórios do SPA ({TOTAL_CONSULTORIOS_SPA} disponíveis)
          </p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
            {indicadores.salasEmUso} em atendimento agora · {Math.max(TOTAL_CONSULTORIOS_SPA - indicadores.salasEmUso, 0)} livre(s)
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {CONSULTORIOS_SPA.map((sala) => {
            const ativoAgora = agendamentos.find(
              (a) =>
                a.curso === 'psicologia' &&
                a.salaOuCadeira === sala &&
                a.status === 'EM_ATENDIMENTO'
            );
            return (
              <div
                key={sala}
                className={`rounded-xl border px-3 py-2 text-xs transition-colors ${
                  ativoAgora
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-200'
                    : 'bg-slate-50/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-[11px]">
                    {sala.replace('Consultório ', '')}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ativoAgora ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                </div>
                <p className="text-[10px] mt-0.5 truncate text-slate-500 dark:text-slate-400">
                  {ativoAgora
                    ? `${ativoAgora.horario} · ${ativoAgora.estagiarioNome.split(' ')[0]}`
                    : 'Disponível'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}