import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AnamneseCliFor45, EvolucaoLinha, ExameDental } from './tipos';
import { RADIOGRAFICOS } from './tipos';
import {
  CheckboxGroup,
  Field,
  InlineInput,
  SectionCard,
  SignatureField,
  TextAreaField,
} from './FormularioBase';
import { PlusIcon, TrashIcon } from '../../../components/icons/CorporateIcons';

interface SecaoProps {
  exameDental: ExameDental;
  setDados: Dispatch<SetStateAction<AnamneseCliFor45>>;
}

const PAGINA_EXAMES = 'Página 3';
const PAGINA_EVOLUCAO = 'Página 4';
const CABECALHO_CELULA =
  'border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500';
const CELULA = 'border border-slate-200 px-1.5 py-1';
const CAMPO_CELULA =
  'w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs font-medium text-slate-800 outline-none transition-colors focus:border-slate-800 focus:ring-2 focus:ring-slate-800/15';

const TERMO =
  'Declaro que fui informado(a) sobre o diagnóstico, os procedimentos e as alternativas de tratamento, e autorizo a realização dos procedimentos odontológicos necessários, bem como o registro e o uso dos meus dados clínicos para fins de acompanhamento, avaliação acadêmica e pesquisa, preservado o sigilo da minha identidade.';

export function ExamesComplementaresSection({
  exameDental,
  setDados,
}: SecaoProps) {
  const alterarExames = (patch: Partial<ExameDental['exames']>) =>
    setDados((prev) => ({
      ...prev,
      exameDental: {
        ...prev.exameDental,
        exames: { ...prev.exameDental.exames, ...patch },
      },
    }));

  return (
    <SectionCard
      id="cli45-p3-secao-1"
      pagina={PAGINA_EXAMES}
      numero={1}
      titulo="Exames Complementares"
    >
      <div className="space-y-2">
        <CheckboxGroup
          label="Radiográfico"
          opcoes={RADIOGRAFICOS}
          valores={exameDental.exames.radiografico}
          onChange={(valores) => alterarExames({ radiografico: valores })}
        />
        <InlineInput
          rotulo="Outros"
          value={exameDental.exames.radiograficoOutros}
          onChange={(valor) => alterarExames({ radiograficoOutros: valor })}
          placeholder="Especifique"
        />
      </div>
      <Field
        label="Hematológico"
        value={exameDental.exames.hematologico}
        onChange={(valor) => alterarExames({ hematologico: valor })}
      />
      <TextAreaField
        label="Outros"
        rows={2}
        value={exameDental.exames.outros}
        onChange={(valor) => alterarExames({ outros: valor })}
      />
    </SectionCard>
  );
}

export function TratamentoProgramadoSection({
  exameDental,
  setDados,
}: SecaoProps) {
  const alterarPlanejamento = (indice: number, valor: string) =>
    setDados((prev) => ({
      ...prev,
      exameDental: {
        ...prev.exameDental,
        planejamento: prev.exameDental.planejamento.map((item, posicao) =>
          posicao === indice ? valor : item
        ),
      },
    }));

  const adicionarPlanejamento = () =>
    setDados((prev) => ({
      ...prev,
      exameDental: {
        ...prev.exameDental,
        planejamento: [...prev.exameDental.planejamento, ''],
      },
    }));

  const removerPlanejamento = (indice: number) =>
    setDados((prev) => ({
      ...prev,
      exameDental: {
        ...prev.exameDental,
        planejamento: prev.exameDental.planejamento.filter(
          (_, posicao) => posicao !== indice
        ),
      },
    }));

  return (
    <SectionCard
      id="cli45-p3-secao-2"
      pagina={PAGINA_EXAMES}
      numero={2}
      titulo="Tratamento Programado"
    >
      {exameDental.planejamento.length === 0 && (
        <p className="text-[11px] text-slate-400">
          Nenhum planejamento registrado.
        </p>
      )}
      {exameDental.planejamento.map((texto, indice) => (
        <TextAreaField
          key={indice}
          label={`Planejamento ${indice + 1}`}
          rows={3}
          value={texto}
          onChange={(valor) => alterarPlanejamento(indice, valor)}
          acao={
            <button
              type="button"
              onClick={() => removerPlanejamento(indice)}
              aria-label={`Remover planejamento ${indice + 1}`}
              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-900"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          }
        />
      ))}

      <button
        type="button"
        onClick={adicionarPlanejamento}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
      >
        <PlusIcon className="h-3.5 w-3.5" />
        Adicionar linha
      </button>
    </SectionCard>
  );
}

export function TermoAutorizacaoSection({
  exameDental,
  setDados,
}: SecaoProps) {
  const alterarTermo = (patch: Partial<ExameDental['termo']>) =>
    setDados((prev) => ({
      ...prev,
      exameDental: {
        ...prev.exameDental,
        termo: { ...prev.exameDental.termo, ...patch },
      },
    }));

  return (
    <SectionCard
      id="cli45-p3-secao-3"
      pagina={PAGINA_EXAMES}
      numero={3}
      titulo="Termo de Autorização"
    >
      <p className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs leading-relaxed text-slate-600">
        {TERMO}
      </p>

      <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-3">
        <SignatureField
          label="Assinatura do Paciente/Responsável"
          value={exameDental.termo.paciente}
          onChange={(valor) => alterarTermo({ paciente: valor })}
        />
        <SignatureField
          label="Assinatura do Discente + Carimbo"
          value={exameDental.termo.discente}
          onChange={(valor) => alterarTermo({ discente: valor })}
        />
        <SignatureField
          label="Assinatura do Professor + Carimbo"
          value={exameDental.termo.professor}
          onChange={(valor) => alterarTermo({ professor: valor })}
        />
      </div>
    </SectionCard>
  );
}

export function EvolucaoAdultoSection({
  exameDental,
  setDados,
}: SecaoProps) {
  const alterarEvolucao = (indice: number, patch: Partial<EvolucaoLinha>) =>
    setDados((prev) => ({
      ...prev,
      exameDental: {
        ...prev.exameDental,
        evolucao: prev.exameDental.evolucao.map((linha, posicao) =>
          posicao === indice ? { ...linha, ...patch } : linha
        ),
      },
    }));

  const adicionarEvolucao = () =>
    setDados((prev) => ({
      ...prev,
      exameDental: {
        ...prev.exameDental,
        evolucao: [
          ...prev.exameDental.evolucao,
          { data: '', intervencao: '', assinaturaDocente: '' },
        ],
      },
    }));

  const removerEvolucao = (indice: number) =>
    setDados((prev) => ({
      ...prev,
      exameDental: {
        ...prev.exameDental,
        evolucao: prev.exameDental.evolucao.filter(
          (_, posicao) => posicao !== indice
        ),
      },
    }));

  return (
    <SectionCard
      id="cli45-p3-secao-4"
      pagina={PAGINA_EVOLUCAO}
      numero={4}
      titulo="Folha de Evolução"
      descricao="Registre as intervenções realizadas, a data e a assinatura do docente responsável."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse">
          <thead>
            <tr>
              <th className={`${CABECALHO_CELULA} w-36`}>Data</th>
              <th className={CABECALHO_CELULA}>Intervenção</th>
              <th className={`${CABECALHO_CELULA} w-56`}>
                Assinatura do Docente (carimbo)
              </th>
              <th className={`${CABECALHO_CELULA} w-10`} aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {exameDental.evolucao.map((linha, indice) => (
              <tr key={indice}>
                <td className={CELULA}>
                  <input
                    type="date"
                    value={linha.data}
                    onChange={(e) =>
                      alterarEvolucao(indice, { data: e.target.value })
                    }
                    aria-label={`Data da ${indice + 1}ª evolução`}
                    className={CAMPO_CELULA}
                  />
                </td>
                <td className={CELULA}>
                  <input
                    type="text"
                    value={linha.intervencao}
                    onChange={(e) =>
                      alterarEvolucao(indice, { intervencao: e.target.value })
                    }
                    aria-label={`Intervenção da ${indice + 1}ª evolução`}
                    className={CAMPO_CELULA}
                  />
                </td>
                <td className={CELULA}>
                  <input
                    type="text"
                    value={linha.assinaturaDocente}
                    onChange={(e) =>
                      alterarEvolucao(indice, {
                        assinaturaDocente: e.target.value,
                      })
                    }
                    aria-label={`Assinatura do docente da ${indice + 1}ª evolução`}
                    className={CAMPO_CELULA}
                  />
                </td>
                <td className={`${CELULA} text-center`}>
                  <button
                    type="button"
                    onClick={() => removerEvolucao(indice)}
                    aria-label={`Remover ${indice + 1}ª linha da evolução`}
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
        Adicionar linha
      </button>

      <p className="text-[10px] leading-relaxed text-slate-400">
        Documento CLI-FOR-45 preenchido localmente. A assinatura e o carimbo docente
        passam pela homologação no prontuário após a integração com o servidor.
      </p>
    </SectionCard>
  );
}

export const Pagina3DentesPlano = memo(function Pagina3DentesPlano({
  exameDental,
  setDados,
}: SecaoProps) {
  return (
    <>
      <ExamesComplementaresSection
        exameDental={exameDental}
        setDados={setDados}
      />
      <TratamentoProgramadoSection
        exameDental={exameDental}
        setDados={setDados}
      />
      <TermoAutorizacaoSection exameDental={exameDental} setDados={setDados} />
      <EvolucaoAdultoSection exameDental={exameDental} setDados={setDados} />
    </>
  );
});
