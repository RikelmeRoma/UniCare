import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type {
  Anamnese,
  DocumentoFichaOdonto,
  Paciente,
} from '../../clinic/context/ClinicContext';
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
  { key: 'anamnese', label: 'Anamnese', icon: ClipboardDocumentCheckIcon },
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
  const [imprimindo, setImprimindo] = useState(false);
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

  useEffect(() => {
    if (!imprimindo) return;

    const tituloAnterior = document.title;
    document.body.classList.add('ficha-print-mode');
    document.title = `Ficha Odontológica - ${paciente?.nome ?? 'Paciente'}`;

    const encerrar = () => {
      document.body.classList.remove('ficha-print-mode');
      document.title = tituloAnterior;
      setImprimindo(false);
    };

    window.addEventListener('afterprint', encerrar);
    const temporizador = window.setTimeout(() => window.print(), 100);

    return () => {
      window.clearTimeout(temporizador);
      window.removeEventListener('afterprint', encerrar);
      document.body.classList.remove('ficha-print-mode');
      document.title = tituloAnterior;
    };
  }, [imprimindo, paciente?.nome]);

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
        onExportarPdf={() => setImprimindo(true)}
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
        />
      )}

      {activeTab === 'evolucao' && (
        <EvolucaoAdultoSection
          exameDental={dados.exameDental}
          setDados={setDados}
        />
      )}

      {activeTab === 'exames' && (
        <div className="space-y-6">
          <ExamesComplementaresSection
            exameDental={dados.exameDental}
            setDados={setDados}
          />
          <DentalRadiologyTab />
        </div>
      )}
      </div>

      {imprimindo &&
        createPortal(
          <FichaOdontoAdultoPrint
            paciente={paciente}
            documento={documento}
            dados={dados}
            odontograma={odontograma}
            periograma={periograma}
            indices={indices}
            ultima={ultima}
          />,
          document.body
        )}
    </div>
  );
}
