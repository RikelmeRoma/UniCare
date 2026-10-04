import { AppLayout } from '../../../components/layout/AppLayout';
import { RTStatsDashboard } from '../components/RTStatsDashboard';

export function RTManagementPage() {
  return (
    <AppLayout
      title="Painel Executivo da Responsável Técnica (RT)"
      subtitle="Supervisão geral hospitalar, auditoria de acessos conforme LGPD Artigo 11, indicadores de produtividade e custódia legal de 20 anos"
      badge="Diretoria Técnica & Compliance"
      badgeType="indigo"
    >
      <div className="max-w-6xl mx-auto">
        <RTStatsDashboard />
      </div>
    </AppLayout>
  );
}
