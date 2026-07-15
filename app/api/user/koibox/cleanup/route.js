import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const SANITY_MAX = 15000
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
  if (!profile || !ALLOWED_ROLES.includes(profile.ruolo_livello) || !profile.centro_id) return null
  return { user, profile }
}

/**
 * POST /api/user/koibox/cleanup
 * Cancella tutti i dati Koibox corrotti (totale_giorno > soglia) e le relative
 * righe in registro_giornate (source='koibox') per permettere una resync pulita.
 * Ritorna il numero di righe cancellate.
 */
export async function POST(request) {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const centroId = auth.profile.centro_id

  // 1. Cancella TUTTI i dati koibox_casse del centro (resync completa)
  const { error: e1, count: c1 } = await admin
    .from('koibox_casse')
    .delete({ count: 'exact' })
    .eq('centro_id', centroId)

  // 2. Cancella righe registro_giornate con source='koibox' (generate dal bridge)
  const { error: e2, count: c2 } = await admin
    .from('registro_giornate')
    .delete({ count: 'exact' })
    .eq('centro_id', centroId)
    .eq('source', 'koibox')

  // 3. Cancella pagamenti registro con source='koibox'
  const { error: e3, count: c3 } = await admin
    .from('registro_pagamenti')
    .delete({ count: 'exact' })
    .eq('centro_id', centroId)
    .eq('source', 'koibox')

  const errors = [e1, e2, e3].filter(Boolean).map(e => e.message)

  return NextResponse.json({
    ok: errors.length === 0,
    cancellate: {
      koibox_casse: c1 || 0,
      registro_giornate: c2 || 0,
      registro_pagamenti: c3 || 0,
    },
    errors,
    messaggio: errors.length === 0
      ? `Pulizia completata. Ora esegui una nuova sincronizzazione.`
      : `Pulizia parziale. Errori: ${errors.join('; ')}`
  })
}
