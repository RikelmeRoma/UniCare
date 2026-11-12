import { useState } from 'react';
import type {
  Anamnese,
  DocumentoFichaOdonto,
  Paciente,
} from '../../clinic/context/ClinicContext';
import { RelatorioImpressao } from '../../../shared/impressao/RelatorioImpressao';
import OdontogramApp, { type TeethMap } from '../components/OdontogramaViewer';
import Periograma, { type ToothMap as PeriogramaToothMap } from '../components/PeriogramaViewer';
import { DocumentoFichaBar } from '../components/DocumentoFichaBar';
import type { IndicesGengivais } from '../indices/tipos';
import { AnamneseHeader } from '../anamnese/AnamneseHeader';
import { Pagina1IdentificacaoHistoria } from '../anamnese/Pagina1IdentificacaoHistoria';
import { Pagina2ExameFisico } from '../anamnese/Pagina2ExameFisico';
import {
  EvolucaoAdultoSection,
  ExamesComplementaresSection,
  TermoAutorizacaoSection,
  TratamentoProgramadoSection,
} from '../anamnese/Pagina3DentesPlano';
import {
  calcularIdade,
  carregarRascunho,
  criarAnamneseVazia,
  exportarJson,
  removerRascunho,
  salvarRascunho,
} from '../anamnese/estado';
import type { AnamneseCliFor45 } from '../anamnese/tipos';
import { useDraft } from '../hooks/useDraft';
import { AdultAlertsTab } from '../tabs/AdultAlertsTab';
import { IndicesGengivaisCard } from '../indices/IndicesGengivaisCard';
import { DentalRadiologyTab } from '../components/DentalRadiologyTab';
import { FichaOdontoAdultoPrint } from '../components/FichaOdontoPrint';
import { ClinicalAssistantDrawer } from '../../ai-assistant/components/ClinicalAssistantDrawer';
import { dataHojeLocalIso } from '../../ai-assistant/hooks/useVoiceRecorder';
import {
  ClinicalTabNav,
  type ClinicalTab,
  type ClinicalTabKey,
} from '../components/ClinicalTabNav';
import { ClinicalChartCard } from '../components/ClinicalChartCard';
import {
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PhotoIcon,
} from '../../../components/icons/CorporateIcons';

interface AdultRecordWorkspaceProps {
  paciente?: Paciente;
  ultima?: Anamnese;
  documento?: DocumentoFichaOdonto | null;
  somenteLeitura?: boolean;
}

const TABS: ClinicalTab[] = [
  { key: 'anamnese', label: 'Ficha Clínica Odontológica', icon: ClipboardDocumentCheckIcon },
  { key: 'alertas', label: 'Alertas', icon: ExclamationTriangleIcon },
  { key: 'exame', label: 'Exame Clínico', icon: DocumentTextIcon },
  { key: 'plano', label: 'Plano', icon: ClipboardDocumentCheckIcon },
  { key: 'evolucao', label: 'Evolução', icon: DocumentTextIcon },
  { key: 'exames', label: 'Exames', icon: PhotoIcon },
];

export function AdultRecordWorkspace({
  paciente,
  ultima,
  documento,
  somenteLeitura = false,
}: AdultRecordWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ClinicalTabKey>('anamnese');
  const [previaAberta, setPreviaAberta] = useState(false);
  const [assistenteAberto, setAssistenteAberto] = useState(false);
  const conteudoDocumento = documento?.conteudo as
    | {
        anamnese?: AnamneseCliFor45;
        odontograma?: TeethMap | null;
        periograma?: PeriogramaToothMap | null;
        indicesGengivais?: IndicesGengivais | null;
      }
    | undefined;
  const [odontograma, setOdontograma] = useState<TeethMap | null>(
    () => conteudoDocumento?.odontograma ?? null
  );
  const [periograma, setPeriograma] = useState<PeriogramaToothMap | null>(
    () => conteudoDocumento?.periograma ?? null
  );
  const [indices, setIndices] = useState<IndicesGengivais | null>(
    () => conteudoDocumento?.indicesGengivais ?? null
  );
  const {
    dados,
    setDados,
    mensagem,
    setMensagem,
    confirmandoLimpeza,
    setConfirmandoLimpeza,
    conteudoOculto,
    setConteudoOculto,
    salvarManual,
    limpar,
  } = useDraft<AnamneseCliFor45>({
    paciente,
    inicial: conteudoDocumento?.anamnese,
    criar: criarAnamneseVazia,
    carregar: carregarRascunho,
    salvar: salvarRascunho,
    remover: removerRascunho,
  });

  const exportar = () => {
    if (!paciente) return;
    exportarJson(paciente, dados);
    setMensagem({
      tipo: 'ok',
      texto: 'Arquivo exportado para conferência.',
    });
  };

  const montarConteudo = () => ({
    anamnese: dados,
    odontograma,
    periograma,
    indicesGengivais: indices,
  });

  const idade = calcularIdade(dados.identificacao.dataNascimento);

  return (
    <div className="space-y-6 font-sans">
      <AnamneseHeader
        titulo="Ficha Clínica Odontológica — Adulto e Idoso"
        selo="ADULTO"
        paciente={paciente}
        idade={idade}
        idConteudo="ficha-adulto-conteudo"
        conteudoOculto={conteudoOculto}
        onAlternarConteudo={() => setConteudoOculto((oculto) => !oculto)}
        mostrarAlternar={activeTab === 'anamnese'}
        rotuloAlternar="ficha"
        onSalvar={salvarManual}
        onExportar={exportar}
        onExportarPdf={() => setPreviaAberta(true)}
        onAbrirAssistente={() => setAssistenteAberto(true)}
        onLimpar={() => setConfirmandoLimpeza(true)}
        confirmandoLimpeza={confirmandoLimpeza}
        onCancelarLimpeza={() => setConfirmandoLimpeza(false)}
        onConfirmarLimpeza={limpar}
        mensagem={mensagem}
        descricao={
          <>
            Ficha completa organizada por domínio clínico. O preenchimento é
            preservado durante a digitação e enviado à supervisão ao final.
          </>
        }
      />

      <DocumentoFichaBar
        pacienteId={paciente?.id}
        pacienteNome={paciente?.nome}
        tipo="adulto"
        documento={documento}
        montarConteudo={montarConteudo}
        somenteLeitura={somenteLeitura}
      />

      <ClinicalTabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className={somenteLeitura ? 'pointer-events-none' : ''}>
      {activeTab === 'anamnese' && (
        <div
          id="ficha-adulto-conteudo"
          className={conteudoOculto ? 'hidden' : 'space-y-4'}
        >
          <Pagina1IdentificacaoHistoria
            identificacao={dados.identificacao}
            historiaMedica={dados.historiaMedica}
            historiaOdontologica={dados.historiaOdontologica}
            habitos={dados.habitos}
            declaracao={dados.declaracao}
            setDados={setDados}
          />
        </div>
      )}

      {activeTab === 'alertas' && (
        <AdultAlertsTab
          paciente={paciente}
          ultima={ultima}
          dados={dados}
          onIrParaExame={() => setActiveTab('exame')}
        />
      )}

      {activeTab === 'exame' && (
        <div className="space-y-6">
          <Pagina2ExameFisico
            exameFisico={dados.exameFisico}
            setDados={setDados}
          />
          <ClinicalChartCard>
            <OdontogramApp
              valor={odontograma}
              onChange={setOdontograma}
              somenteLeitura={somenteLeitura}
            />
          </ClinicalChartCard>
          <ClinicalChartCard>
            <Periograma
              valor={periograma}
              onChange={setPeriograma}
              somenteLeitura={somenteLeitura}
            />
          </ClinicalChartCard>
          <ClinicalChartCard>
            <IndicesGengivaisCard
              key={paciente?.id ?? 'sem-paciente'}
              pacienteId={paciente?.id}
              valor={indices}
              onChange={setIndices}
              somenteLeitura={somenteLeitura}
            />
          </ClinicalChartCard>
          <TermoAutorizacaoSection
            exameDental={dados.exameDental}
            setDados={setDados}
          />
        </div>
      )}

      {activeTab === 'plano' && (
        <TratamentoProgramadoSection
          exameDental={dados.exameDental}
          setDados={setDados}
          pacienteId={paciente?.id}
          somenteLeitura={somenteLeitura}
        />
      )}

      {activeTab === 'evolucao' && (
        <EvolucaoAdultoSection
          exameDental={dados.exameDental}
          setDados={setDados}
          pacienteId={paciente?.id}
          somenteLeitura={somenteLeitura}
        />
      )}

      {activeTab === 'exames' && (
        <div className="space-y-6">
          <ExamesComplementaresSection
            exameDental={dados.exameDental}
            setDados={setDados}
          />
          <DentalRadiologyTab
            pacienteId={paciente?.id}
            pacienteNome={paciente?.nome}
            somenteLeitura={somenteLeitura}
          />
        </div>
      )}
      </div>

      {previaAberta && (
        <RelatorioImpressao
          titulo="Ficha Clínica Odontológica — Adulto e Idoso"
          nomeArquivo={`UniCare-Ficha-Odonto-${paciente?.nome ?? 'Paciente'}`}
          onClose={() => setPreviaAberta(false)}
        >
          <FichaOdontoAdultoPrint
            paciente={paciente}
            documento={documento}
            dados={dados}
            odontograma={odontograma}
            periograma={periograma}
            indices={indices}
            ultima={ultima}
          />
        </RelatorioImpressao>
      )}

      <ClinicalAssistantDrawer
        open={assistenteAberto}
        onClose={() => setAssistenteAberto(false)}
        curso="odontologia"
        paciente={paciente}
        abaAtual={activeTab}
        somenteLeitura={somenteLeitura}
        fichaResumo={{
          subtipo: 'adulto',
          abaAtual: activeTab,
          ultimaAfericao: ultima ?? null,
          historiaMedica: dados.historiaMedica,
          historiaOdontologica: dados.historiaOdontologica,
          habitos: dados.habitos,
          planejamento: dados.exameDental.planejamento,
          evolucaoRecente: dados.exameDental.evolucao.slice(-5),
        }}
        rascunhoAtual={
          activeTab === 'anamnese'
            ? dados.historiaOdontologica.historiaDoenca
            : activeTab === 'plano'
              ? dados.exameDental.planejamento.filter(Boolean).join('\n')
              : activeTab === 'evolucao'
                ? dados.exameDental.evolucao
                    .map((e) => `${e.data}: ${e.intervencao}`)
                    .join('\n')
                : dados.exameFisico.periodonto.observacoes
        }
        onApplyFields={(campos, modo) => {
          const hoje = dataHojeLocalIso();

          setDados((prev) => {
            let next = { ...prev };
            if (campos.historia_doenca) {
              const atual = next.historiaOdontologica.historiaDoenca;
              const historiaDoenca =
                modo === 'acrescentar' && atual.trim()
                  ? `${atual.trimEnd()}\n${campos.historia_doenca}`
                  : campos.historia_doenca;
              next = {
                ...next,
                historiaOdontologica: { ...next.historiaOdontologica, historiaDoenca },
              };
            }
            if (campos.plano_tratamento) {
              const lista = [...next.exameDental.planejamento];
              const idxVazia = lista.findIndex((p) => !p.trim());
              if (idxVazia >= 0) {
                lista[idxVazia] = campos.plano_tratamento;
              } else {
                lista.push(campos.plano_tratamento);
              }
              next = {
                ...next,
                exameDental: { ...next.exameDental, planejamento: lista },
              };
            }
            if (campos.evolucao_procedimento) {
              next = {
                ...next,
                exameDental: {
                  ...next.exameDental,
                  evolucao: [
                    ...next.exameDental.evolucao,
                    {
                      data: hoje,
                      intervencao: campos.evolucao_procedimento,
                      assinaturaDocente: '',
                    },
                  ],
                },
              };
            }
            if (campos.observacoes_exame) {
              const atualObs = next.exameFisico.periodonto.observacoes;
              const observacoes =
                modo === 'acrescentar' && atualObs.trim()
                  ? `${atualObs.trimEnd()}\n${campos.observacoes_exame}`
                  : campos.observacoes_exame;
              next = {
                ...next,
                exameFisico: {
                  ...next.exameFisico,
                  periodonto: { ...next.exameFisico.periodonto, observacoes },
                },
              };
            }
            return next;
          });

          if (campos.evolucao_procedimento) setActiveTab('evolucao');
          else if (campos.plano_tratamento) setActiveTab('plano');
          else if (campos.historia_doenca) setActiveTab('anamnese');
        }}
      />
    </div>
  );
}
