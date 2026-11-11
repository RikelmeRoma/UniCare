import { useTheme } from '../../context/themeState';
import { MoonIcon, SunIcon } from '../icons/CorporateIcons';

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      data-testid="theme-toggle"
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-slate-50/90 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-2xs transition-all hover:bg-white hover:border-slate-300 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-600 cursor-pointer"
    >
      {isDark ? (
        <SunIcon className="w-3.5 h-3.5 text-[#FFD100]" />
      ) : (
        <MoonIcon className="w-3.5 h-3.5 text-[#002B49]" />
      )}
      {!compact && (
        <span className="hidden sm:inline">
          {isDark ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      )}
    </button>
  );
}
