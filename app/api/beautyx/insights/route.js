import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCentroOwnership, verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Recupera insights
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centro_id = searchParams.get('centro_id')
    const stato = searchParams.get('stato')
    const tipo = searchParams.get('tipo')

    if (!centro_id) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    let query = supabase
      .from('beautyx_insights')
      .select('*')
      .eq('centro_id', centro_id)
      .order('priorita', { ascending: true })
      .order('created_at', { ascending: false })

    if (stato) {
      query = query.eq('stato', stato)
    }

    if (tipo) {
      query = query.eq('tipo', tipo)
    }

    const { data, error } = await query

    if (error) {
      console.error('Errore GET insights:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ insights: data || [] })
  } catch (error) {
    console.error('Errore GET insights:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Crea nuovo insight
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      centro_id,
      conversation_id,
      tipo,
      titolo,
      descrizione,
      valore_iniziale,
      valore_target,
      valore_corrente,
      data_inizio,
      data_target,
      priorita,
      metadata
    } = body

    if (!centro_id || !tipo || !titolo) {
      return NextResponse.json({
        error: 'centro_id, tipo e titolo richiesti'
      }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const validTipi = ['obiettivo', 'progresso', 'alert', 'suggerimento', 'traguardo']
    if (!validTipi.includes(tipo)) {
      return NextResponse.json({
        error: `tipo deve essere uno di: ${validTipi.join(', ')}`
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('beautyx_insights')
      .insert({
        centro_id,
        conversation_id: conversation_id || null,
        tipo,
        titolo,
        descrizione: descrizione || null,
        valore_iniziale: valore_iniziale || null,
        valore_target: valore_target || null,
        valore_corrente: valore_corrente || valore_iniziale || null,
        data_inizio: data_inizio || new Date().toISOString().split('T')[0],
        data_target: data_target || null,
        stato: 'attivo',
        priorita: priorita || 3,
        metadata: metadata || {}
      })
      .select()
      .single()

    if (error) {
      console.error('Errore POST insight:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, insight: data })
  } catch (error) {
    console.error('Errore POST insight:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Aggiorna insight
export async function PATCH(request) {
  try {
    const body = await request.json()
    const {
      id,
      valore_corrente,
      stato,
      priorita,
      descrizione,
      metadata
    } = body

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'beautyx_insights', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const updates = {}
    if (valore_corrente !== undefined) updates.valore_corrente = valore_corrente
    if (stato !== undefined) updates.stato = stato
    if (priorita !== undefined) updates.priorita = priorita
    if (descrizione !== undefined) updates.descrizione = descrizione
    if (metadata !== undefined) updates.metadata = metadata

    const { data, error } = await supabase
      .from('beautyx_insights')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Errore PATCH insight:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, insight: data })
  } catch (error) {
    console.error('Errore PATCH insight:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
