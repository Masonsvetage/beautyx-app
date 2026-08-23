import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCentroOwnership, verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

// Client con SERVICE_KEY usato per TUTTE le query (lookup ownership e dati).
// `progressi_obiettivi`/`obiettivi` sono state ricreate il 2026-08-21 con RLS
// abilitata e nessuna policy per anon/authenticated (stesso pattern di
// accantonamenti, bank_movements, ecc.): il client anon di `lib/supabase.js`
// non avrebbe più accesso. Il confine di sicurezza reale resta applicativo,
// tramite verifyCentroOwnership sotto.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/progressi-obiettivi?centro_id=xxx&data=2025-01-16
 * GET /api/progressi-obiettivi?centro_id=xxx&from=2025-01-01&to=2025-01-31
 * GET /api/progressi-obiettivi?obiettivo_id=xxx&from=2025-01-01&to=2025-01-31
 * Recupera progressi obiettivi
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const obiettivoId = searchParams.get('obiettivo_id')
    const data = searchParams.get('data')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    if (!centroId && !obiettivoId) {
      return NextResponse.json(
        { error: 'centro_id o obiettivo_id richiesto' },
        { status: 400 }
      )
    }

    // centro_id verificato sulla sessione (o derivato dall'obiettivo e poi
    // verificato) — riusato più sotto per il doppio controllo di coerenza sul
    // join, non solo per il check di ownership iniziale.
    let verifiedCentroId = centroId

    if (centroId) {
      const ownership = await verifyCentroOwnership(request, centroId)
      if (!ownership.ok) return centroOwnershipErrorResponse(ownership)
    } else {
      // Solo obiettivo_id fornito: risali al centro_id dell'obiettivo e verifica
      const { data: obiettivo, error: obErr } = await supabaseAdmin
        .from('obiettivi')
        .select('centro_id')
        .eq('id', obiettivoId)
        .maybeSingle()

      if (obErr) {
        return NextResponse.json({ error: obErr.message }, { status: 500 })
      }
      if (!obiettivo) {
        return NextResponse.json({ error: 'Obiettivo non trovato' }, { status: 404 })
      }

      const ownership = await verifyCentroOwnership(request, obiettivo.centro_id)
      if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

      verifiedCentroId = obiettivo.centro_id
    }

    // SICUREZZA (fix 2026-08-23, audit Riccardo): `!inner` forza il join a
    // scartare righe senza obiettivo collegato o il cui obiettivo non passa
    // il filtro sottostante — necessario per poter filtrare esplicitamente
    // anche su `obiettivo.centro_id`, non solo su `progressi_obiettivi.centro_id`.
    // Anche se la scrittura è ora blindata (vedi POST sopra), questo secondo
    // filtro protegge in lettura da eventuali righe già incoerenti in tabella
    // per altri motivi (es. dati pre-esistenti, migrazioni, bug futuri).
    let query = supabaseAdmin
      .from('progressi_obiettivi')
      .select(`
        *,
        obiettivo:obiettivi!inner(*)
      `)
      .eq('obiettivo.centro_id', verifiedCentroId)
      .order('data', { ascending: false })

    if (centroId) {
      query = query.eq('centro_id', centroId)
    }

    if (obiettivoId) {
      query = query.eq('obiettivo_id', obiettivoId)
    }

    if (data) {
      query = query.eq('data', data)
    }

    if (fromDate && toDate) {
      query = query.gte('data', fromDate).lte('data', toDate)
    }

    const { data: progressi, error } = await query

    if (error) throw error

    return NextResponse.json({ progressi: progressi || [] })
  } catch (error) {
    console.error('Errore GET progressi:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/progressi-obiettivi
 * Registra progresso giornaliero (upsert)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      obiettivo_id,
      centro_id,
      data,
      valore_registrato,
      note,
      registrato_da
    } = body

    if (!obiettivo_id || !centro_id || !data || valore_registrato === undefined) {
      return NextResponse.json(
        { error: 'obiettivo_id, centro_id, data e valore_registrato sono richiesti' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // SICUREZZA (fix 2026-08-23, audit Riccardo su PoC reale — vedi
    // memory/riccardo.md): il centro_id è verificato sopra, ma NON basta —
    // va verificato ANCHE che l'obiettivo_id fornito nello stesso payload
    // appartenga davvero a quel centro. Senza questo controllo un titolare
    // del proprio centro A poteva inviare centro_id=A (verificato, proprio)
    // insieme a un obiettivo_id reale di un centro B altrui: l'upsert andava
    // a buon fine e la successiva GET esponeva l'intero record `obiettivi`
    // del centro B (nome, note, dati riservati) dentro la risposta di A.
    // Riusa lo stesso helper già in uso nel resto della feature
    // (verifyRowCentroOwnership) applicato alla riga `obiettivi` realmente
    // referenziata da obiettivo_id, non al centro_id dichiarato dal client.
    const obiettivoOwnership = await verifyRowCentroOwnership(request, supabaseAdmin, {
      table: 'obiettivi',
      id: obiettivo_id
    })
    if (!obiettivoOwnership.ok) return centroOwnershipErrorResponse(obiettivoOwnership)

    // Coerenza esplicita, non solo "l'utente ha accesso a qualche centro
    // legato all'obiettivo": l'obiettivo deve appartenere ESATTAMENTE al
    // centro_id dichiarato in questo payload. Rilevante anche per admin/HPA
    // multi-centro, che altrimenti passerebbero il check sopra pur creando
    // una riga progressi_obiettivi con centro_id e obiettivo_id incoerenti
    // tra loro (bug di integrità dati, non solo di confidenzialità).
    if (String(obiettivoOwnership.row.centro_id) !== String(centro_id)) {
      return NextResponse.json(
        { error: 'obiettivo_id non appartiene al centro_id indicato' },
        { status: 403 }
      )
    }

    // Upsert: aggiorna se esiste, altrimenti crea
    const { data: progresso, error } = await supabaseAdmin
      .from('progressi_obiettivi')
      .upsert(
        {
          obiettivo_id,
          centro_id,
          data,
          valore_registrato,
          note,
          registrato_da: registrato_da || 'centro'
        },
        {
          onConflict: 'obiettivo_id,data',
          ignoreDuplicates: false
        }
      )
      .select(`
        *,
        obiettivo:obiettivi(*)
      `)
      .single()

    if (error) throw error

    return NextResponse.json({ progresso })
  } catch (error) {
    console.error('Errore POST progresso:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/progressi-obiettivi/riepilogo?centro_id=xxx&data=2025-01-16
 * Recupera riepilogo giornaliero con obiettivi e progressi
 */
export async function getRiepilogoGiornaliero(centroId, data) {
  // Recupera tutti gli obiettivi attivi
  const { data: obiettivi, error: obError } = await supabaseAdmin
    .from('obiettivi')
    .select('*')
    .eq('centro_id', centroId)
    .eq('attivo', true)
    .order('priorita', { ascending: true })

  if (obError) throw obError

  // Recupera i progressi per la data specificata
  const { data: progressi, error: prError } = await supabaseAdmin
    .from('progressi_obiettivi')
    .select('*')
    .eq('centro_id', centroId)
    .eq('data', data)

  if (prError) throw prError

  // Combina obiettivi con progressi
  const riepilogo = (obiettivi || []).map(ob => {
    const progresso = (progressi || []).find(p => p.obiettivo_id === ob.id)
    return {
      ...ob,
      progresso: progresso || null,
      valore_oggi: progresso?.valore_registrato || null,
      percentuale: progresso?.percentuale_raggiungimento || 0,
      raggiunto: progresso?.obiettivo_raggiunto || false
    }
  })

  return riepilogo
}
