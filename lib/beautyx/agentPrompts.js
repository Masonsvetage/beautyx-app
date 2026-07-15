import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Cache in-memory: { agentName: { prompt, cachedAt } }
const _cache = {}
const CACHE_TTL = 2 * 60 * 1000 // 2 minuti

/**
 * Carica il prompt attivo per un agente.
 * Usa cache in-memory con TTL di 2 minuti.
 * Restituisce null se non trovato (il chiamante usa il fallback hardcoded).
 */
export async function loadAgentPrompt(agentName) {
  const cached = _cache[agentName]
  if (cached && (Date.now() - cached.cachedAt) < CACHE_TTL) {
    return cached.prompt
  }

  try {
    const { data } = await supabase
      .from('agent_prompts')
      .select('prompt')
      .eq('agent_name', agentName)
      .eq('is_active', true)
      .maybeSingle()

    if (data?.prompt) {
      _cache[agentName] = { prompt: data.prompt, cachedAt: Date.now() }
      return data.prompt
    }
  } catch (err) {
    console.error(`[AgentPrompts] Errore caricamento prompt "${agentName}":`, err.message)
  }

  return null
}

/**
 * Invalida la cache per un agente (o tutti se agentName omesso).
 * Chiamare dopo ogni salvataggio dalla console.
 */
export function invalidatePromptCache(agentName) {
  if (agentName) {
    delete _cache[agentName]
  } else {
    Object.keys(_cache).forEach(k => delete _cache[k])
  }
}
