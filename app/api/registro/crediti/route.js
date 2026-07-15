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

// GET /api/registro/crediti?centro_id=...&solo_aperti=true
export async function GET(request) {
  const user = await getAuth()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const centro_id   = searchParams.get('centro_id')
  const solo_aperti = searchParams.get('solo_aperti') !== 'false'

  let query = admin.from('registro_crediti').select('*').eq('centro_id', centro_id)
  if (solo_aperti) query = query.eq('saldato', false)
  query = query.order('data_attesa_saldo', { ascending: true, nullsFirst: false })

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ crediti: data || [] })
}

// POST /api/registro/crediti — registra nuovo credito/acconto
export async function POST(request) {
  const user = await getAuth()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const {
    centro_id, data_servizio, nome_cliente, servizio,
    importo_totale, acconto_versato, metodo_acconto,
    data_attesa_saldo, note
  } = await request.json()

  if (!centro_id || !nome_cliente || importo_totale == null) {
    return NextResponse.json({ error: 'centro_id, nome_cliente e importo_totale richiesti' }, { status: 400 })
  }

  const oggi = data_servizio || new Date().toISOString().split('T')[0]
  const acconto = Number(acconto_versato) || 0

  // Ottieni o crea giornata
  await admin.from('registro_giornate')
    .upsert({ centro_id, data: oggi, updated_at: new Date().toISOString() }, { onConflict: 'centro_id,data', ignoreDuplicates: true })
  const { data: giornata } = await admin.from('registro_giornate').select('id').eq('centro_id', centro_id).eq('data', oggi).maybeSingle()

  const { data: credito, error } = await admin.from('registro_crediti').insert({
    centro_id,
    giornata_id: giornata?.id || null,
    data_servizio: oggi,
    nome_cliente,
    servizio:         servizio || null,
    importo_totale:   Number(importo_totale),
    acconto_versato:  acconto,
    metodo_acconto:   metodo_acconto || 'contanti',
    data_attesa_saldo: data_attesa_saldo || null,
    note: note || null
  }).select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se c'è un acconto, registralo anche come pagamento del giorno
  if (acconto > 0) {
    await admin.from('registro_pagamenti').insert({
      centro_id,
      giornata_id: giornata?.id || null,
      data: oggi,
      metodo: metodo_acconto || 'contanti',
      importo: acconto,
      descrizione: `Acconto ${nome_cliente}${servizio ? ` - ${servizio}` : ''}`
    })
    await ricalcolaTotaliGiornata(centro_id, oggi)
  }

  return NextResponse.json({ credito })
}
