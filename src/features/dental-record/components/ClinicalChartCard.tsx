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
      className={`bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}
