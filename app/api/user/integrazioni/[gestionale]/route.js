import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const VALID_GESTIONALI = ['koibox', 'mindbody', 'fresha']
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

// GET /api/user/integrazioni/[gestionale]
// Restituisce stato connessione + config (mai la chiave in chiaro)
export async function GET(request, { params }) {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { gestionale } = await params
  if (!VALID_GESTIONALI.includes(gestionale))
    return NextResponse.json({ error: 'Gestionale non valido' }, { status: 400 })

  const { data } = await admin
    .from('centro_integrazioni')
    .select('id, is_active, config, last_sync_at, updated_at, api_key')
    .eq('centro_id', auth.profile.centro_id)
    .eq('gestionale', gestionale)
    .maybeSingle()

  if (!data) return NextResponse.json({ connected: false, config: {} })

  // Maschera la chiave API: mostra solo ultimi 4 caratteri
  const maskedKey = data.api_key
    ? `${'•'.repeat(Math.max(0, data.api_key.length - 4))}${data.api_key.slice(-4)}`
    : null

  return NextResponse.json({
    connected: !!(data.api_key && data.is_active),
    masked_key: maskedKey,
    config: data.config || {},
    last_sync_at: data.last_sync_at,
    updated_at: data.updated_at,
  })
}

// PUT /api/user/integrazioni/[gestionale]
// Salva/aggiorna chiave API e config
export async function PUT(request, { params }) {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { gestionale } = await params
  if (!VALID_GESTIONALI.includes(gestionale))
    return NextResponse.json({ error: 'Gestionale non valido' }, { status: 400 })

  const body = await request.json()
  const { api_key, config } = body

  if (api_key !== undefined && api_key !== null && typeof api_key !== 'string')
    return NextResponse.json({ error: 'api_key non valido' }, { status: 400 })

  // Upsert
  const upsertData = {
    centro_id: auth.profile.centro_id,
    gestionale,
    is_active: true,
    updated_at: new Date().toISOString(),
  }
  if (api_key !== undefined) upsertData.api_key = api_key?.trim() || null
  if (config !== undefined) upsertData.config = config

  const { error } = await admin
    .from('centro_integrazioni')
    .upsert(upsertData, { onConflict: 'centro_id,gestionale' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE /api/user/integrazioni/[gestionale]
// Disconnette (rimuove la chiave)
export async function DELETE(request, { params }) {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { gestionale } = await params
  if (!VALID_GESTIONALI.includes(gestionale))
    return NextResponse.json({ error: 'Gestionale non valido' }, { status: 400 })

  const { error } = await admin
    .from('centro_integrazioni')
    .update({ api_key: null, is_active: false, updated_at: new Date().toISOString() })
    .eq('centro_id', auth.profile.centro_id)
    .eq('gestionale', gestionale)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
