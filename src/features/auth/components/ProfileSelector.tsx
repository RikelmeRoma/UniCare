import React, { useState } from 'react';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  UserGroupIcon,
} from '../../../components/icons/CorporateIcons';

type ProfileType = 'odontologia' | 'psicologia' | 'docente' | 'recepcao';

export function ProfileSelector() {
  const [selected, setSelected] = useState<ProfileType | null>('odontologia');

  const profiles: {
    id: ProfileType;
    title: string;
    subtitle: string;
    icon: (props: { className?: string }) => React.JSX.Element;
  }[] = [
    { id: 'odontologia', title: 'Odontologia', subtitle: 'Estagiário Clínico', icon: DocumentTextIcon },
    { id: 'psicologia', title: 'Psicologia', subtitle: 'Estagiário SPA', icon: ShieldCheckIcon },
    { id: 'docente', title: 'Docente', subtitle: 'Supervisor (CRP/CRO)', icon: AcademicCapIcon },
    { id: 'recepcao', title: 'Recepção', subtitle: 'Acolhimento & Triagem', icon: UserGroupIcon },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-sans">
      {profiles.map((profile) => {
        const isSelected = selected === profile.id;
        const IconComponent = profile.icon;
        
        return (
          <button
            key={profile.id}
            type="button"
            onClick={() => setSelected(profile.id)}
            className={`
              flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-150
              ${isSelected 
                ? 'border-blue-600 bg-blue-50/60 text-slate-900 shadow-xs ring-1 ring-blue-600' 
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300'
              }
            `}
          >
            <div className={`p-3 rounded-xl mb-2.5 transition-colors ${isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <span className="font-bold text-xs text-slate-900">
              {profile.title}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">
              {profile.subtitle}
            </span>
          </button>
        );
      })}
    </div>
  );
}