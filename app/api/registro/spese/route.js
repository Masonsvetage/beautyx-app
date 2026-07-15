import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { ricalcolaTotaliGiornata } from '../giornata/route'

async function getAuth() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// POST /api/registro/spese
export async function POST(request) {
  const user = await getAuth()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { centro_id, data, descrizione, importo, categoria, metodo, fornitore, note } = await request.json()
  if (!centro_id || !descrizione || importo == null) {
    return NextResponse.json({ error: 'centro_id, descrizione e importo richiesti' }, { status: 400 })
  }

  const oggi = data || new Date().toISOString().split('T')[0]

  // Ottieni o crea giornata
  const { data: giornata } = await admin.from('registro_giornate')
    .upsert({ centro_id, data: oggi, updated_at: new Date().toISOString() }, { onConflict: 'centro_id,data', ignoreDuplicates: true })
    .select('id').maybeSingle()

  const giornataId = giornata?.id || (
    await admin.from('registro_giornate').select('id').eq('centro_id', centro_id).eq('data', oggi).maybeSingle()
  ).data?.id

  const { data: spesa, error } = await admin.from('registro_spese').insert({
    centro_id,
    giornata_id: giornataId || null,
    data: oggi,
    descrizione,
    importo: Number(importo),
    categoria: categoria || 'altro',
    metodo: metodo || 'contanti',
    fornitore: fornitore || null,
    note: note || null
  }).select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await ricalcolaTotaliGiornata(centro_id, oggi)

  return NextResponse.json({ spesa })
}

// GET /api/registro/spese?centro_id=...&data_da=...&data_a=...
export async function GET(request) {
  const user = await getAuth()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const centro_id = searchParams.get('centro_id')
  const data_da   = searchParams.get('data_da') || new Date().toISOString().split('T')[0]
  const data_a    = searchParams.get('data_a')  || new Date().toISOString().split('T')[0]

  const { data, error } = await admin.from('registro_spese')
    .select('*').eq('centro_id', centro_id)
    .gte('data', data_da).lte('data', data_a)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ spese: data || [] })
}
