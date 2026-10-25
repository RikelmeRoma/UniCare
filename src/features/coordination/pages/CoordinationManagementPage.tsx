import { AppLayout } from '../../../components/layout/AppLayout';
import { RTStatsDashboard } from '../../supervision/components/RTStatsDashboard';

export function CoordinationManagementPage() {
  return (
    <AppLayout
      title="Painel Executivo da Coordenação (Psicologia)"
      info="Gestão da clínica de psicologia, indicadores assistenciais, auditoria de acessos conforme LGPD Artigo 11 e custódia legal de 20 anos"
      badge="Coordenação de Psicologia"
      badgeType="indigo"
    >
      <div className="max-w-6xl mx-auto">
        <RTStatsDashboard modo="coordenacao" />
      </div>
    </AppLayout>
  );
}
