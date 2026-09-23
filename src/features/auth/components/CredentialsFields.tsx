export function CredentialsFields() {
  const inputClassName = "w-full px-4 py-2.5 bg-indigo-50/40 border border-transparent rounded-md text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";
  const labelClassName = "block text-xs font-semibold text-gray-700 mb-1.5";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <div>
        <label className={labelClassName}>Senha <span className="text-red-500">*</span></label>
        <div className="relative">
          <input type="password" placeholder="Mínimo 8 caracteres" className={inputClassName} />
          {/* Ícone visual placeholder para "mostrar senha" */}
          <span className="absolute right-3 top-2.5 text-gray-400 text-xs cursor-pointer">👁️</span>
        </div>
        <div className="mt-2 text-[10px] text-gray-400 flex justify-end">
          Força da senha
        </div>
      </div>
      <div>
        <label className={labelClassName}>Confirmar Senha <span className="text-red-500">*</span></label>
        <div className="relative">
          <input type="password" placeholder="Repita a senha" className={inputClassName} />
          <span className="absolute right-3 top-2.5 text-gray-400 text-xs cursor-pointer">👁️</span>
        </div>
        <div className="mt-2 text-[10px] text-gray-400">
          Repita a senha digitada
        </div>
      </div>
    </div>
  );
}