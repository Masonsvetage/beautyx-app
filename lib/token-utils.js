/**
 * Conversione token ↔ caratteri per modelli Claude.
 * Claude Sonnet/Haiku/Opus: ~4 caratteri per token (media italiano/inglese BPE).
 */
export const CHARS_PER_TOKEN = 4

export function tokensToChars(tokens) {
  return Math.round((tokens ?? 0) * CHARS_PER_TOKEN)
}

export function formatTokens(n) {
  if (n === null || n === undefined) return '?'
  // 999.500+ arrotonderebbe a "1000K": da qui in su si mostra in milioni (fix 2026-10-04)
  if (n >= 999500) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return String(n)
}

export function formatChars(n) {
  if (n === null || n === undefined) return '?'
  if (n >= 999500) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return n.toLocaleString('it-IT')
}
