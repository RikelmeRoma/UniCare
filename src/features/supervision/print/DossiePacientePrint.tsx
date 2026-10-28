import type { ApiRadiografiaOdonto } from '../../../services/api';
import type {
  DocumentoFichaOdonto,
  EvolucaoPsico,
  ItemPlanoTratamento,
  Paciente,
} from '../../clinic/context/ClinicContext';
import {
  FichaOdontoAdultoPrint,
  FichaOdontoInfantilPrint,
} from '../../dental-record/components/FichaOdontoPrint';
import type { AnamneseCliFor45 } from '../../dental-record/anamnese/tipos';
import type { AnamneseInfantil } from '../../dental-record/anamnese-infantil/tipos';
import { criarAnamneseVazia } from '../../dental-record/anamnese/estado';
import { criarAnamneseInfantilVazia } from '../../dental-record/anamnese-infantil/estado';
import type { TeethMap } from '../../dental-record/components/OdontogramaViewer';
import type { ToothMap as PeriogramaToothMap } from '../../dental-record/components/PeriogramaViewer';
import type { IndicesGengivais } from '../../dental-record/indices/tipos';

interface DossiePacientePrintProps {
  paciente: Paciente;
  curso: 'psicologia' | 'odontologia';
  evolucoes: EvolucaoPsico[];
  planos: ItemPlanoTratamento[];
  documento: DocumentoFichaOdonto | null;
  radiografias: ApiRadiografiaOdonto[];
}

const formatarData = (valor?: string | null) => {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString('pt-BR');
};

const formatarDataHora = (valor?: string | null) => {
  if (!valor) return '—';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const rotuloStatus = (status?: string | null) => {
  switch (status) {
    case 'VALIDADO':
      return 'Validado com visto digital';
    case 'AGUARDANDO_VALIDACAO':
      return 'Aguardando visto docente';
    case 'DEVOLVIDO_PARA_AJUSTE':
      return 'Devolvido para ajuste';
    default:
      return 'Em elaboração';
  }
};

export function DossiePacientePrint({
  paciente,
  curso,
  evolucoes,
  planos,
  documento,
  radiografias,
}: DossiePacientePrintProps) {
  const conteudo = documento?.conteudo ?? {};
  const tipoDocumento = documento?.tipo === 'infantil' ? 'infantil' : 'adulto';
  const anamnese = (conteudo.anamnese ?? null) as AnamneseCliFor45 | null;
  const anamneseInfantil = (conteudo.anamnese ?? null) as AnamneseInfantil | null;
  const odontograma = (conteudo.odontograma ?? null) as TeethMap | null;
  const periograma = (conteudo.periograma ?? null) as PeriogramaToothMap | null;
  const indices = (conteudo.indicesGengivais ?? null) as IndicesGengivais | null;

  return (
    <div id="rt-print" className="bg-white text-slate-900 font-sans text-[11px] leading-relaxed">
      <header className="border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              UNINASSAU Aracaju • Sistema Integrado de Saúde Hospitalar
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
              Dossiê do Paciente
            </h1>
            <p className="mt-1 text-[11px] text-slate-600">
              {paciente.nome} • {curso === 'psicologia' ? 'Psicologia (SPA)' : 'Odontologia Integrada'}
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

      <section className="print-section">
        <h2 className="mb-3 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
          1. Identificação
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <p><strong>Nome:</strong> {paciente.nome}</p>
          <p><strong>CPF:</strong> {paciente.cpf || '—'}</p>
          <p><strong>Nascimento:</strong> {formatarData(paciente.dataNascimento)}</p>
          <p><strong>Telefone:</strong> {paciente.telefone || '—'}</p>
          <p><strong>Clínica:</strong> {paciente.curso}</p>
          <p><strong>Prontuário ativo:</strong> {paciente.prontuarioAtivo ? 'Sim' : 'Não'}</p>
          {paciente.ehMenor && (
            <>
              <p><strong>Responsável legal:</strong> {paciente.nomeResponsavel || '—'}</p>
              <p><strong>Contato do responsável:</strong> {paciente.contatoResponsavel || '—'}</p>
            </>
          )}
        </div>
      </section>

      {curso === 'odontologia' && (
        <>
          <section className="print-section">
            <h2 className="mb-3 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
              2. Ficha clínica odontológica
            </h2>
            {documento ? (
              <>
                <p className="mb-3 text-[10px] text-slate-600">
                  Tipo: {tipoDocumento === 'infantil' ? 'Odontopediatria' : 'Adulto'} •
                  Versão {documento.versao} • {rotuloStatus(documento.status)} •
                  Atualizada em {formatarDataHora(documento.atualizadoEm)}
                </p>
                {documento.parecerSupervisor && (
                  <p className="mb-3 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                    <strong>Parecer da supervisão:</strong> {documento.parecerSupervisor}
                  </p>
                )}
                {tipoDocumento === 'infantil' ? (
                  <FichaOdontoInfantilPrint
                    paciente={paciente}
                    documento={documento}
                    dados={anamneseInfantil ?? criarAnamneseInfantilVazia(paciente)}
                    containerId="dossie-ficha-odonto"
                  />
                ) : (
                  <FichaOdontoAdultoPrint
                    paciente={paciente}
                    documento={documento}
                    dados={anamnese ?? criarAnamneseVazia(paciente)}
                    odontograma={odontograma}
                    periograma={periograma}
                    indices={indices}
                    containerId="dossie-ficha-odonto"
                  />
                )}
              </>
            ) : (
              <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 font-semibold text-amber-900">
                Paciente sem ficha clínica odontológica enviada até o momento.
              </p>
            )}
          </section>

          <section className="print-section">
            <h2 className="mb-3 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
              3. Procedimentos registrados
            </h2>
            {planos.length ? (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] uppercase tracking-wider text-slate-500">
                    <th className="py-1.5 pr-3 font-bold">Fase</th>
                    <th className="py-1.5 pr-3 font-bold">Dente/região</th>
                    <th className="py-1.5 pr-3 font-bold">Procedimento</th>
                    <th className="py-1.5 pr-3 font-bold">Status</th>
                    <th className="py-1.5 font-bold">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {planos.map((item) => (
                    <tr key={item.id}>
                      <td className="py-1.5 pr-3">{item.prioridade}</td>
                      <td className="py-1.5 pr-3">{item.denteRegiao || '—'}</td>
                      <td className="py-1.5 pr-3">{item.procedimento || '—'}</td>
                      <td className="py-1.5 pr-3">{item.status}</td>
                      <td className="py-1.5">{item.estagiarioResponsavel || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-slate-600">Nenhum procedimento registrado para este paciente.</p>
            )}
          </section>

          <section className="print-section">
            <h2 className="mb-3 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
              4. Exames de imagem
            </h2>
            {radiografias.length ? (
              <div className="space-y-3">
                {radiografias.map((item) => (
                  <div key={item.id} className="rounded border border-slate-200 p-2.5">
                    <p className="font-bold text-slate-900">
                      {item.tipo} • {formatarDataHora(item.criado_em)}
                    </p>
                    <p className="text-[10px] text-slate-600">
                      Dupla: {item.dupla_estagiarios || '—'} • Status: {item.status}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap">{item.laudo || 'Sem laudo descritivo.'}</p>
                    {item.imagem_data && item.imagem_mime?.startsWith('image/') && (
                      <img
                        src={item.imagem_data}
                        alt={`Exame ${item.tipo}`}
                        className="mt-2 max-h-52 max-w-full rounded border border-slate-200 object-contain"
                      />
                    )}
                    {item.imagem_nome && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Arquivo: {item.imagem_nome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-600">Nenhum exame de imagem registrado para este paciente.</p>
            )}
          </section>
        </>
      )}

      {curso === 'psicologia' && (
        <section className="print-section">
          <h2 className="mb-3 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
            2. Evoluções clínicas
          </h2>
          {evolucoes.length ? (
            <div className="space-y-4">
              {evolucoes.map((evolucao) => (
                <article key={evolucao.id} className="rounded border border-slate-200 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-bold text-slate-900">
                      Sessão {evolucao.numeroSessao || '—'} • {formatarData(evolucao.dataSessao)}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      {rotuloStatus(evolucao.status)}
                    </p>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-600">
                    Estagiário: {evolucao.estagiarioNome} ({evolucao.estagiarioMatricula}) •
                    Supervisor: {evolucao.supervisorNome || '—'}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap">{evolucao.redacaoTexto || '—'}</p>
                  {evolucao.parecerSupervisor && (
                    <p className="mt-2 rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                      <strong>Parecer da supervisão:</strong> {evolucao.parecerSupervisor}
                    </p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-slate-600">Nenhuma evolução clínica registrada para este paciente.</p>
          )}
        </section>
      )}

      <footer className="mt-6 border-t border-slate-300 pt-3 text-[10px] text-slate-500">
        Documento gerado pelo UniCare a partir dos registros do banco de dados.
        A autenticidade deve ser conferida na trilha de auditoria institucional.
      </footer>
    </div>
  );
}
