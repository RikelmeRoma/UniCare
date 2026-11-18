import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { AppLayout } from '../../../components/layout/AppLayout';
import { SeletorComBusca } from '../../../components/ui/SeletorComBusca';
import { PatientHeader } from '../components/PatientHeader';
import { useClinic } from '../../clinic/context/ClinicContext';
import { useAuth } from '../../auth/context/AuthContext';
import { AdultRecordWorkspace } from '../workspaces/AdultRecordWorkspace';
import { ChildRecordWorkspace } from '../workspaces/ChildRecordWorkspace';

export function DentalRecordPage() {
  const {
    pacientes,
    anamnesesPorPaciente,
    carregarAnamneses,
    documentosOdonto,
    carregarDocumentoOdontoPaciente,
  } = useClinic();
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pacientesOdonto = pacientes.filter((p) => p.curso === 'odontologia');

  // A agenda abre a ficha do paciente do card clicado. Sem ler o state, o
  // seletor caía sempre no primeiro paciente da clínica e o estagiário tinha
  // que procurar de novo o paciente que acabou de clicar.
  const pacienteDaQuery = Number(searchParams.get('paciente')) || undefined;
  const pacienteDaAgenda =
    (location.state as { pacienteId?: number } | null)?.pacienteId ??
    pacienteDaQuery;
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(
    pacienteDaAgenda
  );
  const pacienteSelecionado =
    pacientesOdonto.find((p) => p.id === selectedPatientId) || pacientesOdonto[0];

  // A anamnese é por paciente: troca de paciente precisa recarregar o histórico.
  useEffect(() => {
    if (pacienteSelecionado?.id) {
      void carregarAnamneses(pacienteSelecionado.id);
    }
  }, [pacienteSelecionado?.id, carregarAnamneses]);

  useEffect(() => {
    if (pacienteSelecionado?.id) {
      void carregarDocumentoOdontoPaciente(pacienteSelecionado.id);
    }
    // A função do contexto é recriada a cada render; a chave é o paciente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pacienteSelecionado?.id]);

  const anamneses = pacienteSelecionado?.id
    ? (anamnesesPorPaciente[pacienteSelecionado.id] ?? [])
    : [];
  // O backend devolve do mais recente para o mais antigo.
  const ultima = anamneses[0];
  const documento =
    documentosOdonto.find((d) => d.pacienteId === pacienteSelecionado?.id) ?? null;
  const documentoKey = documento
    ? `${documento.id}-${documento.versao}-${documento.conteudo ? 'detalhe' : 'resumo'}`
    : 'novo';
  const somenteLeitura = user?.perfil === 'supervisor' || user?.perfil === 'rt';

  return (
    <AppLayout
      title="Ficha Clínica Odontológica"
      subtitle="Prontuário odontológico por domínio clínico: anamnese, exame, plano, evolução e exames"
      badge="Supervisão Clínica CFO"
      badgeType="emerald"
      actions={
        <SeletorComBusca
          rotulo="Paciente da Clínica"
          opcoes={pacientesOdonto.map((p) => ({
            id: p.id,
            rotulo: p.nome,
            detalhe: p.cpf,
          }))}
          valor={pacienteSelecionado?.id}
          onSelecionar={setSelectedPatientId}
          placeholderBusca="Buscar por nome ou CPF..."
          exibirDetalheNoGatilho
          vazio="Nenhum paciente odontológico disponível."
        />
      }
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <PatientHeader paciente={pacienteSelecionado} />

        {pacienteSelecionado ? (
          pacienteSelecionado.ehMenor ? (
            <ChildRecordWorkspace
              key={`infantil-${pacienteSelecionado.id}-${documentoKey}`}
              paciente={pacienteSelecionado}
              documento={documento}
              somenteLeitura={somenteLeitura}
            />
          ) : (
            <AdultRecordWorkspace
              key={`adulto-${pacienteSelecionado.id}-${documentoKey}`}
              paciente={pacienteSelecionado}
              ultima={ultima}
              documento={documento}
              somenteLeitura={somenteLeitura}
            />
          )
        ) : (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-6 text-xs font-semibold text-amber-900 dark:text-amber-300">
            Nenhum paciente odontológico selecionado.
          </div>
        )}
      </div>
    </AppLayout>
  );
}
