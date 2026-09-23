export function AuthFooter() {
  return (
    <footer className="px-8 py-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 bg-white border-t border-gray-100">
      <p>© 2026 UniCare UNINASSAU • Todos os direitos reservados.</p>
      <div className="flex items-center gap-4 mt-4 md:mt-0">
        <span className="flex items-center gap-1 text-green-600 font-medium">
          🔒 Conexão Segura TLS 1.3
        </span>
        <span>•</span>
        <a href="#" className="hover:text-gray-900">Termos & Privacidade</a>
      </div>
    </footer>
  );
}