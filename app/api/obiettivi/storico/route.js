import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

// Client con SERVICE_KEY: `obiettivi_storico` è stata ricreata il 2026-08-21
// con RLS abilitata e nessuna policy per anon/authenticated (stesso pattern di
// accantonamenti, bank_movements, ecc.). Il confine di sicurezza reale resta
// applicativo, tramite verifyRowCentroOwnership sotto.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/obiettivi/storico?obiettivo_id=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const obiettivoId = searchParams.get('obiettivo_id')

    if (!obiettivoId) {
      return NextResponse.json({ error: 'obiettivo_id richiesto' }, { status: 400 })
    }

    // obiettivo_id è l'id di una riga in `obiettivi`, che ha centro_id diretto:
    // verifica ownership tramite quella riga PRIMA di restituire lo storico
    // (endpoint scoperto senza alcun controllo durante il fix dell'IDOR su
    // app/api/obiettivi/step/route.js — stesso gap, stesso rimedio).
    const ownership = await verifyRowCentroOwnership(request, supabaseAdmin, { table: 'obiettivi', id: obiettivoId })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data: storico, error } = await supabaseAdmin
      .from('obiettivi_storico')
      .select('*')
      .eq('obiettivo_id', obiettivoId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ storico: storico || [] })
  } catch (error) {
    console.error('Errore GET storico:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
