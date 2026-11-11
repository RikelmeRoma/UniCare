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
    <div className="bg-white dark:bg-[#0E1729] p-1 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex overflow-x-auto transition-colors">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-current={activeTab === key ? 'page' : undefined}
          className={`flex-1 whitespace-nowrap py-2.5 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === key
              ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
