import type { Dispatch, SetStateAction } from 'react';
import type {
  AnamneseInfantil,
  PlanoTratamentoInfantil,
} from './tipos';
import {
  Field,
  SectionCard,
  SignatureField,
  SubTitulo,
  TextAreaField,
} from '../anamnese/FormularioBase';

interface Pagina5Props {
  planoTratamento: PlanoTratamentoInfantil;
  setDados: Dispatch<SetStateAction<AnamneseInfantil>>;
}

export function Pagina5PlanoTratamento({
  planoTratamento,
  setDados,
}: Pagina5Props) {
  const alterarPlano = (patch: Partial<PlanoTratamentoInfantil>) =>
    setDados((prev) => ({
      ...prev,
      planoTratamento: { ...prev.planoTratamento, ...patch },
    }));

  return (
    <SectionCard
      id="anamnese-infantil-p5-secao-1"
      numero={1}
      titulo="Plano de Tratamento (Segundo KERR)"
    >
      <SubTitulo>1. Fase sistêmica</SubTitulo>
      <TextAreaField
        label="Fase sistêmica"
        rows={3}
        value={planoTratamento.faseSistemica}
        onChange={(valor) => alterarPlano({ faseSistemica: valor })}
      />

      <SubTitulo>2. Fase preparatória</SubTitulo>
      <TextAreaField
        label="2.1 Etapa preventiva"
        rows={3}
        value={planoTratamento.etapaPreventiva}
        onChange={(valor) => alterarPlano({ etapaPreventiva: valor })}
      />
      <TextAreaField
        label="2.2 Adequação do meio"
        rows={3}
        value={planoTratamento.adequacaoMeio}
        onChange={(valor) => alterarPlano({ adequacaoMeio: valor })}
      />

      <SubTitulo>3. Fase corretiva</SubTitulo>
      <TextAreaField
        label="3.1 Etapa restauradora"
        rows={3}
        value={planoTratamento.etapaRestauradora}
        onChange={(valor) => alterarPlano({ etapaRestauradora: valor })}
      />
      <TextAreaField
        label="3.2 Tratamento ortodôntico"
        rows={3}
        value={planoTratamento.tratamentoOrtodontico}
        onChange={(valor) => alterarPlano({ tratamentoOrtodontico: valor })}
      />

      <SubTitulo>4. Fase de manutenção</SubTitulo>
      <TextAreaField
        label="Fase de manutenção"
        rows={3}
        value={planoTratamento.faseManutencao}
        onChange={(valor) => alterarPlano({ faseManutencao: valor })}
      />

      <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
        <SignatureField
          label="Assinatura do Professor"
          value={planoTratamento.assinaturaProfessor}
          onChange={(valor) => alterarPlano({ assinaturaProfessor: valor })}
        />
        <Field
          label="Data"
          type="date"
          value={planoTratamento.dataAssinatura}
          onChange={(valor) => alterarPlano({ dataAssinatura: valor })}
        />
      </div>
    </SectionCard>
  );
}
