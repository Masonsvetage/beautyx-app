import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { testKoiboxConnection } from '@/lib/koibox/apiClient'

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

// POST /api/user/integrazioni/koibox/test
// Testa la connessione con la chiave salvata (o una chiave fornita nel body)
export async function POST(request) {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  // Se viene passata una chiave nel body (per testare prima di salvare),
  // la salviamo temporaneamente, testiamo, poi non la committiamo
  if (body.api_key) {
    // Test diretto con la chiave fornita (senza salvarla)
    try {
      const url = new URL('https://api.koibox.cloud/api/clientes/')
      url.searchParams.set('limit', '1')
      const res = await fetch(url.toString(), {
        headers: { 'X-Koibox-Key': body.api_key.trim() },
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        return NextResponse.json({ ok: false, error: `Koibox API ${res.status}: ${txt}` })
      }
      return NextResponse.json({ ok: true })
    } catch (err) {
      return NextResponse.json({ ok: false, error: err.message })
    }
  }

  // Altrimenti testa con la chiave salvata nel DB
  const result = await testKoiboxConnection(auth.profile.centro_id)
  return NextResponse.json(result)
}
