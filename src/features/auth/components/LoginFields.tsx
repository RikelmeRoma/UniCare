import { useState } from 'react';

type RoleType = 'estudante' | 'docente' | 'recepcao';

export function LoginFields() {
  const [activeRole, setActiveRole] = useState<RoleType>('estudante');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700 mb-4">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Acesso Seguro • Portal Clínico
        </span>
        <h2 className="text-3xl font-bold mb-2">Entrar no UniCare</h2>
        <p className="text-gray-500 text-sm">
          Selecione o seu perfil de atuação e insira suas credenciais institucionais.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex bg-indigo-50/50 p-1 rounded-lg mb-6">
          {(['estudante', 'docente', 'recepcao'] as RoleType[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-all ${
                activeRole === role 
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {role === 'docente' ? 'Docente / RT' : role}
            </button>
          ))}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">Matrícula ou E-mail Institucional</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400">👤</span>
            <input 
              type="text" 
              placeholder="01348821 ou usuario@uninassau.edu.br" 
              className="w-full pl-10 pr-4 py-2.5 bg-indigo-50/40 border border-transparent rounded-md text-sm text-gray-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-xs font-semibold text-gray-700">Senha</label>
            <a href="#" className="text-xs text-blue-600 hover:underline">Esqueceu a senha?</a>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400">🔒</span>
            <input 
              type="password" 
              defaultValue="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-indigo-50/40 border border-transparent rounded-md text-sm text-gray-800 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
            <span className="absolute right-3 top-2.5 text-gray-400 cursor-pointer">👁️</span>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-900 focus:ring-blue-900" />
          <span className="text-sm text-gray-600">Lembrar nesta estação</span>
        </label>

        <button 
          type="submit" 
          className="w-full bg-[#0a1526] hover:bg-black text-white py-3 rounded-md font-medium transition-colors mt-4 flex justify-center items-center gap-2"
        >
          <span>🚪</span> Acessar Plataforma
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center text-sm">
        <span className="text-gray-500">Primeiro acesso ao estágio clínico?</span>
        <a href="/cadastro" className="text-blue-600 font-medium hover:underline">Solicitar Acesso &rarr;</a>
      </div>
    </div>
  );
}