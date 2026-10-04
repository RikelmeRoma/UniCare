export function PersonalInfoFields() {
  // Estilo base para todos os inputs e selects para manter a consistência com o design
  const inputClassName = "w-full px-4 py-2.5 bg-indigo-50/40 border border-transparent rounded-md text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";
  
  const labelClassName = "block text-xs font-semibold text-gray-700 mb-1.5";
  const requiredAsterisk = <span className="text-red-500">*</span>;

  return (
    <div className="space-y-5">
      {/* Nome Completo - Ocupa a largura total */}
      <div>
        <label className={labelClassName}>Nome Completo {requiredAsterisk}</label>
        <input 
          type="text" 
          placeholder="Ex.: Mariana Albuquerque Silva" 
          className={inputClassName}
        />
      </div>

      {/* Linha: CPF e Matrícula */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>CPF {requiredAsterisk}</label>
          <input 
            type="text" 
            placeholder="000.000.000-00" 
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Matrícula Ser Educacional {requiredAsterisk}</label>
          <input 
            type="text" 
            placeholder="Ex.: 01489234" 
            className={inputClassName}
          />
        </div>
      </div>

      {/* Linha: E-mail e Telefone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>E-mail Institucional {requiredAsterisk}</label>
          <input 
            type="email" 
            placeholder="nome.sobrenome@uninassau.edu.br" 
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Telefone / WhatsApp {requiredAsterisk}</label>
          <input 
            type="tel" 
            placeholder="(79) 99999-9999" 
            className={inputClassName}
          />
        </div>
      </div>

      {/* Linha: Curso e Turma */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>Curso / Especialidade {requiredAsterisk}</label>
          <select className={inputClassName} defaultValue="odonto">
            <option value="odonto">Odontologia (Clínicas Integradas)</option>
            <option value="psico">Psicologia</option>
          </select>
        </div>
        <div>
          <label className={labelClassName}>Turma & Turno {requiredAsterisk}</label>
          <select className={inputClassName} defaultValue="manha">
            <option value="manha">Manhã (07:30 - 11:50)</option>
            <option value="tarde">Tarde (13:30 - 17:50)</option>
          </select>
        </div>
      </div>

      {/* Linha: Dupla e Supervisor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClassName}>Dupla Clínica</label>
          <input 
            type="text" 
            placeholder="Nome ou matrícula da dupla" 
            className={inputClassName}
          />
        </div>
        <div>
          <label className={labelClassName}>Docente Supervisor Responsável {requiredAsterisk}</label>
          <select className={inputClassName} defaultValue="juliana">
            <option value="juliana">Profa. Dra. Juliana Moura Feitosa (CRO/SE 412)</option>
          </select>
        </div>
      </div>
    </div>
  );
}