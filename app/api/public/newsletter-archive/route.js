import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Verifica il token contro guida_access (stesso meccanismo di accesso già
// usato per /guida — vedi app/api/guida/access/route.js e app/guida/page.js).
// Riusato qui per il gate dell'archivio newsletter: non è un sistema di auth
// separato, è lo stesso token per email generato all'iscrizione.
async function isValidToken(token) {
  if (!token) return false
  const { data, error } = await supabase
    .from('guida_access')
    .select('email')
    .eq('token', token)
    .maybeSingle()
  if (error) {
    console.error('Errore verifica token newsletter-archive:', error)
    return false
  }
  return !!data
}

// GET /api/public/newsletter-archive?limit=12&tag=Prezzi%20%26%20margini&token=...
// Espone i numeri di newsletter già pubblicati (tabella public.newsletter_posts),
// usati dalla sezione "Intanto, leggi cosa ti sei persa" di /newsletter.
// Nota: usa il service key solo per semplicità server-side; il risultato è
// comunque limitato ai soli record con pubblicato = true (stesso filtro della
// policy RLS di lettura pubblica), quindi non espone bozze.
//
// Gate contenuto: il campo `contenuto` (testo integrale) viene incluso nella
// select SOLO se il token in query è valido contro guida_access. Senza token
// valido la colonna non è nemmeno richiesta a Supabase, quindi non può mai
// finire nella risposta — il controllo è lato server, non un filtro sul
// frontend.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10) || 12, 50)
    const tag = searchParams.get('tag')
    const token = searchParams.get('token')

    const unlocked = await isValidToken(token)

    const columns = unlocked
      ? 'id, slug, titolo, estratto, contenuto, tags, data_pubblicazione'
      : 'id, slug, titolo, estratto, tags, data_pubblicazione'

    let query = supabase
      .from('newsletter_posts')
      .select(columns)
      .eq('pubblicato', true)
      .order('data_pubblicazione', { ascending: false })
      .limit(limit)

    if (tag) query = query.contains('tags', [tag])

    const { data, error } = await query
    if (error) throw error

    return Response.json({ articoli: data || [], unlocked })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
