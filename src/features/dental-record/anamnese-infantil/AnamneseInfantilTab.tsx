import { useEffect, useRef, useState } from 'react';
import type { Paciente } from '../../clinic/context/ClinicContext';
import { ExclamationTriangleIcon } from '../../../components/icons/CorporateIcons';
import { AnamneseHeader } from '../anamnese/AnamneseHeader';
import {
  calcularIdadeInfantil,
  carregarRascunhoInfantil,
  criarAnamneseInfantilVazia,
  exportarJsonInfantil,
  removerRascunhoInfantil,
  salvarRascunhoInfantil,
} from './estado';
import type { AnamneseInfantil } from './tipos';
import { Pagina1IdentificacaoPsicologica } from './Pagina1IdentificacaoPsicologica';
import { Pagina2AntecedentesHabitos } from './Pagina2AntecedentesHabitos';
import { Pagina3ExameFisicoOclusao } from './Pagina3ExameFisicoOclusao';
import { Pagina4HigieneOdontograma } from './Pagina4HigieneOdontograma';
import { Pagina5PlanoTratamento } from './Pagina5PlanoTratamento';
import { Pagina6EvolucaoTermo } from './Pagina6EvolucaoTermo';

interface AnamneseInfantilTabProps {
  paciente?: Paciente;
}

export function AnamneseInfantilTab({ paciente }: AnamneseInfantilTabProps) {
  const [dados, setDados] = useState<AnamneseInfantil>(() => {
    if (!paciente) return criarAnamneseInfantilVazia();
    return (
      carregarRascunhoInfantil(paciente.id) ??
      criarAnamneseInfantilVazia(paciente)
    );
  });
  const [mensagem, setMensagem] = useState<{
    tipo: 'ok' | 'alerta';
    texto: string;
  } | null>(null);
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
  const [conteudoOculto, setConteudoOculto] = useState(false);
  const pularAutosave = useRef(false);
  const dadosIniciais = useRef(dados);

  useEffect(() => {
    if (dados === dadosIniciais.current) return;
    if (pularAutosave.current) {
      pularAutosave.current = false;
      return;
    }
    if (paciente?.id) {
      salvarRascunhoInfantil(paciente.id, dados);
    }
  }, [paciente?.id, dados]);

  if (!paciente) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-xs font-semibold text-amber-900">
        <div className="mb-1 flex items-center gap-2">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <span>Nenhum paciente odontológico selecionado.</span>
        </div>
        <p className="font-medium text-amber-800">
          Selecione um paciente no topo da página para iniciar a ficha infantil.
        </p>
      </div>
    );
  }

  const salvar = () => {
    const salvo = salvarRascunhoInfantil(paciente.id, dados);
    setMensagem(
      salvo
        ? { tipo: 'ok', texto: 'Rascunho salvo neste navegador.' }
        : {
            tipo: 'alerta',
            texto:
              'Não foi possível salvar neste navegador. O armazenamento pode estar cheio ou bloqueado.',
          }
    );
  };

  const exportar = () => {
    exportarJsonInfantil(paciente, dados);
    setMensagem({
      tipo: 'ok',
      texto: 'Arquivo JSON exportado. O rascunho continua salvo neste navegador.',
    });
  };

  const limpar = () => {
    pularAutosave.current = true;
    removerRascunhoInfantil(paciente.id);
    setDados(criarAnamneseInfantilVazia(paciente));
    setConfirmandoLimpeza(false);
    setMensagem({
      tipo: 'alerta',
      texto: 'Todos os campos foram limpos. O rascunho anterior foi descartado.',
    });
  };

  const idadeCalculada = calcularIdadeInfantil(
    dados.identificacao.dataNascimento
  );

  return (
    <div className="space-y-4 font-sans">
      <AnamneseHeader
        titulo="Anamnese Infantil — Odontopediatria"
        selo="INFANTIL"
        paciente={paciente}
        idade={idadeCalculada}
        idConteudo="anamnese-infantil-conteudo"
        conteudoOculto={conteudoOculto}
        onAlternarConteudo={() => setConteudoOculto((oculto) => !oculto)}
        onSalvar={salvar}
        onExportar={exportar}
        onLimpar={() => setConfirmandoLimpeza(true)}
        confirmandoLimpeza={confirmandoLimpeza}
        onCancelarLimpeza={() => setConfirmandoLimpeza(false)}
        onConfirmarLimpeza={limpar}
        mensagem={mensagem}
        descricao={
          <>
            Ficha completa de anamnese infantil. Nesta fase o preenchimento fica
            <strong className="text-slate-700"> apenas neste navegador</strong>{' '}
            (sessionStorage) e pode ser exportado em JSON; nada é enviado ao
            servidor.
          </>
        }
      />

      <div
        id="anamnese-infantil-conteudo"
        className={conteudoOculto ? 'hidden' : 'space-y-4'}
      >
        <Pagina1IdentificacaoPsicologica
          identificacao={dados.identificacao}
          avaliacaoPsicologica={dados.avaliacaoPsicologica}
          setDados={setDados}
        />

        <Pagina2AntecedentesHabitos
          antecedentesHereditarios={dados.antecedentesHereditarios}
          preNatal={dados.preNatal}
          natal={dados.natal}
          posNatalSaude={dados.posNatalSaude}
          habitosHigiene={dados.habitosHigiene}
          setDados={setDados}
        />

        <Pagina3ExameFisicoOclusao
          exameExtrabucal={dados.exameExtrabucal}
          exameIntrabucal={dados.exameIntrabucal}
          oclusaoDecidua={dados.oclusaoDecidua}
          oclusaoMistaPermanente={dados.oclusaoMistaPermanente}
          setDados={setDados}
        />

        <Pagina4HigieneOdontograma
          mapaHigiene={dados.mapaHigiene}
          diarioAlimentar={dados.diarioAlimentar}
          odontograma={dados.odontograma}
          setDados={setDados}
        />

        <Pagina5PlanoTratamento
          planoTratamento={dados.planoTratamento}
          setDados={setDados}
        />

        <Pagina6EvolucaoTermo
          evolucao={dados.evolucao}
          termo={dados.termo}
          setDados={setDados}
        />

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 text-[10px] leading-relaxed text-slate-500">
          <p className="font-bold text-slate-700">Sobre esta ficha</p>
          <p className="mt-1">
            A anamnese infantil é um rascunho local por paciente. O odontograma
            infantil e o mapa de IP/IS são componentes próprios da
            odontopediatria e não alteram o odontograma ou o periograma gerais.
            A ficha inteira só vai ao servidor quando o modelo de dados do
            backend for definido.
          </p>
        </div>
      </div>
    </div>
  );
}
