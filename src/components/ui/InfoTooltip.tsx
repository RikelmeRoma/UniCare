import { useId } from 'react';
import { QuestionMarkCircleIcon } from '../icons/CorporateIcons';

interface InfoTooltipProps {
  texto: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

/**
 * Ícone de interrogação com a explicação que antes ficava escrita na tela.
 *
 * O texto continua no DOM e ligado ao botão por `aria-describedby`, então
 * leitores de tela o anunciam mesmo sem hover. O tooltip abre no hover e no
 * foco por teclado (`group-focus-within`), sem estado React.
 */
export function InfoTooltip({ texto, align = 'center', className = '' }: InfoTooltipProps) {
  const id = useId();

  const posicao =
    align === 'left'
      ? 'left-0'
      : align === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2';

  return (
    <span className={`group relative inline-flex shrink-0 items-center align-middle ${className}`}>
      <button
        type="button"
        aria-describedby={id}
        aria-label="Mais informações"
        className="inline-flex h-5 w-5 -my-1 cursor-help items-center justify-center rounded-full text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
      >
        <QuestionMarkCircleIcon className="h-4 w-4" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none invisible absolute top-full z-50 mt-1.5 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-[11px] font-normal normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${posicao}`}
      >
        {texto}
      </span>
    </span>
  );
}
