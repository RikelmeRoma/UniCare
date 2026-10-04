import { ShieldCheckIcon, LockClosedIcon } from '../../../components/icons/CorporateIcons';
import { PsychologyEmblem, OdontologyEmblem, InstitutionalEmblem } from '../../../components/icons/CourseSymbols';
import type { ActiveDomain } from './LoginForm';

interface LoginInfoPanelProps {
  activeDomain: ActiveDomain;
}

export function LoginInfoPanel({ activeDomain }: LoginInfoPanelProps) {
  // Configurações visuais dinâmicas por módulo/curso selecionado
  const getDomainConfig = () => {
    switch (activeDomain) {
      case 'psicologia':
        return {
          gradient: 'from-[#07193b] via-[#0e2c5e] to-[#030c1d]',
          glow1: 'bg-blue-600/25',
          glow2: 'bg-indigo-500/20',
          badgeText: 'Psicologia Clínica • CFP 06/2019',
          badgeBorder: 'border-blue-400/30 bg-blue-500/15 text-blue-200',
          title: 'Serviço de Psicologia Aplicada (SPA)',
          headline: 'Supervisão clínica estruturada e sigilo profissional absoluto.',
          description:
            'Custódia segura de prontuários psicológicos sob conformidade estrita com a Resolução CFP nº 06/2019, evolução tripartite obrigatória e blindagem de dados sensíveis.',
          items: [
            'Registro de evolução sem citações literais (Anti-aspas CFP)',
            'Estrutura tripartite padronizada: Início, Meio e Fechamento',
            'Homologação docente individualizada por turma de estágio',
          ],
          emblem: (
            <>
              <PsychologyEmblem className="w-80 h-80 text-blue-400/10 animate-slow-spin absolute -right-16 -bottom-16 pointer-events-none select-none" />
              <PsychologyEmblem className="w-36 h-36 text-blue-400/20 animate-float-orb absolute top-10 -right-4 pointer-events-none select-none" />
            </>
          ),
          footerTag: 'Conselho Federal de Psicologia (CFP)',
        };

      case 'odontologia':
        return {
          gradient: 'from-[#20040d] via-[#480518] to-[#100105]',
          glow1: 'bg-rose-600/25',
          glow2: 'bg-emerald-500/15',
          badgeText: 'Odontologia Integrada • Diretrizes CFO',
          badgeBorder: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
          title: 'Clínica Odontológica Integrada',
          headline: 'Mapeamento anatômico em cadeira e supervisão pedagógica.',
          description:
            'Ambiente clínico odontológico com odontograma 2D interativo por superfícies, periodontograma digital com cálculo de sangramento e validação de duplas acadêmicas.',
          items: [
            'Odontograma 2D interativo com superfícies V, L, M, D e O/I',
            'Periodontograma clínico com profundidade de sondagem e sangramento',
            'Acompanhamento e homologação em tempo real pelo docente supervisor',
          ],
          emblem: (
            <>
              <OdontologyEmblem className="w-80 h-80 text-rose-400/10 animate-slow-spin absolute -right-16 -bottom-16 pointer-events-none select-none" />
              <OdontologyEmblem className="w-36 h-36 text-rose-400/20 animate-float-orb absolute top-10 -right-4 pointer-events-none select-none" />
            </>
          ),
          footerTag: 'Conselho Federal de Odontologia (CFO)',
        };

      case 'institucional':
        return {
          gradient: 'from-[#001D33] via-[#002B49] to-[#060e17]',
          glow1: 'bg-[#FFD100]/20',
          glow2: 'bg-blue-600/20',
          badgeText: 'Gestão UNINASSAU & Diretoria Técnica',
          badgeBorder: 'border-[#FFD100]/30 bg-white/10 text-amber-200',
          title: 'Diretoria & Controladoria Central',
          headline: 'Custódia legal de 20 anos e auditoria integral LGPD.',
          description:
            'Painel executivo da Responsável Técnica (RT Master) para governança hospitalar unificada, gestão de capacidade das clínicas e salvaguardas regulatórias.',
          items: [
            'Cumprimento rigoroso da Salvaguarda RN-001 para a Recepção',
            'Trilha de auditoria criptográfica imutável (LGPD Art. 11)',
            'Custódia legal documental com retenção de dados por 20 anos',
          ],
          emblem: (
            <>
              <InstitutionalEmblem className="w-80 h-80 text-amber-300/10 animate-slow-spin absolute -right-16 -bottom-16 pointer-events-none select-none" />
              <InstitutionalEmblem className="w-36 h-36 text-amber-400/20 animate-float-orb absolute top-10 -right-4 pointer-events-none select-none" />
            </>
          ),
          footerTag: 'Centro Universitário Maurício de Nassau',
        };

      case 'credenciais':
      default:
        return {
          gradient: 'from-[#001D33] via-[#002B49] to-[#08111a]',
          glow1: 'bg-blue-500/20',
          glow2: 'bg-[#FFD100]/15',
          badgeText: 'Portal Corporativo • Acesso Direto',
          badgeBorder: 'border-white/20 bg-white/10 text-slate-200',
          title: 'Hospital-Escola Integrado UNINASSAU',
          headline: 'Governança clínica, formação de excelência e proteção de dados.',
          description:
            'Acesso seguro por matrícula acadêmica ou e-mail corporativo. O sistema detecta automaticamente seu curso e nível de privilégio institucional.',
          items: [
            'Autenticação criptografada com tokens JWT de alta segurança',
            'Roteamento automático para o prontuário ou mesa do supervisor',
            'Conformidade integral com as normas de proteção à privacidade',
          ],
          emblem: (
            <>
              <InstitutionalEmblem className="w-80 h-80 text-blue-300/10 animate-slow-spin absolute -right-16 -bottom-16 pointer-events-none select-none" />
              <InstitutionalEmblem className="w-36 h-36 text-blue-400/20 animate-float-orb absolute top-10 -right-4 pointer-events-none select-none" />
            </>
          ),
          footerTag: 'UNINASSAU • Campus Aracaju',
        };
    }
  };

  const config = getDomainConfig();

  return (
    <div
      className={`hidden lg:flex w-1/2 bg-gradient-to-br ${config.gradient} text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden transition-all duration-700 select-none`}
    >
      {/* Luzes e Orbes Animados de Atmosfera */}
      <div
        className={`absolute -top-24 -left-24 w-80 h-80 rounded-full ${config.glow1} blur-3xl pointer-events-none animate-float-orb`}
      />
      <div
        className={`absolute -bottom-24 -right-12 w-96 h-96 rounded-full ${config.glow2} blur-3xl pointer-events-none animate-float-orb-delayed`}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_50%)] pointer-events-none" />

      {/* Marca D'água Heráldica Animada do Curso */}
      {config.emblem}

      {/* Conteúdo Superior */}
      <div className="relative z-10">
        {/* Banner do Módulo com o Brasão Veritas */}
        <div className="flex items-center gap-3.5 p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 mb-6 max-w-fit shadow-lg">
          <div className="p-1 bg-white rounded-xl shadow-xs shrink-0">
            <img
              src="/uninassau-crest.png"
              alt="Brasão Oficial UNINASSAU Veritas"
              className="h-9 w-auto object-contain"
            />
          </div>
          <div className="pr-2">
            <div className="text-[12px] font-black tracking-widest text-white uppercase font-sans">
              UNINASSAU
            </div>
            <div className="text-[9.5px] text-[#FFD100] font-semibold tracking-wider uppercase font-mono">
              Campus Aracaju • Clínicas Integradas
            </div>
          </div>
        </div>

        {/* Badge do Curso Ativo */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border shadow-xs ${config.badgeBorder}`}
          >
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            <span>{config.badgeText}</span>
          </span>
        </div>

        <h2 className="text-2xl xl:text-3xl font-bold leading-tight mb-3 text-white tracking-tight">
          {config.headline}
        </h2>

        <p className="text-slate-300 text-xs leading-relaxed max-w-md">
          {config.description}
        </p>

        {/* Pontos de Conformidade e Normativas */}
        <div className="mt-6 space-y-2.5 max-w-md">
          {config.items.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé do Painel */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 mt-6">
        <div>
          <p className="text-xs font-bold text-white tracking-wide">{config.footerTag}</p>
          <p className="text-[10px] text-slate-400 font-mono">Ambiente Auditado sob Regras RBAC</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-300 bg-emerald-400/15 px-3 py-1.5 rounded-full border border-emerald-400/25 backdrop-blur-xs">
          <LockClosedIcon className="w-3 h-3 text-emerald-300" />
          <span>Segurança Ativa</span>
        </div>
      </div>
    </div>
  );
}