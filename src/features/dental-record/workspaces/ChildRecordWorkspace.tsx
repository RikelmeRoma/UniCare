import { useState } from 'react';
import type { Paciente } from '../../clinic/context/ClinicContext';
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
}: ChildRecordWorkspaceProps) {
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
  } = useDraft<AnamneseInfantil>({
    paciente,
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
      texto: 'Arquivo JSON exportado. O rascunho continua salvo neste navegador.',
    });
  };

  const idade = calcularIdadeInfantil(dados.identificacao.dataNascimento);

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
        onLimpar={() => setConfirmandoLimpeza(true)}
        confirmandoLimpeza={confirmandoLimpeza}
        onCancelarLimpeza={() => setConfirmandoLimpeza(false)}
        onConfirmarLimpeza={limpar}
        mensagem={mensagem}
        descricao={
          <>
            Ficha infantil organizada por domínio clínico. O preenchimento fica
            <strong className="text-slate-700"> apenas neste navegador</strong>{' '}
            (sessionStorage) e pode ser exportado em JSON; nada é enviado ao servidor
            nesta fase.
          </>
        }
      />

      <ClinicalTabNav tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

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
  );
}
