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

// POST /api/registro/pagamenti
export async function POST(request) {
  const user = await getAuth()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { centro_id, data, metodo, importo, descrizione, note } = await request.json()
  if (!centro_id || importo == null) {
    return NextResponse.json({ error: 'centro_id e importo richiesti' }, { status: 400 })
  }

  const oggi = data || new Date().toISOString().split('T')[0]

  await admin.from('registro_giornate')
    .upsert({ centro_id, data: oggi, updated_at: new Date().toISOString() }, { onConflict: 'centro_id,data', ignoreDuplicates: true })
  const { data: giornata } = await admin.from('registro_giornate').select('id').eq('centro_id', centro_id).eq('data', oggi).maybeSingle()

  const { data: pagamento, error } = await admin.from('registro_pagamenti').insert({
    centro_id,
    giornata_id: giornata?.id || null,
    data: oggi,
    metodo: metodo || 'contanti',
    importo: Number(importo),
    descrizione: descrizione || null,
    note: note || null
  }).select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await ricalcolaTotaliGiornata(centro_id, oggi)

  return NextResponse.json({ pagamento })
}
