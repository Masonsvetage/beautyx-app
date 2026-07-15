import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { syncKoibox } from '@/lib/koibox/sync'

const ALLOWED_ROLES = ['admin', 'hpa', 'titolare', 'direttore', 'amministrativo']

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function getAuthorizedUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await admin
    .from('user_profiles')
    .select('ruolo_livello, centro_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !ALLOWED_ROLES.includes(profile.ruolo_livello)) return null
  if (!profile.centro_id) return null

  return { user, profile }
}

// POST /api/user/koibox/sync
// Avvia sincronizzazione Koibox → tabelle locali
export async function POST(request) {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const centroId = auth.profile.centro_id

  // Default conservativi per evitare sync troppo lunghe
  let opts = {
    giorni_agenda: 30,
    giorni_casse:  90,
  }
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.clienti  === 'boolean') opts.clienti  = body.clienti
    if (typeof body.servizi  === 'boolean') opts.servizi  = body.servizi
    if (typeof body.agenda   === 'boolean') opts.agenda   = body.agenda
    if (typeof body.casse    === 'boolean') opts.casse    = body.casse

    // Date esplicite (YYYY-MM-DD) — nessun cap, l'utente sa cosa vuole
    const isValidDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
    if (isValidDate(body.data_da)) opts.data_da = body.data_da
    if (isValidDate(body.data_a))  opts.data_a  = body.data_a

    // Se non ci sono date esplicite, usa i giorni con cap
    if (!opts.data_da) {
      if (typeof body.giorni_agenda === 'number') opts.giorni_agenda = Math.min(body.giorni_agenda, 365)
      if (typeof body.giorni_casse  === 'number') opts.giorni_casse  = Math.min(body.giorni_casse,  730)
    }
  } catch { /* usa default */ }

  const result = await syncKoibox(centroId, opts)

  return NextResponse.json(result, { status: result.ok ? 200 : 207 })
}
