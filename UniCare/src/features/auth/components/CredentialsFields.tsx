import { EyeIcon } from '../../../components/icons/CorporateIcons';

export function CredentialsFields() {
  const inputClassName = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors font-mono";
  const labelClassName = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start font-sans">
      <div>
        <label className={labelClassName}>Senha de Acesso <span className="text-red-500">*</span></label>
        <div className="relative">
          <input type="password" placeholder="Mínimo 8 caracteres" className={inputClassName} />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600">
            <EyeIcon className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-1.5 text-[10px] text-slate-400 flex justify-between">
          <span>Requer letras, números e símbolos</span>
          <span className="font-semibold text-emerald-700">Forte</span>
        </div>
      </div>
      <div>
        <label className={labelClassName}>Confirmar Senha <span className="text-red-500">*</span></label>
        <div className="relative">
          <input type="password" placeholder="Repita a senha digitada" className={inputClassName} />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer hover:text-slate-600">
            <EyeIcon className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-1.5 text-[10px] text-slate-400">
          Validação automática de conferência
        </div>
      </div>
    </div>
  );
}