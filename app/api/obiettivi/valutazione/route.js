import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

// Client con SERVICE_KEY: `obiettivi_valutazioni` è stata ricreata il
// 2026-08-21 con RLS abilitata e nessuna policy per anon/authenticated
// (stesso pattern di accantonamenti, bank_movements, ecc.). Il confine di
// sicurezza reale resta applicativo, tramite verifyRowCentroOwnership sotto.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/obiettivi/valutazione?obiettivo_id=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const obiettivoId = searchParams.get('obiettivo_id')

    if (!obiettivoId) {
      return NextResponse.json({ error: 'obiettivo_id richiesto' }, { status: 400 })
    }

    // obiettivo_id è l'id di una riga in `obiettivi`, che ha centro_id diretto:
    // verifica ownership tramite quella riga PRIMA di restituire le valutazioni
    // (endpoint scoperto senza alcun controllo durante il fix dell'IDOR su
    // app/api/obiettivi/step/route.js — stesso gap, stesso rimedio).
    const ownership = await verifyRowCentroOwnership(request, supabaseAdmin, { table: 'obiettivi', id: obiettivoId })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data: valutazioni, error } = await supabaseAdmin
      .from('obiettivi_valutazioni')
      .select('*')
      .eq('obiettivo_id', obiettivoId)
      .order('data_valutazione', { ascending: false })

    if (error) throw error

    return NextResponse.json({ valutazioni: valutazioni || [] })
  } catch (error) {
    console.error('Errore GET valutazioni:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/obiettivi/valutazione
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { obiettivo_id } = body

    if (!obiettivo_id) {
      return NextResponse.json({ error: 'obiettivo_id richiesto' }, { status: 400 })
    }

    // Verifica che l'obiettivo_id indicato appartenga a un centro dell'utente
    // PRIMA di registrare una valutazione collegata ad esso.
    const ownership = await verifyRowCentroOwnership(request, supabaseAdmin, { table: 'obiettivi', id: obiettivo_id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data: valutazione, error } = await supabaseAdmin
      .from('obiettivi_valutazioni')
      .insert({
        ...body,
        data_valutazione: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ valutazione })
  } catch (error) {
    console.error('Errore POST valutazione:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
