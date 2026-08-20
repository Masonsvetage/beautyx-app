import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { ricalcolaTotaliGiornata } from '../../giornata/route'
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

// PATCH /api/registro/crediti/[id] — chiudi credito (saldato=true)
export async function PATCH(request, { params }) {
  const user = await getAuth()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { id } = await params
  const { metodo_saldo, note } = await request.json()

  // Fetch credito esistente
  const { data: credito, error: fetchErr } = await admin
    .from('registro_crediti').select('*').eq('id', id).maybeSingle()
  if (fetchErr || !credito) return NextResponse.json({ error: 'Credito non trovato' }, { status: 404 })

  const ownership = await verifyCentroOwnership(request, credito.centro_id)
  if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

  if (credito.saldato) return NextResponse.json({ error: 'Credito già saldato' }, { status: 400 })

  const oggi = new Date().toISOString().split('T')[0]

  // Aggiorna credito
  const { data: updated, error: updateErr } = await admin.from('registro_crediti').update({
    saldato: true,
    saldato_il: oggi,
    metodo_saldo: metodo_saldo || 'contanti',
    note: note || credito.note,
    updated_at: new Date().toISOString()
  }).eq('id', id).select().maybeSingle()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Registra il saldo come pagamento di oggi
  const residuo = Number(credito.importo_totale) - Number(credito.acconto_versato)
  if (residuo > 0) {
    await admin.from('registro_pagamenti').insert({
      centro_id: credito.centro_id,
      data: oggi,
      metodo: metodo_saldo || 'contanti',
      importo: residuo,
      descrizione: `Saldo ${credito.nome_cliente}${credito.servizio ? ` - ${credito.servizio}` : ''}`
    })
    await ricalcolaTotaliGiornata(credito.centro_id, oggi)
  }

  return NextResponse.json({ credito: updated })
}
