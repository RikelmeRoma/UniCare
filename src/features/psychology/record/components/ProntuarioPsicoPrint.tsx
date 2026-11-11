import type { EvolucaoPsico, Paciente } from '../../../clinic/context/ClinicContext';
import {
  calcularIdade,
  formatarDataBr,
  META_TIPO_REGISTRO_PSICO,
  MOTIVOS_ENCERRAMENTO_PSICO,
} from '../../constants/psico';

interface ProntuarioPsicoPrintProps {
  paciente: Paciente;
  registros: EvolucaoPsico[];
  estagiarioResponsavel?: string;
  supervisorExibicao?: string;
}

const ROTULO_STATUS: Record<string, string> = {
  VALIDADO: 'Homologado',
  AGUARDANDO_VALIDACAO: 'Aguardando Visto',
  DEVOLVIDO_PARA_AJUSTE: 'Devolvido para Ajuste',
  EM_ELABORACAO: 'Em Elaboração',
};

/**
 * Documento A4 de impressão / exportação em PDF do Prontuário Psicológico (UNINASSAU-AJU).
 * Renderiza Demanda, Sessões Clínicas e Encerramento em ordem cronológica com campos de assinatura.
 */
export function ProntuarioPsicoPrint({
  paciente,
  registros,
  estagiarioResponsavel,
  supervisorExibicao,
}: ProntuarioPsicoPrintProps) {
  const ultimoEstagiario =
    registros.find((r) => r.estagiarioNome)?.estagiarioNome || estagiarioResponsavel || '—';
  const ultimoSupervisor =
    registros.find((r) => r.supervisorNome)?.supervisorNome || supervisorExibicao || '';

  return (
    <article className="text-slate-900 text-[9.5pt] leading-relaxed">
      {/* Cabeçalho institucional fiel às fichas do SPA UNINASSAU-AJU */}
      <header className="text-center pb-3 mb-4 border-b-2 border-slate-900">
        <h1 className="text-[16pt] font-bold tracking-tight text-slate-950">
          Prontuário Psicológico
        </h1>
        <p className="text-[10.5pt] font-semibold text-slate-800">
          Estágio Supervisionado Psicologia
        </p>
        <p className="text-[10pt] font-bold tracking-wider text-slate-700">UNINASSAU-AJU</p>
      </header>

      {/* Tabela cadastral (Cliente / Nascimento / Estagiário / Idade / Responsável / CPF) */}
      <table className="w-full border-collapse border border-slate-800 text-[9pt] mb-5">
        <tbody>
          <tr className="border-b border-slate-800">
            <td className="w-[15%] font-semibold bg-slate-50 px-2.5 py-1.5 border-r border-slate-800">
              Cliente:
            </td>
            <td className="w-[47%] px-2.5 py-1.5 border-r border-slate-800 font-medium">
              {paciente.nome}
            </td>
            <td className="w-[16%] font-semibold bg-slate-50 px-2.5 py-1.5 border-r border-slate-800">
              Nascimento:
            </td>
            <td className="w-[22%] px-2.5 py-1.5 font-mono">
              {formatarDataBr(paciente.dataNascimento)}
            </td>
          </tr>
          <tr className="border-b border-slate-800">
            <td className="font-semibold bg-slate-50 px-2.5 py-1.5 border-r border-slate-800">
              Estagiário:
            </td>
            <td className="px-2.5 py-1.5 border-r border-slate-800">{ultimoEstagiario}</td>
            <td className="font-semibold bg-slate-50 px-2.5 py-1.5 border-r border-slate-800">
              Idade:
            </td>
            <td className="px-2.5 py-1.5">{calcularIdade(paciente.dataNascimento)}</td>
          </tr>
          <tr>
            <td className="font-semibold bg-slate-50 px-2.5 py-1.5 border-r border-slate-800">
              Responsável:
            </td>
            <td className="px-2.5 py-1.5 border-r border-slate-800">
              {paciente.ehMenor
                ? paciente.nomeResponsavel || 'Não informado'
                : paciente.nomeResponsavel || 'Não aplicável'}
            </td>
            <td className="font-semibold bg-slate-50 px-2.5 py-1.5 border-r border-slate-800">
              CPF:
            </td>
            <td className="px-2.5 py-1.5 font-mono">{paciente.cpf || '—'}</td>
          </tr>
        </tbody>
      </table>

      {/* Registros cronológicos (Demanda, Sessões Clínicas e Encerramento) */}
      {registros.length === 0 ? (
        <div className="border border-slate-400 p-4 text-center text-[9pt] text-slate-600 mb-6">
          Nenhum registro clínico submetido para este paciente até a data de emissão.
        </div>
      ) : (
        <div className="space-y-4">
          {registros.map((reg) => {
            const meta = META_TIPO_REGISTRO_PSICO[reg.tipoRegistro] ?? META_TIPO_REGISTRO_PSICO.SESSAO;
            const est = (reg.conteudoEstruturado ?? {}) as Record<string, unknown>;

            if (reg.tipoRegistro === 'DEMANDA') {
              const avDemanda =
                typeof est.avaliacao_demanda === 'string'
                  ? est.avaliacao_demanda
                  : reg.redacaoTexto;
              const objInterv =
                typeof est.objetivos_intervencao === 'string' ? est.objetivos_intervencao : '';
              const hipDiag =
                typeof est.hipotese_diagnostica === 'string' ? est.hipotese_diagnostica : '';

              return (
                <section
                  key={reg.id}
                  className="relatorio-bloco border border-slate-800 rounded-sm overflow-hidden"
                >
                  <div className="bg-slate-100 border-b border-slate-800 px-3 py-1.5 flex justify-between items-center text-[8.5pt]">
                    <span className="font-bold uppercase tracking-wide">
                      {meta.titulo} · {reg.dataSessao}
                    </span>
                    <span className="font-mono text-slate-700">
                      {ROTULO_STATUS[reg.status] ?? reg.status}
                    </span>
                  </div>

                  <div className="p-3 border-b border-slate-300">
                    <p className="font-bold text-[9pt] mb-1">Avaliação da Demanda ou Queixa:</p>
                    <p className="whitespace-pre-line min-h-[3.5rem]">{avDemanda}</p>
                  </div>

                  {objInterv && (
                    <div className="p-3 border-b border-slate-300">
                      <p className="font-bold text-[9pt] mb-1">
                        Definição dos Objetivos da Intervenção:
                      </p>
                      <p className="whitespace-pre-line min-h-[3.5rem]">{objInterv}</p>
                    </div>
                  )}

                  {hipDiag && (
                    <div className="p-3">
                      <p className="font-bold text-[9pt] mb-1">Hipótese Diagnóstica Inicial:</p>
                      <p className="whitespace-pre-line min-h-[3rem]">{hipDiag}</p>
                    </div>
                  )}

                  {reg.parecerSupervisor && (
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-300 text-[8.5pt]">
                      <strong>Parecer da Supervisão ({reg.supervisorNome || 'Docente'}):</strong>{' '}
                      {reg.parecerSupervisor}
                    </div>
                  )}
                </section>
              );
            }

            if (reg.tipoRegistro === 'ENCERRAMENTO') {
              const avFinal =
                typeof est.avaliacao_final === 'string' ? est.avaliacao_final : reg.redacaoTexto;
              const motivosMarcados = Array.isArray(est.motivos_encerramento)
                ? est.motivos_encerramento.map(String)
                : [];
              const infoExtra =
                typeof est.informacoes_adicionais === 'string' ? est.informacoes_adicionais : '';

              return (
                <section
                  key={reg.id}
                  className="relatorio-bloco border border-slate-800 rounded-sm overflow-hidden"
                >
                  <div className="bg-slate-100 border-b border-slate-800 px-3 py-1.5 flex justify-between items-center text-[8.5pt]">
                    <span className="font-bold uppercase tracking-wide">
                      {meta.titulo} · {reg.dataSessao}
                    </span>
                    <span className="font-mono text-slate-700">
                      {ROTULO_STATUS[reg.status] ?? reg.status}
                    </span>
                  </div>

                  <div className="p-3 border-b border-slate-300">
                    <p className="font-bold text-[9pt] mb-1">Avaliação Final do Caso:</p>
                    <p className="whitespace-pre-line min-h-[3.5rem]">{avFinal}</p>
                  </div>

                  <div className="p-3 border-b border-slate-300">
                    <p className="font-bold text-[9pt] mb-2">Registro de Encerramento</p>
                    <div className="grid grid-cols-2 border-t border-l border-slate-800 text-[8.5pt]">
                      {MOTIVOS_ENCERRAMENTO_PSICO.map((motivo) => {
                        const marcado = motivosMarcados.includes(motivo);
                        return (
                          <div
                            key={motivo}
                            className="flex items-center border-r border-b border-slate-800"
                          >
                            <span className="w-7 h-7 flex items-center justify-center border-r border-slate-800 font-bold text-[10pt] shrink-0">
                              {marcado ? 'X' : ''}
                            </span>
                            <span className="px-2 py-1">{motivo}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="font-bold text-[9pt] mb-1">Informações Adicionais:</p>
                    <p className="whitespace-pre-line min-h-[2.5rem]">
                      {infoExtra || 'Sem informações adicionais.'}
                    </p>
                  </div>

                  {reg.parecerSupervisor && (
                    <div className="px-3 py-2 bg-slate-50 border-t border-slate-300 text-[8.5pt]">
                      <strong>Parecer da Supervisão ({reg.supervisorNome || 'Docente'}):</strong>{' '}
                      {reg.parecerSupervisor}
                    </div>
                  )}
                </section>
              );
            }

            return (
              <section
                key={reg.id}
                className="relatorio-bloco border border-slate-800 rounded-sm overflow-hidden"
              >
                <div className="bg-slate-100 border-b border-slate-800 px-3 py-1.5 flex justify-between items-center text-[8.5pt]">
                  <span className="font-bold">
                    {reg.numeroSessao} · Data: {reg.dataSessao} · Estagiário: {reg.estagiarioNome} (
                    {reg.estagiarioMatricula})
                  </span>
                  <span className="font-mono text-slate-700">
                    {ROTULO_STATUS[reg.status] ?? reg.status}
                  </span>
                </div>
                <div className="p-3">
                  <p className="whitespace-pre-line">{reg.redacaoTexto}</p>
                </div>
                {reg.parecerSupervisor && (
                  <div className="px-3 py-2 bg-slate-50 border-t border-slate-300 text-[8.5pt]">
                    <strong>Parecer da Supervisão ({reg.supervisorNome || 'Docente'}):</strong>{' '}
                    {reg.parecerSupervisor}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Campos obrigatórios de assinatura física / institucional */}
      <footer className="relatorio-bloco mt-10 pt-6 grid grid-cols-2 gap-12 text-center">
        <div>
          <div className="border-t border-slate-900 pt-1.5 mx-2">
            <p className="text-[9pt] font-semibold">Assinatura Estagiário</p>
            <p className="text-[7.5pt] text-slate-500 mt-0.5">{ultimoEstagiario}</p>
          </div>
        </div>
        <div>
          <div className="border-t border-slate-900 pt-1.5 mx-2">
            <p className="text-[9pt] font-semibold">Assinatura Supervisão</p>
            <p className="text-[7.5pt] text-slate-500 mt-0.5">
              {ultimoSupervisor || 'Orientação Docente / CRP'}
            </p>
          </div>
        </div>
      </footer>
    </article>
  );
}
