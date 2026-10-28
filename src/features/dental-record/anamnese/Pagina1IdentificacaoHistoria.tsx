import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { GRADE } from './estilos';
import { calcularIdade } from './estado';
import type {
  AnamneseCliFor45,
  Declaracao,
  Habitos,
  HistoriaMedica,
  HistoriaOdontologica,
  Identificacao,
} from './tipos';
import {
  ALIMENTACAO,
  ANTECEDENTES_FAMILIAIS,
  OPCOES_ESTADO_CIVIL,
  OPCOES_ETNIA,
  OPCOES_FREQUENCIA_HIGIENE,
  OPCOES_GENERO,
  RECURSOS_HIGIENE,
  SISTEMA_CARDIOVASCULAR,
  SISTEMA_ENDOCRINO,
  SISTEMA_GASTRINTESTINAL,
  SISTEMA_GENITURINARIO,
  SISTEMA_NERVOSO_MUSCULAR,
  SISTEMA_RESPIRATORIO,
} from './tipos';
import {
  CheckboxGroup,
  Field,
  InlineTextInput,
  RadioGroup,
  SectionCard,
  SignatureField,
  TextAreaField,
  YesNoGroup,
} from './FormularioBase';

interface Pagina1Props {
  identificacao: Identificacao;
  historiaMedica: HistoriaMedica;
  historiaOdontologica: HistoriaOdontologica;
  habitos: Habitos;
  declaracao: Declaracao;
  setDados: Dispatch<SetStateAction<AnamneseCliFor45>>;
}

export const Pagina1IdentificacaoHistoria = memo(function Pagina1IdentificacaoHistoria({
  identificacao,
  historiaMedica,
  historiaOdontologica,
  habitos,
  declaracao,
  setDados,
}: Pagina1Props) {
  const alterarIdentificacao = (patch: Partial<Identificacao>) =>
    setDados((prev) => ({
      ...prev,
      identificacao: { ...prev.identificacao, ...patch },
    }));

  const alterarHistoriaMedica = (patch: Partial<HistoriaMedica>) =>
    setDados((prev) => ({
      ...prev,
      historiaMedica: { ...prev.historiaMedica, ...patch },
    }));

  const alterarHistoriaOdontologica = (patch: Partial<HistoriaOdontologica>) =>
    setDados((prev) => ({
      ...prev,
      historiaOdontologica: { ...prev.historiaOdontologica, ...patch },
    }));

  const alterarHabitos = (patch: Partial<Habitos>) =>
    setDados((prev) => ({
      ...prev,
      habitos: { ...prev.habitos, ...patch },
    }));

  const alterarDeclaracao = (patch: Partial<Declaracao>) =>
    setDados((prev) => ({
      ...prev,
      declaracao: { ...prev.declaracao, ...patch },
    }));

  return (
    <>
      <SectionCard id="cli45-p1-secao-1" numero={1} titulo="Identificação">
        <div className={GRADE}>
          <Field
            className="sm:col-span-2"
            label="Nome"
            value={identificacao.nome}
            onChange={(valor) => alterarIdentificacao({ nome: valor })}
          />
          <Field
            label="RG"
            value={identificacao.rg}
            onChange={(valor) => alterarIdentificacao({ rg: valor })}
          />
          <Field
            label="Data de Nascimento"
            type="date"
            value={identificacao.dataNascimento}
            onChange={(valor) =>
              alterarIdentificacao({
                dataNascimento: valor,
                idade: calcularIdade(valor),
              })
            }
          />
          <Field
            label="Idade"
            value={identificacao.idade}
            onChange={(valor) => alterarIdentificacao({ idade: valor })}
            placeholder="Ex: 42"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RadioGroup
            label="Etnia"
            valor={identificacao.etnia}
            opcoes={OPCOES_ETNIA}
            onChange={(valor) => alterarIdentificacao({ etnia: valor })}
          />
          <RadioGroup
            label="Gênero"
            valor={identificacao.genero}
            opcoes={OPCOES_GENERO}
            onChange={(valor) => alterarIdentificacao({ genero: valor })}
          />
          <RadioGroup
            label="Estado Civil"
            valor={identificacao.estadoCivil}
            opcoes={OPCOES_ESTADO_CIVIL}
            onChange={(valor) => alterarIdentificacao({ estadoCivil: valor })}
          />
          <Field
            label="Naturalidade"
            value={identificacao.naturalidade}
            onChange={(valor) => alterarIdentificacao({ naturalidade: valor })}
          />
        </div>

        <div className={GRADE}>
          <Field
            className="sm:col-span-2"
            label="Endereço"
            value={identificacao.endereco}
            onChange={(valor) => alterarIdentificacao({ endereco: valor })}
          />
          <Field
            label="CEP"
            value={identificacao.cep}
            onChange={(valor) => alterarIdentificacao({ cep: valor })}
          />
          <Field
            label="UF"
            value={identificacao.uf}
            onChange={(valor) => alterarIdentificacao({ uf: valor })}
          />
          <Field
            label="Telefone"
            type="tel"
            value={identificacao.telefone}
            onChange={(valor) => alterarIdentificacao({ telefone: valor })}
          />
          <Field
            label="Celular"
            type="tel"
            value={identificacao.celular}
            onChange={(valor) => alterarIdentificacao({ celular: valor })}
          />
          <Field
            label="Trabalho"
            value={identificacao.trabalho}
            onChange={(valor) => alterarIdentificacao({ trabalho: valor })}
          />
        </div>
      </SectionCard>

      <SectionCard id="cli45-p1-secao-2" numero={2} titulo="História Médica">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <YesNoGroup
            label="Tratamento Médico Atual"
            valor={historiaMedica.tratamentoAtual}
            onChange={(valor) => alterarHistoriaMedica({ tratamentoAtual: valor })}
          />
          <Field
            label="Qual"
            value={historiaMedica.tratamentoQual}
            onChange={(valor) => alterarHistoriaMedica({ tratamentoQual: valor })}
          />
          <Field
            label="Médico/Serviço de Saúde"
            value={historiaMedica.medicoServico}
            onChange={(valor) => alterarHistoriaMedica({ medicoServico: valor })}
          />
          <Field
            label="Fone"
            type="tel"
            value={historiaMedica.medicoFone}
            onChange={(valor) => alterarHistoriaMedica({ medicoFone: valor })}
          />
        </div>

        <Field
          label="Medicamentos Utilizados"
          value={historiaMedica.medicamentos}
          onChange={(valor) => alterarHistoriaMedica({ medicamentos: valor })}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CheckboxGroup
            label="Sistema Cardiovascular"
            opcoes={SISTEMA_CARDIOVASCULAR}
            valores={historiaMedica.cardiovascular}
            onChange={(valores) => alterarHistoriaMedica({ cardiovascular: valores })}
          />
          <CheckboxGroup
            label="Sistema Respiratório"
            opcoes={SISTEMA_RESPIRATORIO}
            valores={historiaMedica.respiratorio}
            onChange={(valores) => alterarHistoriaMedica({ respiratorio: valores })}
          />
          <CheckboxGroup
            label="Sistema Geniturinário"
            opcoes={SISTEMA_GENITURINARIO}
            valores={historiaMedica.geniturinario}
            onChange={(valores) => alterarHistoriaMedica({ geniturinario: valores })}
          />
          <CheckboxGroup
            label="Sistema Gastrintestinal"
            opcoes={SISTEMA_GASTRINTESTINAL}
            valores={historiaMedica.gastrintestinal}
            onChange={(valores) => alterarHistoriaMedica({ gastrintestinal: valores })}
          />
          <CheckboxGroup
            label="Sistema Nervoso e Muscular"
            opcoes={SISTEMA_NERVOSO_MUSCULAR}
            valores={historiaMedica.nervosoMuscular}
            onChange={(valores) => alterarHistoriaMedica({ nervosoMuscular: valores })}
          />
          <CheckboxGroup
            label="Sistema Endócrino"
            opcoes={SISTEMA_ENDOCRINO}
            valores={historiaMedica.endocrino}
            onChange={(valores) => alterarHistoriaMedica({ endocrino: valores })}
          />
        </div>

        <CheckboxGroup
          label="Antecedentes Familiais"
          opcoes={ANTECEDENTES_FAMILIAIS}
          valores={historiaMedica.antecedentesFamiliais}
          onChange={(valores) => alterarHistoriaMedica({ antecedentesFamiliais: valores })}
        />
      </SectionCard>

      <SectionCard id="cli45-p1-secao-3" numero={3} titulo="História Odontológica">
        <TextAreaField
          label="História da doença"
          rows={3}
          value={historiaOdontologica.historiaDoenca}
          onChange={(valor) => alterarHistoriaOdontologica({ historiaDoenca: valor })}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <YesNoGroup
            label="Tem dificuldade na mastigação?"
            valor={historiaOdontologica.dificuldadeMastigacao}
            onChange={(valor) => alterarHistoriaOdontologica({ dificuldadeMastigacao: valor })}
          />
          <YesNoGroup
            label="Tem algum dente sensível?"
            valor={historiaOdontologica.denteSensivel}
            onChange={(valor) => alterarHistoriaOdontologica({ denteSensivel: valor })}
          />
          <YesNoGroup
            label="Sua gengiva sangra com facilidade?"
            valor={historiaOdontologica.gengivaSangra}
            onChange={(valor) => alterarHistoriaOdontologica({ gengivaSangra: valor })}
          />
          <YesNoGroup
            label="Tem dificuldade em abrir a boca?"
            valor={historiaOdontologica.dificuldadeAbrirBoca}
            onChange={(valor) =>
              alterarHistoriaOdontologica({ dificuldadeAbrirBoca: valor })
            }
          />
          <YesNoGroup
            className="sm:col-span-2"
            label="Já teve feridas na boca ou no lábio que demoraram a melhorar?"
            valor={historiaOdontologica.feridasBoca}
            onChange={(valor) => alterarHistoriaOdontologica({ feridasBoca: valor })}
          />
          <YesNoGroup
            label="Costuma ranger ou apertar os dentes?"
            valor={historiaOdontologica.rangeDentes}
            onChange={(valor) => alterarHistoriaOdontologica({ rangeDentes: valor })}
          />
          <YesNoGroup
            label="Sente estalos quando mastiga?"
            valor={historiaOdontologica.estalos}
            onChange={(valor) => alterarHistoriaOdontologica({ estalos: valor })}
          />
        </div>

        <Field
          label="Quando foi a última vez que esteve no dentista?"
          value={historiaOdontologica.ultimaVisita}
          onChange={(valor) => alterarHistoriaOdontologica({ ultimaVisita: valor })}
        />
      </SectionCard>

      <SectionCard id="cli45-p1-secao-4" numero={4} titulo="Hábitos">
        <RadioGroup
          label="Higiene Bucal — Frequência"
          valor={habitos.higieneFrequencia}
          opcoes={OPCOES_FREQUENCIA_HIGIENE}
          onChange={(valor) => alterarHabitos({ higieneFrequencia: valor })}
        />
        <CheckboxGroup
          label="Higiene Bucal — Recursos"
          opcoes={RECURSOS_HIGIENE}
          valores={habitos.higieneRecursos}
          onChange={(valores) => alterarHabitos({ higieneRecursos: valores })}
        />
        <CheckboxGroup
          label="Alimentação/Dieta — Rica em"
          opcoes={ALIMENTACAO}
          valores={habitos.alimentacao}
          onChange={(valores) => alterarHabitos({ alimentacao: valores })}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <YesNoGroup
            label="Tabagismo"
            valor={habitos.tabagismo}
            onChange={(valor) => alterarHabitos({ tabagismo: valor })}
          />
          <Field
            label="Frequência"
            value={habitos.tabagismoFrequencia}
            onChange={(valor) => alterarHabitos({ tabagismoFrequencia: valor })}
          />
          <YesNoGroup
            label="Etilismo"
            valor={habitos.etilismo}
            onChange={(valor) => alterarHabitos({ etilismo: valor })}
          />
          <Field
            label="Frequência"
            value={habitos.etilismoFrequencia}
            onChange={(valor) => alterarHabitos({ etilismoFrequencia: valor })}
          />
        </div>

        <Field
          label="Outros Hábitos (ex: morder objetos)"
          value={habitos.outrosHabitos}
          onChange={(valor) => alterarHabitos({ outrosHabitos: valor })}
        />
      </SectionCard>

      <SectionCard
        id="cli45-p1-secao-5"
        numero={5}
        titulo="Declaração e Assinatura"
      >
        <p className="text-xs leading-loose text-slate-700">
          Eu,{' '}
          <InlineTextInput
            ariaLabel="Nome na declaração"
            value={declaracao.nome}
            onChange={(valor) => alterarDeclaracao({ nome: valor })}
            className="w-56"
          />
          , portador do CPF{' '}
          <InlineTextInput
            ariaLabel="CPF na declaração"
            value={declaracao.cpf}
            onChange={(valor) => alterarDeclaracao({ cpf: valor })}
            className="w-36"
          />{' '}
          R.G.{' '}
          <InlineTextInput
            ariaLabel="RG na declaração"
            value={declaracao.rg}
            onChange={(valor) => alterarDeclaracao({ rg: valor })}
            className="w-32"
          />{' '}
          declaro que respondi corretamente às questões acima sobre meu estado de saúde, não
          omitindo nenhuma informação.
        </p>

        <div className="flex flex-wrap items-end gap-2 text-xs leading-loose text-slate-700">
          <span>Data:</span>
          <InlineTextInput
            ariaLabel="Local/Cidade"
            value={declaracao.local}
            onChange={(valor) => alterarDeclaracao({ local: valor })}
            placeholder="Local/Cidade"
            className="w-48"
          />
          <span>,</span>
          <InlineTextInput
            ariaLabel="Dia"
            value={declaracao.dia}
            onChange={(valor) => alterarDeclaracao({ dia: valor })}
            placeholder="Dia"
            className="w-12 text-center"
          />
          <span>de</span>
          <InlineTextInput
            ariaLabel="Mês"
            value={declaracao.mes}
            onChange={(valor) => alterarDeclaracao({ mes: valor })}
            placeholder="Mês"
            className="w-28"
          />
          <span>de</span>
          <InlineTextInput
            ariaLabel="Ano"
            value={declaracao.ano}
            onChange={(valor) => alterarDeclaracao({ ano: valor })}
            placeholder="Ano"
            className="w-16 text-center"
          />
          <span>.</span>
        </div>

        <div className="max-w-sm pt-2">
          <SignatureField
            label="Assinatura (Paciente)"
            value={declaracao.assinaturaPaciente}
            onChange={(valor) => alterarDeclaracao({ assinaturaPaciente: valor })}
          />
        </div>
      </SectionCard>
    </>
  );
});
