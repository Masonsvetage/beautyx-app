import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

// Client con SERVICE_KEY usato per TUTTE le query (lookup ownership e dati).
// `obiettivi_step` è stata ricreata il 2026-08-21 con RLS abilitata e nessuna
// policy per anon/authenticated (stesso pattern di accantonamenti,
// bank_movements, ecc.): il client anon di `lib/supabase.js` non avrebbe più
// accesso. Il confine di sicurezza reale resta applicativo
// (verifyRowCentroOwnership sotto), stesso pattern di `app/api/obiettivi/route.js`.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/obiettivi/step?obiettivo_id=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const obiettivoId = searchParams.get('obiettivo_id')

    if (!obiettivoId) {
      return NextResponse.json({ error: 'obiettivo_id richiesto' }, { status: 400 })
    }

    // obiettivo_id è l'id di una riga in `obiettivi`, che ha centro_id diretto:
    // verifica ownership tramite quella riga prima di leggere gli step.
    const ownership = await verifyRowCentroOwnership(request, supabaseAdmin, { table: 'obiettivi', id: obiettivoId })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data: steps, error } = await supabaseAdmin
      .from('obiettivi_step')
      .select('*')
      .eq('obiettivo_id', obiettivoId)
      .order('ordine', { ascending: true })

    if (error) throw error

    return NextResponse.json({ steps: steps || [] })
  } catch (error) {
    console.error('Errore GET step:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/obiettivi/step
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { obiettivo_id } = body

    if (!obiettivo_id) {
      return NextResponse.json({ error: 'obiettivo_id richiesto' }, { status: 400 })
    }

    // Verifica che l'obiettivo_id indicato appartenga a un centro dell'utente
    // PRIMA di creare uno step collegato ad esso.
    const ownership = await verifyRowCentroOwnership(request, supabaseAdmin, { table: 'obiettivi', id: obiettivo_id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data: step, error } = await supabaseAdmin
      .from('obiettivi_step')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ step })
  } catch (error) {
    console.error('Errore POST step:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/obiettivi/step
 */
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    // `id` qui è la riga di obiettivi_step, che NON ha un centro_id diretto
    // (solo obiettivo_id). Prima si recupera l'obiettivo_id reale della riga
    // (con il client service-key, per non dipendere da RLS), poi si verifica
    // l'ownership sul centro_id dell'obiettivo padre.
    const { data: existingStep, error: stepLookupError } = await supabaseAdmin
      .from('obiettivi_step')
      .select('id, obiettivo_id')
      .eq('id', id)
      .maybeSingle()

    if (stepLookupError) throw stepLookupError
    if (!existingStep) {
      return NextResponse.json({ error: 'Step non trovato' }, { status: 404 })
    }

    const ownership = await verifyRowCentroOwnership(request, supabaseAdmin, { table: 'obiettivi', id: existingStep.obiettivo_id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // obiettivo_id/id/created_at non sono riassegnabili dal client via update:
    // stessa logica anti-corruzione-dati richiesta per obiettivi PATCH e
    // centro/servizi PUT (centro_id qui non è nemmeno una colonna della tabella,
    // ma obiettivo_id lo è e permetterebbe lo stesso tipo di attacco).
    const { obiettivo_id: _ignoredObiettivoId, id: _ignoredId, created_at: _ignoredCreatedAt, ...safeUpdates } = updates

    const { data: step, error } = await supabaseAdmin
      .from('obiettivi_step')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ step })
  } catch (error) {
    console.error('Errore PATCH step:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
