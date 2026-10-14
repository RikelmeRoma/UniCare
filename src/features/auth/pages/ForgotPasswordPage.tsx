import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '../../../components/icons/CorporateIcons';

/**
 * Tela de recuperação de senha.
 *
 * Antes exibia um formulário completo — e-mail ou CPF, perfil de atuação e um
 * botão — que **não tinha `<form>`, handler nem chamada de API nenhuma**. O
 * campo aceitando digitação e nada acontecendo é pior que campo ausente: a
 * tela fingia funcionar.
 *
 * Pior ainda, o rodapé do formulário afirmava "Emissão de Token Criptográfico"
 * e que um código de 15 minutos "será gerado e enviado ao e-mail institucional
 * registrado sob conformidade com a LGPD". Não existe geração de token, não
 * existe envio de e-mail (a aplicação não tem canal SMTP nem biblioteca de
 * e-mail) e não existe rota de recuperação no backend — a única rota pública é
 * `POST /auth/login`. Alegar conformidade LGPD para um mecanismo inexistente é
 * o tipo de afirmação que não pode ficar numa tela que trata dado de saúde.
 *
 * A tela agora diz o que é verdade e nada além disso.
 */
export function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Cabeçalho da Página */}
      <header className="bg-white border-b border-slate-200 px-6 sm:px-8 py-4 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">UniCare Enterprise Health</h1>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Hospital-Escola UNINASSAU</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold border border-slate-200">
            <MapPinIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Campus Aracaju</span>
          </span>
        </div>
      </header>

      {/* Área Central */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="mb-6 flex items-center gap-2 text-xs font-bold text-blue-700 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-200/80 uppercase tracking-wider">
          <ShieldCheckIcon className="w-4 h-4 text-blue-700" />
          <span>Portal de Identidade & Acesso Institucional</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
          <div className="bg-slate-900 text-white p-8 text-center">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/20">
              <ArrowPathIcon className="w-6 h-6 text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2 tracking-tight">Redefinição de Credenciais</h2>
            <p className="text-xs text-slate-300 px-4 leading-relaxed">
              Ainda não há recuperação automática de senha no UniCare.
            </p>
          </div>

          <div className="p-8 space-y-5">
            {/* O que existe hoje, dito sem rodeio. */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex gap-3 text-xs">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-900">
                  Este formulário não existe mais porque não havia nada por trás dele
                </h3>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  A versão anterior desta tela aceitava e-mail ou CPF e perfil de atuação,
                  e prometia enviar um token de 15 minutos. Não há geração de token, não
                  há envio de e-mail — a aplicação não tem canal de e-mail configurado —
                  e não há rota de recuperação no servidor. A única rota pública de
                  autenticação é o login por matrícula e senha.
                </p>
              </div>
            </div>

            {/* O caminho que funciona. */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex gap-3 text-xs">
              <LockClosedIcon className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900">Como obter acesso hoje</h3>
                <ul className="text-[11px] text-slate-700 mt-1.5 space-y-1.5 list-disc pl-4">
                  <li>
                    <strong>Se você já está autenticado</strong> e quer trocar a senha por
                    precaução: ainda não há tela para isso — é funcionalidade pendente do
                    projeto.
                  </li>
                  <li>
                    <strong>Se você não tem acesso</strong>, procure a coordenação da sua
                    clínica-escola (SPA ou Clínica Odontológica Integrada), que é quem
                    autoriza credenciais de estagiário.
                  </li>
                  <li>
                    A senha é gravada com bcrypt e não é recuperável em texto claro por
                    ninguém, nem pela coordenação. Ela é redefinida, não consultada.
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 text-xs">
              <Link to="/login" className="font-semibold text-slate-600 hover:text-slate-900">
                Voltar para o Login
              </Link>
              <span className="text-slate-500">
                Primeiro acesso?{' '}
                <Link to="/cadastro" className="font-bold text-blue-700 hover:underline">
                  Solicitar credencial
                </Link>
              </span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold text-slate-500 flex items-center gap-1.5">
          <BuildingOfficeIcon className="w-3.5 h-3.5 text-slate-400" />
          <span>Coordenação de Odontologia e Serviço de Psicologia Aplicada — Aracaju</span>
        </p>
      </main>

      {/* Rodapé da Página */}
      <footer className="border-t border-slate-200 bg-white px-6 sm:px-8 py-3.5 flex justify-between items-center text-[10px] text-slate-500 shrink-0">
        <p>© 2026 UniCare UNINASSAU — Todos os direitos reservados.</p>
        <p className="flex items-center gap-1.5 font-mono">
          <ShieldCheckIcon className="w-3 h-3 text-emerald-600" />
          <span>LGPD Art. 11 — dados sensíveis de saúde</span>
        </p>
      </footer>
    </div>
  );
}