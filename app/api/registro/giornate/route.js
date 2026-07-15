/**
 * GET /api/registro/giornate?giorni=30
 * Lista giorni registro_giornate per il centro dell'utente loggato.
 * Auth via session (non richiede centro_id nel body).
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

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
  if (!profile?.centro_id) return null
  return { user, profile }
}

export async function GET(request) {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const giorni = Math.min(parseInt(searchParams.get('giorni') || '30'), 365)

  const centroId = auth.profile.centro_id
  const from = new Date(Date.now() - giorni * 86400000).toISOString().split('T')[0]
  const to   = new Date().toISOString().split('T')[0]

  const { data, error } = await admin
    .from('registro_giornate')
    .select('data, incasso_effettivo, n_clienti, spese_totali, source, updated_at')
    .eq('centro_id', centroId)
    .gte('data', from)
    .lte('data', to)
    .order('data', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ centro_id: centroId, giorni: data || [] })
}
