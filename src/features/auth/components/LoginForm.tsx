import { useState } from 'react';
import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';
import { LoginFields } from './LoginFields';
import { LoginInfoPanel } from './LoginInfoPanel';

export type ActiveDomain = 'psicologia' | 'odontologia' | 'institucional' | 'credenciais';

export function LoginForm() {
  const [activeDomain, setActiveDomain] = useState<ActiveDomain>('credenciais');

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 bg-slate-100">
      <AuthHeader />

      <main className="flex-grow flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl shadow-slate-900/10 flex flex-col lg:flex-row overflow-hidden min-h-[640px] border border-slate-200/80 transition-all duration-500">
          <LoginFields activeDomain={activeDomain} onDomainChange={setActiveDomain} />
          <LoginInfoPanel activeDomain={activeDomain} />
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}