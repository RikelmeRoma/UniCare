import type { Dispatch, SetStateAction } from 'react';
import { GRADE } from '../anamnese/estilos';
import type {
  AnamneseInfantil,
  AntecedentesHereditariosInfantil,
  HabitosHigieneInfantil,
  NatalInfantil,
  PosNatalSaudeInfantil,
  PreNatalInfantil,
} from './tipos';
import {
  DOENCAS_INFANCIA,
  OPCOES_HABITOS_INFANTIS,
  OPCOES_TIPO_PARTO,
} from './constantes';
import {
  CheckboxGroup,
  Field,
  InlineInput,
  RadioGroup,
  SectionCard,
  TextAreaField,
  YesNoGroup,
} from '../anamnese/FormularioBase';

interface Pagina2Props {
  antecedentesHereditarios: AntecedentesHereditariosInfantil;
  preNatal: PreNatalInfantil;
  natal: NatalInfantil;
  posNatalSaude: PosNatalSaudeInfantil;
  habitosHigiene: HabitosHigieneInfantil;
  setDados: Dispatch<SetStateAction<AnamneseInfantil>>;
}

export function Pagina2AntecedentesHabitos({
  antecedentesHereditarios,
  preNatal,
  natal,
  posNatalSaude,
  habitosHigiene,
  setDados,
}: Pagina2Props) {
  const alterarAntecedentes = (
    patch: Partial<AntecedentesHereditariosInfantil>
  ) =>
    setDados((prev) => ({
      ...prev,
      antecedentesHereditarios: {
        ...prev.antecedentesHereditarios,
        ...patch,
      },
    }));

  const alterarPreNatal = (patch: Partial<PreNatalInfantil>) =>
    setDados((prev) => ({
      ...prev,
      preNatal: { ...prev.preNatal, ...patch },
    }));

  const alterarNatal = (patch: Partial<NatalInfantil>) =>
    setDados((prev) => ({
      ...prev,
      natal: { ...prev.natal, ...patch },
    }));

  const alterarPosNatal = (patch: Partial<PosNatalSaudeInfantil>) =>
    setDados((prev) => ({
      ...prev,
      posNatalSaude: { ...prev.posNatalSaude, ...patch },
    }));

  const alterarHabitos = (patch: Partial<HabitosHigieneInfantil>) =>
    setDados((prev) => ({
      ...prev,
      habitosHigiene: { ...prev.habitosHigiene, ...patch },
    }));

  return (
    <>
      <SectionCard
        id="anamnese-infantil-p2-secao-2-2"
        numero={3}
        titulo="Antecedentes Hereditários"
      >
        <TextAreaField
          label="Descreva os antecedentes hereditários"
          rows={4}
          value={antecedentesHereditarios.relato}
          onChange={(valor) => alterarAntecedentes({ relato: valor })}
        />
      </SectionCard>

      <SectionCard
        id="anamnese-infantil-p2-secao-2-3"
        numero={4}
        titulo="Pré-Natal"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <YesNoGroup
            label="Houve alteração durante a gravidez?"
            valor={preNatal.alteracaoGravidez}
            onChange={(valor) => alterarPreNatal({ alteracaoGravidez: valor })}
          />
          <Field
            label="Qual alteração?"
            value={preNatal.alteracaoGravidezQual}
            onChange={(valor) =>
              alterarPreNatal({ alteracaoGravidezQual: valor })
            }
          />
          <YesNoGroup
            label="Uso de medicamentos?"
            valor={preNatal.medicamentos}
            onChange={(valor) => alterarPreNatal({ medicamentos: valor })}
          />
          <Field
            label="Quais medicamentos?"
            value={preNatal.medicamentosQuais}
            onChange={(valor) => alterarPreNatal({ medicamentosQuais: valor })}
          />
          <YesNoGroup
            label="Uso de flúor?"
            valor={preNatal.fluor}
            onChange={(valor) => alterarPreNatal({ fluor: valor })}
          />
          <Field
            label="Qual flúor?"
            value={preNatal.fluorQual}
            onChange={(valor) => alterarPreNatal({ fluorQual: valor })}
          />
          <YesNoGroup
            className="sm:col-span-2"
            label="Recebeu orientação odontológica?"
            valor={preNatal.orientacaoOdontologica}
            onChange={(valor) =>
              alterarPreNatal({ orientacaoOdontologica: valor })
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        id="anamnese-infantil-p2-secao-2-4"
        numero={5}
        titulo="Natal"
      >
        <div className={GRADE}>
          <RadioGroup
            label="Tipo de parto"
            valor={natal.tipoParto}
            opcoes={OPCOES_TIPO_PARTO}
            onChange={(valor) => alterarNatal({ tipoParto: valor })}
          />
          <Field
            label="Outro tipo de parto"
            value={natal.tipoPartoOutro}
            onChange={(valor) => alterarNatal({ tipoPartoOutro: valor })}
          />
          <YesNoGroup
            label="Houve algum problema?"
            valor={natal.problemas}
            onChange={(valor) => alterarNatal({ problemas: valor })}
          />
          <Field
            label="Qual problema?"
            value={natal.problemasQuais}
            onChange={(valor) => alterarNatal({ problemasQuais: valor })}
          />
          <YesNoGroup
            label="Anomalias?"
            valor={natal.anomalias}
            onChange={(valor) => alterarNatal({ anomalias: valor })}
          />
          <Field
            label="Quais anomalias?"
            value={natal.anomaliasQuais}
            onChange={(valor) => alterarNatal({ anomaliasQuais: valor })}
          />
          <YesNoGroup
            label="Amamentação?"
            valor={natal.amamentacao}
            onChange={(valor) => alterarNatal({ amamentacao: valor })}
          />
          <Field
            label="Tempo de amamentação"
            value={natal.amamentacaoTempo}
            onChange={(valor) => alterarNatal({ amamentacaoTempo: valor })}
          />
          <YesNoGroup
            label="Mamadeira?"
            valor={natal.mamadeira}
            onChange={(valor) => alterarNatal({ mamadeira: valor })}
          />
          <Field
            label="Quantas vezes ao dia?"
            value={natal.mamadeiraQuantidade}
            onChange={(valor) => alterarNatal({ mamadeiraQuantidade: valor })}
          />
          <Field
            label="Horário"
            value={natal.mamadeiraHorario}
            onChange={(valor) => alterarNatal({ mamadeiraHorario: valor })}
          />
        </div>
      </SectionCard>

      <SectionCard
        id="anamnese-infantil-p2-secao-2-5"
        numero={6}
        titulo="Pós-Natal e Saúde Geral"
      >
        <div className={GRADE}>
          <Field
            label="Estado de saúde"
            value={posNatalSaude.estadoSaude}
            onChange={(valor) => alterarPosNatal({ estadoSaude: valor })}
          />
          <Field
            label="Data do último exame médico"
            type="date"
            value={posNatalSaude.ultimoExame}
            onChange={(valor) => alterarPosNatal({ ultimoExame: valor })}
          />
          <Field
            label="Tratamento médico"
            value={posNatalSaude.tratamentoMedico}
            onChange={(valor) => alterarPosNatal({ tratamentoMedico: valor })}
          />
          <YesNoGroup
            label="Faz uso de medicação?"
            valor={posNatalSaude.medicacao}
            onChange={(valor) => alterarPosNatal({ medicacao: valor })}
          />
          <Field
            label="Qual medicação?"
            value={posNatalSaude.medicacaoQual}
            onChange={(valor) => alterarPosNatal({ medicacaoQual: valor })}
          />
        </div>

        <TextAreaField
          label="Medicamentos utilizados no passado"
          rows={2}
          value={posNatalSaude.medicamentosPassado}
          onChange={(valor) => alterarPosNatal({ medicamentosPassado: valor })}
        />

        <CheckboxGroup
          label="Doenças da infância e outras"
          opcoes={DOENCAS_INFANCIA}
          valores={posNatalSaude.doencasInfancia}
          onChange={(valores) => alterarPosNatal({ doencasInfancia: valores })}
        />

        <InlineInput
          rotulo="Outras"
          value={posNatalSaude.doencasOutras}
          onChange={(valor) => alterarPosNatal({ doencasOutras: valor })}
          placeholder="Especifique outras doenças"
        />

        <TextAreaField
          label="Especifique os problemas"
          rows={3}
          value={posNatalSaude.problemasEspecificar}
          onChange={(valor) => alterarPosNatal({ problemasEspecificar: valor })}
        />

        <div className={GRADE}>
          <YesNoGroup
            label="Já foi hospitalizado?"
            valor={posNatalSaude.hospitalizado}
            onChange={(valor) => alterarPosNatal({ hospitalizado: valor })}
          />
          <Field
            label="Motivo da hospitalização"
            value={posNatalSaude.hospitalizadoMotivo}
            onChange={(valor) =>
              alterarPosNatal({ hospitalizadoMotivo: valor })
            }
          />
          <Field
            label="Data da hospitalização"
            type="date"
            value={posNatalSaude.hospitalizadoData}
            onChange={(valor) => alterarPosNatal({ hospitalizadoData: valor })}
          />
          <YesNoGroup
            label="Possui alergia?"
            valor={posNatalSaude.alergia}
            onChange={(valor) => alterarPosNatal({ alergia: valor })}
          />
          <Field
            label="Quais alergias?"
            value={posNatalSaude.alergiaQuais}
            onChange={(valor) => alterarPosNatal({ alergiaQuais: valor })}
          />
        </div>
      </SectionCard>

      <SectionCard
        id="anamnese-infantil-p2-secao-2-6"
        numero={7}
        titulo="Hábitos e Higiene Bucal Infantil"
      >
        <CheckboxGroup
          label="Hábitos"
          opcoes={OPCOES_HABITOS_INFANTIS}
          valores={habitosHigiene.habitos}
          onChange={(valores) => alterarHabitos({ habitos: valores })}
        />

        <InlineInput
          rotulo="Outros"
          value={habitosHigiene.habitosOutros}
          onChange={(valor) => alterarHabitos({ habitosOutros: valor })}
          placeholder="Especifique outros hábitos"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <YesNoGroup
            label="Foi orientado sobre higiene bucal?"
            valor={habitosHigiene.orientacaoHigiene}
            onChange={(valor) =>
              alterarHabitos({ orientacaoHigiene: valor })
            }
          />
          <Field
            label="Por quem?"
            value={habitosHigiene.orientacaoPorQuem}
            onChange={(valor) =>
              alterarHabitos({ orientacaoPorQuem: valor })
            }
          />
          <YesNoGroup
            label="A criança escova os dentes?"
            valor={habitosHigiene.escova}
            onChange={(valor) => alterarHabitos({ escova: valor })}
          />
          <Field
            label="Quantas vezes ao dia?"
            value={habitosHigiene.escovaVezes}
            onChange={(valor) => alterarHabitos({ escovaVezes: valor })}
          />
          <Field
            label="Quem escova?"
            value={habitosHigiene.escovaQuem}
            onChange={(valor) => alterarHabitos({ escovaQuem: valor })}
          />
          <YesNoGroup
            label="Usa pasta dental?"
            valor={habitosHigiene.pasta}
            onChange={(valor) => alterarHabitos({ pasta: valor })}
          />
          <Field
            label="Qual pasta?"
            value={habitosHigiene.pastaQual}
            onChange={(valor) => alterarHabitos({ pastaQual: valor })}
          />
          <YesNoGroup
            label="Usa fio dental?"
            valor={habitosHigiene.fioDental}
            onChange={(valor) => alterarHabitos({ fioDental: valor })}
          />
          <Field
            label="Quantas vezes ao dia?"
            value={habitosHigiene.fioDentalVezes}
            onChange={(valor) => alterarHabitos({ fioDentalVezes: valor })}
          />
          <Field
            label="Quem passa o fio dental?"
            value={habitosHigiene.fioDentalQuem}
            onChange={(valor) => alterarHabitos({ fioDentalQuem: valor })}
          />
          <YesNoGroup
            label="Usa flúor?"
            valor={habitosHigiene.fluor}
            onChange={(valor) => alterarHabitos({ fluor: valor })}
          />
          <Field
            label="De que forma?"
            value={habitosHigiene.fluorForma}
            onChange={(valor) => alterarHabitos({ fluorForma: valor })}
          />
        </div>
      </SectionCard>
    </>
  );
}
