import { useCallback, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { PrinterIcon, XMarkIcon } from '../../../components/icons/CorporateIcons';
import './relatorio.css';

interface RelatorioImpressaoProps {
  /** Título mostrado na barra da prévia e no rodapé do papel. */
  titulo: string;
  /** Sugestão de nome de arquivo (sem `.pdf`). Vira `document.title` na impressão. */
  nomeArquivo: string;
  children: ReactNode;
  onClose: () => void;
}

/**
 * Moldura de impressão do relatório.
 *
 * Renderiza num portal em `document.body`, fora do `#root`. É o que resolve a
 * "impressão que parece print de tela": o layout da aplicação usa
 * `h-screen overflow-hidden` com `<main overflow-y-auto>`, então o
 * `window.print()` capturava só o pedaço visível, com sidebar e abas. No
 * `@media print` (ver `relatorio.css`) o `#root` é escondido e sobra apenas
 * este documento — texto vetorial, selecionável, paginado em A4.
 */
export function RelatorioImpressao({
  titulo,
  nomeArquivo,
  children,
  onClose,
}: RelatorioImpressaoProps) {
  const fechar = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    // Guardado no mount para o caso de a prévia fechar durante o diálogo de
    // impressão: sem isso o nome do arquivo ficaria como título da aba.
    const tituloAnterior = document.title;
    // Trava a rolagem do app enquanto a prévia está aberta: sem isso o rodapé
    // do painel aparece por baixo do papel.
    document.body.style.overflow = 'hidden';

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') fechar();
    };
    window.addEventListener('keydown', aoTeclar);

    return () => {
      window.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
      document.title = tituloAnterior;
    };
  }, [fechar]);

  const imprimir = () => {
    // O Chrome usa `document.title` como nome sugerido do arquivo. A troca
    // vale só durante o diálogo: o `afterprint` devolve o título da aba.
    const tituloAnterior = document.title;
    document.title = nomeArquivo;

    const restaurar = () => {
      document.title = tituloAnterior;
      window.removeEventListener('afterprint', restaurar);
    };
    window.addEventListener('afterprint', restaurar);

    window.print();
  };

  return createPortal(
    <div className="relatorio-impressao fixed inset-0 z-50 overflow-auto bg-slate-700/95">
      <div className="relatorio-impressao__barra sticky top-0 z-10 bg-[#002B49] text-white shadow-lg">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#FFD100]">
              Prévia do documento
            </p>
            <p className="truncate text-sm font-semibold">{titulo}</p>
            <p className="mt-0.5 text-[10px] text-slate-300">
              No diálogo de impressão, escolha <strong>Salvar como PDF</strong>.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={imprimir}
              className="flex items-center gap-2 rounded-lg bg-[#FFD100] px-3.5 py-2 text-xs font-bold text-[#002B49] transition-colors hover:bg-[#e6bd00]"
            >
              <PrinterIcon className="h-4 w-4" />
              <span>Imprimir / Salvar em PDF</span>
            </button>
            <button
              type="button"
              onClick={fechar}
              className="flex items-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
              title="Fechar prévia (Esc)"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Fechar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relatorio-doc mx-auto my-6 shadow-2xl">{children}</div>
    </div>,
    document.body
  );
}
