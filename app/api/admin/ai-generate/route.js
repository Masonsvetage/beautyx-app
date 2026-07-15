import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Anthropic from '@anthropic-ai/sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

async function isAdmin(cookieStore) {
  const authClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
    }
  })
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return false
  const { data: profile } = await authClient
    .from('user_profiles')
    .select('ruolo_livello')
    .eq('id', user.id)
    .maybeSingle()
  return profile?.ruolo_livello === 'admin'
}

const CAT_LABELS = { novita: 'Novità', aggiornamento: 'Aggiornamento', evento: 'Evento', offerta: 'Offerta' }
const TONO_LABELS = {
  informativo: 'informativo e autorevole',
  coinvolgente: 'coinvolgente e narrativo',
  promozionale: 'promozionale e persuasivo',
  educativo: 'educativo e pratico con consigli concreti',
}

const SYSTEM_PROMPT = `Sei un esperto copywriter SEO specializzato nel settore beauty & wellness italiano. Scrivi contenuti per BeautyX, una piattaforma SaaS B2B per la gestione di centri estetici e beauty center.

Regole FONDAMENTALI:
- Lingua: italiano
- Ottimizza per SEO: inserisci le keyword in modo naturale nel testo, nel titolo e nell'excerpt
- Struttura: paragrafi brevi e chiari (3-5 frasi), adatti alla lettura su schermo
- Lunghezza contenuto: 350-500 parole
- NON usare markdown (no #, *, liste con -)
- Separa i paragrafi con una riga vuota (\n\n)
- Per evidenziare i 2-3 concetti chiave più importanti di ogni paragrafo usa **parola** o **breve frase**
- Titolo: massimo 70 caratteri, accattivante, con keyword SEO in posizione naturale
- Excerpt: una sola frase di 120-150 caratteri che riassume chiaramente il valore del post

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido (senza blocchi di codice, senza testo prima o dopo):
{"titolo": "...", "excerpt": "...", "contenuto": "..."}`

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    if (!await isAdmin(cookieStore)) {
      return Response.json({ error: 'Accesso negato' }, { status: 403 })
    }

    const { argomento, categoria, keywords, tono } = await request.json()
    if (!argomento?.trim()) {
      return Response.json({ error: 'Argomento obbligatorio' }, { status: 400 })
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const tonoDesc = TONO_LABELS[tono] || 'professionale'
    const catLabel = CAT_LABELS[categoria] || categoria || 'Novità'

    const userPrompt = [
      `Scrivi un post per la sezione "${catLabel}" del blog di BeautyX.`,
      `Argomento principale: ${argomento.trim()}`,
      keywords?.trim() ? `Keyword SEO da includere: ${keywords.trim()}` : '',
      `Tono richiesto: ${tonoDesc}`,
    ].filter(Boolean).join('\n')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1200,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = message.content[0]?.text?.trim() || ''

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) parsed = JSON.parse(match[0])
      else return Response.json({ error: 'Risposta AI non valida — riprova' }, { status: 500 })
    }

    if (!parsed.titolo || !parsed.contenuto) {
      return Response.json({ error: 'Risposta AI incompleta — riprova' }, { status: 500 })
    }

    return Response.json({ success: true, titolo: parsed.titolo, excerpt: parsed.excerpt || '', contenuto: parsed.contenuto })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
