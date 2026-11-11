import { LockClosedIcon } from '../../../components/icons/CorporateIcons';

export function AuthFooter() {
  return (
    <footer className="px-6 sm:px-8 py-5 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-[#0B1220]/90 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 transition-colors">
      <p>© 2026 UniCare UNINASSAU • Todos os direitos reservados.</p>
      <div className="flex items-center gap-4 mt-3 md:mt-0 font-medium">
        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
          <LockClosedIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Conexão Segura TLS 1.3</span>
        </span>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Normativa LGPD</a>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Termos & Privacidade</a>
      </div>
    </footer>
  );
}