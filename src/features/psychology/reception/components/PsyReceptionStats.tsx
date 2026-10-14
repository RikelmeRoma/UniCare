import { useMemo } from 'react';
import { useClinic } from '../../../clinic/context/ClinicContext';
import {
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  XMarkIcon,
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
    const spa = agendamentos.filter((a) => a.curso === 'psicologia');
    const porStatus = (s: string) => spa.filter((a) => a.status === s).length;
    const emAtendimento = spa.filter((a) => a.status === 'EM_ATENDIMENTO');

    return {
      total: spa.length,
      emEspera: porStatus('PRESENTE'),
      emAtendimento: emAtendimento.length,
      cancelados: porStatus('CANCELADO'),
      // Salas distintas ocupadas agora. O denominador "de 10" saiu: não
      // há cadastro de consultórios que diga quantos existem.
      salasEmUso: new Set(emAtendimento.map((a) => a.salaOuCadeira)).size,
    };
  }, [agendamentos]);

  // Dado clínico ausente é melhor que número inventado: se a API falhou, a tela
  // mostra travessão e diz que não sabe.
  const semDado = sync.estado === 'erro' || sync.estado === 'aguardando-login';

  const cartoes = [
    {
      rotulo: 'Agendamentos',
      valor: indicadores.total,
      rodape: 'Sessões individuais SPA',
      numero: 'text-slate-900',
      rodapeClass: 'text-slate-400',
      icone: <CalendarIcon className="w-4 h-4" />,
      iconeClass: 'bg-slate-100 text-slate-700',
    },
    {
      rotulo: 'Sala de Espera SPA',
      valor: indicadores.emEspera,
      rodape: 'Pacientes aguardando acolhimento',
      numero: 'text-blue-700',
      rodapeClass: 'text-blue-700',
      icone: <ClockIcon className="w-4 h-4" />,
      iconeClass: 'bg-blue-50 text-blue-700',
    },
    {
      rotulo: 'Em Psicoterapia',
      valor: indicadores.emAtendimento,
      rodape: `${indicadores.salasEmUso} consultório(s) em uso`,
      numero: 'text-emerald-800',
      rodapeClass: 'text-emerald-800',
      icone: <UserGroupIcon className="w-4 h-4" />,
      iconeClass: 'bg-emerald-50 text-emerald-700',
    },
    {
      rotulo: 'Cancelamentos',
      valor: indicadores.cancelados,
      rodape: 'Vagas liberadas para remanejamento',
      numero: 'text-amber-700',
      rodapeClass: 'text-amber-800',
      icone: <XMarkIcon className="w-4 h-4" />,
      iconeClass: 'bg-amber-50 text-amber-700',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cartoes.map((c) => (
        <div
          key={c.rotulo}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex justify-between items-start"
        >
          <div>
            <p className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${c.numero}`}>
              {c.rotulo}
            </p>
            <h3 className={`text-3xl font-bold font-mono ${c.numero}`}>
              {semDado ? '—' : String(c.valor).padStart(2, '0')}
            </h3>
            <p className={`text-[10px] font-medium mt-1 ${c.rodapeClass}`}>
              {semDado ? 'sem dado da API' : c.rodape}
            </p>
          </div>
          <span className={`p-2.5 rounded-xl ${c.iconeClass}`}>{c.icone}</span>
        </div>
      ))}
    </div>
  );
}