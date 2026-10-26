import type { Dispatch, SetStateAction } from 'react';
import type {
  AnamneseInfantil,
  DiarioAlimentarInfantil,
  MapaHigieneInfantilDados,
  OdontogramaInfantilDados,
} from './tipos';
import { atualizarTripla } from './estado';
import {
  InlineTextInput,
  SectionCard,
  TextAreaField,
} from '../anamnese/FormularioBase';
import { MapaHigieneInfantil } from './MapaHigieneInfantil';
import { OdontogramaInfantil } from './OdontogramaInfantil';

interface MapaProps {
  mapaHigiene: MapaHigieneInfantilDados;
  setDados: Dispatch<SetStateAction<AnamneseInfantil>>;
}

interface DiarioProps {
  diarioAlimentar: DiarioAlimentarInfantil;
  setDados: Dispatch<SetStateAction<AnamneseInfantil>>;
}

interface OdontogramaProps {
  odontograma: OdontogramaInfantilDados;
  setDados: Dispatch<SetStateAction<AnamneseInfantil>>;
}

interface Pagina4Props extends MapaProps, DiarioProps, OdontogramaProps {}

const PAGINA = 'Página 4';
const CABECALHO_CELULA =
  'border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500';
const CELULA = 'border border-slate-200 px-2 py-1';

type LinhaDiario = 'refeicoes' | 'lanches';

interface TabelaDiarioProps {
  titulo: string;
  dados: DiarioAlimentarInfantil['frequencia'];
  onChange: (linha: LinhaDiario, dia: number, valor: string) => void;
}

function TabelaDiario({ titulo, dados, onChange }: TabelaDiarioProps) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-bold text-slate-600">{titulo}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
          <thead>
            <tr>
              <th className={`${CABECALHO_CELULA} w-32`}> </th>
              <th className={CABECALHO_CELULA}>Dia 1</th>
              <th className={CABECALHO_CELULA}>Dia 2</th>
              <th className={CABECALHO_CELULA}>Dia 3</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                { chave: 'refeicoes', rotulo: 'Refeições' },
                { chave: 'lanches', rotulo: 'Lanches' },
              ] as const
            ).map((linha) => (
              <tr key={linha.chave}>
                <td className={`${CELULA} text-[11px] font-bold text-slate-600`}>
                  {linha.rotulo}
                </td>
                {[0, 1, 2].map((dia) => (
                  <td key={dia} className={CELULA}>
                    <InlineTextInput
                      ariaLabel={`${titulo}, ${linha.rotulo}, dia ${dia + 1}`}
                      value={dados[linha.chave][dia]}
                      onChange={(valor) => onChange(linha.chave, dia, valor)}
                      placeholder="—"
                      className="w-full text-center"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MapaHigieneSection({ mapaHigiene, setDados }: MapaProps) {
  const alterarMapa = (mapa: MapaHigieneInfantilDados) =>
    setDados((prev) => ({ ...prev, mapaHigiene: mapa }));

  return (
    <SectionCard
      id="anamnese-infantil-p4-secao-1"
      pagina={PAGINA}
      numero={1}
      titulo="Mapa de Higiene, IP e IS"
      descricao="Marque as faces com placa ou sangramento nos 20 dentes decíduos. O índice é calculado sobre as faces dos dentes presentes."
    >
      <MapaHigieneInfantil mapa={mapaHigiene} onChange={alterarMapa} />
    </SectionCard>
  );
}

export function DiarioAlimentarSection({
  diarioAlimentar,
  setDados,
}: DiarioProps) {
  const alterarDiario = (patch: Partial<DiarioAlimentarInfantil>) =>
    setDados((prev) => ({
      ...prev,
      diarioAlimentar: { ...prev.diarioAlimentar, ...patch },
    }));

  const alterarFrequencia = (
    linha: LinhaDiario,
    dia: number,
    valor: string
  ) =>
    setDados((prev) => {
      const frequencia = { ...prev.diarioAlimentar.frequencia };
      frequencia[linha] = atualizarTripla(frequencia[linha], dia, valor);
      return {
        ...prev,
        diarioAlimentar: { ...prev.diarioAlimentar, frequencia },
      };
    });

  const alterarSacarose = (linha: LinhaDiario, dia: number, valor: string) =>
    setDados((prev) => {
      const sacarose = { ...prev.diarioAlimentar.sacarose };
      sacarose[linha] = atualizarTripla(sacarose[linha], dia, valor);
      return {
        ...prev,
        diarioAlimentar: { ...prev.diarioAlimentar, sacarose },
      };
    });

  return (
    <SectionCard
      id="anamnese-infantil-p4-secao-2"
      pagina={PAGINA}
      numero={2}
      titulo="Análise do Diário Alimentar"
    >
      <TabelaDiario
        titulo="Frequência de ingestão de alimentos"
        dados={diarioAlimentar.frequencia}
        onChange={alterarFrequencia}
      />
      <TabelaDiario
        titulo="Consumo de sacarose"
        dados={diarioAlimentar.sacarose}
        onChange={alterarSacarose}
      />
      <TextAreaField
        label="Consistência alimentar e Análise nutricional"
        rows={4}
        value={diarioAlimentar.consistenciaAnalise}
        onChange={(valor) => alterarDiario({ consistenciaAnalise: valor })}
      />
    </SectionCard>
  );
}

export function OdontogramaInfantilSection({
  odontograma,
  setDados,
}: OdontogramaProps) {
  const alterarOdontograma = (dados: OdontogramaInfantilDados) =>
    setDados((prev) => ({ ...prev, odontograma: dados }));

  return (
    <SectionCard
      id="anamnese-infantil-p4-secao-3"
      pagina={PAGINA}
      numero={3}
      titulo="Exame Físico Intrabucal — Odontograma Infantil"
      descricao="Pinte as faces conforme a legenda e clique no número para marcar o dente como presente ou ausente."
    >
      <OdontogramaInfantil
        odontograma={odontograma}
        denticao=""
        onChange={alterarOdontograma}
      />
    </SectionCard>
  );
}

export function DiagnosticoRadiograficoField({
  odontograma,
  setDados,
}: OdontogramaProps) {
  const alterarDiagnostico = (valor: string) =>
    setDados((prev) => ({
      ...prev,
      odontograma: {
        ...prev.odontograma,
        diagnosticoRadiografico: valor,
      },
    }));

  return (
    <SectionCard
      id="anamnese-infantil-p4-secao-4"
      pagina="Exames"
      numero={4}
      titulo="Diagnóstico Radiográfico"
    >
      <TextAreaField
        label="Diagnóstico Radiográfico"
        rows={5}
        value={odontograma.diagnosticoRadiografico}
        onChange={alterarDiagnostico}
      />
    </SectionCard>
  );
}

export function Pagina4HigieneOdontograma({
  mapaHigiene,
  diarioAlimentar,
  odontograma,
  setDados,
}: Pagina4Props) {
  return (
    <>
      <MapaHigieneSection mapaHigiene={mapaHigiene} setDados={setDados} />
      <DiarioAlimentarSection
        diarioAlimentar={diarioAlimentar}
        setDados={setDados}
      />
      <OdontogramaInfantilSection
        odontograma={odontograma}
        setDados={setDados}
      />
      <DiagnosticoRadiograficoField
        odontograma={odontograma}
        setDados={setDados}
      />
    </>
  );
}
