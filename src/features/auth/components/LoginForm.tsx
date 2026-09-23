import { AuthHeader } from './AuthHeader';
import { AuthFooter } from './AuthFooter';
import { LoginFields } from './LoginFields';
import { LoginInfoPanel } from './LoginInfoPanel';

export function LoginForm() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans text-gray-900">
      <AuthHeader />

      <main className="flex-grow flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl shadow-gray-200/50 flex overflow-hidden min-h-[600px] border border-gray-100">
          <LoginFields />
          <LoginInfoPanel />
        </div>
      </main>

      <AuthFooter />
    </div>
  );
}