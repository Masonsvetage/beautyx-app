import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const dataInizio = searchParams.get('data_inizio')
    const dataFine = searchParams.get('data_fine')

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id richiesto' }, { status: 400 })
    }

    let query = supabase
      .from('employee_hours')
      .select('*')
      .eq('employee_id', employeeId)
      .order('data', { ascending: false })

    if (dataInizio) query = query.gte('data', dataInizio)
    if (dataFine) query = query.lte('data', dataFine)

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ hours: data || [] })
  } catch (error) {
    console.error('Errore GET employee hours:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { employee_id, data, ore_lavorate, tipo, note } = await request.json()

    if (!employee_id || !data || ore_lavorate === undefined) {
      return NextResponse.json(
        { error: 'employee_id, data e ore_lavorate richiesti' },
        { status: 400 }
      )
    }

    // Upsert: inserisci o aggiorna se esiste già per quella data
    const { data: hours, error } = await supabase
      .from('employee_hours')
      .upsert({
        employee_id,
        data,
        ore_lavorate: parseFloat(ore_lavorate),
        tipo: tipo || 'normale',
        note
      }, {
        onConflict: 'employee_id,data'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, hours })
  } catch (error) {
    console.error('Errore POST employee hours:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, ore_lavorate, tipo, note } = await request.json()

    if (!id || ore_lavorate === undefined) {
      return NextResponse.json({ error: 'id e ore_lavorate richiesti' }, { status: 400 })
    }

    const updateData = { ore_lavorate: parseFloat(ore_lavorate) }
    if (tipo !== undefined) updateData.tipo = tipo
    if (note !== undefined) updateData.note = note

    const { data, error } = await supabase
      .from('employee_hours')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, hours: data })
  } catch (error) {
    console.error('Errore PATCH employee hours:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const { error } = await supabase
      .from('employee_hours')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE employee hours:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
