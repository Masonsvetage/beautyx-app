import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

async function getAuth() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }
  return { user, supabase }
}

// POST: suggerisce nome commerciale accattivante e protocollo operativo via AI
export async function POST(request) {
  try {
    const { error, user, supabase } = await getAuth()
    if (error) return error

    // === CHECK LIMITE TOKEN AI ===
    try {
      const { data: limitCheck } = await supabase.rpc('check_ai_limit', { p_user_id: user.id })
      if (limitCheck && !limitCheck.allowed) {
        return NextResponse.json({
          error: `Hai raggiunto il limite mensile di token AI per il tuo piano ${limitCheck.piano || ''}. Acquista un pacchetto aggiuntivo o attendi il reset del prossimo mese.`,
          limit_reached: true,
          metadata: {
            token_ai_usati: limitCheck.token_ai_usati,
            token_ai_mensili: limitCheck.token_ai_mensili,
            percentage: limitCheck.percentage,
          },
        }, { status: 429 })
      }
    } catch (err) {
      console.log('[SUGGEST] check_ai_limit skip:', err.message)
    }

    const { nome, categoria, tipo, descrizione, note_interne } = await request.json()

    if (!nome?.trim())
      return NextResponse.json({ error: 'Nome obbligatorio per il suggerimento' }, { status: 400 })

    const tipoLabel = tipo === 'prodotto' ? 'prodotto' : 'servizio estetico'
    const haProtocollo = !!(note_interne?.trim())

    const prompt = `Sei un esperto di marketing e protocolli estetici per centri italiani di fascia media-alta. Scrivi in italiano, con tono professionale ed elegante.

Devi ottimizzare la scheda di questo ${tipoLabel}:
- Nome attuale: "${nome.trim()}"
${categoria ? `- Categoria: ${categoria}` : ''}
${descrizione ? `- Descrizione esistente: ${descrizione}` : ''}
${haProtocollo ? `- Protocollo/note attuali: "${note_interne.trim()}"` : ''}

Genera:

1. **nome_suggerito**: un nome commerciale accattivante, evocativo e memorabile (max 5-6 parole). Professionale e aspirazionale. NON usare simboli o emoji.

2. **protocollo_tecnico**: descrizione tecnica del trattamento — le fasi operative, i prodotti/strumenti usati, le tecniche applicate. Scritta per la cliente ma con precisione professionale. Max 3-4 frasi. ${haProtocollo ? 'Basati sul protocollo esistente, migliorandolo.' : 'Deduci le fasi logiche dal nome e dalla categoria.'}

3. **benefici**: i benefici concreti e i risultati che la cliente otterrà — effetti sulla pelle/corpo, sensazioni durante e dopo, risultati visibili. Usa un tono caldo e aspirazionale. Max 2-3 frasi.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo:
{
  "nome_suggerito": "...",
  "protocollo_tecnico": "...",
  "benefici": "..."
}`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    const usage = message.usage
    const rawText = message.content[0]?.text || ''
    let result = null
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) result = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Risposta AI non valida' }, { status: 500 })
    }

    if (!result?.nome_suggerito || !result?.protocollo_tecnico || !result?.benefici)
      return NextResponse.json({ error: 'Risposta AI incompleta' }, { status: 500 })

    // === TRACCIA CONSUMO TOKEN ===
    try {
      await supabase.rpc('track_ai_usage', {
        p_user_id: user.id,
        p_centro_id: null,
        p_conversation_id: null,
        p_tokens_in: usage?.input_tokens || 0,
        p_tokens_out: usage?.output_tokens || 0,
        p_model: 'claude-haiku-4-5',
      })
    } catch (err) {
      console.log('[SUGGEST] track_ai_usage skip:', err.message)
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('POST /api/centro/servizi/suggest:', err)
    return NextResponse.json({ error: 'Errore suggerimento AI' }, { status: 500 })
  }
}
