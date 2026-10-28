import type { Dispatch, SetStateAction } from 'react';
import type {
  AnamneseInfantil,
  EvolucaoInfantilLinha,
  TermoInfantil,
} from './tipos';
import { TERMO_INFANTIL } from './constantes';
import { PlusIcon, TrashIcon } from '../../../components/icons/CorporateIcons';
import {
  Field,
  SectionCard,
  SignatureField,
} from '../anamnese/FormularioBase';

interface EvolucaoProps {
  evolucao: EvolucaoInfantilLinha[];
  setDados: Dispatch<SetStateAction<AnamneseInfantil>>;
}

interface TermoProps {
  termo: TermoInfantil;
  setDados: Dispatch<SetStateAction<AnamneseInfantil>>;
}

interface Pagina6Props extends EvolucaoProps, TermoProps {}

const CABECALHO_CELULA =
  'border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500';
const CELULA = 'border border-slate-200 px-1.5 py-1';
const CAMPO_CELULA =
  'w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-medium text-slate-800 outline-none transition-colors focus:border-slate-800 focus:ring-2 focus:ring-slate-800/15';

export function EvolucaoInfantilSection({
  evolucao,
  setDados,
}: EvolucaoProps) {
  const alterarEvolucao = (
    indice: number,
    patch: Partial<EvolucaoInfantilLinha>
  ) =>
    setDados((prev) => ({
      ...prev,
      evolucao: prev.evolucao.map((linha, posicao) =>
        posicao === indice ? { ...linha, ...patch } : linha
      ),
    }));

  const adicionarEvolucao = () =>
    setDados((prev) => ({
      ...prev,
      evolucao: [
        ...prev.evolucao,
        { data: '', procedimento: '', assinaturaProfessor: '' },
      ],
    }));

  const removerEvolucao = (indice: number) =>
    setDados((prev) => ({
      ...prev,
      evolucao: prev.evolucao.filter((_, posicao) => posicao !== indice),
    }));

  return (
    <SectionCard
      id="anamnese-infantil-p6-secao-2"
      numero={1}
      titulo="Sequência Favorável do Plano de Tratamento (Evolução por Sessão)"
      descricao="Registre a data, o procedimento ou segmento realizado e a assinatura do professor responsável."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr>
              <th className={`${CABECALHO_CELULA} w-36`}>Data</th>
              <th className={CABECALHO_CELULA}>Procedimento/Segmento</th>
              <th className={`${CABECALHO_CELULA} w-56`}>
                Assinatura do Professor
              </th>
              <th className={`${CABECALHO_CELULA} w-10`} aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {evolucao.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="border border-slate-200 px-2 py-3 text-center text-[11px] text-slate-400"
                >
                  Nenhuma sessão registrada.
                </td>
              </tr>
            )}
            {evolucao.map((linha, indice) => (
              <tr key={indice}>
                <td className={CELULA}>
                  <input
                    type="date"
                    value={linha.data}
                    onChange={(e) =>
                      alterarEvolucao(indice, { data: e.target.value })
                    }
                    aria-label={`Data da ${indice + 1}ª sessão`}
                    className={CAMPO_CELULA}
                  />
                </td>
                <td className={CELULA}>
                  <input
                    type="text"
                    value={linha.procedimento}
                    onChange={(e) =>
                      alterarEvolucao(indice, {
                        procedimento: e.target.value,
                      })
                    }
                    aria-label={`Procedimento da ${indice + 1}ª sessão`}
                    className={CAMPO_CELULA}
                  />
                </td>
                <td className={CELULA}>
                  <input
                    type="text"
                    value={linha.assinaturaProfessor}
                    onChange={(e) =>
                      alterarEvolucao(indice, {
                        assinaturaProfessor: e.target.value,
                      })
                    }
                    aria-label={`Assinatura do professor da ${indice + 1}ª sessão`}
                    className={CAMPO_CELULA}
                  />
                </td>
                <td className={`${CELULA} text-center`}>
                  <button
                    type="button"
                    onClick={() => removerEvolucao(indice)}
                    aria-label={`Remover ${indice + 1}ª sessão`}
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-900"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={adicionarEvolucao}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Adicionar sessão
      </button>
    </SectionCard>
  );
}

export function TermoInfantilSection({ termo, setDados }: TermoProps) {
  const alterarTermo = (patch: Partial<TermoInfantil>) =>
    setDados((prev) => ({
      ...prev,
      termo: { ...prev.termo, ...patch },
    }));

  return (
    <SectionCard
      id="anamnese-infantil-p6-secao-3"
      numero={9}
      titulo="Termo de Veracidade e Assinaturas"
    >
      <p className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-600">
        {TERMO_INFANTIL}
      </p>

      <Field
        label="Data"
        type="date"
        value={termo.data}
        onChange={(valor) => alterarTermo({ data: valor })}
      />

      <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-3">
        <SignatureField
          label="Assinatura do Responsável"
          value={termo.assinaturaResponsavel}
          onChange={(valor) => alterarTermo({ assinaturaResponsavel: valor })}
        />
        <SignatureField
          label="Assinatura do Aluno Responsável 1"
          value={termo.assinaturaAluno1}
          onChange={(valor) => alterarTermo({ assinaturaAluno1: valor })}
        />
        <SignatureField
          label="Assinatura do Aluno Responsável 2"
          value={termo.assinaturaAluno2}
          onChange={(valor) => alterarTermo({ assinaturaAluno2: valor })}
        />
      </div>
    </SectionCard>
  );
}

export function Pagina6EvolucaoTermo({
  evolucao,
  termo,
  setDados,
}: Pagina6Props) {
  return (
    <>
      <EvolucaoInfantilSection evolucao={evolucao} setDados={setDados} />
      <TermoInfantilSection termo={termo} setDados={setDados} />
    </>
  );
}
