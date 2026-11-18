import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
} from '../icons/CorporateIcons';

export interface OpcaoSeletor {
  id: number;
  rotulo: string;
  detalhe?: string;
}

interface SeletorComBuscaProps {
  rotulo: string;
  opcoes: OpcaoSeletor[];
  valor: number | undefined;
  onSelecionar: (id: number) => void;
  placeholderBusca?: string;
  exibirDetalheNoGatilho?: boolean;
  vazio?: string;
  /** Texto de aviso que substitui o seletor (vínculo ausente, falha de carga). */
  aviso?: string;
  className?: string;
}

/** Compara sem acento e sem caixa: "José" e "jose" caem na mesma busca. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

function contagem(total: number): string {
  return `${total} ${total === 1 ? 'paciente' : 'pacientes'}`;
}

/**
 * Seletor com busca embutida: o gatilho tem a mesma aparência do `<select>`
 * que substitui e, ao abrir, mostra um campo de busca e a lista filtrada.
 *
 * A lista cresce com a clínica, então a busca é local (o array de pacientes já
 * vem carregado do contexto) e casa por nome — ignorando acento e caixa — ou
 * por CPF, comparando apenas os dígitos a partir de três.
 */
export function SeletorComBusca({
  rotulo,
  opcoes,
  valor,
  onSelecionar,
  placeholderBusca = 'Buscar por nome...',
  exibirDetalheNoGatilho = false,
  vazio = 'Nenhum paciente disponível.',
  aviso,
  className = 'w-64 sm:w-72',
}: SeletorComBuscaProps) {
  const idBase = useId();
  const idRotulo = `${idBase}-rotulo`;
  const idValor = `${idBase}-valor`;
  const idLista = `${idBase}-lista`;

  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const selecionada = opcoes.find((opcao) => opcao.id === valor);

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);
    if (!termo) return opcoes;
    const digitos = apenasDigitos(busca);
    return opcoes.filter(
      (opcao) =>
        normalizar(opcao.rotulo).includes(termo) ||
        (digitos.length >= 3 && apenasDigitos(opcao.detalhe ?? '').includes(digitos))
    );
  }, [opcoes, busca]);

  // O foco vai para a busca assim que o painel abre; sem isso o usuário de
  // teclado teria que tabular até o campo.
  useEffect(() => {
    if (aberto) buscaRef.current?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (evento: MouseEvent) => {
      if (!containerRef.current?.contains(evento.target as Node)) {
        setAberto(false);
        setBusca('');
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    listaRef.current
      ?.querySelector<HTMLElement>(`[data-indice="${indiceAtivo}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [aberto, indiceAtivo]);

  const abrir = () => {
    const indiceSelecionado = opcoes.findIndex((opcao) => opcao.id === valor);
    setIndiceAtivo(indiceSelecionado >= 0 ? indiceSelecionado : 0);
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setBusca('');
  };

  const selecionar = (id: number) => {
    onSelecionar(id);
    fechar();
    gatilhoRef.current?.focus();
  };

  const aoTeclar = (evento: KeyboardEvent<HTMLDivElement>) => {
    if (!aberto) {
      if (evento.key === 'ArrowDown') {
        evento.preventDefault();
        abrir();
      }
      return;
    }

    if (evento.key === 'Escape') {
      evento.preventDefault();
      fechar();
      gatilhoRef.current?.focus();
      return;
    }

    if (filtradas.length === 0) return;

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setIndiceAtivo((atual) => Math.min(atual + 1, filtradas.length - 1));
      return;
    }

    if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setIndiceAtivo((atual) => Math.max(atual - 1, 0));
      return;
    }

    if (evento.key === 'Enter') {
      const opcao = filtradas[indiceAtivo];
      if (opcao) {
        evento.preventDefault();
        selecionar(opcao.id);
      }
      return;
    }

    if (evento.key === 'Tab') {
      // Sem isto o painel desmonta com o foco dentro dele e o Tab recomeça do
      // body; parar no gatilho mantém a ordem de tabulação previsível.
      evento.preventDefault();
      fechar();
      gatilhoRef.current?.focus();
    }
  };

  const textoGatilho = selecionada
    ? exibirDetalheNoGatilho && selecionada.detalhe
      ? `${selecionada.rotulo} (${selecionada.detalhe})`
      : selecionada.rotulo
    : opcoes.length === 0
      ? vazio
      : 'Selecione um paciente';

  return (
    <div ref={containerRef} className={`relative ${className}`} onKeyDown={aoTeclar}>
      <span
        id={idRotulo}
        className="mb-1 block text-[10px] font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400"
      >
        {rotulo}
      </span>

      {aviso ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-200">
          {aviso}
        </p>
      ) : (
        <>
          <button
            ref={gatilhoRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={aberto}
            aria-controls={idLista}
            aria-labelledby={`${idRotulo} ${idValor}`}
            disabled={opcoes.length === 0}
            onClick={() => (aberto ? fechar() : abrir())}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-600 dark:disabled:text-slate-500"
          >
            <span id={idValor} className="truncate">
              {textoGatilho}
            </span>
            <ChevronDownIcon
              className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${
                aberto ? 'rotate-180' : ''
              }`}
            />
          </button>

          {aberto && (
            <div className="absolute right-0 left-0 z-40 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-[#0E1729]">
              <div className="border-b border-slate-200 p-2 dark:border-slate-700">
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    ref={buscaRef}
                    type="text"
                    role="combobox"
                    aria-expanded={aberto}
                    aria-controls={idLista}
                    aria-autocomplete="list"
                    aria-activedescendant={
                      filtradas[indiceAtivo]
                        ? `${idBase}-opcao-${filtradas[indiceAtivo].id}`
                        : undefined
                    }
                    aria-label={placeholderBusca}
                    value={busca}
                    onChange={(evento) => {
                      setBusca(evento.target.value);
                      setIndiceAtivo(0);
                    }}
                    placeholder={placeholderBusca}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pr-2 pl-8 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>

              <ul
                ref={listaRef}
                id={idLista}
                role="listbox"
                aria-labelledby={idRotulo}
                className="max-h-64 overflow-y-auto py-1"
              >
                {filtradas.length === 0 ? (
                  <li className="px-3 py-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
                    Nenhum paciente encontrado.
                  </li>
                ) : (
                  filtradas.map((opcao, indice) => {
                    const ativa = indice === indiceAtivo;
                    const selecionadaAgora = opcao.id === valor;
                    return (
                      <li
                        key={opcao.id}
                        id={`${idBase}-opcao-${opcao.id}`}
                        role="option"
                        aria-selected={selecionadaAgora}
                        data-indice={indice}
                        onMouseEnter={() => setIndiceAtivo(indice)}
                        onClick={() => selecionar(opcao.id)}
                        className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-xs ${
                          ativa
                            ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-100'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{opcao.rotulo}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {opcao.detalhe && (
                            <span className="font-mono text-[10px] text-slate-400 tabular-nums dark:text-slate-500">
                              {opcao.detalhe}
                            </span>
                          )}
                          {selecionadaAgora && (
                            <CheckIcon className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                          )}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>

              <p className="border-t border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-400 dark:border-slate-700 dark:text-slate-500">
                {busca.trim()
                  ? `${filtradas.length} de ${contagem(opcoes.length)}`
                  : contagem(opcoes.length)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
