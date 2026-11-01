import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type {
  Anamnese,
  DocumentoFichaOdonto,
  Paciente,
} from '../../clinic/context/ClinicContext';
import type { AnamneseCliFor45, ExameDental } from '../anamnese/tipos';
import type { AnamneseInfantil } from '../anamnese-infantil/tipos';
import { calcularIdade } from '../anamnese/estado';
import { calcularIdadeInfantil } from '../anamnese-infantil/estado';
import { Pagina1IdentificacaoHistoria } from '../anamnese/Pagina1IdentificacaoHistoria';
import { Pagina2ExameFisico } from '../anamnese/Pagina2ExameFisico';
import {
  EvolucaoAdultoSection,
  TermoAutorizacaoSection,
  TratamentoProgramadoSection,
} from '../anamnese/Pagina3DentesPlano';
import { Pagina1IdentificacaoPsicologica } from '../anamnese-infantil/Pagina1IdentificacaoPsicologica';
import { Pagina2AntecedentesHabitos } from '../anamnese-infantil/Pagina2AntecedentesHabitos';
import { Pagina3ExameFisicoOclusao } from '../anamnese-infantil/Pagina3ExameFisicoOclusao';
import { DiarioAlimentarSection } from '../anamnese-infantil/Pagina4HigieneOdontograma';
import { Pagina5PlanoTratamento } from '../anamnese-infantil/Pagina5PlanoTratamento';
import {
  EvolucaoInfantilSection,
  TermoInfantilSection,
} from '../anamnese-infantil/Pagina6EvolucaoTermo';
import { MapaHigieneInfantil } from '../anamnese-infantil/MapaHigieneInfantil';
import { OdontogramaInfantil } from '../anamnese-infantil/OdontogramaInfantil';
import OdontogramApp, { type TeethMap } from './OdontogramaViewer';
import Periograma, { type ToothMap as PeriogramaToothMap } from './PeriogramaViewer';
import { IndicesGengivaisCard } from '../indices/IndicesGengivaisCard';
import { criarIndicesVazios } from '../indices/estado';
import type { IndicesGengivais } from '../indices/tipos';
import { AdultAlertsTab } from '../tabs/AdultAlertsTab';
import { ChildAlertsTab } from '../tabs/ChildAlertsTab';

const ROTULOS_STATUS: Record<string, string> = {
  EM_ELABORACAO: 'Em elaboração',
  AGUARDANDO_VALIDACAO: 'Aguardando validação da supervisão',
  VALIDADO: 'Homologada pela supervisão',
  DEVOLVIDO_PARA_AJUSTE: 'Devolvida para ajuste',
};

const semAlteracaoAdulto: Dispatch<SetStateAction<AnamneseCliFor45>> = () => {};
const semAlteracaoInfantil: Dispatch<SetStateAction<AnamneseInfantil>> = () => {};

function formatarData(valor?: string | null): string {
  if (!valor) return '—';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return valor;
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-500">
        {rotulo}
      </p>
      <p className="text-[8.5pt] font-semibold text-slate-900">{valor}</p>
    </div>
  );
}

interface CabecalhoProps {
  titulo: string;
  paciente?: Paciente;
  documento?: DocumentoFichaOdonto | null;
  idade?: string;
}

/**
 * Cabeçalho institucional do documento.
 *
 * Mesmo desenho do dossiê de custódia: faixa navy com filete amarelo, emissor
 * à esquerda e registro à direita. O número não é um id de banco exposto — é o
 * identificador do documento impresso, formado pelo ano e pelo paciente.
 */
function CabecalhoFicha({ titulo, paciente, documento, idade }: CabecalhoProps) {
  const agora = new Date();
  const numeroDocumento = `FICHA-${agora.getFullYear()}-${String(paciente?.id ?? 0).padStart(4, '0')}`;

  return (
    <header className="relatorio-bloco border-b-[3px] border-[#FFD100] bg-[#002B49] px-6 py-5 text-white">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[8pt] font-bold uppercase tracking-[0.22em] text-[#FFD100]">
            UNINASSAU Aracaju
          </p>
          <h1 className="mt-1 text-[16pt] font-bold leading-tight">{titulo}</h1>
          <p className="mt-1 text-[8.5pt] text-slate-200">
            UniCare · Clínica Odontológica Integrada
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[7pt] uppercase tracking-[0.16em] text-slate-300">
            Registro da ficha
          </p>
          <p className="font-mono text-[10pt] font-bold">{numeroDocumento}</p>
          <p className="mt-1 text-[7.5pt] text-slate-300">
            Emitido em {agora.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-x-5 gap-y-3">
        <div>
          <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-300">Paciente</p>
          <p className="text-[8.5pt] font-semibold text-white">
            {paciente?.nome ?? 'Não selecionado'}
          </p>
        </div>
        <div>
          <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-300">CPF</p>
          <p className="text-[8.5pt] font-semibold text-white">
            {paciente?.cpf || 'Não informado'}
          </p>
        </div>
        <div>
          <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-300">Nascimento</p>
          <p className="text-[8.5pt] font-semibold text-white">
            {formatarData(paciente?.dataNascimento)}
          </p>
        </div>
        <div>
          <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-300">Idade</p>
          <p className="text-[8.5pt] font-semibold text-white">
            {idade ? `${idade} anos` : 'Não informada'}
          </p>
        </div>
        <div>
          <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-300">Dupla</p>
          <p className="text-[8.5pt] font-semibold text-white">
            {documento?.duplaEstagiarios || 'Não informada'}
          </p>
        </div>
        <div>
          <p className="text-[7pt] font-bold uppercase tracking-wider text-slate-300">Supervisão</p>
          <p className="text-[8.5pt] font-semibold text-white">
            {documento?.supervisorNome || 'Não informada'}
          </p>
        </div>
      </div>
    </header>
  );
}

function SituacaoDaFicha({ documento }: { documento?: DocumentoFichaOdonto | null }) {
  return (
    <section className="relatorio-bloco mt-4 rounded border border-slate-200 bg-slate-50 px-4 py-3">
      <h2 className="text-[9pt] font-bold uppercase tracking-wide text-[#002B49]">
        Situação do documento
      </h2>
      <div className="mt-2 grid grid-cols-3 gap-x-5 gap-y-3">
        <Campo
          rotulo="Status"
          valor={
            documento
              ? ROTULOS_STATUS[documento.status] ?? documento.status
              : 'Ainda não enviada à supervisão'
          }
        />
        <Campo rotulo="Versão" valor={documento ? String(documento.versao) : '—'} />
        <Campo
          rotulo="Homologação"
          valor={documento?.parecerSupervisor ? 'Com parecer registrado' : 'Sem parecer'}
        />
      </div>
      {documento?.parecerSupervisor && (
        <p className="mt-3 border-t border-slate-200 pt-2 text-[8pt] leading-relaxed text-slate-700">
          <strong>Parecer da supervisão:</strong> {documento.parecerSupervisor}
        </p>
      )}
    </section>
  );
}

function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="relatorio-bloco mt-5">
      <h2 className="mb-3 border-b border-slate-300 pb-1 text-[10pt] font-bold uppercase tracking-wide text-[#002B49]">
        {numero}. {titulo}
      </h2>
      {children}
    </section>
  );
}

function ExamesComplementaresPrint({ exameDental }: { exameDental: ExameDental }) {
  return (
    <div className="rounded border border-slate-200 px-4 py-3 text-[8.5pt] space-y-2">
      <p>
        <strong>Hematológico:</strong> {exameDental.exames.hematologico || 'Não informado'}
      </p>
      <p>
        <strong>Outros exames:</strong> {exameDental.exames.outros || 'Não informado'}
      </p>
    </div>
  );
}

/** Fecho do documento: quem responde pela ficha e pelo caso. */
function Assinaturas({ documento }: { documento?: DocumentoFichaOdonto | null }) {
  return (
    <section className="relatorio-bloco mt-8 grid grid-cols-2 gap-10 text-[8pt]">
      <div>
        <div className="border-t border-slate-400 pt-1">
          <p className="font-semibold text-slate-900">
            {documento?.duplaEstagiarios || 'Estagiário(a) responsável'}
          </p>
          <p className="text-[7pt] text-slate-500">Dupla de estagiários · Clínica Odontológica</p>
        </div>
      </div>
      <div>
        <div className="border-t border-slate-400 pt-1">
          <p className="font-semibold text-slate-900">
            {documento?.supervisorNome || 'Supervisor(a) docente'}
          </p>
          <p className="text-[7pt] text-slate-500">Supervisão docente</p>
        </div>
      </div>
    </section>
  );
}

function Rodape({ paciente }: { paciente?: Paciente }) {
  const agora = new Date();
  const numeroDocumento = `FICHA-${agora.getFullYear()}-${String(paciente?.id ?? 0).padStart(4, '0')}`;
  return (
    <p className="mt-4 font-mono text-[7pt] text-slate-400">
      {numeroDocumento} · emitido em {agora.toLocaleString('pt-BR')} · UniCare
    </p>
  );
}

interface FichaAdultaPrintProps {
  paciente?: Paciente;
  documento?: DocumentoFichaOdonto | null;
  dados: AnamneseCliFor45;
  odontograma: TeethMap | null;
  periograma: PeriogramaToothMap | null;
  indices: IndicesGengivais | null;
  ultima?: Anamnese;
  /** Id do container, usado por quem embute a ficha em outro documento. */
  containerId?: string;
  /** `false` quando a ficha entra dentro de um documento que já tem cabeçalho. */
  comCabecalho?: boolean;
}

export function FichaOdontoAdultoPrint({
  paciente,
  documento,
  dados,
  odontograma,
  periograma,
  indices,
  ultima,
  containerId,
  comCabecalho = true,
}: FichaAdultaPrintProps) {
  return (
    <article id={containerId} className="documento-ficha text-slate-900">
      {comCabecalho && (
        <>
          <CabecalhoFicha
            titulo="Ficha Clínica Odontológica — Adulto e Idoso"
            paciente={paciente}
            documento={documento}
            idade={calcularIdade(dados.identificacao.dataNascimento)}
          />
          <SituacaoDaFicha documento={documento} />
        </>
      )}

      <Secao numero={1} titulo="Anamnese">
        <Pagina1IdentificacaoHistoria
          identificacao={dados.identificacao}
          historiaMedica={dados.historiaMedica}
          historiaOdontologica={dados.historiaOdontologica}
          habitos={dados.habitos}
          declaracao={dados.declaracao}
          setDados={semAlteracaoAdulto}
        />
      </Secao>

      <Secao numero={2} titulo="Alertas">
        <AdultAlertsTab
          paciente={paciente}
          ultima={ultima}
          dados={dados}
          onIrParaExame={() => {}}
        />
      </Secao>

      <Secao numero={3} titulo="Exame Clínico">
        <div className="space-y-4">
          <Pagina2ExameFisico exameFisico={dados.exameFisico} setDados={semAlteracaoAdulto} />
          <OdontogramApp valor={odontograma} somenteLeitura />
          <Periograma valor={periograma} somenteLeitura />
          <IndicesGengivaisCard
            pacienteId={paciente?.id}
            valor={indices ?? criarIndicesVazios()}
            somenteLeitura
          />
          <TermoAutorizacaoSection
            exameDental={dados.exameDental}
            setDados={semAlteracaoAdulto}
          />
        </div>
      </Secao>

      <Secao numero={4} titulo="Plano">
        <TratamentoProgramadoSection
          exameDental={dados.exameDental}
          setDados={semAlteracaoAdulto}
        />
      </Secao>

      <Secao numero={5} titulo="Evolução">
        <EvolucaoAdultoSection
          exameDental={dados.exameDental}
          setDados={semAlteracaoAdulto}
        />
      </Secao>

      <Secao numero={6} titulo="Exames Complementares">
        <ExamesComplementaresPrint exameDental={dados.exameDental} />
      </Secao>

      {comCabecalho && (
        <>
          <Assinaturas documento={documento} />
          <Rodape paciente={paciente} />
        </>
      )}
    </article>
  );
}

interface FichaInfantilPrintProps {
  paciente?: Paciente;
  documento?: DocumentoFichaOdonto | null;
  dados: AnamneseInfantil;
  containerId?: string;
  /** `false` quando a ficha entra dentro de um documento que já tem cabeçalho. */
  comCabecalho?: boolean;
}

export function FichaOdontoInfantilPrint({
  paciente,
  documento,
  dados,
  containerId,
  comCabecalho = true,
}: FichaInfantilPrintProps) {
  return (
    <article id={containerId} className="documento-ficha text-slate-900">
      {comCabecalho && (
        <>
          <CabecalhoFicha
            titulo="Ficha Clínica Odontológica — Odontopediatria"
            paciente={paciente}
            documento={documento}
            idade={calcularIdadeInfantil(dados.identificacao.dataNascimento)}
          />
          <SituacaoDaFicha documento={documento} />
        </>
      )}

      <Secao numero={1} titulo="Anamnese">
        <div className="space-y-4">
          <Pagina1IdentificacaoPsicologica
            identificacao={dados.identificacao}
            avaliacaoPsicologica={dados.avaliacaoPsicologica}
            setDados={semAlteracaoInfantil}
          />
          <Pagina2AntecedentesHabitos
            antecedentesHereditarios={dados.antecedentesHereditarios}
            preNatal={dados.preNatal}
            natal={dados.natal}
            posNatalSaude={dados.posNatalSaude}
            habitosHigiene={dados.habitosHigiene}
            setDados={semAlteracaoInfantil}
          />
          <DiarioAlimentarSection
            diarioAlimentar={dados.diarioAlimentar}
            setDados={semAlteracaoInfantil}
          />
          <TermoInfantilSection termo={dados.termo} setDados={semAlteracaoInfantil} />
        </div>
      </Secao>

      <Secao numero={2} titulo="Alertas">
        <ChildAlertsTab
          paciente={paciente}
          dados={dados}
          onIrParaAnamnese={() => {}}
        />
      </Secao>

      <Secao numero={3} titulo="Exame Clínico">
        <div className="space-y-4">
          <Pagina3ExameFisicoOclusao
            exameExtrabucal={dados.exameExtrabucal}
            exameIntrabucal={dados.exameIntrabucal}
            oclusaoDecidua={dados.oclusaoDecidua}
            oclusaoMistaPermanente={dados.oclusaoMistaPermanente}
            setDados={semAlteracaoInfantil}
          />
          <MapaHigieneInfantil mapa={dados.mapaHigiene} onChange={() => {}} />
          <OdontogramaInfantil
            odontograma={dados.odontograma}
            denticao={dados.exameIntrabucal.denticao}
            onChange={() => {}}
          />
        </div>
      </Secao>

      <Secao numero={4} titulo="Plano">
        <Pagina5PlanoTratamento
          planoTratamento={dados.planoTratamento}
          setDados={semAlteracaoInfantil}
        />
      </Secao>

      <Secao numero={5} titulo="Evolução">
        <EvolucaoInfantilSection
          evolucao={dados.evolucao}
          setDados={semAlteracaoInfantil}
        />
      </Secao>

      {comCabecalho && (
        <>
          <Assinaturas documento={documento} />
          <Rodape paciente={paciente} />
        </>
      )}
    </article>
  );
}
