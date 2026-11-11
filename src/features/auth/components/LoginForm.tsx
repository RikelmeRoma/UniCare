import { useState } from 'react';
import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';
import { LoginFields } from './LoginFields';
import { LoginInfoPanel } from './LoginInfoPanel';

export type ActiveDomain = 'psicologia' | 'odontologia' | 'recepcao' | 'institucional' | 'credenciais';

export function LoginForm() {
  const [activeDomain, setActiveDomain] = useState<ActiveDomain>('credenciais');

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 dark:text-slate-100 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/40 dark:from-[#060B16] dark:via-[#081020] dark:to-[#0A162B] transition-colors">
      <AuthHeader />

      <main className="flex-grow flex items-center justify-center p-4 sm:p-8 relative z-10">
        <div className="max-w-5xl w-full bg-white dark:bg-[#0D1628] rounded-3xl shadow-2xl shadow-slate-900/10 dark:shadow-black/50 flex flex-col lg:flex-row overflow-hidden min-h-[640px] border border-slate-200/80 dark:border-slate-800/90 transition-all duration-500">
          <LoginFields activeDomain={activeDomain} onDomainChange={setActiveDomain} />
          <LoginInfoPanel activeDomain={activeDomain} />
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}