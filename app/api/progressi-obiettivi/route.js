import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

// Client SERVICE_KEY usato solo per risalire al centro_id di un obiettivo quando
// la richiesta filtra per obiettivo_id senza passare centro_id (vedi nota in
// app/api/obiettivi/route.js sullo stesso pattern).
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
    }

    let query = supabase
      .from('progressi_obiettivi')
      .select(`
        *,
        obiettivo:obiettivi(*)
      `)
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

    // Upsert: aggiorna se esiste, altrimenti crea
    const { data: progresso, error } = await supabase
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
  const { data: obiettivi, error: obError } = await supabase
    .from('obiettivi')
    .select('*')
    .eq('centro_id', centroId)
    .eq('attivo', true)
    .order('priorita', { ascending: true })

  if (obError) throw obError

  // Recupera i progressi per la data specificata
  const { data: progressi, error: prError } = await supabase
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
