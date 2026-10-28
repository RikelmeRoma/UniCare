import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DocumentoFichaOdonto, Paciente } from '../../clinic/context/ClinicContext';
import { DocumentoFichaBar } from '../components/DocumentoFichaBar';
import { AnamneseHeader } from '../anamnese/AnamneseHeader';
import { Pagina1IdentificacaoPsicologica } from '../anamnese-infantil/Pagina1IdentificacaoPsicologica';
import { Pagina2AntecedentesHabitos } from '../anamnese-infantil/Pagina2AntecedentesHabitos';
import { Pagina3ExameFisicoOclusao } from '../anamnese-infantil/Pagina3ExameFisicoOclusao';
import {
  DiarioAlimentarSection,
  DiagnosticoRadiograficoField,
} from '../anamnese-infantil/Pagina4HigieneOdontograma';
import { Pagina5PlanoTratamento } from '../anamnese-infantil/Pagina5PlanoTratamento';
import {
  EvolucaoInfantilSection,
  TermoInfantilSection,
} from '../anamnese-infantil/Pagina6EvolucaoTermo';
import { MapaHigieneInfantil } from '../anamnese-infantil/MapaHigieneInfantil';
import { OdontogramaInfantil } from '../anamnese-infantil/OdontogramaInfantil';
import {
  calcularIdadeInfantil,
  carregarRascunhoInfantil,
  criarAnamneseInfantilVazia,
  exportarJsonInfantil,
  removerRascunhoInfantil,
  salvarRascunhoInfantil,
} from '../anamnese-infantil/estado';
import type { AnamneseInfantil } from '../anamnese-infantil/tipos';
import { useDraft } from '../hooks/useDraft';
import { ChildAlertsTab } from '../tabs/ChildAlertsTab';
import { DentalRadiologyTab } from '../components/DentalRadiologyTab';
import { FichaOdontoInfantilPrint } from '../components/FichaOdontoPrint';
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

interface ChildRecordWorkspaceProps {
  paciente?: Paciente;
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

export function ChildRecordWorkspace({
  paciente,
  documento,
  somenteLeitura = false,
}: ChildRecordWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<ClinicalTabKey>('anamnese');
  const [imprimindo, setImprimindo] = useState(false);
  const conteudoDocumento = documento?.conteudo as
    | { anamnese?: AnamneseInfantil }
    | undefined;
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
  } = useDraft<AnamneseInfantil>({
    paciente,
    inicial: conteudoDocumento?.anamnese,
    criar: criarAnamneseInfantilVazia,
    carregar: carregarRascunhoInfantil,
    salvar: salvarRascunhoInfantil,
    remover: removerRascunhoInfantil,
  });

  const exportar = () => {
    if (!paciente) return;
    exportarJsonInfantil(paciente, dados);
    setMensagem({
      tipo: 'ok',
      texto: 'Arquivo exportado para conferência.',
    });
  };

  const montarConteudo = () => ({ anamnese: dados });

  const idade = calcularIdadeInfantil(dados.identificacao.dataNascimento);

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
        titulo="Ficha Clínica Odontológica — Odontopediatria"
        selo="INFANTIL"
        paciente={paciente}
        idade={idade}
        idConteudo="ficha-infantil-conteudo"
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
            Ficha infantil organizada por domínio clínico. O preenchimento é
            preservado durante a digitação e enviado à supervisão ao final.
          </>
        }
      />

      <DocumentoFichaBar
        pacienteId={paciente?.id}
        pacienteNome={paciente?.nome}
        tipo="infantil"
        documento={documento}
        montarConteudo={montarConteudo}
        somenteLeitura={somenteLeitura}
      />

      <ClinicalTabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className={somenteLeitura ? 'pointer-events-none' : ''}>
      {activeTab === 'anamnese' && (
        <div
          id="ficha-infantil-conteudo"
          className={conteudoOculto ? 'hidden' : 'space-y-4'}
        >
          <Pagina1IdentificacaoPsicologica
            identificacao={dados.identificacao}
            avaliacaoPsicologica={dados.avaliacaoPsicologica}
            setDados={setDados}
          />
          <Pagina2AntecedentesHabitos
            antecedentesHereditarios={dados.antecedentesHereditarios}
            preNatal={dados.preNatal}
            natal={dados.natal}
            posNatalSaude={dados.posNatalSaude}
            habitosHigiene={dados.habitosHigiene}
            setDados={setDados}
          />
          <DiarioAlimentarSection
            diarioAlimentar={dados.diarioAlimentar}
            setDados={setDados}
          />
          <TermoInfantilSection termo={dados.termo} setDados={setDados} />
        </div>
      )}

      {activeTab === 'alertas' && (
        <ChildAlertsTab
          paciente={paciente}
          dados={dados}
          onIrParaAnamnese={() => setActiveTab('anamnese')}
        />
      )}

      {activeTab === 'exame' && (
        <div className="space-y-6">
          <Pagina3ExameFisicoOclusao
            exameExtrabucal={dados.exameExtrabucal}
            exameIntrabucal={dados.exameIntrabucal}
            oclusaoDecidua={dados.oclusaoDecidua}
            oclusaoMistaPermanente={dados.oclusaoMistaPermanente}
            setDados={setDados}
          />
          <ClinicalChartCard>
            <MapaHigieneInfantil
              mapa={dados.mapaHigiene}
              onChange={(mapa) =>
                setDados((prev) => ({ ...prev, mapaHigiene: mapa }))
              }
            />
          </ClinicalChartCard>
          <ClinicalChartCard>
            <OdontogramaInfantil
              odontograma={dados.odontograma}
              denticao={dados.exameIntrabucal.denticao}
              onChange={(odontograma) =>
                setDados((prev) => ({ ...prev, odontograma }))
              }
            />
          </ClinicalChartCard>
        </div>
      )}

      {activeTab === 'plano' && (
        <Pagina5PlanoTratamento
          planoTratamento={dados.planoTratamento}
          setDados={setDados}
        />
      )}

      {activeTab === 'evolucao' && (
        <EvolucaoInfantilSection
          evolucao={dados.evolucao}
          setDados={setDados}
        />
      )}

      {activeTab === 'exames' && (
        <div className="space-y-6">
          <DiagnosticoRadiograficoField
            odontograma={dados.odontograma}
            setDados={setDados}
          />
          <DentalRadiologyTab />
        </div>
      )}
      </div>

      {imprimindo &&
        createPortal(
          <FichaOdontoInfantilPrint
            paciente={paciente}
            documento={documento}
            dados={dados}
          />,
          document.body
        )}
    </div>
  );
}
