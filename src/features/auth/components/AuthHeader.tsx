export function AuthHeader() {
  return (
    <header className="flex justify-between items-center px-8 py-4 bg-white border-b border-gray-100">
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">UniCare</h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">Clínicas-Escola UNINASSAU</p>
      </div>
      <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
        <a href="#" className="text-blue-600 hover:underline">Ajuda & Suporte</a>
        <a href="#" className="hover:text-gray-900">Contato</a>
        <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-md">
          <span>📍</span> Unidade Aracaju
        </div>
      </div>
    </header>
  );
}