import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyCentroOwnership, verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const stato = searchParams.get('stato') // opzionale

    if (!centroId) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    let query = supabase
      .from('validated_anomalies')
      .select('*')
      .eq('centro_id', centroId)
      .order('created_at', { ascending: false })

    if (stato) {
      query = query.eq('stato', stato)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ anomalies: data || [] })
  } catch (error) {
    console.error('Errore GET anomalies:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const payload = await request.json()

    if (!payload?.centro_id) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, payload.centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data, error } = await supabase
      .from('validated_anomalies')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, anomaly: data })
  } catch (error) {
    console.error('Errore POST anomaly:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, stato, note_utente, risolto_in_data } = await request.json()

    const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'validated_anomalies', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const updateData = {
      stato,
      updated_at: new Date().toISOString()
    }

    if (note_utente !== undefined) updateData.note_utente = note_utente
    if (risolto_in_data !== undefined) updateData.risolto_in_data = risolto_in_data

    const { data, error } = await supabase
      .from('validated_anomalies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, anomaly: data })
  } catch (error) {
    console.error('Errore PATCH anomaly:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
