import { useState } from 'react';
import type { Anamnese, Paciente } from '../../clinic/context/ClinicContext';
import OdontogramApp from '../components/OdontogramaViewer';
import Periograma from '../components/PeriogramaViewer';
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
}: AdultRecordWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ClinicalTabKey>('anamnese');
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
      texto: 'Arquivo JSON exportado. O rascunho continua salvo neste navegador.',
    });
  };

  const idade = calcularIdade(dados.identificacao.dataNascimento);

  return (
    <div className="space-y-6 font-sans">
      <AnamneseHeader
        titulo="Ficha Clínica Odontológica — Adulto e Idoso"
        selo="CLI-FOR-45"
        paciente={paciente}
        idade={idade}
        idConteudo="ficha-adulto-conteudo"
        conteudoOculto={conteudoOculto}
        onAlternarConteudo={() => setConteudoOculto((oculto) => !oculto)}
        mostrarAlternar={activeTab === 'anamnese'}
        rotuloAlternar="ficha"
        onSalvar={salvarManual}
        onExportar={exportar}
        onLimpar={() => setConfirmandoLimpeza(true)}
        confirmandoLimpeza={confirmandoLimpeza}
        onCancelarLimpeza={() => setConfirmandoLimpeza(false)}
        onConfirmarLimpeza={limpar}
        mensagem={mensagem}
        descricao={
          <>
            Ficha completa organizada por domínio clínico. O preenchimento fica
            <strong className="text-slate-700"> apenas neste navegador</strong>{' '}
            (sessionStorage) e pode ser exportado em JSON. A atualização de alertas
            clínicos no servidor continua disponível na aba Alertas.
          </>
        }
      />

      <ClinicalTabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

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
            <OdontogramApp />
          </ClinicalChartCard>
          <ClinicalChartCard>
            <Periograma />
          </ClinicalChartCard>
          <ClinicalChartCard>
            <IndicesGengivaisCard
              key={paciente?.id ?? 'sem-paciente'}
              pacienteId={paciente?.id}
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
  );
}
