import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCentroOwnership, verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

// Client con SERVICE_KEY usato per TUTTE le query su questa tabella (sia il
// lookup ownership sia le query dati). Le tabelle obiettivi* sono state
// ricreate il 2026-08-21 con RLS abilitata e NESSUNA policy per anon/authenticated
// (stesso pattern di accantonamenti, bank_movements, ecc.): il client anon di
// `lib/supabase.js` (createBrowserClient, nessuna sessione quando usato
// server-side) non potrebbe più leggere/scrivere nulla su queste tabelle.
// Il confine di sicurezza reale resta applicativo, tramite
// verifyCentroOwnership/verifyRowCentroOwnership qui sotto.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/obiettivi?centro_id=xxx
 * GET /api/obiettivi?centro_id=xxx&stato=attivo
 * GET /api/obiettivi?centro_id=xxx&attivo=true
 * Recupera obiettivi del centro
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const attivo = searchParams.get('attivo')
    const tipo = searchParams.get('tipo')
    const stato = searchParams.get('stato')

    if (!centroId) {
      return NextResponse.json(
        { error: 'centro_id richiesto' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    let query = supabaseAdmin
      .from('obiettivi')
      .select('*')
      .eq('centro_id', centroId)
      .order('priorita', { ascending: true })
      .order('created_at', { ascending: false })

    // Filtro per stato (nuovo sistema lifecycle)
    if (stato && stato !== 'tutti') {
      query = query.eq('stato', stato)
    }

    // Retrocompatibilità con attivo=true
    if (attivo === 'true') {
      query = query.eq('attivo', true)
    }

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data: obiettivi, error } = await query

    if (error) throw error

    return NextResponse.json({ obiettivi: obiettivi || [] })
  } catch (error) {
    console.error('Errore GET obiettivi:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/obiettivi
 * Crea nuovo obiettivo
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      centro_id,
      nome,
      descrizione,
      icona,
      tipo,
      unita_misura,
      valore_riferimento,
      valore_obiettivo,
      direzione,
      frequenza,
      data_inizio,
      data_fine,
      creato_da,
      visibile_beautyx,
      visibile_hpa,
      visibile_centro,
      priorita,
      note
    } = body

    if (!centro_id || !nome || !tipo || valore_riferimento === undefined) {
      return NextResponse.json(
        { error: 'centro_id, nome, tipo e valore_riferimento sono richiesti' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data: obiettivo, error } = await supabaseAdmin
      .from('obiettivi')
      .insert({
        centro_id,
        nome,
        descrizione,
        icona: icona || '🎯',
        tipo,
        unita_misura: unita_misura || 'numero',
        valore_riferimento,
        valore_obiettivo,
        direzione: direzione || 'maggiore',
        frequenza: frequenza || 'giornaliero',
        data_inizio: data_inizio || new Date().toISOString().split('T')[0],
        data_fine,
        creato_da: creato_da || 'beautyx',
        visibile_beautyx: visibile_beautyx !== false,
        visibile_hpa: visibile_hpa !== false,
        visibile_centro: visibile_centro !== false,
        priorita: priorita || 1,
        note
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ obiettivo })
  } catch (error) {
    console.error('Errore POST obiettivo:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/obiettivi
 * Aggiorna obiettivo esistente
 */
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'id richiesto' },
        { status: 400 }
      )
    }

    const ownership = await verifyRowCentroOwnership(request, supabaseAdmin, { table: 'obiettivi', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // centro_id/id/created_at non sono riassegnabili dal client: l'ownership
    // sopra verifica il centro_id REALE della riga, ma se venisse passato al
    // .update() un centro_id diverso nel body, l'utente potrebbe riassegnare
    // la propria riga a un centro arbitrario (corruzione dati cross-centro).
    const { centro_id: _ignoredCentroId, id: _ignoredId, created_at: _ignoredCreatedAt, ...safeUpdates } = updates

    const { data: obiettivo, error } = await supabaseAdmin
      .from('obiettivi')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ obiettivo })
  } catch (error) {
    console.error('Errore PATCH obiettivo:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/obiettivi?id=xxx
 * Elimina obiettivo
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'id richiesto' },
        { status: 400 }
      )
    }

    const ownership = await verifyRowCentroOwnership(request, supabaseAdmin, { table: 'obiettivi', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { error } = await supabaseAdmin
      .from('obiettivi')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE obiettivo:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
