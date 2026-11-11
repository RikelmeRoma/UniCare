import { AuthFooter } from '../components/AuthFooter';
import { AuthHeader } from '../components/AuthHeader';
import { RegisterForm } from '../components/RegisterForm';

export function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 dark:text-slate-100 bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50/40 dark:from-[#060B16] dark:via-[#081020] dark:to-[#0A162B] transition-colors">
      <AuthHeader />
      <main className="flex-grow flex items-center justify-center p-4 sm:p-8">
        <RegisterForm />
      </main>
      <AuthFooter />
    </div>
  );
}