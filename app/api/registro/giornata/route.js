import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

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

// Ricalcola e upsert i totali di registro_giornate da pagamenti + spese
export async function ricalcolaTotaliGiornata(centroId, data) {
  const [pagRes, speseRes, creditiRes] = await Promise.all([
    admin.from('registro_pagamenti').select('importo').eq('centro_id', centroId).eq('data', data),
    admin.from('registro_spese').select('importo').eq('centro_id', centroId).eq('data', data),
    admin.from('registro_crediti').select('importo_totale, acconto_versato').eq('centro_id', centroId).eq('data_servizio', data)
  ])

  const incasso_effettivo = (pagRes.data || []).reduce((s, r) => s + Number(r.importo), 0)
  const spese_totali      = (speseRes.data || []).reduce((s, r) => s + Number(r.importo), 0)
  // incasso maturato = totale servizi erogati oggi (inclusi crediti parziali)
  const incasso_maturato  = (creditiRes.data || []).reduce((s, r) => s + Number(r.importo_totale), 0) || incasso_effettivo

  await admin.from('registro_giornate').upsert(
    { centro_id: centroId, data, incasso_effettivo, spese_totali, incasso_maturato, updated_at: new Date().toISOString() },
    { onConflict: 'centro_id,data', ignoreDuplicates: false }
  )
}

// GET /api/registro/giornata?centro_id=...&data=YYYY-MM-DD
export async function GET(request) {
  const user = await getAuth()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const centro_id = searchParams.get('centro_id')
  const data = searchParams.get('data') || new Date().toISOString().split('T')[0]
  if (!centro_id) return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })

  const ownership = await verifyCentroOwnership(request, centro_id)
  if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

  const [giornataRes, pagRes, speseRes, creditiApertiRes] = await Promise.all([
    admin.from('registro_giornate').select('*').eq('centro_id', centro_id).eq('data', data).maybeSingle(),
    admin.from('registro_pagamenti').select('metodo, importo, descrizione').eq('centro_id', centro_id).eq('data', data),
    admin.from('registro_spese').select('descrizione, importo, categoria, fornitore').eq('centro_id', centro_id).eq('data', data),
    admin.from('registro_crediti').select('id, nome_cliente, servizio, residuo, data_attesa_saldo').eq('centro_id', centro_id).eq('saldato', false).order('data_attesa_saldo', { ascending: true })
  ])

  return NextResponse.json({
    giornata: giornataRes.data,
    pagamenti: pagRes.data || [],
    spese: speseRes.data || [],
    crediti_aperti: creditiApertiRes.data || []
  })
}

// POST /api/registro/giornata — aggiorna contatori (n_clienti, n_servizi, ecc.)
export async function POST(request) {
  const user = await getAuth()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { centro_id, data, n_clienti, n_servizi, n_prodotti, note } = await request.json()
  if (!centro_id) return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })

  const ownership = await verifyCentroOwnership(request, centro_id)
  if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

  const oggi = data || new Date().toISOString().split('T')[0]

  const { data: existing } = await admin.from('registro_giornate').select('*').eq('centro_id', centro_id).eq('data', oggi).maybeSingle()

  const payload = {
    centro_id,
    data: oggi,
    n_clienti:  n_clienti  ?? existing?.n_clienti  ?? 0,
    n_servizi:  n_servizi  ?? existing?.n_servizi  ?? 0,
    n_prodotti: n_prodotti ?? existing?.n_prodotti ?? 0,
    note:       note       ?? existing?.note,
    updated_at: new Date().toISOString()
  }

  const { data: result, error } = await admin.from('registro_giornate')
    .upsert(payload, { onConflict: 'centro_id,data' })
    .select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ giornata: result })
}

// PATCH /api/registro/giornata — correzione manuale di incasso e/o clienti per un giorno
// Usato dal widget dashboard "Gestione Dati" per correggere valori errati
export async function PATCH(request) {
  const user = await getAuth()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const body = await request.json()
  const { centro_id, data, incasso_effettivo, n_clienti } = body
  if (!centro_id || !data) return NextResponse.json({ error: 'centro_id e data richiesti' }, { status: 400 })

  const ownership = await verifyCentroOwnership(request, centro_id)
  if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

  const update = { source: 'manuale', updated_at: new Date().toISOString() }
  if (incasso_effettivo !== undefined) update.incasso_effettivo = parseFloat(incasso_effettivo) || 0
  if (n_clienti         !== undefined) update.n_clienti         = parseInt(n_clienti, 10) || 0

  // Upsert: se il giorno non esiste lo crea
  const { data: result, error } = await admin
    .from('registro_giornate')
    .upsert({ centro_id, data, ...update }, { onConflict: 'centro_id,data' })
    .select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, giornata: result })
}
