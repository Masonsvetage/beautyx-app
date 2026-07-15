import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')

    const { data, error } = await supabase
      .from('opening_hours')
      .select('*')
      .eq('centro_id', centroId)
      .order('giorno_settimana')

    if (error) throw error

    return NextResponse.json({ hours: data || [] })
  } catch (error) {
    console.error('Errore GET opening-hours:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { centro_id, hours } = await request.json()

    // Elimina orari esistenti
    await supabase
      .from('opening_hours')
      .delete()
      .eq('centro_id', centro_id)

    // Inserisci nuovi orari
    const hoursToInsert = hours.map(h => ({
      centro_id,
      giorno_settimana: h.giorno_settimana,
      aperto: h.aperto,
      orario_apertura: h.aperto ? h.orario_apertura : null,
      orario_chiusura: h.aperto ? h.orario_chiusura : null,
      note: h.note || null
    }))

    const { data, error } = await supabase
      .from('opening_hours')
      .insert(hoursToInsert)
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, hours: data })
  } catch (error) {
    console.error('Errore POST opening-hours:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
