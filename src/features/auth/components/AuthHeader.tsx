import { MapPinIcon } from '../../../components/icons/CorporateIcons';
import { ThemeToggle } from '../../../components/ui/ThemeToggle';

export function AuthHeader() {
  return (
    <header className="flex justify-between items-center px-6 sm:px-8 py-3.5 bg-white/90 dark:bg-[#0B1220]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 shadow-2xs transition-colors">
      <div className="flex items-center gap-3.5">
        <div className="h-11 w-11 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
          <img
            src="/uninassau-crest.png"
            alt="Brasão Oficial UNINASSAU Veritas"
            className="h-8 w-auto object-contain"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
              UniCare Enterprise Health
            </h1>
            <span className="bg-[#002B49] dark:bg-blue-900 text-white text-[9px] font-bold px-2 py-0.5 rounded tracking-wider uppercase border border-[#001D33] dark:border-blue-700 inline-flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD100]"></span>
              <span className="font-mono">UNINASSAU</span>
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            Hospital-Escola Integrado • Clínicas de Psicologia &amp; Odontologia
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2.5 sm:gap-3 text-xs font-semibold">
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <MapPinIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Campus Aracaju</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}