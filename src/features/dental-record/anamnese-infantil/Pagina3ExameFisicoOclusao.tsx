import type { Dispatch, SetStateAction } from 'react';
import { GRADE } from '../anamnese/estilos';
import type {
  AnamneseInfantil,
  ExameExtrabucalInfantil,
  ExameIntrabucalInfantil,
  OclusaoDeciduaInfantil,
  OclusaoMistaPermanenteInfantil,
} from './tipos';
import {
  OPCOES_AMIGDALAS,
  OPCOES_ANGLE,
  OPCOES_ATM,
  OPCOES_BAUME,
  OPCOES_CURVA_SPEE,
  OPCOES_DENTICAO,
  OPCOES_DIVISAO_ANGLE,
  OPCOES_ESPACO_PRIMATA,
  OPCOES_FALA,
  OPCOES_LINHA_MEDIANA,
  OPCOES_MORDIDA_CRUZADA,
  OPCOES_PALATO_DURO,
  OPCOES_PLANO_SAGITAL,
  OPCOES_RELACAO_CANINA,
  OPCOES_RESPIRACAO,
  OPCOES_ANOMALIAS_DENTAIS,
} from './constantes';
import {
  CheckboxGroup,
  Field,
  RadioGroup,
  SectionCard,
  SubTitulo,
  TextAreaField,
  YesNoGroup,
} from '../anamnese/FormularioBase';

interface Pagina3Props {
  exameExtrabucal: ExameExtrabucalInfantil;
  exameIntrabucal: ExameIntrabucalInfantil;
  oclusaoDecidua: OclusaoDeciduaInfantil;
  oclusaoMistaPermanente: OclusaoMistaPermanenteInfantil;
  setDados: Dispatch<SetStateAction<AnamneseInfantil>>;
}

export function Pagina3ExameFisicoOclusao({
  exameExtrabucal,
  exameIntrabucal,
  oclusaoDecidua,
  oclusaoMistaPermanente,
  setDados,
}: Pagina3Props) {
  const alterarExtrabucal = (patch: Partial<ExameExtrabucalInfantil>) =>
    setDados((prev) => ({
      ...prev,
      exameExtrabucal: { ...prev.exameExtrabucal, ...patch },
    }));

  const alterarIntrabucal = (patch: Partial<ExameIntrabucalInfantil>) =>
    setDados((prev) => ({
      ...prev,
      exameIntrabucal: { ...prev.exameIntrabucal, ...patch },
    }));

  const alterarDecidua = (patch: Partial<OclusaoDeciduaInfantil>) =>
    setDados((prev) => ({
      ...prev,
      oclusaoDecidua: { ...prev.oclusaoDecidua, ...patch },
    }));

  const alterarMistaPermanente = (
    patch: Partial<OclusaoMistaPermanenteInfantil>
  ) =>
    setDados((prev) => ({
      ...prev,
      oclusaoMistaPermanente: {
        ...prev.oclusaoMistaPermanente,
        ...patch,
      },
    }));

  const terminacaoMolar = [
    ...(oclusaoDecidua.terminacaoMolarDireita ? ['Direita'] : []),
    ...(oclusaoDecidua.terminacaoMolarEsquerda ? ['Esquerda'] : []),
  ];

  return (
    <>
      <SectionCard
        id="anamnese-infantil-p3-secao-3-1"
        numero={1}
        titulo="Extrabucal"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <YesNoGroup
            label="Há alguma alteração notável na cabeça, face ou pescoço (cadeia de linfonodos)?"
            valor={exameExtrabucal.alteracaoCabecaFacePescoco}
            onChange={(valor) =>
              alterarExtrabucal({ alteracaoCabecaFacePescoco: valor })
            }
          />
          <Field
            label="Qual alteração?"
            value={exameExtrabucal.alteracaoQual}
            onChange={(valor) =>
              alterarExtrabucal({ alteracaoQual: valor })
            }
          />
          <RadioGroup
            label="A.T.M."
            valor={exameExtrabucal.atm}
            opcoes={OPCOES_ATM}
            onChange={(valor) => alterarExtrabucal({ atm: valor })}
          />
          <RadioGroup
            label="Respiração"
            valor={exameExtrabucal.respiracao}
            opcoes={OPCOES_RESPIRACAO}
            onChange={(valor) => alterarExtrabucal({ respiracao: valor })}
          />
          <RadioGroup
            label="Fala"
            valor={exameExtrabucal.fala}
            opcoes={OPCOES_FALA}
            onChange={(valor) => alterarExtrabucal({ fala: valor })}
          />
          <Field
            label="Especifique a fala"
            value={exameExtrabucal.falaEspecifique}
            onChange={(valor) =>
              alterarExtrabucal({ falaEspecifique: valor })
            }
          />
        </div>
      </SectionCard>

      <SectionCard
        id="anamnese-infantil-p3-secao-3-2"
        numero={2}
        titulo="Intrabucal"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <YesNoGroup
            label="Há alterações em lábios, freios, mucosas, língua, assoalho ou palato mole?"
            valor={exameIntrabucal.alteracoes}
            onChange={(valor) => alterarIntrabucal({ alteracoes: valor })}
          />
          <Field
            label="Quais alterações?"
            value={exameIntrabucal.alteracoesQuais}
            onChange={(valor) =>
              alterarIntrabucal({ alteracoesQuais: valor })
            }
          />
        </div>

        <div className={GRADE}>
          <Field
            label="Lábios"
            value={exameIntrabucal.labios}
            onChange={(valor) => alterarIntrabucal({ labios: valor })}
            placeholder="Normalidade ou descreva"
          />
          <Field
            label="Freios"
            value={exameIntrabucal.freios}
            onChange={(valor) => alterarIntrabucal({ freios: valor })}
            placeholder="Normalidade ou descreva"
          />
          <Field
            label="Mucosa"
            value={exameIntrabucal.mucosa}
            onChange={(valor) => alterarIntrabucal({ mucosa: valor })}
            placeholder="Normalidade ou descreva"
          />
          <Field
            label="Língua"
            value={exameIntrabucal.lingua}
            onChange={(valor) => alterarIntrabucal({ lingua: valor })}
            placeholder="Normalidade ou descreva"
          />
          <Field
            label="Assoalho"
            value={exameIntrabucal.assoalho}
            onChange={(valor) => alterarIntrabucal({ assoalho: valor })}
            placeholder="Normalidade ou descreva"
          />
        </div>

        <div className={GRADE}>
          <RadioGroup
            label="Palato duro"
            valor={exameIntrabucal.palatoDuro}
            opcoes={OPCOES_PALATO_DURO}
            onChange={(valor) => alterarIntrabucal({ palatoDuro: valor })}
          />
          <RadioGroup
            label="Amídalas"
            valor={exameIntrabucal.amigdalas}
            opcoes={OPCOES_AMIGDALAS}
            onChange={(valor) => alterarIntrabucal({ amigdalas: valor })}
          />
          <RadioGroup
            label="Dentição"
            valor={exameIntrabucal.denticao}
            opcoes={OPCOES_DENTICAO}
            onChange={(valor) => alterarIntrabucal({ denticao: valor })}
          />
        </div>

        <CheckboxGroup
          label="Anomalias dentais"
          opcoes={OPCOES_ANOMALIAS_DENTAIS}
          valores={exameIntrabucal.anomalias}
          onChange={(valores) => alterarIntrabucal({ anomalias: valores })}
        />
      </SectionCard>

      <SectionCard
        id="anamnese-infantil-p3-secao-3-3"
        numero={3}
        titulo="Análise da Oclusão"
      >
        <SubTitulo>Dentição decídua</SubTitulo>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RadioGroup
            label="Arco de Baume superior"
            valor={oclusaoDecidua.baumeSuperior}
            opcoes={OPCOES_BAUME}
            onChange={(valor) => alterarDecidua({ baumeSuperior: valor })}
          />
          <RadioGroup
            label="Arco de Baume inferior"
            valor={oclusaoDecidua.baumeInferior}
            opcoes={OPCOES_BAUME}
            onChange={(valor) => alterarDecidua({ baumeInferior: valor })}
          />
          <RadioGroup
            label="Espaço primata superior direito"
            valor={oclusaoDecidua.espacoPrimataSuperiorDireito}
            opcoes={OPCOES_ESPACO_PRIMATA}
            onChange={(valor) =>
              alterarDecidua({ espacoPrimataSuperiorDireito: valor })
            }
          />
          <RadioGroup
            label="Espaço primata superior esquerdo"
            valor={oclusaoDecidua.espacoPrimataSuperiorEsquerdo}
            opcoes={OPCOES_ESPACO_PRIMATA}
            onChange={(valor) =>
              alterarDecidua({ espacoPrimataSuperiorEsquerdo: valor })
            }
          />
          <RadioGroup
            label="Espaço primata inferior direito"
            valor={oclusaoDecidua.espacoPrimataInferiorDireito}
            opcoes={OPCOES_ESPACO_PRIMATA}
            onChange={(valor) =>
              alterarDecidua({ espacoPrimataInferiorDireito: valor })
            }
          />
          <RadioGroup
            label="Espaço primata inferior esquerdo"
            valor={oclusaoDecidua.espacoPrimataInferiorEsquerdo}
            opcoes={OPCOES_ESPACO_PRIMATA}
            onChange={(valor) =>
              alterarDecidua({ espacoPrimataInferiorEsquerdo: valor })
            }
          />
          <RadioGroup
            label="Relação canina direita"
            valor={oclusaoDecidua.relacaoCaninaDireita}
            opcoes={OPCOES_RELACAO_CANINA}
            onChange={(valor) =>
              alterarDecidua({ relacaoCaninaDireita: valor })
            }
          />
          <RadioGroup
            label="Relação canina esquerda"
            valor={oclusaoDecidua.relacaoCaninaEsquerda}
            opcoes={OPCOES_RELACAO_CANINA}
            onChange={(valor) =>
              alterarDecidua({ relacaoCaninaEsquerda: valor })
            }
          />
        </div>

        <CheckboxGroup
          label="Terminação molar reta para mandíbula"
          opcoes={['Direita', 'Esquerda']}
          valores={terminacaoMolar}
          onChange={(valores) =>
            alterarDecidua({
              terminacaoMolarDireita: valores.includes('Direita'),
              terminacaoMolarEsquerda: valores.includes('Esquerda'),
            })
          }
        />

        <CheckboxGroup
          label="Mordida cruzada"
          opcoes={OPCOES_MORDIDA_CRUZADA}
          valores={oclusaoDecidua.mordidaCruzada}
          onChange={(valores) =>
            alterarDecidua({ mordidaCruzada: valores })
          }
        />

        <div className={GRADE}>
          <Field
            label="Trespasse horizontal (mm)"
            value={oclusaoDecidua.trespasseHorizontal}
            onChange={(valor) =>
              alterarDecidua({ trespasseHorizontal: valor })
            }
            placeholder="mm"
          />
          <Field
            label="Trespasse vertical (mm)"
            value={oclusaoDecidua.trespasseVertical}
            onChange={(valor) =>
              alterarDecidua({ trespasseVertical: valor })
            }
            placeholder="mm"
          />
          <RadioGroup
            label="Linha mediana"
            valor={oclusaoDecidua.linhaMediana}
            opcoes={OPCOES_LINHA_MEDIANA}
            onChange={(valor) => alterarDecidua({ linhaMediana: valor })}
          />
        </div>

        <SubTitulo>Dentição mista/permanente</SubTitulo>

        <TextAreaField
          label="Perdas precoces"
          rows={2}
          value={oclusaoMistaPermanente.perdasPrecoces}
          onChange={(valor) =>
            alterarMistaPermanente({ perdasPrecoces: valor })
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RadioGroup
            label="Classificação de Angle"
            valor={oclusaoMistaPermanente.angle}
            opcoes={OPCOES_ANGLE}
            onChange={(valor) => alterarMistaPermanente({ angle: valor })}
          />
          <RadioGroup
            label="Divisão"
            valor={oclusaoMistaPermanente.divisao}
            opcoes={OPCOES_DIVISAO_ANGLE}
            onChange={(valor) => alterarMistaPermanente({ divisao: valor })}
          />
          <Field
            label="Subdivisão"
            value={oclusaoMistaPermanente.subdivisao}
            onChange={(valor) =>
              alterarMistaPermanente({ subdivisao: valor })
            }
          />
          <YesNoGroup
            label="Mordida cruzada posterior"
            valor={oclusaoMistaPermanente.mordidaCruzadaPosterior}
            onChange={(valor) =>
              alterarMistaPermanente({ mordidaCruzadaPosterior: valor })
            }
          />
          <YesNoGroup
            label="Mordida cruzada anterior"
            valor={oclusaoMistaPermanente.mordidaCruzadaAnterior}
            onChange={(valor) =>
              alterarMistaPermanente({ mordidaCruzadaAnterior: valor })
            }
          />
          <Field
            label="Trespasse horizontal (mm)"
            value={oclusaoMistaPermanente.trespasseHorizontal}
            onChange={(valor) =>
              alterarMistaPermanente({ trespasseHorizontal: valor })
            }
            placeholder="mm"
          />
          <Field
            label="Trespasse vertical (mm)"
            value={oclusaoMistaPermanente.trespasseVertical}
            onChange={(valor) =>
              alterarMistaPermanente({ trespasseVertical: valor })
            }
            placeholder="mm"
          />
          <RadioGroup
            label="Curva de Spee"
            valor={oclusaoMistaPermanente.curvaSpee}
            opcoes={OPCOES_CURVA_SPEE}
            onChange={(valor) =>
              alterarMistaPermanente({ curvaSpee: valor })
            }
          />
          <RadioGroup
            label="Linha mediana"
            valor={oclusaoMistaPermanente.linhaMediana}
            opcoes={OPCOES_LINHA_MEDIANA}
            onChange={(valor) =>
              alterarMistaPermanente({ linhaMediana: valor })
            }
          />
          <RadioGroup
            label="Plano sagital superior"
            valor={oclusaoMistaPermanente.planoSagitalSuperior}
            opcoes={OPCOES_PLANO_SAGITAL}
            onChange={(valor) =>
              alterarMistaPermanente({ planoSagitalSuperior: valor })
            }
          />
          <RadioGroup
            label="Plano sagital inferior"
            valor={oclusaoMistaPermanente.planoSagitalInferior}
            opcoes={OPCOES_PLANO_SAGITAL}
            onChange={(valor) =>
              alterarMistaPermanente({ planoSagitalInferior: valor })
            }
          />
        </div>
      </SectionCard>
    </>
  );
}
