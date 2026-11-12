/**
 * Persistência temporária em `sessionStorage` para manter o histórico do
 * Assistente Clínico IA ao fechar/reabrir a gaveta ou trocar de aba, isolado
 * por usuário autenticado, curso e paciente (limpo integralmente no logout).
 */

export const IA_CHAT_STORAGE_PREFIX = 'unicare:ia-chat:';
const MAX_MENSAGENS_SALVAS = 40;

export interface MensagemChat {
  id: string;
  papel: 'user' | 'assistant';
  texto: string;
  transcricao?: string | null;
  camposSugeridos?: Record<string, string>;
  alertasClinicos?: string[];
  avisosConformidade?: string[];
  modeloUtilizado?: string;
  aplicado?: boolean;
}

interface ConversaPersistida {
  mensagens: MensagemChat[];
  entrada?: string;
}

export function montarChaveConversaIa(
  usuarioId: number | string | undefined,
  curso: 'psicologia' | 'odontologia',
  pacienteId: number | string | undefined
): string | null {
  if (!pacienteId) return null;
  return `${IA_CHAT_STORAGE_PREFIX}${usuarioId ?? 'anon'}:${curso}:${pacienteId}`;
}

export function carregarConversaIa(chave: string | null): ConversaPersistida {
  if (!chave) return { mensagens: [], entrada: '' };
  try {
    const bruto = window.sessionStorage.getItem(chave);
    if (!bruto) return { mensagens: [], entrada: '' };
    const parsed = JSON.parse(bruto) as Partial<ConversaPersistida>;
    const mensagens = Array.isArray(parsed.mensagens)
      ? parsed.mensagens.filter(
          (m): m is MensagemChat =>
            !!m &&
            typeof m === 'object' &&
            (m.papel === 'user' || m.papel === 'assistant') &&
            typeof m.texto === 'string' &&
            typeof m.id === 'string'
        )
      : [];
    return {
      mensagens: mensagens.slice(-MAX_MENSAGENS_SALVAS),
      entrada: typeof parsed.entrada === 'string' ? parsed.entrada : '',
    };
  } catch {
    return { mensagens: [], entrada: '' };
  }
}

export function salvarConversaIa(
  chave: string | null,
  mensagens: MensagemChat[],
  entrada: string
): void {
  if (!chave) return;
  try {
    if (mensagens.length === 0 && !entrada) {
      window.sessionStorage.removeItem(chave);
      return;
    }
    const payload: ConversaPersistida = {
      mensagens: mensagens.slice(-MAX_MENSAGENS_SALVAS),
      entrada,
    };
    window.sessionStorage.setItem(chave, JSON.stringify(payload));
  } catch {
    // Ignora falhas de cota/privacidade de sessionStorage
  }
}

export function limparConversaIa(chave: string | null): void {
  if (!chave) return;
  try {
    window.sessionStorage.removeItem(chave);
  } catch {
    // Ignora
  }
}

export function limparTodasConversasIa(): void {
  try {
    const chaves: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const k = window.sessionStorage.key(i);
      if (k && k.startsWith(IA_CHAT_STORAGE_PREFIX)) {
        chaves.push(k);
      }
    }
    for (const k of chaves) {
      window.sessionStorage.removeItem(k);
    }
  } catch {
    // Ignora
  }
}
