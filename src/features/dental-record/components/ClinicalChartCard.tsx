import type { ReactNode } from 'react';

interface ClinicalChartCardProps {
  children: ReactNode;
  className?: string;
}

export function ClinicalChartCard({
  children,
  className = '',
}: ClinicalChartCardProps) {
  return (
    <div
      className={`bg-white dark:bg-[#0E1729] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-colors ${className}`}
    >
      {children}
    </div>
  );
}
