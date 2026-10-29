import { memo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { GRADE } from './estilos';
import { criarAfericaoVazia } from './estado';
import { PlusIcon, TrashIcon } from '../../../components/icons/CorporateIcons';
import type {
  Afericao,
  AnamneseCliFor45,
  Estomatograma,
  ExameFisico,
  Periodonto,
} from './tipos';
import {
  OPCOES_COR_GENGIVA,
  OPCOES_FORMA_GENGIVA,
  OPCOES_LINFONODO,
  OPCOES_TEXTURA_GENGIVA,
  REGIOES_ESTOMATOGRAMA,
} from './tipos';
import {
  Field,
  RadioGroup,
  SectionCard,
  TextAreaField,
  YesNoGroup,
} from './FormularioBase';

interface Pagina2Props {
  exameFisico: ExameFisico;
  setDados: Dispatch<SetStateAction<AnamneseCliFor45>>;
}

const CABECALHO_CELULA =
  'border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500';
const CELULA = 'border border-slate-200 px-1.5 py-1';
const CAMPO_CELULA =
  'w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-center text-xs font-medium text-slate-800 outline-none transition-colors focus:border-slate-800 focus:ring-2 focus:ring-slate-800/15';

function ReferenciaEstomatograma() {
  const [indisponivel, setIndisponivel] = useState(false);

  return (
    <figure className="flex h-full flex-col gap-2">
      {indisponivel ? (
        <div className="flex min-h-44 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
          <p className="text-[11px] font-bold text-slate-600">
            Imagem de referência indisponível
          </p>
          <p className="text-[10px] leading-relaxed text-slate-400">
            Salve o arquivo em{' '}
            <code className="font-mono text-slate-500">public/estomatograma.png</code>{' '}
            para exibi-la.
          </p>
        </div>
      ) : (
        <a
          href="/estomatograma.png"
          target="_blank"
          rel="noreferrer"
          title="Abrir imagem em tamanho real"
          className="block rounded-xl border border-slate-200 bg-white p-1 transition-colors hover:border-slate-300"
        >
          <img
            src="/estomatograma.png"
            alt="Ilustração da cavidade bucal com a localização dos lábios, gengivas, palato, mucosa jugal, língua, assoalho da boca e glândulas salivares"
            loading="lazy"
            onError={() => setIndisponivel(true)}
            className="w-full rounded-lg object-contain"
          />
        </a>
      )}
      <figcaption className="text-[10px] leading-relaxed text-slate-500">
        Referência anatômica ilustrativa. Use a numeração dos campos ao lado para registrar as
        regiões examinadas.
      </figcaption>
    </figure>
  );
}

export const Pagina2ExameFisico = memo(function Pagina2ExameFisico({
  exameFisico,
  setDados,
}: Pagina2Props) {
  const alterarExame = (patch: Partial<ExameFisico>) =>
    setDados((prev) => ({
      ...prev,
      exameFisico: { ...prev.exameFisico, ...patch },
    }));

  const alterarAfericao = (indice: number, patch: Partial<Afericao>) =>
    setDados((prev) => ({
      ...prev,
      exameFisico: {
        ...prev.exameFisico,
        afericoes: prev.exameFisico.afericoes.map((afericao, posicao) =>
          posicao === indice ? { ...afericao, ...patch } : afericao
        ),
      },
    }));

  const adicionarAfericao = () =>
    setDados((prev) => ({
      ...prev,
      exameFisico: {
        ...prev.exameFisico,
        afericoes: [...prev.exameFisico.afericoes, criarAfericaoVazia()],
      },
    }));

  const removerAfericao = (indice: number) =>
    setDados((prev) => ({
      ...prev,
      exameFisico: {
        ...prev.exameFisico,
        afericoes: prev.exameFisico.afericoes.filter(
          (_, posicao) => posicao !== indice
        ),
      },
    }));

  const alterarEstomatograma = (patch: Partial<Estomatograma>) =>
    setDados((prev) => ({
      ...prev,
      exameFisico: {
        ...prev.exameFisico,
        estomatograma: { ...prev.exameFisico.estomatograma, ...patch },
      },
    }));

  const alterarPeriodonto = (patch: Partial<Periodonto>) =>
    setDados((prev) => ({
      ...prev,
      exameFisico: {
        ...prev.exameFisico,
        periodonto: { ...prev.exameFisico.periodonto, ...patch },
      },
    }));

  const alternarRegiao = (numero: number) =>
    setDados((prev) => {
      const atuais = prev.exameFisico.estomatograma.regioes;
      const regioes = atuais.includes(numero)
        ? atuais.filter((item) => item !== numero)
        : [...atuais, numero].sort((a, b) => a - b);

      return {
        ...prev,
        exameFisico: {
          ...prev.exameFisico,
          estomatograma: { ...prev.exameFisico.estomatograma, regioes },
        },
      };
    });

  return (
    <>
      <SectionCard id="cli45-p2-secao-1" numero={1} titulo="Exame Físico">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr>
                <th className={CABECALHO_CELULA}>PA</th>
                <th className={CABECALHO_CELULA}>FC</th>
                <th className={CABECALHO_CELULA}>FR</th>
                <th className={CABECALHO_CELULA}>T</th>
                <th className={CABECALHO_CELULA}>Dia</th>
                <th className={`${CABECALHO_CELULA} w-10`} aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {exameFisico.afericoes.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="border border-slate-200 px-2 py-3 text-center text-[11px] text-slate-400"
                  >
                    Nenhuma aferição registrada.
                  </td>
                </tr>
              )}
              {exameFisico.afericoes.map((afericao, indice) => (
                <tr key={indice}>
                  <td className={CELULA}>
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={afericao.sistolica}
                        onChange={(e) =>
                          alterarAfericao(indice, { sistolica: e.target.value })
                        }
                        aria-label={`Pressão arterial sistólica da linha ${indice + 1}`}
                        placeholder="120"
                        className={CAMPO_CELULA}
                      />
                      <span className="text-[11px] font-bold text-slate-400">x</span>
                      <input
                        type="text"
                        value={afericao.diastolica}
                        onChange={(e) =>
                          alterarAfericao(indice, { diastolica: e.target.value })
                        }
                        aria-label={`Pressão arterial diastólica da linha ${indice + 1}`}
                        placeholder="80"
                        className={CAMPO_CELULA}
                      />
                    </div>
                  </td>
                  <td className={CELULA}>
                    <input
                      type="text"
                      value={afericao.fc}
                      onChange={(e) => alterarAfericao(indice, { fc: e.target.value })}
                      aria-label={`Frequência cardíaca da linha ${indice + 1}`}
                      placeholder="bpm"
                      className={CAMPO_CELULA}
                    />
                  </td>
                  <td className={CELULA}>
                    <input
                      type="text"
                      value={afericao.fr}
                      onChange={(e) => alterarAfericao(indice, { fr: e.target.value })}
                      aria-label={`Frequência respiratória da linha ${indice + 1}`}
                      placeholder="rpm"
                      className={CAMPO_CELULA}
                    />
                  </td>
                  <td className={CELULA}>
                    <input
                      type="text"
                      value={afericao.temperatura}
                      onChange={(e) =>
                        alterarAfericao(indice, { temperatura: e.target.value })
                      }
                      aria-label={`Temperatura da linha ${indice + 1}`}
                      placeholder="°C"
                      className={CAMPO_CELULA}
                    />
                  </td>
                  <td className={CELULA}>
                    <input
                      type="date"
                      value={afericao.dia}
                      onChange={(e) => alterarAfericao(indice, { dia: e.target.value })}
                      aria-label={`Data da aferição da linha ${indice + 1}`}
                      className={CAMPO_CELULA}
                    />
                  </td>
                  <td className={`${CELULA} text-center`}>
                    <button
                      type="button"
                      onClick={() => removerAfericao(indice)}
                      aria-label={`Remover ${indice + 1}ª linha do exame físico`}
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
          onClick={adicionarAfericao}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Adicionar linha
        </button>
      </SectionCard>

      <SectionCard id="cli45-p2-secao-2" numero={2} titulo="Extrabucal">
        <YesNoGroup
          label="Assimetrias"
          valor={exameFisico.assimetrias}
          onChange={(valor) => alterarExame({ assimetrias: valor })}
        />
        <RadioGroup
          label="Linfonodos"
          valor={exameFisico.linfonodos}
          opcoes={OPCOES_LINFONODO}
          onChange={(valor) => alterarExame({ linfonodos: valor })}
        />
      </SectionCard>

      <SectionCard id="cli45-p2-secao-3" numero={3} titulo="Intrabucal — Estomatograma">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
          <div className="space-y-4">
            <div>
              <span className="mb-1 block text-[11px] font-bold text-slate-600">
                Regiões da cavidade bucal
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REGIOES_ESTOMATOGRAMA.map((regiao) => {
                  const ativo = exameFisico.estomatograma.regioes.includes(regiao.numero);
                  return (
                    <label
                      key={regiao.numero}
                      className={`relative cursor-pointer rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                        ativo
                          ? 'border-slate-900 bg-slate-100 text-slate-900'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={ativo}
                        onChange={() => alternarRegiao(regiao.numero)}
                      />
                      <span className="mr-1 font-mono">({regiao.numero})</span>
                      {regiao.rotulo}
                    </label>
                  );
                })}
              </div>
            </div>

            <Field
              label="Alteração encontrada"
              value={exameFisico.estomatograma.alteracao}
              onChange={(valor) => alterarEstomatograma({ alteracao: valor })}
            />

            <TextAreaField
              label="Descrição da lesão"
              rows={4}
              value={exameFisico.estomatograma.descricao}
              onChange={(valor) => alterarEstomatograma({ descricao: valor })}
            />
          </div>

          <ReferenciaEstomatograma />
        </div>
      </SectionCard>

      <SectionCard id="cli45-p2-secao-4" numero={4} titulo="Periodonto">
        <RadioGroup
          label="Cor"
          valor={exameFisico.periodonto.cor}
          opcoes={OPCOES_COR_GENGIVA}
          onChange={(valor) => alterarPeriodonto({ cor: valor })}
        />
        <RadioGroup
          label="Textura"
          valor={exameFisico.periodonto.textura}
          opcoes={OPCOES_TEXTURA_GENGIVA}
          onChange={(valor) => alterarPeriodonto({ textura: valor })}
        />
        <RadioGroup
          label="Forma"
          valor={exameFisico.periodonto.forma}
          opcoes={OPCOES_FORMA_GENGIVA}
          onChange={(valor) => alterarPeriodonto({ forma: valor })}
        />
        <div className={GRADE}>
          <TextAreaField
            className="sm:col-span-2 lg:col-span-3"
            label="Observações"
            rows={2}
            value={exameFisico.periodonto.observacoes}
            onChange={(valor) => alterarPeriodonto({ observacoes: valor })}
          />
        </div>
      </SectionCard>
    </>
  );
});
