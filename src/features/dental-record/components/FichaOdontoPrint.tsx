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

interface CabecalhoProps {
  titulo: string;
  paciente?: Paciente;
  documento?: DocumentoFichaOdonto | null;
  idade?: string;
}

function CabecalhoFicha({ titulo, paciente, documento, idade }: CabecalhoProps) {
  return (
    <header className="border-b-2 border-slate-900 pb-3 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            UNINASSAU Aracaju • Clínica Odontológica Integrada
          </p>
          <h1 className="mt-1 text-lg font-bold tracking-tight text-slate-900">
            {titulo}
          </h1>
          <p className="mt-1 text-[11px] text-slate-600">
            Documento gerado em {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="rounded-lg border border-slate-300 px-3 py-2 text-right text-[10px]">
          <p className="font-bold uppercase tracking-wider text-slate-500">
            Situação da ficha
          </p>
          <p className="mt-0.5 font-bold text-slate-900">
            {documento ? ROTULOS_STATUS[documento.status] ?? documento.status : 'Ainda não enviada'}
          </p>
          {documento && <p className="text-slate-500">Versão {documento.versao}</p>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-[11px]">
        <p>
          <strong>Paciente:</strong> {paciente?.nome ?? 'Não selecionado'}
        </p>
        <p>
          <strong>CPF:</strong> {paciente?.cpf ?? 'Não informado'}
        </p>
        <p>
          <strong>Nascimento:</strong> {paciente?.dataNascimento || 'Não informado'}
        </p>
        <p>
          <strong>Idade:</strong> {idade ? `${idade} anos` : 'Não informada'}
        </p>
        <p>
          <strong>Dupla:</strong> {documento?.duplaEstagiarios || 'Não informada'}
        </p>
        <p>
          <strong>Supervisão:</strong> {documento?.supervisorNome || 'Não informada'}
        </p>
      </div>

      {documento?.parecerSupervisor && (
        <p className="mt-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-[11px]">
          <strong>Parecer da supervisão:</strong> {documento.parecerSupervisor}
        </p>
      )}
    </header>
  );
}

function Secao({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <section className="print-section">
      <h2 className="mb-3 border-b border-slate-300 pb-1 text-sm font-bold uppercase tracking-wider text-slate-900">
        {numero}. {titulo}
      </h2>
      {children}
    </section>
  );
}

function ExamesComplementaresPrint({ exameDental }: { exameDental: ExameDental }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 text-[11px] space-y-2">
      <p>
        <strong>Hematológico:</strong> {exameDental.exames.hematologico || 'Não informado'}
      </p>
      <p>
        <strong>Outros exames:</strong> {exameDental.exames.outros || 'Não informado'}
      </p>
    </div>
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
}

export function FichaOdontoAdultoPrint({
  paciente,
  documento,
  dados,
  odontograma,
  periograma,
  indices,
  ultima,
}: FichaAdultaPrintProps) {
  return (
    <div id="ficha-odonto-print" className="bg-white text-slate-900 font-sans text-[11px] leading-relaxed">
      <CabecalhoFicha
        titulo="Ficha Clínica Odontológica — Adulto e Idoso"
        paciente={paciente}
        documento={documento}
        idade={calcularIdade(dados.identificacao.dataNascimento)}
      />

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
    </div>
  );
}

interface FichaInfantilPrintProps {
  paciente?: Paciente;
  documento?: DocumentoFichaOdonto | null;
  dados: AnamneseInfantil;
}

export function FichaOdontoInfantilPrint({
  paciente,
  documento,
  dados,
}: FichaInfantilPrintProps) {
  return (
    <div id="ficha-odonto-print" className="bg-white text-slate-900 font-sans text-[11px] leading-relaxed">
      <CabecalhoFicha
        titulo="Ficha Clínica Odontológica — Odontopediatria"
        paciente={paciente}
        documento={documento}
        idade={calcularIdadeInfantil(dados.identificacao.dataNascimento)}
      />

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
    </div>
  );
}
