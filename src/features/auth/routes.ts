import type { User } from './context/AuthContext';

/**
 * Para onde a conta vai depois de autenticar.
 *
 * Esta função morava dentro de `LoginFields` e, em cópia, dentro de
 * `UnauthorizedPage`. As duas já divergiram: o caso `recepcao` existia só no
 * ramo `odontologia`, então a recepção de psicologia caía no ternário
 * "não é supervisor, vai para o prontuário" e levava 403 — a rota que `App.tsx`
 * libera é `estagiario | supervisor | rt`, recepção não entra (RN-001).
 *
 * O botão "Voltar ao Meu Módulo Autorizado" tinha o defeito espelhado: mandava
 * qualquer `recepcao` para `/recepcao`, que é a tela de odontologia, e a recepção
 * de psicologia tomava 403 de novo ao tentar sair. Ficar presa em laço de negação.
 *
 * Uma função só, importada pelos dois lados: a divergência some porque não há
 * mais o que divergir.
 *
 * `geral` (RT) cai no fim. Uma recepção sem curso definido também cai no fim, e
 * o destino é a recepção de psicologia — é onde a pessoa vai ter mais chance de
 * reconhecer onde está do que ser jogada numa tela de prontuário.
 */
export function getDestinationRoute(u: User): string {
  if (u.perfil === 'rt') return '/rt/relatorios';
  if (u.perfil === 'coordenacao') return '/psi/coordenacao';

  if (u.curso === 'psicologia') {
    if (u.perfil === 'recepcao') return '/psi/recepcao';
    return u.perfil === 'supervisor' ? '/psi/supervisao' : '/psi/prontuario';
  }

  if (u.curso === 'odontologia') {
    if (u.perfil === 'recepcao') return '/recepcao';
    return u.perfil === 'supervisor' ? '/supervisao' : '/ficha-odonto';
  }

  return '/psi/recepcao';
}