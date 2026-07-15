import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
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
    return { error: NextResponse.json({ error: 'Nessun centro associato' }, { status: 400 }) }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return { user, admin, centroId: profile.centro_id }
}

export async function GET() {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const { data, error: err } = await admin
      .from('pacchetti')
      .select(`
        *,
        items:pacchetti_items(
          quantita,
          servizio:servizi(id, nome, durata_preparazione_min, durata_esecuzione_min, durata_chiusura_min, durata_sanificazione_min)
        )
      `)
      .eq('centro_id', centroId)
      .order('nome')

    if (err) throw err
    return NextResponse.json({ pacchetti: data || [] })
  } catch (err) {
    console.error('GET /api/centro/pacchetti:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const body = await request.json()
    const { items, ...pacchettoData } = body

    if (!pacchettoData.nome)
      return NextResponse.json({ error: 'Nome pacchetto obbligatorio' }, { status: 400 })

    const { data: pacchetto, error: insErr } = await admin
      .from('pacchetti')
      .insert({ ...pacchettoData, centro_id: centroId })
      .select().single()

    if (insErr) throw insErr

    if (items?.length > 0) {
      const rows = items.map(i => ({
        pacchetto_id: pacchetto.id,
        servizio_id: i.servizio_id,
        quantita: i.quantita || 1,
      }))
      await admin.from('pacchetti_items').insert(rows)
    }

    return NextResponse.json({ pacchetto }, { status: 201 })
  } catch (err) {
    console.error('POST /api/centro/pacchetti:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
