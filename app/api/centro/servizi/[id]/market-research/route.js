import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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

  const { data: profile } = await supabase
    .from('user_profiles').select('centro_id').eq('id', user.id).maybeSingle()

  if (!profile?.centro_id)
    return { error: NextResponse.json({ error: 'Nessun centro' }, { status: 400 }) }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return { user, supabase, admin, centroId: profile.centro_id }
}

// PUT: salva indagine di mercato inserita manualmente (no AI → no token check)
export async function PUT(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const resolvedParams = await params
    const { prezzo_min, prezzo_max, prezzo_medio, note } = await request.json()

    if (!prezzo_min || !prezzo_max || !prezzo_medio)
      return NextResponse.json({ error: 'Inserisci almeno min, max e medio' }, { status: 400 })

    const now = new Date().toISOString()
    const { error: updErr } = await admin.from('servizi').update({
      mercato_prezzo_min: Number(prezzo_min),
      mercato_prezzo_max: Number(prezzo_max),
      mercato_prezzo_medio: Number(prezzo_medio),
      mercato_ultima_ricerca: now,
      mercato_note: note || null,
      updated_at: now,
    }).eq('id', resolvedParams.id).eq('centro_id', centroId)

    if (updErr) throw updErr
    return NextResponse.json({
      prezzo_min: Number(prezzo_min),
      prezzo_max: Number(prezzo_max),
      prezzo_medio: Number(prezzo_medio),
      posizionamento: null,
      note: note || null,
      aggiornato_il: now,
      manuale: true,
    })
  } catch (err) {
    console.error('PUT /api/centro/servizi/[id]/market-research:', err)
    return NextResponse.json({ error: 'Errore salvataggio' }, { status: 500 })
  }
}

// POST: lancia indagine di mercato AI (con check limite token)
export async function POST(request, { params }) {
  try {
    const { error, user, supabase, admin, centroId } = await getAuth()
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
      console.log('[MARKET-RESEARCH] check_ai_limit skip:', err.message)
    }

    const resolvedParams = await params

    // Leggi servizio
    const { data: servizio } = await admin
      .from('servizi').select('nome').eq('id', resolvedParams.id).eq('centro_id', centroId).maybeSingle()

    if (!servizio) return NextResponse.json({ error: 'Servizio non trovato' }, { status: 404 })

    // Leggi città del centro
    const { data: centro } = await admin
      .from('beauty_centers').select('nome, citta, cap, indirizzo').eq('id', centroId).maybeSingle()

    const citta = centro?.citta || ''
    const cap = centro?.cap || ''

    const prompt = `Sei un esperto del settore estetico e benessere italiano con approfondita conoscenza dei prezzi di mercato.

Fai un'indagine sui prezzi medi praticati per il servizio "${servizio.nome}" nei centri estetici della zona di ${citta}${cap ? ` (${cap})` : ''}, Italia.

Considera centri estetici di fascia media (non luxury né low cost).

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo, in questo formato esatto:
{
  "prezzo_min": <numero intero euro>,
  "prezzo_max": <numero intero euro>,
  "prezzo_medio": <numero intero euro>,
  "posizionamento": "<una di: sotto_mercato | in_linea | sopra_mercato>",
  "note": "<2-3 frasi di analisi e suggerimenti pratici>"
}`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const usage = message.usage
    const rawText = message.content[0]?.text || ''
    let mercato = null

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (jsonMatch) mercato = JSON.parse(jsonMatch[0])
    } catch {
      return NextResponse.json({ error: 'Impossibile parsare la risposta AI' }, { status: 500 })
    }

    if (!mercato?.prezzo_min || !mercato?.prezzo_max) {
      return NextResponse.json({ error: 'Risposta AI incompleta' }, { status: 500 })
    }

    // Salva cache nel DB
    const now = new Date().toISOString()
    await admin.from('servizi').update({
      mercato_prezzo_min: mercato.prezzo_min,
      mercato_prezzo_max: mercato.prezzo_max,
      mercato_prezzo_medio: mercato.prezzo_medio,
      mercato_ultima_ricerca: now,
      mercato_note: mercato.note || null,
      updated_at: now,
    }).eq('id', resolvedParams.id).eq('centro_id', centroId)

    // === TRACCIA CONSUMO TOKEN ===
    try {
      await supabase.rpc('track_ai_usage', {
        p_user_id: user.id,
        p_centro_id: centroId,
        p_conversation_id: null,
        p_tokens_in: usage?.input_tokens || 0,
        p_tokens_out: usage?.output_tokens || 0,
        p_model: 'claude-haiku-4-5',
      })
    } catch (err) {
      console.log('[MARKET-RESEARCH] track_ai_usage skip:', err.message)
    }

    return NextResponse.json({
      prezzo_min: mercato.prezzo_min,
      prezzo_max: mercato.prezzo_max,
      prezzo_medio: mercato.prezzo_medio,
      posizionamento: mercato.posizionamento,
      note: mercato.note,
      aggiornato_il: now,
    })
  } catch (err) {
    console.error('POST /api/centro/servizi/[id]/market-research:', err)
    return NextResponse.json({ error: 'Errore indagine di mercato' }, { status: 500 })
  }
}
