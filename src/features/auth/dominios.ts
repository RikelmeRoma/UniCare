/**
 * Política de e-mail institucional, em um lugar só.
 *
 * A lista espelha `backend/app/schemas/solicitacao.py` — quem **recusa** o
 * domínio é o servidor. O frontend precisa da mesma lista para sugerir o
 * endereço na tela pública e para avisar a gestão, antes da aprovação, que o
 * endereço de destino não é institucional.
 *
 * Duas cópias dessa lista divergem na primeira mudança: foi o que aconteceu
 * com `getDestinationRoute`, que existia no login e na tela de acesso negado.
 * Por isso a lista vive aqui, e `RegisterForm` e `SolicitacoesCadastro` importam
 * daqui em vez de escrever o domínio à mão.
 *
 * A comparação é `endswith` com o `@` junto, igual ao backend: assim
 * `x@sempreuninassau.com.br` é institucional e `x@sempreuninnassau.com.br`
 * (dois "n") não é.
 */
export const DOMINIOS_INSTITUCIONAIS = [
  '@uninassau.edu.br',
  '@prof.uninassau.edu.br',
  '@sempreuninassau.com.br',
] as const;

export type PerfilSolicitado =
  | 'estagiario'
  | 'supervisor'
  | 'recepcao'
  | 'rt'
  | 'coordenacao';

/**
 * Sufixo sugerido para o perfil: estagiário usa `@sempreuninassau.com.br`, os
 * demais usam `@prof.uninassau.edu.br`.
 *
 * É só uma sugestão. Com `PERMITIR_EMAILS_EXTERNOS` ligado o servidor aceita
 * qualquer endereço, e a pessoa pode sobrescrever o valor na tela pública.
 */
export function dominioDoPerfil(perfil: PerfilSolicitado): string {
  return perfil === 'estagiario' ? '@sempreuninassau.com.br' : '@prof.uninassau.edu.br';
}

/** `true` quando o endereço termina em um dos domínios institucionais. */
export function eInstitucional(email: string): boolean {
  const normalizado = email.trim().toLowerCase();
  return DOMINIOS_INSTITUCIONAIS.some((dominio) => normalizado.endsWith(dominio));
}
