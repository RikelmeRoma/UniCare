import { useState } from 'react';

type ProfileType = 'odontologia' | 'psicologia' | 'docente' | 'recepcao';

export function ProfileSelector() {
  const [selected, setSelected] = useState<ProfileType | null>('odontologia');

  const profiles = [
    { id: 'odontologia', title: 'Odontologia', subtitle: 'Estagiário', icon: '🦷' },
    { id: 'psicologia', title: 'Psicologia', subtitle: 'Estagiário', icon: '🧠' },
    { id: 'docente', title: 'Docente', subtitle: 'Supervisor', icon: '👨‍🏫' },
    { id: 'recepcao', title: 'Recepção', subtitle: 'Apoio', icon: '📋' },
  ] as const;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {profiles.map((profile) => {
        const isSelected = selected === profile.id;
        
        return (
          <button
            key={profile.id}
            type="button"
            onClick={() => setSelected(profile.id)}
            className={`
              flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all duration-200
              ${isSelected 
                ? 'border-blue-100 bg-blue-50/50 text-blue-900 shadow-sm' 
                : 'border-gray-100 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-200'
              }
            `}
          >
            <span className={`text-2xl mb-3 p-3 rounded-lg ${isSelected ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-500'}`}>
              {profile.icon}
            </span>
            <span className={`font-semibold text-sm ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
              {profile.title}
            </span>
            <span className="text-xs text-gray-500 mt-1">
              {profile.subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}