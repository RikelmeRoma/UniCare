import { NavLink } from 'react-router-dom';

export function PsySidebar() {
  const getLinkStyle = ({ isActive }: { isActive: boolean }) => 
    `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive 
        ? 'bg-[#0a1526] text-white' 
        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-blue-600">🏥</span> UniCare
        </h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">UNINASSAU Saúde</p>
      </div>

      <nav className="flex-1 px-4 mt-6">
        <h2 className="text-xs font-semibold text-gray-400 mb-4 uppercase tracking-wider">Módulos Clínicos</h2>
        <ul className="space-y-2">
          <li>
            <NavLink to="/psi/recepcao" className={getLinkStyle}>
              <span>📅</span> Agenda & Recepção
            </NavLink>
          </li>
          <li>
            <NavLink to="/psi/supervisao" className={getLinkStyle}>
              <span>🛡️</span> Supervisão Docente
            </NavLink>
          </li>
          <li>
            <NavLink to="/psi/prontuario" className={getLinkStyle}>
              <span>📄</span> Prontuário de Psicologia
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}