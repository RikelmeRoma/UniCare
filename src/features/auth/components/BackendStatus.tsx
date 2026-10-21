import { useCallback, useEffect, useState } from 'react';
import { api, type ApiHealth } from '../../../services/api';

/**
 * Estado real do serviço, consultado no `/health` do backend.
 *
 * Antes esta tela mostrava um ponto verde pulsante com "API Backend" e o
 * rótulo fixo "FastAPI • Porta 8000" — dois dados que não eram medidos: o
 * ponto era verde mesmo com a API fora do ar, e a porta não é 8000 em
 * produção. A tela prometia um serviço que ela não checava.
 *
 * A distinção que importa: **a API responder não basta**. Sem banco não há
 * login, e o `/health` já separa os dois casos (`status: degraded` com
 * `conectado: false`). Dizer "disponível" com o banco fora seria mentira.
 */
type EstadoServico = 'disponivel' | 'indisponivel';

interface Classificacao {
  estado: EstadoServico;
  detalhe: string;
}

/** Traduz a resposta do `/health` no que a tela mostra. */
function classificar(info: ApiHealth): Classificacao {
  if (info.conectado === false || info.status === 'degraded') {
    return {
      estado: 'indisponivel',
      detalhe: 'servidor no ar, banco de dados inacessível',
    };
  }
  return { estado: 'disponivel', detalhe: '' };
}

export function BackendStatus() {
  // `null` = a primeira consulta ainda não respondeu. Depois disso o estado
  // conhecido continua na tela enquanto a reconsulta acontece, para não
  // piscar "Verificando…" a cada retorno de aba.
  const [estado, setEstado] = useState<EstadoServico | null>(null);
  const [detalhe, setDetalhe] = useState('');

  // Reconsulta usada pelo evento de visibilidade (aba voltando ao foco):
  // quem deixou a tela em segundo plano enquanto a API caía ou subia volta
  // a ver a verdade, sem precisar de clique.
  const consultar = useCallback(() => {
    api
      .health()
      .then((info) => {
        const resultado = classificar(info);
        setEstado(resultado.estado);
        setDetalhe(resultado.detalhe);
      })
      .catch(() => {
        setEstado('indisponivel');
        setDetalhe('sem resposta do servidor');
      });
  }, []);

  useEffect(() => {
    let cancelado = false;

    api
      .health()
      .then((info) => {
        if (cancelado) return;
        const resultado = classificar(info);
        setEstado(resultado.estado);
        setDetalhe(resultado.detalhe);
      })
      .catch(() => {
        if (cancelado) return;
        setEstado('indisponivel');
        setDetalhe('sem resposta do servidor');
      });

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        consultar();
      }
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      cancelado = true;
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [consultar]);

  const rotulo =
    estado === null
      ? 'Verificando o serviço…'
      : estado === 'disponivel'
        ? 'Serviço disponível'
        : 'Serviço indisponível';

  const corDoPonto =
    estado === null ? 'bg-slate-400' : estado === 'disponivel' ? 'bg-emerald-500' : 'bg-rose-500';

  return (
    <div className="flex items-center justify-between text-[11px] text-slate-500">
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${corDoPonto} ${estado === null ? 'animate-pulse' : ''}`}></span>
        <span className={`font-semibold ${estado === 'indisponivel' ? 'text-rose-700' : 'text-slate-700'}`}>
          {rotulo}
        </span>
      </span>
      {detalhe && (
        <span className="text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
          {detalhe}
        </span>
      )}
    </div>
  );
}
