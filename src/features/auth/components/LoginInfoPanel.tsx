import type { CSSProperties } from 'react';
import { ShieldCheckIcon, LockClosedIcon } from '../../../components/icons/CorporateIcons';
import type { ActiveDomain } from './LoginForm';

interface LoginInfoPanelProps {
  activeDomain: ActiveDomain;
}

interface DomainVisualConfig {
  gradient: string;
  glow1: string;
  glow2: string;
  glow3: string;
  sparkleTint: string;
  orbitColor: string;
  badgeText: string;
  badgeBorder: string;
  headline: string;
  description: string;
  items: string[];
  footerTag: string;
}

const DOMAIN_CONFIGS: Record<ActiveDomain, DomainVisualConfig> = {
  psicologia: {
    gradient: 'from-[#07193b] via-[#0e2c5e] to-[#030c1d]',
    glow1: 'bg-blue-500/30',
    glow2: 'bg-indigo-400/25',
    glow3: 'bg-cyan-400/20',
    sparkleTint: 'text-sky-200',
    orbitColor: 'bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.9)]',
    badgeText: 'Psicologia Clínica • CFP 06/2019',
    badgeBorder: 'border-blue-400/30 bg-blue-500/15 text-blue-200',
    headline: 'Supervisão clínica estruturada e sigilo profissional absoluto.',
    description:
      'Custódia segura de prontuários psicológicos sob conformidade estrita com a Resolução CFP nº 06/2019, evolução tripartite obrigatória e blindagem de dados sensíveis.',
    items: [
      'Registro de evolução sem citações literais (Anti-aspas CFP)',
      'Estrutura tripartite padronizada: Início, Meio e Fechamento',
      'Homologação docente individualizada por turma de estágio',
    ],
    footerTag: 'Conselho Federal de Psicologia (CFP)',
  },
  odontologia: {
    gradient: 'from-[#20040d] via-[#480518] to-[#100105]',
    glow1: 'bg-rose-500/30',
    glow2: 'bg-emerald-400/20',
    glow3: 'bg-amber-300/15',
    sparkleTint: 'text-rose-200',
    orbitColor: 'bg-rose-300 shadow-[0_0_12px_rgba(253,164,175,0.9)]',
    badgeText: 'Odontologia Integrada • Diretrizes CFO',
    badgeBorder: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
    headline: 'Mapeamento anatômico em cadeira e supervisão pedagógica.',
    description:
      'Ambiente clínico odontológico com odontograma 2D interativo por superfícies, periodontograma digital com cálculo de sangramento e validação de duplas acadêmicas.',
    items: [
      'Odontograma 2D interativo com superfícies V, L, M, D e O/I',
      'Periodontograma clínico com profundidade de sondagem e sangramento',
      'Acompanhamento e homologação em tempo real pelo docente supervisor',
    ],
    footerTag: 'Conselho Federal de Odontologia (CFO)',
  },
  institucional: {
    gradient: 'from-[#001D33] via-[#002B49] to-[#060e17]',
    glow1: 'bg-[#FFD100]/25',
    glow2: 'bg-blue-500/25',
    glow3: 'bg-cyan-400/15',
    sparkleTint: 'text-amber-200',
    orbitColor: 'bg-[#FFD100] shadow-[0_0_12px_rgba(255,209,0,0.9)]',
    badgeText: 'Gestão UNINASSAU & Diretoria Técnica',
    badgeBorder: 'border-[#FFD100]/30 bg-white/10 text-amber-200',
    headline: 'Custódia legal de 20 anos e auditoria integral LGPD.',
    description:
      'Painel executivo da Responsável Técnica (RT Master) para governança hospitalar unificada, gestão de capacidade das clínicas e salvaguardas regulatórias.',
    items: [
      'Cumprimento rigoroso da salvaguarda de acesso clínico para a Recepção',
      'Trilha de auditoria criptográfica imutável (LGPD Art. 11)',
      'Custódia legal documental com retenção de dados por 20 anos',
    ],
    footerTag: 'Centro Universitário Maurício de Nassau',
  },
  credenciais: {
    gradient: 'from-[#001D33] via-[#002B49] to-[#08111a]',
    glow1: 'bg-sky-400/25',
    glow2: 'bg-[#FFD100]/20',
    glow3: 'bg-indigo-400/20',
    sparkleTint: 'text-amber-200',
    orbitColor: 'bg-[#FFD100] shadow-[0_0_14px_rgba(255,209,0,0.95)]',
    badgeText: 'Portal Corporativo • Acesso Direto',
    badgeBorder: 'border-white/20 bg-white/10 text-slate-200',
    headline: 'Governança clínica, formação de excelência e proteção de dados.',
    description:
      'Acesso seguro por matrícula acadêmica ou e-mail corporativo. O sistema detecta automaticamente seu curso e nível de privilégio institucional.',
    items: [
      'Autenticação criptografada com tokens JWT de alta segurança',
      'Roteamento automático para o prontuário ou mesa do supervisor',
      'Conformidade integral com as normas de proteção à privacidade',
    ],
    footerTag: 'UNINASSAU • Campus Aracaju',
  },
};

interface SparklePoint {
  className: string;
  duration: string;
  delay: string;
  accent?: boolean;
}

const SPARKLES: SparklePoint[] = [
  { className: 'top-8 right-10 w-6 h-6', duration: '4.2s', delay: '-1.1s', accent: true },
  { className: 'top-16 right-28 w-4 h-4', duration: '5.1s', delay: '-2.6s' },
  { className: 'top-28 right-12 w-3.5 h-3.5', duration: '3.8s', delay: '-0.4s' },
  { className: 'top-[38%] right-5 w-4 h-4', duration: '4.9s', delay: '-3.2s', accent: true },
  { className: 'top-[54%] right-8 w-3 h-3', duration: '4.4s', delay: '-1.8s' },
  { className: 'bottom-40 right-12 w-6 h-6', duration: '4.6s', delay: '-0.9s', accent: true },
  { className: 'bottom-28 right-32 w-4 h-4', duration: '5.4s', delay: '-2.4s' },
  { className: 'bottom-24 right-8 w-3.5 h-3.5', duration: '3.9s', delay: '-1.5s' },
  { className: 'bottom-16 right-20 w-5 h-5', duration: '5.0s', delay: '-3.6s' },
  { className: 'top-9 left-[54%] w-3.5 h-3.5', duration: '4.7s', delay: '-2.1s' },
];

const GLOW_MOTES: SparklePoint[] = [
  { className: 'top-12 right-20 w-2 h-2', duration: '6.2s', delay: '-1.2s' },
  { className: 'top-24 right-6 w-1.5 h-1.5', duration: '5.5s', delay: '-3.0s', accent: true },
  { className: 'top-[62%] right-6 w-2 h-2', duration: '6.8s', delay: '-2.2s' },
  { className: 'bottom-44 right-20 w-2.5 h-2.5', duration: '5.8s', delay: '-0.7s', accent: true },
  { className: 'bottom-32 right-16 w-1.5 h-1.5', duration: '6.4s', delay: '-4.1s' },
  { className: 'bottom-16 right-36 w-2 h-2', duration: '7.1s', delay: '-1.9s' },
];

function SparkleStar({ className, style }: { className: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path d="M12 1.5 L14.2 9.8 L22.5 12 L14.2 14.2 L12 22.5 L9.8 14.2 L1.5 12 L9.8 9.8 Z" />
    </svg>
  );
}

function LuminousBackdrop({ config }: { config: DomainVisualConfig }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none" aria-hidden="true">
      {/* Grade arquitetônica sutil com máscara radial */}
      <div
        className="absolute inset-0 opacity-50 bg-[linear-gradient(to_right,rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.045)_1px,transparent_1px)]"
        style={{
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse at 75% 45%, black 20%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 75% 45%, black 20%, transparent 80%)',
        }}
      />

      {/* Auroras e orbes luminosos animados */}
      <div
        className={`absolute -top-24 -left-24 w-80 h-80 rounded-full ${config.glow1} blur-3xl animate-float-orb`}
      />
      <div
        className={`absolute -bottom-24 -right-12 w-96 h-96 rounded-full ${config.glow2} blur-3xl animate-float-orb-delayed`}
      />
      <div
        className={`absolute top-12 -right-10 w-64 h-64 rounded-full ${config.glow3} blur-3xl animate-aurora-breathe`}
      />

      {/* Feixe diagonal suave de brilho vítreo */}
      <div className="absolute -inset-y-16 left-0 w-44 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent blur-xl animate-light-sweep" />

      {/* Anéis orbitais luminosos discretos (sem escudos) */}
      <div className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full border border-white/10 animate-slow-spin">
        <span className={`absolute top-1/2 -left-1.5 w-3 h-3 rounded-full ${config.orbitColor}`} />
      </div>
      <div className="absolute -right-32 -bottom-32 w-[26rem] h-[26rem] rounded-full border border-dashed border-white/[0.09] animate-slow-spin-reverse">
        <span className="absolute top-6 left-1/3 w-2 h-2 rounded-full bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.85)]" />
      </div>
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full border border-white/[0.08] animate-slow-spin-reverse">
        <span className={`absolute bottom-4 left-6 w-2 h-2 rounded-full ${config.orbitColor}`} />
      </div>

      {/* Partículas e estrelas cintilantes */}
      {SPARKLES.map((sp, index) => (
        <SparkleStar
          key={`sp-${index}`}
          className={`absolute animate-sparkle-twinkle drop-shadow-[0_0_8px_rgba(255,255,255,0.7)] ${
            sp.accent ? config.sparkleTint : 'text-white/90'
          } ${sp.className}`}
          style={
            {
              '--sparkle-duration': sp.duration,
              animationDelay: sp.delay,
            } as CSSProperties
          }
        />
      ))}

      {GLOW_MOTES.map((mote, index) => (
        <span
          key={`mote-${index}`}
          className={`absolute rounded-full animate-sparkle-mote ${
            mote.accent ? config.orbitColor : 'bg-white/75 shadow-[0_0_10px_rgba(255,255,255,0.8)]'
          } ${mote.className}`}
          style={
            {
              '--mote-duration': mote.duration,
              animationDelay: mote.delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function LoginInfoPanel({ activeDomain }: LoginInfoPanelProps) {
  const config = DOMAIN_CONFIGS[activeDomain] ?? DOMAIN_CONFIGS.credenciais;

  return (
    <div
      className={`hidden lg:flex w-1/2 bg-gradient-to-br ${config.gradient} text-white p-10 xl:p-12 flex-col justify-between relative overflow-hidden transition-all duration-700 select-none`}
    >
      <LuminousBackdrop config={config} />

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
