import type { Dispatch, SetStateAction } from 'react';
import { GRADE } from '../anamnese/estilos';
import { calcularIdadeInfantil } from './estado';
import type {
  AnamneseInfantil,
  AvaliacaoPsicologica,
  IdentificacaoInfantil,
} from './tipos';
import {
  OPCOES_APRENDIZADO,
  OPCOES_ATITUDES_PAIS,
  OPCOES_CARACTERISTICAS_CRIANCA,
  OPCOES_EXPERIENCIA_ADVERSA,
  OPCOES_REACAO_CONTRARIADO,
  OPCOES_SEXO_INFANTIL,
} from './constantes';
import {
  CheckboxGroup,
  Field,
  InlineInput,
  RadioGroup,
  SectionCard,
  SubTitulo,
  TextAreaField,
  YesNoGroup,
} from '../anamnese/FormularioBase';

interface Pagina1Props {
  identificacao: IdentificacaoInfantil;
  avaliacaoPsicologica: AvaliacaoPsicologica;
  setDados: Dispatch<SetStateAction<AnamneseInfantil>>;
}

export function Pagina1IdentificacaoPsicologica({
  identificacao,
  avaliacaoPsicologica,
  setDados,
}: Pagina1Props) {
  const alterarIdentificacao = (patch: Partial<IdentificacaoInfantil>) =>
    setDados((prev) => ({
      ...prev,
      identificacao: { ...prev.identificacao, ...patch },
    }));

  const alterarAvaliacao = (patch: Partial<AvaliacaoPsicologica>) =>
    setDados((prev) => ({
      ...prev,
      avaliacaoPsicologica: { ...prev.avaliacaoPsicologica, ...patch },
    }));

  return (
    <>
      <SectionCard
        id="anamnese-infantil-p1-secao-1"
        numero={1}
        titulo="Identificação do Paciente"
      >
        <div className={GRADE}>
          <Field
            className="sm:col-span-2"
            label="Nome"
            value={identificacao.nome}
            onChange={(valor) => alterarIdentificacao({ nome: valor })}
          />
          <Field
            label="Apelido"
            value={identificacao.apelido}
            onChange={(valor) => alterarIdentificacao({ apelido: valor })}
          />
          <Field
            label="Como gosta de ser chamado"
            value={identificacao.comoGostaSerChamado}
            onChange={(valor) =>
              alterarIdentificacao({ comoGostaSerChamado: valor })
            }
          />
          <Field
            label="Nasc."
            type="date"
            value={identificacao.dataNascimento}
            onChange={(valor) => alterarIdentificacao({ dataNascimento: valor })}
          />
          <RadioGroup
            label="Sexo"
            valor={identificacao.sexo}
            opcoes={OPCOES_SEXO_INFANTIL}
            onChange={(valor) => alterarIdentificacao({ sexo: valor })}
          />
          <Field
            label="Natural de"
            value={identificacao.naturalidade}
            onChange={(valor) => alterarIdentificacao({ naturalidade: valor })}
          />
          <Field
            label="Nome da mãe"
            value={identificacao.nomeMae}
            onChange={(valor) => alterarIdentificacao({ nomeMae: valor })}
          />
          <Field
            label="Profissão da mãe"
            value={identificacao.profissaoMae}
            onChange={(valor) => alterarIdentificacao({ profissaoMae: valor })}
          />
          <Field
            label="Nome do pai"
            value={identificacao.nomePai}
            onChange={(valor) => alterarIdentificacao({ nomePai: valor })}
          />
          <Field
            label="Profissão do pai"
            value={identificacao.profissaoPai}
            onChange={(valor) => alterarIdentificacao({ profissaoPai: valor })}
          />
          <Field
            className="sm:col-span-2"
            label="Endereço"
            value={identificacao.endereco}
            onChange={(valor) => alterarIdentificacao({ endereco: valor })}
          />
          <Field
            label="Tel."
            type="tel"
            value={identificacao.telefone}
            onChange={(valor) => alterarIdentificacao({ telefone: valor })}
          />
          <Field
            className="sm:col-span-2"
            label="Responsável que acompanhará a criança"
            value={identificacao.responsavelAcompanhante}
            onChange={(valor) =>
              alterarIdentificacao({ responsavelAcompanhante: valor })
            }
          />
          <Field
            label="Estado civil dos pais"
            value={identificacao.estadoCivilPais}
            onChange={(valor) => alterarIdentificacao({ estadoCivilPais: valor })}
          />
          <Field
            label="N.º de irmãos"
            value={identificacao.numeroIrmaos}
            onChange={(valor) => alterarIdentificacao({ numeroIrmaos: valor })}
          />
          <Field
            label="Idades"
            value={identificacao.idadesIrmaos}
            onChange={(valor) => alterarIdentificacao({ idadesIrmaos: valor })}
          />
          <Field
            label="Raça"
            value={identificacao.raca}
            onChange={(valor) => alterarIdentificacao({ raca: valor })}
          />
        </div>
        <p className="text-[10px] text-slate-400">
          Idade calculada: {calcularIdadeInfantil(identificacao.dataNascimento) || '—'}
        </p>
      </SectionCard>

      <SectionCard
        id="anamnese-infantil-p1-secao-2"
        numero={2}
        titulo="Anamnese"
      >
        <SubTitulo>2.1 Avaliação psicológica</SubTitulo>

        <div className={GRADE}>
          <Field
            className="sm:col-span-2"
            label="Com quem a criança fica?"
            value={avaliacaoPsicologica.comQuemFica}
            onChange={(valor) => alterarAvaliacao({ comQuemFica: valor })}
          />
          <YesNoGroup
            label="Tem amizade?"
            valor={avaliacaoPsicologica.amizades}
            onChange={(valor) => alterarAvaliacao({ amizades: valor })}
          />
          <YesNoGroup
            label="Pratica esportes?"
            valor={avaliacaoPsicologica.esportes}
            onChange={(valor) => alterarAvaliacao({ esportes: valor })}
          />
          <Field
            label="Quais esportes?"
            value={avaliacaoPsicologica.esportesQuais}
            onChange={(valor) => alterarAvaliacao({ esportesQuais: valor })}
          />
          <Field
            label="Time"
            value={avaliacaoPsicologica.esportesTime}
            onChange={(valor) => alterarAvaliacao({ esportesTime: valor })}
          />
          <YesNoGroup
            label="Já foi ao dentista?"
            valor={avaliacaoPsicologica.jaFoiDentista}
            onChange={(valor) => alterarAvaliacao({ jaFoiDentista: valor })}
          />
          <Field
            label="Comportamento no dentista"
            value={avaliacaoPsicologica.comportamentoDentista}
            onChange={(valor) =>
              alterarAvaliacao({ comportamentoDentista: valor })
            }
          />
        </div>

        <CheckboxGroup
          label="Experiência anterior adversa (médica ou odontológica)"
          opcoes={OPCOES_EXPERIENCIA_ADVERSA}
          valores={avaliacaoPsicologica.experienciaAdversa}
          onChange={(valores) =>
            alterarAvaliacao({ experienciaAdversa: valores })
          }
        />

        <TextAreaField
          label="Relato da experiência"
          rows={3}
          value={avaliacaoPsicologica.experienciaRelato}
          onChange={(valor) => alterarAvaliacao({ experienciaRelato: valor })}
        />

        <CheckboxGroup
          label="Atitude dos pais"
          opcoes={OPCOES_ATITUDES_PAIS}
          valores={avaliacaoPsicologica.atitudesPais}
          onChange={(valores) => alterarAvaliacao({ atitudesPais: valores })}
        />

        <CheckboxGroup
          label="Características da criança"
          opcoes={OPCOES_CARACTERISTICAS_CRIANCA}
          valores={avaliacaoPsicologica.caracteristicasCrianca}
          onChange={(valores) =>
            alterarAvaliacao({ caracteristicasCrianca: valores })
          }
        />

        <InlineInput
          rotulo="Outros"
          value={avaliacaoPsicologica.caracteristicasOutros}
          onChange={(valor) =>
            alterarAvaliacao({ caracteristicasOutros: valor })
          }
          placeholder="Especifique outras características"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RadioGroup
            label="Comportamento quando contrariado, reage com"
            valor={avaliacaoPsicologica.reacaoContrariado}
            opcoes={OPCOES_REACAO_CONTRARIADO}
            onChange={(valor) => alterarAvaliacao({ reacaoContrariado: valor })}
          />
          <RadioGroup
            label="Aprendizado"
            valor={avaliacaoPsicologica.aprendizado}
            opcoes={OPCOES_APRENDIZADO}
            onChange={(valor) => alterarAvaliacao({ aprendizado: valor })}
          />
        </div>
      </SectionCard>
    </>
  );
}
