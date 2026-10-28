import type { ComponentType } from 'react';

export type ClinicalTabKey =
  | 'anamnese'
  | 'alertas'
  | 'exame'
  | 'plano'
  | 'evolucao'
  | 'exames';

export interface ClinicalTab {
  key: ClinicalTabKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

interface ClinicalTabNavProps {
  tabs: ClinicalTab[];
  activeTab: ClinicalTabKey;
  onChange: (tab: ClinicalTabKey) => void;
}

export function ClinicalTabNav({
  tabs,
  activeTab,
  onChange,
}: ClinicalTabNavProps) {
  return (
    <div className="bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs flex overflow-x-auto">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-current={activeTab === key ? 'page' : undefined}
          className={`flex-1 whitespace-nowrap py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === key
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
