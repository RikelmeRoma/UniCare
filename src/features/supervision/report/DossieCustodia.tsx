import type {
  EvolucaoPsico,
  ItemPlanoTratamento,
  Paciente,
} from '../../clinic/context/ClinicContext';
import type { User } from '../../auth/context/AuthContext';

interface DossieCustodiaProps {
  paciente: Paciente;
  evolucoes: EvolucaoPsico[];
  planos: ItemPlanoTratamento[];
  cursoPainel: 'psicologia' | 'odontologia';
  gestaoLabel: string;
  usuario: User | null;
}

const ROTULO_CURSO: Record<string, string> = {
  psicologia: 'Psicologia',
  odontologia: 'Odontologia',
  ambos: 'Psicologia e Odontologia',
};

const ROTULO_STATUS: Record<string, string> = {
  EM_ELABORACAO: 'Em elaboração',
  AGUARDANDO_VALIDACAO: 'Aguardando validação',
  VALIDADO: 'Validado',
  DEVOLVIDO_PARA_AJUSTE: 'Devolvido para ajuste',
};

function formatarData(valor?: string | null): string {
  if (!valor) return '—';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return valor;
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-500">{rotulo}</p>
      <p className="text-[8.5pt] font-semibold text-slate-900">{valor}</p>
    </div>
  );
}

/**
 * Dossiê de guarda de um paciente.
 *
 * Documento separado do relatório executivo de propósito: aqui vai o conteúdo
 * clínico completo, que pode ocupar muitas páginas e não deve se misturar com
 * os indicadores gerenciais.
 */
export function DossieCustodia({
  paciente,
  evolucoes,
  planos,
  cursoPainel,
  gestaoLabel,
  usuario,
}: DossieCustodiaProps) {
  const agora = new Date();
  const numeroDocumento = `CUST-${agora.getFullYear()}-${paciente.id.toString().padStart(4, '0')}`;

  return (
    <article className="text-slate-900">
      <header className="relatorio-bloco border-b-[3px] border-[#FFD100] bg-[#002B49] px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[8pt] font-bold uppercase tracking-[0.22em] text-[#FFD100]">
              UNINASSAU Aracaju
            </p>
            <h1 className="mt-1 text-[16pt] font-bold leading-tight">
              Dossiê de Custódia Legal de Prontuário
            </h1>
            <p className="mt-1 text-[8.5pt] text-slate-200">
              UniCare · Sistema Integrado de Saúde — {ROTULO_CURSO[cursoPainel] ?? cursoPainel}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[7pt] uppercase tracking-[0.16em] text-slate-300">
              Registro de custódia
            </p>
            <p className="font-mono text-[10pt] font-bold">{numeroDocumento}</p>
            <p className="mt-1 text-[7.5pt] text-slate-300">
              Emitido em {agora.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </header>

      <section className="relatorio-bloco mt-4 rounded border border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-[9pt] font-bold uppercase tracking-wide text-[#002B49]">
          Identificação do paciente
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-x-5 gap-y-3">
          <Campo rotulo="Nome" valor={paciente.nome} />
          <Campo rotulo="Nascimento" valor={formatarData(paciente.dataNascimento)} />
          <Campo rotulo="Clínica" valor={ROTULO_CURSO[paciente.curso] ?? paciente.curso} />
          <Campo
            rotulo="Situação do prontuário"
            valor={paciente.prontuarioAtivo ? 'Ativo em tratamento' : 'Encerrado'}
          />
          <Campo rotulo="Sessões registradas" valor={String(evolucoes.length)} />
          <Campo
            rotulo="Responsável legal"
            valor={paciente.ehMenor ? paciente.nomeResponsavel || '—' : 'Não se aplica'}
          />
        </div>
        <p className="mt-3 text-[7pt] text-slate-500">
          O CPF e o contato telefônico não são reproduzidos neste dossiê; permanecem no
          cadastro do sistema, acessíveis pela trilha de auditoria.
        </p>
      </section>

      {cursoPainel === 'psicologia' && (
        <section className="mt-5">
          <h2 className="relatorio-bloco flex items-center justify-between border-b border-slate-300 pb-1 text-[10pt] font-bold uppercase tracking-wide text-[#002B49]">
            <span>Evoluções clínicas</span>
            <span className="text-[7.5pt] font-semibold normal-case tracking-normal text-slate-500">
              {evolucoes.length} sessão(ões)
            </span>
          </h2>

          {evolucoes.length === 0 ? (
            <p className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[8pt] italic text-slate-500">
              Nenhum registro de psicologia para este paciente.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {evolucoes.map((evolucao) => (
                <div
                  key={evolucao.id}
                  className="relatorio-bloco rounded border border-slate-200 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-1.5">
                    <p className="font-mono text-[8pt] font-bold text-slate-900">
                      {evolucao.numeroSessao} · {formatarData(evolucao.dataSessao)}
                    </p>
                    <p className="text-[7.5pt] text-slate-600">
                      {evolucao.estagiarioNome} ({evolucao.estagiarioMatricula})
                    </p>
                    <p className="text-[7.5pt] font-semibold text-slate-700">
                      {ROTULO_STATUS[evolucao.status] ?? evolucao.status}
                    </p>
                  </div>

                  <p className="mt-1.5 whitespace-pre-line text-[8.5pt] leading-relaxed text-slate-800">
                    {evolucao.redacaoTexto}
                  </p>

                  {evolucao.parecerSupervisor && (
                    <p className="mt-2 border-t border-slate-100 pt-1.5 text-[8pt] text-indigo-900">
                      <strong>Visto docente ({evolucao.supervisorNome}):</strong>{' '}
                      {evolucao.parecerSupervisor}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {cursoPainel === 'odontologia' && (
        <section className="mt-5">
          <h2 className="relatorio-bloco border-b border-slate-300 pb-1 text-[10pt] font-bold uppercase tracking-wide text-[#002B49]">
            Registro de procedimentos odontológicos
          </h2>

          {planos.length === 0 ? (
            <p className="mt-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[8pt] italic text-slate-500">
              Nenhum procedimento registrado para este paciente.
            </p>
          ) : (
            <table className="mt-3 text-[8pt]">
              <thead>
                <tr className="bg-slate-100 text-[7pt] uppercase tracking-wider text-slate-600">
                  <th className="px-2 py-1.5 text-left font-bold">Fase / prioridade</th>
                  <th className="px-2 py-1.5 text-left font-bold">Dente / região</th>
                  <th className="px-2 py-1.5 text-left font-bold">Procedimento</th>
                  <th className="px-2 py-1.5 text-left font-bold">Status</th>
                  <th className="px-2 py-1.5 text-left font-bold">Dupla responsável</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {planos.map((item) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="px-2 py-1.5 font-semibold">{item.prioridade}</td>
                    <td className="px-2 py-1.5 font-mono">{item.denteRegiao}</td>
                    <td className="px-2 py-1.5">{item.procedimento}</td>
                    <td className="px-2 py-1.5">{item.status}</td>
                    <td className="px-2 py-1.5">{item.estagiarioResponsavel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="relatorio-bloco mt-6 rounded border border-indigo-300 bg-indigo-50/50 px-4 py-3">
        <h2 className="text-[9pt] font-bold uppercase tracking-wide text-indigo-900">
          Termo de guarda e custódia definitiva
        </h2>
        <p className="mt-1.5 text-[8pt] leading-relaxed text-slate-700">
          Certificamos que este prontuário é mantido sob guarda institucional pelo prazo
          mínimo de 20 anos, sob responsabilidade da {gestaoLabel}, conforme as
          resoluções do Conselho Federal de Psicologia e do Conselho Federal de
          Odontologia aplicáveis ao caso.
        </p>
        <p className="mt-2 text-[7pt] text-slate-500">
          O sistema não implementa hash de integridade deste documento. A verificação de
          autenticidade se dá pelo registro {numeroDocumento} e pela trilha de auditoria
          do UniCare.
        </p>
      </section>

      <section className="relatorio-bloco mt-8 grid grid-cols-2 gap-10 text-[8pt]">
        <div>
          <div className="border-t border-slate-400 pt-1">
            <p className="font-semibold text-slate-900">{usuario?.nome ?? '—'}</p>
            <p className="text-[7pt] text-slate-500">
              {usuario ? `${usuario.matricula} · ${gestaoLabel}` : 'Emissor'}
            </p>
          </div>
        </div>
        <div>
          <div className="border-t border-slate-400 pt-1">
            <p className="font-semibold text-slate-900">{gestaoLabel}</p>
            <p className="text-[7pt] text-slate-500">Responsável pela guarda</p>
          </div>
        </div>
      </section>

      <p className="mt-4 font-mono text-[7pt] text-slate-400">
        {numeroDocumento} · emitido em {agora.toLocaleString('pt-BR')}
      </p>
    </article>
  );
}
