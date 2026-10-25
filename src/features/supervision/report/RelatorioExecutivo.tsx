import type { ReactNode } from 'react';
import type { ApiLogAuditoria, RelatorioEstatisticas } from '../../../services/api';
import type {
  Agendamento,
  EvolucaoPsico,
  Paciente,
} from '../../clinic/context/ClinicContext';
import type { User } from '../../auth/context/AuthContext';

export interface ResumoExecutivo {
  totalPacientes: number;
  totalAgendamentos: number;
  taxaComparecimento: number;
  taxaAbsenteismo: number;
}

interface RelatorioExecutivoProps {
  modo: 'rt' | 'coordenacao';
  usuario: User | null;
  stats: RelatorioEstatisticas | null;
  logs: ApiLogAuditoria[];
  usuarios: User[];
  pacientes: Paciente[];
  agendamentos: Agendamento[];
  evolucoes: EvolucaoPsico[];
  cursoPainel: 'psicologia' | 'odontologia';
  gestaoLabel: string;
  isPainelPsicologia: boolean;
  resumo: ResumoExecutivo;
}

const numeroBR = new Intl.NumberFormat('pt-BR');

function doisDigitos(valor: number): string {
  return valor.toString().padStart(2, '0');
}

function formatarData(valor?: string | null): string {
  if (!valor) return '—';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return valor;
}

function partesDataHora(valor?: string | null): { data: string; hora: string } {
  if (!valor) return { data: '—', hora: '' };
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return { data: valor, hora: '' };
  return {
    data: data.toLocaleDateString('pt-BR'),
    hora: data.toLocaleTimeString('pt-BR'),
  };
}

const ROTULO_PERFIL: Record<string, string> = {
  estagiario: 'Estagiário',
  supervisor: 'Supervisor',
  recepcao: 'Recepção',
  rt: 'RT Master',
  coordenacao: 'Coordenação',
};

const ROTULO_CURSO: Record<string, string> = {
  psicologia: 'Psicologia',
  odontologia: 'Odontologia',
  ambos: 'Ambos',
  geral: 'Geral (Triagem)',
};

function Secao({
  numero,
  titulo,
  children,
}: {
  numero: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section className="relatorio-bloco mt-6">
      <h2 className="flex items-center gap-2 border-b border-slate-300 pb-1 text-[10pt] font-bold uppercase tracking-wide text-[#002B49]">
        <span className="flex h-5 w-5 items-center justify-center rounded bg-[#002B49] text-[8pt] font-bold text-white">
          {numero}
        </span>
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-500">{rotulo}</p>
      <p className="text-[8.5pt] font-semibold text-slate-900">{valor}</p>
    </div>
  );
}

function Indicador({
  rotulo,
  valor,
  detalhe,
  classeValor,
  classeFundo,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  classeValor: string;
  classeFundo: string;
}) {
  return (
    <div className={`relatorio-bloco rounded border border-slate-200 px-3 py-2.5 ${classeFundo}`}>
      <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-500">{rotulo}</p>
      <p className={`mt-1 font-mono text-[16pt] font-bold leading-none ${classeValor}`}>{valor}</p>
      <p className="mt-1.5 text-[7.5pt] font-semibold text-slate-600">{detalhe}</p>
    </div>
  );
}

function Barra({ percentual, classe }: { percentual: number; classe: string }) {
  const largura = Math.max(0, Math.min(100, percentual));
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200">
      <div className={`h-1.5 rounded-full ${classe}`} style={{ width: `${largura}%` }} />
    </div>
  );
}

/**
 * Relatório executivo impresso do Painel de Gestão.
 *
 * Regra herdada do painel: sem dado da API, o campo mostra `—`. Nenhum número
 * estimado, nenhuma barra de largura fixa — este documento é institucional e
 * pode instruir decisão de guarda legal.
 */
export function RelatorioExecutivo({
  modo,
  usuario,
  stats,
  logs,
  usuarios,
  pacientes,
  agendamentos,
  evolucoes,
  cursoPainel,
  gestaoLabel,
  isPainelPsicologia,
  resumo,
}: RelatorioExecutivoProps) {
  const agora = new Date();
  const numeroDocumento =
    `REL-${agora.getFullYear()}-${doisDigitos(agora.getMonth() + 1)}-` +
    `${doisDigitos(agora.getDate())}-${doisDigitos(agora.getHours())}` +
    `${doisDigitos(agora.getMinutes())}`;

  const semRelatorio = !stats;

  const bloco = stats?.distribuicao_cursos?.[cursoPainel] as
    | Record<string, number>
    | undefined;

  const num = (chave: string): number | null => bloco?.[chave] ?? null;
  const textoNum = (chave: string): string => {
    const valor = num(chave);
    return valor === null ? '—' : numeroBR.format(valor);
  };

  const totalParticipacao =
    (num('prontuarios_submetidos') ?? 0) + (num('fichas_clinicas_totais') ?? 0);

  const pct = (chave: string): number => {
    const valor = num(chave);
    if (valor === null || totalParticipacao === 0) return 0;
    return Math.round((valor / totalParticipacao) * 100);
  };

  const menores = pacientes.filter((p) => p.ehMenor);
  const menoresComResponsavel = stats?.conformidade_legal?.pacientes_menores_com_responsavel ?? null;
  const pctMenores =
    menores.length === 0 || menoresComResponsavel === null
      ? null
      : Math.round((menoresComResponsavel / menores.length) * 100);

  const pacientesDoCurso = pacientes.filter(
    (p) => p.curso === cursoPainel || p.curso === 'ambos'
  );

  const usuariosOrdenados = [...usuarios].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR')
  );

  const faltas = agendamentos.filter((a) => a.status === 'FALTOU').length;

  return (
    <article className="text-slate-900">
      {/* Cabeçalho institucional */}
      <header className="relatorio-bloco border-b-[3px] border-[#FFD100] bg-[#002B49] px-6 py-5 text-white">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[8pt] font-bold uppercase tracking-[0.22em] text-[#FFD100]">
              UNINASSAU Aracaju
            </p>
            <h1 className="mt-1 text-[16pt] font-bold leading-tight">
              Painel Executivo de Gestão, Indicadores &amp; Custódia Legal
            </h1>
            <p className="mt-1 text-[8.5pt] text-slate-200">
              UniCare · Sistema Integrado de Saúde
              {isPainelPsicologia ? ' — Psicologia' : ' — Psicologia e Odontologia'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[7pt] uppercase tracking-[0.16em] text-slate-300">Documento</p>
            <p className="font-mono text-[10pt] font-bold">{numeroDocumento}</p>
            <p className="mt-1 text-[7.5pt] text-slate-300">Emitido em {agora.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </header>

      {/* Identificação do emitente */}
      <section className="relatorio-bloco mt-4 grid grid-cols-3 gap-x-5 gap-y-3 rounded border border-slate-200 bg-slate-50 px-4 py-3">
        <Campo
          rotulo="Emitido por"
          valor={usuario ? `${usuario.nome} (${usuario.matricula})` : '—'}
        />
        <Campo rotulo="Perfil emissor" valor={ROTULO_PERFIL[modo === 'coordenacao' ? 'coordenacao' : 'rt'] ?? '—'} />
        <Campo
          rotulo="Clínica"
          valor={isPainelPsicologia ? 'Psicologia' : 'Psicologia e Odontologia'}
        />
        <Campo
          rotulo="Fonte dos dados"
          valor="API /relatorios/estatisticas e /auditoria"
        />
        <Campo rotulo="Unidade" valor={stats?.resumo_executivo?.unidade ?? 'Aracaju'} />
        <Campo rotulo="Instituição" valor={stats?.resumo_executivo?.instituicao ?? 'UNINASSAU'} />
      </section>

      {semRelatorio && (
        <p className="relatorio-bloco mt-3 rounded border border-amber-300 bg-amber-50 px-4 py-2 text-[8pt] text-amber-900">
          <strong>Sem dado da API.</strong> O relatório de estatísticas não respondeu. Os
          indicadores marcados com “—” não foram calculados; os totais abaixo vêm dos
          registros já carregados na sessão, não de estimativa.
        </p>
      )}

      {/* 1. Resumo executivo */}
      <Secao numero="1" titulo="Resumo executivo">
        <div className="grid grid-cols-4 gap-3">
          <Indicador
            rotulo="Pacientes registrados"
            valor={numeroBR.format(resumo.totalPacientes)}
            detalhe="Cadastro único compartilhado"
            classeValor="text-blue-800"
            classeFundo="bg-blue-50/60"
          />
          <Indicador
            rotulo="Atendimentos totais"
            valor={numeroBR.format(resumo.totalAgendamentos)}
            detalhe={`Comparecimento: ${resumo.taxaComparecimento}%`}
            classeValor="text-emerald-800"
            classeFundo="bg-emerald-50/60"
          />
          <Indicador
            rotulo="Taxa de absenteísmo"
            valor={`${resumo.taxaAbsenteismo}%`}
            detalhe={`${faltas} falta(s) registrada(s) · tolerância < 15%`}
            classeValor="text-amber-800"
            classeFundo="bg-amber-50/60"
          />
          <Indicador
            rotulo="Fila docente"
            valor={textoNum('prontuarios_aguardando_visto')}
            detalhe="Prontuários aguardando visto"
            classeValor="text-indigo-800"
            classeFundo="bg-indigo-50/60"
          />
        </div>
      </Secao>

      {/* 2. Indicadores por clínica */}
      <Secao numero="2" titulo={`Indicadores assistenciais — ${ROTULO_CURSO[cursoPainel]}`}>
        <table className="text-[8.5pt]">
          <thead>
            <tr className="bg-slate-100 text-[7pt] uppercase tracking-wider text-slate-600">
              <th className="px-2 py-1.5 text-left font-bold">Indicador</th>
              <th className="px-2 py-1.5 text-right font-bold">Valor</th>
              <th className="w-[38%] px-2 py-1.5 text-left font-bold">Participação</th>
            </tr>
          </thead>
          <tbody className="text-slate-700">
            <tr className="border-b border-slate-200">
              <td className="px-2 py-1.5">Pacientes ativos na clínica</td>
              <td className="px-2 py-1.5 text-right font-mono font-semibold">{textoNum('pacientes_ativos')}</td>
              <td className="px-2 py-1.5 text-[7.5pt] text-slate-500">—</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="px-2 py-1.5">Atendimentos registrados</td>
              <td className="px-2 py-1.5 text-right font-mono font-semibold">{textoNum('agendamentos_totais')}</td>
              <td className="px-2 py-1.5 text-[7.5pt] text-slate-500">—</td>
            </tr>

            {cursoPainel === 'psicologia' ? (
              <>
                <tr className="border-b border-slate-200">
                  <td className="px-2 py-1.5">Prontuários submetidos</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold">{textoNum('prontuarios_submetidos')}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Barra percentual={pct('prontuarios_submetidos')} classe="bg-slate-700" />
                      <span className="w-8 text-right text-[7.5pt] text-slate-500">
                        {num('prontuarios_submetidos') === null ? '—' : `${pct('prontuarios_submetidos')}%`}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-2 py-1.5">Homologados com visto digital</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-emerald-800">{textoNum('prontuarios_validados')}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Barra percentual={pct('prontuarios_validados')} classe="bg-emerald-600" />
                      <span className="w-8 text-right text-[7.5pt] text-slate-500">
                        {num('prontuarios_validados') === null ? '—' : `${pct('prontuarios_validados')}%`}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-2 py-1.5">Aguardando parecer docente</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-indigo-800">{textoNum('prontuarios_aguardando_visto')}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Barra percentual={pct('prontuarios_aguardando_visto')} classe="bg-indigo-600" />
                      <span className="w-8 text-right text-[7.5pt] text-slate-500">
                        {num('prontuarios_aguardando_visto') === null ? '—' : `${pct('prontuarios_aguardando_visto')}%`}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="px-2 py-1.5">Devolvidos para ajuste</td>
                  <td className="px-2 py-1.5 text-right font-mono font-semibold text-amber-800">{textoNum('prontuarios_devolvidos')}</td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <Barra percentual={pct('prontuarios_devolvidos')} classe="bg-amber-500" />
                      <span className="w-8 text-right text-[7.5pt] text-slate-500">
                        {num('prontuarios_devolvidos') === null ? '—' : `${pct('prontuarios_devolvidos')}%`}
                      </span>
                    </div>
                  </td>
                </tr>
              </>
            ) : (
              <tr className="border-b border-slate-200">
                <td className="px-2 py-1.5">Fichas odontológicas totais</td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold">{textoNum('fichas_clinicas_totais')}</td>
                <td className="px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <Barra percentual={pct('fichas_clinicas_totais')} classe="bg-blue-700" />
                    <span className="w-8 text-right text-[7.5pt] text-slate-500">
                      {num('fichas_clinicas_totais') === null ? '—' : `${pct('fichas_clinicas_totais')}%`}
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-[7pt] text-slate-500">
          A participação é calculada sobre o total de registros da própria clínica
          ({numeroBR.format(totalParticipacao)}). Sem base de cálculo, a coluna mostra “—”.
        </p>
      </Secao>

      {/* 3. Conformidade legal */}
      <Secao numero="3" titulo="Conformidade legal (LGPD Art. 11)">
        <div className="grid grid-cols-3 gap-3">
          <div className="relatorio-bloco rounded border border-slate-200 px-3 py-2.5">
            <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-500">
              Menores com responsável
            </p>
            <p className="mt-1 font-mono text-[14pt] font-bold text-slate-900">
              {menoresComResponsavel === null ? '—' : numeroBR.format(menoresComResponsavel)}
              <span className="text-[9pt] font-semibold text-slate-500">
                {' / '}
                {numeroBR.format(menores.length)}
              </span>
            </p>
            <div className="mt-1.5">
              <Barra percentual={pctMenores ?? 0} classe="bg-emerald-600" />
            </div>
          </div>
          <div className="relatorio-bloco rounded border border-slate-200 px-3 py-2.5">
            <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-500">
              Registros na trilha de auditoria
            </p>
            <p className="mt-1 font-mono text-[14pt] font-bold text-slate-900">
              {stats?.conformidade_legal?.total_logs_rastreados_lgpd === undefined
                ? '—'
                : numeroBR.format(stats.conformidade_legal.total_logs_rastreados_lgpd)}
            </p>
            <p className="mt-1.5 text-[7.5pt] text-slate-500">
              {logs.length} registro(s) listados neste documento
            </p>
          </div>
          <div className="relatorio-bloco rounded border border-slate-200 px-3 py-2.5">
            <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-500">
              Normas atendidas
            </p>
            <p className="mt-1 text-[8pt] font-semibold text-slate-800">
              {stats?.conformidade_legal?.normas_atendidas?.length
                ? stats.conformidade_legal.normas_atendidas.join(' · ')
                : '—'}
            </p>
          </div>
        </div>
      </Secao>

      {/* 4. Custódia — resumo */}
      <Secao numero="4" titulo="Custódia legal — resumo de prontuários">
        {pacientesDoCurso.length === 0 ? (
          <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[8pt] italic text-slate-500">
            Nenhum paciente vinculado à clínica de {ROTULO_CURSO[cursoPainel]}.
          </p>
        ) : (
          <table className="text-[8pt]">
            <thead>
              <tr className="bg-slate-100 text-[7pt] uppercase tracking-wider text-slate-600">
                <th className="px-2 py-1.5 text-left font-bold">Paciente</th>
                <th className="px-2 py-1.5 text-left font-bold">Clínica</th>
                <th className="px-2 py-1.5 text-left font-bold">Nascimento</th>
                <th className="px-2 py-1.5 text-right font-bold">Sessões</th>
                <th className="px-2 py-1.5 text-left font-bold">Prontuário</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {pacientesDoCurso.map((p) => (
                <tr key={p.id} className="border-b border-slate-200">
                  <td className="px-2 py-1.5 font-semibold text-slate-900">{p.nome}</td>
                  <td className="px-2 py-1.5">{ROTULO_CURSO[p.curso] ?? p.curso}</td>
                  <td className="px-2 py-1.5 font-mono">{formatarData(p.dataNascimento)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">
                    {evolucoes.filter((e) => e.pacienteId === p.id).length}
                  </td>
                  <td className="px-2 py-1.5">
                    {p.prontuarioAtivo ? 'Ativo em tratamento' : 'Encerrado'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[7pt] text-slate-500">
          Este resumo não inclui CPF nem conteúdo clínico. O dossiê completo é emitido
          pela aba <strong>Custódia</strong>, para um paciente por vez.
        </p>
      </Secao>

      {/* 5. Auditoria */}
      <Secao numero="5" titulo="Trilha de auditoria (LGPD Art. 11)">
        {logs.length === 0 ? (
          <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[8pt] italic text-slate-500">
            Nenhum registro de auditoria retornado pela API.
          </p>
        ) : (
          <table className="text-[7.5pt]">
            <thead>
              <tr className="bg-slate-100 text-[6.5pt] uppercase tracking-wider text-slate-600">
                <th className="w-[14%] px-2 py-1.5 text-left font-bold">Data / hora</th>
                <th className="w-[24%] px-2 py-1.5 text-left font-bold">Usuário</th>
                <th className="w-[28%] px-2 py-1.5 text-left font-bold">Ação</th>
                <th className="w-[18%] px-2 py-1.5 text-left font-bold">Módulo</th>
                <th className="w-[8%] px-2 py-1.5 text-right font-bold">Registro</th>
                <th className="w-[8%] px-2 py-1.5 text-left font-bold">IP</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {logs.map((log) => {
                const quando = partesDataHora(log.timestamp);
                return (
                  <tr key={log.id} className="border-b border-slate-200 leading-tight">
                    <td className="whitespace-nowrap px-2 py-1 font-mono text-[7pt] text-slate-500">
                      {quando.data}
                      {quando.hora && (
                        <>
                          <br />
                          <span className="text-[6.5pt] text-slate-400">{quando.hora}</span>
                        </>
                      )}
                    </td>
                    <td className="px-2 py-1 font-semibold text-slate-900">{log.usuario_nome}</td>
                    <td className="px-2 py-1 font-mono text-[6.8pt]">{log.acao}</td>
                    <td className="px-2 py-1 font-mono text-slate-600">{log.tabela_afetada}</td>
                    <td className="px-2 py-1 text-right font-mono text-slate-500">
                      {log.registro_id ?? '—'}
                    </td>
                    <td className="px-2 py-1 font-mono text-slate-500">
                      {log.endereco_ip || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Secao>

      {/* 6. Usuários RBAC */}
      <Secao numero="6" titulo="Usuários e perfis de acesso (RBAC)">
        {usuariosOrdenados.length === 0 ? (
          <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[8pt] italic text-slate-500">
            Nenhum usuário carregado na sessão.
          </p>
        ) : (
          <table className="text-[8pt]">
            <thead>
              <tr className="bg-slate-100 text-[7pt] uppercase tracking-wider text-slate-600">
                <th className="px-2 py-1.5 text-left font-bold">Nome</th>
                <th className="px-2 py-1.5 text-left font-bold">Matrícula</th>
                <th className="px-2 py-1.5 text-left font-bold">Perfil</th>
                <th className="px-2 py-1.5 text-left font-bold">Clínica</th>
                <th className="px-2 py-1.5 text-left font-bold">Registro</th>
                <th className="px-2 py-1.5 text-left font-bold">Acesso</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {usuariosOrdenados.map((u) => (
                <tr key={u.id} className="border-b border-slate-200">
                  <td className="px-2 py-1.5 font-semibold text-slate-900">{u.nome}</td>
                  <td className="px-2 py-1.5 font-mono">{u.matricula}</td>
                  <td className="px-2 py-1.5">{ROTULO_PERFIL[u.perfil] ?? u.perfil}</td>
                  <td className="px-2 py-1.5">{ROTULO_CURSO[u.curso] ?? u.curso}</td>
                  <td className="px-2 py-1.5 font-mono">{u.registro_profissional || '—'}</td>
                  <td className="px-2 py-1.5">{u.ativo ? 'Habilitado' : 'Desativado'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[7pt] text-slate-500">
          A senha nunca é exibida: o banco guarda apenas o hash e ele não sai pela API.
        </p>
      </Secao>

      {/* Encerramento */}
      <section className="relatorio-bloco mt-8 border-t border-slate-300 pt-4">
        <p className="text-[7.5pt] leading-relaxed text-slate-500">
          Documento gerado automaticamente pelo UniCare a partir dos dados da API no
          momento da emissão. A trilha de auditoria é a fonte de rastreabilidade
          (LGPD Art. 11) e a guarda dos prontuários é de 20 anos, sob responsabilidade
          da {gestaoLabel}.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-10 text-[8pt]">
          <div>
            <div className="border-t border-slate-400 pt-1">
              <p className="font-semibold text-slate-900">{usuario?.nome ?? '—'}</p>
              <p className="text-[7pt] text-slate-500">
                {usuario ? `${usuario.matricula} · ${ROTULO_PERFIL[usuario.perfil] ?? usuario.perfil}` : 'Emissor'}
              </p>
            </div>
          </div>
          <div>
            <div className="border-t border-slate-400 pt-1">
              <p className="font-semibold text-slate-900">{gestaoLabel}</p>
              <p className="text-[7pt] text-slate-500">Ciência e guarda institucional</p>
            </div>
          </div>
        </div>

        <p className="mt-4 font-mono text-[7pt] text-slate-400">
          {numeroDocumento} · emitido em {agora.toLocaleString('pt-BR')}
        </p>
      </section>
    </article>
  );
}
