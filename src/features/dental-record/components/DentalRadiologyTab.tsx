import { useEffect, useState } from 'react';
import {
  api,
  type ApiDuplaOdonto,
  type ApiRadiografiaOdonto,
} from '../../../services/api';
import { useAuth } from '../../auth/context/AuthContext';
import {
  PhotoIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
  DocumentTextIcon,
} from '../../../components/icons/CorporateIcons';

interface DentalRadiologyTabProps {
  pacienteId?: number;
  pacienteNome?: string;
  somenteLeitura?: boolean;
}

const LIMITE_ARQUIVO_BYTES = 5 * 1024 * 1024;

const formatarData = (valor: string) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString('pt-BR');
};

const ehPdf = (mime?: string | null) => mime === 'application/pdf';

export function DentalRadiologyTab({
  pacienteId,
  pacienteNome,
  somenteLeitura = false,
}: DentalRadiologyTabProps) {
  const { user } = useAuth();
  const [radiografias, setRadiografias] = useState<ApiRadiografiaOdonto[]>([]);
  const [showNovo, setShowNovo] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ApiRadiografiaOdonto | null>(null);
  const [duplas, setDuplas] = useState<ApiDuplaOdonto[]>([]);
  const [duplaId, setDuplaId] = useState('');
  const [carregandoDuplas, setCarregandoDuplas] = useState(true);
  const [erroDuplas, setErroDuplas] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);

  const [tipo, setTipo] = useState('');
  const [laudo, setLaudo] = useState('');
  const [imagemPreview, setImagemPreview] = useState('');
  const [imagemNome, setImagemNome] = useState('');
  const [imagemMime, setImagemMime] = useState('');
  const [sucessoMsg, setSucessoMsg] = useState('');

  useEffect(() => {
    let cancelado = false;

    const carregarDupla = async () => {
      if (somenteLeitura || user?.perfil !== 'estagiario') {
        if (!cancelado) {
          setDuplas([]);
          setCarregandoDuplas(false);
        }
        return;
      }

      setCarregandoDuplas(true);
      setErroDuplas('');
      try {
        const dupla = await api.getMinhaDuplaOdonto();
        if (cancelado) return;
        setDuplas(dupla ? [dupla] : []);
        setDuplaId(dupla ? String(dupla.id) : '');
      } catch (error) {
        if (cancelado) return;
        setDuplas([]);
        setDuplaId('');
        setErroDuplas(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar a dupla ativa.'
        );
      } finally {
        if (!cancelado) setCarregandoDuplas(false);
      }
    };

    void carregarDupla();
    return () => {
      cancelado = true;
    };
  }, [somenteLeitura, user?.perfil, user?.matricula]);

  useEffect(() => {
    let cancelado = false;

    const carregarRadiografias = async () => {
      if (!pacienteId) {
        if (!cancelado) {
          setRadiografias([]);
          setCarregando(false);
        }
        return;
      }

      setCarregando(true);
      setErro('');
      try {
        const lista = await api.getRadiografiasOdonto(pacienteId);
        if (!cancelado) setRadiografias(lista);
      } catch (error) {
        if (cancelado) return;
        setRadiografias([]);
        setErro(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar os exames do paciente.'
        );
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    void carregarRadiografias();
    return () => {
      cancelado = true;
    };
  }, [pacienteId]);

  const duplaSelecionada =
    duplas.find((dupla) => String(dupla.id) === duplaId) ?? null;

  const limparFormulario = () => {
    setTipo('');
    setLaudo('');
    setImagemPreview('');
    setImagemNome('');
    setImagemMime('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErro('');
    if (file.size > LIMITE_ARQUIVO_BYTES) {
      setErro('Arquivo acima do limite de 5 MB. Reduza a imagem antes de anexar.');
      e.target.value = '';
      return;
    }

    const permitido =
      file.type.startsWith('image/') || file.type === 'application/pdf';
    if (!permitido) {
      setErro('Formato inválido: anexe uma imagem ou um PDF.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagemPreview(String(reader.result ?? ''));
      setImagemNome(file.name);
      setImagemMime(file.type);
    };
    reader.onerror = () => {
      setErro('Não foi possível ler o arquivo selecionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pacienteId || !duplaSelecionada || !tipo.trim() || !laudo.trim()) return;

    setSalvando(true);
    setErro('');
    setSucessoMsg('');
    try {
      const criada = await api.createRadiografiaOdonto({
        paciente_id: pacienteId,
        dupla_id: duplaSelecionada.id,
        tipo: tipo.trim(),
        laudo: laudo.trim(),
        imagem_nome: imagemNome || undefined,
        imagem_mime: imagemMime || undefined,
        imagem_data: imagemPreview || undefined,
      });
      setRadiografias((prev) => [criada, ...prev]);
      setShowNovo(false);
      limparFormulario();
      setSucessoMsg('Exame gravado no prontuário do paciente.');
      setTimeout(() => setSucessoMsg(''), 6000);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Falha ao gravar o exame no prontuário.'
      );
    } finally {
      setSalvando(false);
    }
  };

  const handleRemover = async (id: number) => {
    if (!window.confirm('Remover este exame de imagem do prontuário?')) return;

    setExcluindoId(id);
    setErro('');
    try {
      await api.deleteRadiografiaOdonto(id);
      setRadiografias((prev) => prev.filter((r) => r.id !== id));
      if (selectedImage?.id === id) setSelectedImage(null);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : 'Falha ao remover o exame.'
      );
    } finally {
      setExcluindoId(null);
    }
  };

  const podeGravar =
    Boolean(pacienteId) &&
    Boolean(duplaSelecionada) &&
    Boolean(tipo.trim()) &&
    Boolean(laudo.trim()) &&
    !salvando;

  return (
    <div className="space-y-6 font-sans">
      {sucessoMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {erro && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shadow-2xs flex items-center gap-2">
          <XMarkIcon className="w-4 h-4 text-rose-600" />
          <span>{erro}</span>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <PhotoIcon className="w-4 h-4 text-slate-900" />
            <span>Exames de Imagem & Radiografias</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {pacienteNome
              ? `Anexos e laudos de ${pacienteNome}.`
              : 'Digitalização, upload fotográfico e emissão de laudo de radiografias periapicais, panorâmicas e fotografias clínicas'}
          </p>
        </div>
        {!somenteLeitura && (
          <button
            onClick={() => setShowNovo(!showNovo)}
            disabled={!pacienteId}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showNovo ? <XMarkIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
            <span>{showNovo ? 'Fechar Formulário' : 'Anexar Radiografia'}</span>
          </button>
        )}
      </div>

      {showNovo && !somenteLeitura && (
        <form
          onSubmit={handleSalvar}
          className="bg-white p-6 rounded-2xl border border-slate-500/50 shadow-sm space-y-4 text-xs ring-1 ring-slate-500/20"
        >
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm">
              Novo Anexo de Imagem Radiográfica / Fotografia Clínica
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              Conformidade CFO
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Modalidade do Exame *
              </label>
              <input
                type="text"
                required
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="Ex.: Radiografia Periapical, Tomografia, Fotografia Clínica"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Dupla Responsável *
              </label>
              <select
                required
                value={duplaId}
                onChange={(e) => setDuplaId(e.target.value)}
                disabled={carregandoDuplas || duplas.length === 0}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-slate-800 font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {carregandoDuplas
                    ? 'Carregando dupla...'
                    : duplas.length > 0
                      ? 'Selecione a dupla'
                      : 'Sem dupla ativa'}
                </option>
                {duplas.map((dupla) => (
                  <option key={dupla.id} value={dupla.id}>
                    {dupla.operador_nome} (Op.) & {dupla.auxiliar_nome} (Aux.)
                  </option>
                ))}
              </select>
              {erroDuplas && (
                <p className="mt-1 text-[10px] font-semibold text-rose-700">
                  {erroDuplas}
                </p>
              )}
              {!carregandoDuplas && !erroDuplas && duplas.length === 0 && (
                <p className="mt-1 text-[10px] font-semibold text-amber-700">
                  Nenhuma dupla ativa. Procure a supervisão antes de anexar o exame.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Arquivo da Radiografia / Foto (JPG, PNG ou PDF)
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer text-slate-700 font-medium transition-colors">
                <ArrowUpTrayIcon className="w-4 h-4 text-slate-600" />
                <span>Carregar Arquivo / Capturar pela Câmera</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {imagemPreview && (
                <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                  <span>{imagemNome || 'Arquivo anexado'}</span>
                </span>
              )}
            </div>
            {imagemPreview && (
              <div className="mt-3 w-40 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                {ehPdf(imagemMime) ? (
                  <div className="flex h-28 flex-col items-center justify-center gap-1 bg-slate-50 text-slate-600">
                    <DocumentTextIcon className="w-7 h-7" />
                    <span className="text-[10px] font-bold">PDF anexado</span>
                  </div>
                ) : (
                  <img
                    src={imagemPreview}
                    alt="Prévia"
                    className="h-28 w-full object-cover"
                  />
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Laudo Radiográfico / Interpretação Clínica *
            </label>
            <textarea
              required
              rows={3}
              value={laudo}
              onChange={(e) => setLaudo(e.target.value)}
              placeholder="Descreva as estruturas anatômicas observadas, limites radiolúcidos/radiopacos, espessura do ligamento e diagnósticos presuntivos..."
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-slate-800 font-medium"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setShowNovo(false);
                limparFormulario();
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!podeGravar}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? 'Gravando...' : 'Gravar Exame no Prontuário'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {carregando && (
          <p className="col-span-full text-xs text-slate-500 bg-white p-5 rounded-xl border border-slate-200/80">
            Carregando exames do paciente...
          </p>
        )}
        {!carregando && !pacienteId && (
          <p className="col-span-full text-xs text-slate-500 bg-white p-5 rounded-xl border border-slate-200/80">
            Selecione um paciente para consultar os exames de imagem.
          </p>
        )}
        {!carregando && pacienteId && radiografias.length === 0 && (
          <p className="col-span-full text-xs text-slate-500 bg-white p-5 rounded-xl border border-slate-200/80">
            Nenhum exame de imagem registrado para este paciente.
          </p>
        )}
        {!carregando &&
          radiografias.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div>
                <div className="p-4 border-b border-slate-100 flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.tipo}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                      Data: {formatarData(item.criado_em)} • Responsável: {item.dupla_estagiarios}
                    </p>
                  </div>

                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                    <ShieldCheckIcon className="w-3 h-3 text-emerald-600" />
                    <span>Registrado</span>
                  </span>
                </div>

                <div className="relative h-44 bg-slate-900 overflow-hidden group">
                  {item.imagem_data && ehPdf(item.imagem_mime) ? (
                    <a
                      href={item.imagem_data}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-200 text-xs font-bold"
                    >
                      <DocumentTextIcon className="w-9 h-9" />
                      <span>{item.imagem_nome || 'Abrir PDF do exame'}</span>
                    </a>
                  ) : item.imagem_data ? (
                    <img
                      src={item.imagem_data}
                      alt={item.tipo}
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                      Sem imagem anexada
                    </div>
                  )}
                  {item.imagem_data && !ehPdf(item.imagem_mime) && (
                    <button
                      type="button"
                      onClick={() => setSelectedImage(item)}
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold"
                    >
                      <EyeIcon className="w-4 h-4" />
                      <span>Inspecionar Imagem em Alta Resolução</span>
                    </button>
                  )}
                </div>

                <div className="p-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Laudo Radiográfico / Parecer Clínico:
                  </span>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                    {item.laudo}
                  </p>
                </div>
              </div>

              <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedImage(item)}
                  className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
                >
                  <EyeIcon className="w-3.5 h-3.5" />
                  <span>Visualizar</span>
                </button>
                {!somenteLeitura && (
                  <button
                    type="button"
                    onClick={() => void handleRemover(item.id)}
                    disabled={excluindoId === item.id}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1 disabled:opacity-50"
                    title="Remover anexo"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  {selectedImage.tipo}
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Data: {formatarData(selectedImage.criado_em)} • Responsável:{' '}
                  {selectedImage.dupla_estagiarios}
                </p>
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              {selectedImage.imagem_data && ehPdf(selectedImage.imagem_mime) ? (
                <a
                  href={selectedImage.imagem_data}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-2 py-16 text-slate-200 text-xs font-bold"
                >
                  <DocumentTextIcon className="w-10 h-10" />
                  <span>{selectedImage.imagem_nome || 'Abrir PDF do exame'}</span>
                </a>
              ) : selectedImage.imagem_data ? (
                <img
                  src={selectedImage.imagem_data}
                  alt={selectedImage.tipo}
                  className="max-h-[60vh] w-auto object-contain"
                />
              ) : (
                <p className="text-slate-400 text-xs py-16">Sem imagem anexada</p>
              )}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1">
              <span className="font-bold text-slate-900">Laudo Radiográfico Oficial:</span>
              <p className="leading-relaxed">{selectedImage.laudo}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
