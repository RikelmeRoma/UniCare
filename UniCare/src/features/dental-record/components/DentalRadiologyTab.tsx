import { useState } from 'react';
import {
  PhotoIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
} from '../../../components/icons/CorporateIcons';

export interface RadiografiaItem {
  id: number;
  data: string;
  tipo: 'Periapical' | 'Panorâmica' | 'Bite-Wing' | 'Oclusal' | 'Fotografia Clínica';
  regiao: string;
  laudo: string;
  responsavel: string;
  status: 'Homologado' | 'Pendente';
  vistoDocente?: string;
  imagemUrl: string;
}

const INITIAL_RADIOGRAFIAS: RadiografiaItem[] = [
  {
    id: 1,
    data: '15/09/2026',
    tipo: 'Periapical',
    regiao: 'Dente 36 (Molar Inferior Esquerdo)',
    laudo: 'Área radiolúcida compatível com lesão cariosa profunda atingindo terço médio de dentina na face ocluso-distal. Espaço do ligamento periodontal e lâmina dura preservados, sem envolvimento periapical.',
    responsavel: 'Lucas Vasconcelos (Op.) & Gabriela Prado (Aux.)',
    status: 'Pendente',
    imagemUrl: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 2,
    data: '08/09/2026',
    tipo: 'Panorâmica',
    regiao: 'Arcadas Superior e Inferior Completa',
    laudo: 'Ausência de lesões ósseas patológicas. Presença dos terceiros molares 18 e 28 inclusos verticalmente; 38 e 48 semi-inclusos com angulação mesioangular. Cristas ósseas alveolares íntegras.',
    responsavel: 'Augusto Cesar Farias (Op.) & Marlon Bruno (Aux.)',
    status: 'Homologado',
    vistoDocente: 'Profa. Dra. Bianca Nubia (CRO-SE 4512) • 08/09 17:10',
    imagemUrl: 'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?auto=format&fit=crop&q=80&w=800',
  },
];

export function DentalRadiologyTab() {
  const [radiografias, setRadiografias] = useState<RadiografiaItem[]>(INITIAL_RADIOGRAFIAS);
  const [showNovo, setShowNovo] = useState(false);
  const [selectedImage, setSelectedImage] = useState<RadiografiaItem | null>(null);

  // Form states
  const [tipo, setTipo] = useState<RadiografiaItem['tipo']>('Periapical');
  const [regiao, setRegiao] = useState('');
  const [laudo, setLaudo] = useState('');
  const [responsavel, setResponsavel] = useState('Augusto Cesar (Op.) & Gabriela Prado (Aux.)');
  const [imagemPreview, setImagemPreview] = useState<string>('');
  const [sucessoMsg, setSucessoMsg] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regiao.trim() || !laudo.trim()) return;

    const nova: RadiografiaItem = {
      id: Date.now(),
      data: '15/09/2026',
      tipo,
      regiao,
      laudo,
      responsavel,
      status: 'Pendente',
      imagemUrl:
        imagemPreview ||
        'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=800',
    };

    setRadiografias([nova, ...radiografias]);
    setShowNovo(false);
    setRegiao('');
    setLaudo('');
    setImagemPreview('');
    setSucessoMsg('Exame radiográfico anexado com sucesso e submetido para validação docente.');
    setTimeout(() => setSucessoMsg(''), 4000);
  };

  const handleRemover = (id: number) => {
    setRadiografias(radiografias.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6 font-sans">
      {sucessoMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
          <span>{sucessoMsg}</span>
        </div>
      )}

      {/* Cabeçalho da Aba */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <PhotoIcon className="w-4 h-4 text-emerald-800" />
            <span>Exames de Imagem & Radiografias (RF02 / UC-05)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Digitalização, upload fotográfico e emissão de laudo de radiografias periapicais, panorâmicas e fotografias clínicas
          </p>
        </div>
        <button
          onClick={() => setShowNovo(!showNovo)}
          className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
        >
          {showNovo ? <XMarkIcon className="w-3.5 h-3.5" /> : <PlusIcon className="w-3.5 h-3.5" />}
          <span>{showNovo ? 'Fechar Formulário' : 'Anexar Radiografia'}</span>
        </button>
      </div>

      {/* Formulário de Upload e Laudo */}
      {showNovo && (
        <form
          onSubmit={handleSalvar}
          className="bg-white p-6 rounded-2xl border border-emerald-500/50 shadow-sm space-y-4 text-xs ring-1 ring-emerald-500/20"
        >
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-bold text-slate-900 text-sm">
              Novo Anexo de Imagem Radiográfica / Fotografia Clínica
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200">
              Conformidade CFO
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Modalidade do Exame *
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as RadiografiaItem['tipo'])}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              >
                <option value="Periapical">Radiografia Periapical</option>
                <option value="Panorâmica">Radiografia Panorâmica</option>
                <option value="Bite-Wing">Radiografia Interproximal (Bite-Wing)</option>
                <option value="Oclusal">Radiografia Oclusal</option>
                <option value="Fotografia Clínica">Fotografia Clínica Intra/Extraoral</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Dente ou Região Anatômica *
              </label>
              <input
                type="text"
                required
                value={regiao}
                onChange={(e) => setRegiao(e.target.value)}
                placeholder="Ex: Dente 36 ou Arcada Superior"
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Dupla Responsável *
              </label>
              <input
                type="text"
                required
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Arquivo da Radiografia / Foto (JPG, PNG ou PDF) *
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
                  <span>Arquivo anexado com sucesso</span>
                </span>
              )}
            </div>
            {imagemPreview && (
              <div className="mt-3 w-32 h-32 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                <img
                  src={imagemPreview}
                  alt="Prévia"
                  className="w-full h-full object-cover"
                />
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
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-600 font-medium"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowNovo(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition-colors"
            >
              Gravar Laudo e Submeter ao Supervisor
            </button>
          </div>
        </form>
      )}

      {/* Grid de Radiografias e Exames */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {radiografias.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              {/* Header do Card */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{item.tipo}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                      {item.regiao}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    Data: {item.data} • Responsável: {item.responsavel}
                  </p>
                </div>

                {item.status === 'Homologado' ? (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                    <ShieldCheckIcon className="w-3 h-3 text-emerald-600" />
                    <span>Homologado</span>
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                    <ClockIcon className="w-3 h-3 text-amber-600" />
                    <span>Aguardando Visto</span>
                  </span>
                )}
              </div>

              {/* Imagem do Exame */}
              <div className="relative h-44 bg-slate-900 overflow-hidden group">
                <img
                  src={item.imagemUrl}
                  alt={item.tipo}
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  type="button"
                  onClick={() => setSelectedImage(item)}
                  className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span>Inspecionar Imagem em Alta Resolução</span>
                </button>
              </div>

              {/* Laudo Descritivo */}
              <div className="p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Laudo Radiográfico / Parecer Clínico:
                </span>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                  {item.laudo}
                </p>
                {item.vistoDocente && (
                  <p className="text-[10px] text-emerald-800 font-semibold flex items-center gap-1.5 pt-1">
                    <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Assinado digitalmente por: {item.vistoDocente}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Ações do Card */}
            <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setSelectedImage(item)}
                className="text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                <span>Visualizar</span>
              </button>
              <button
                type="button"
                onClick={() => handleRemover(item.id)}
                className="text-slate-400 hover:text-red-600 transition-colors p-1"
                title="Remover anexo"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Inspeção em Alta Resolução */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  {selectedImage.tipo} • {selectedImage.regiao}
                </h4>
                <p className="text-xs text-slate-500 font-mono">
                  Data: {selectedImage.data} • Responsável: {selectedImage.responsavel}
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
              <img
                src={selectedImage.imagemUrl}
                alt={selectedImage.tipo}
                className="max-h-[60vh] w-auto object-contain"
              />
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
