import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateAbsenceHours } from '@/lib/pianificazione-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const anno = searchParams.get('anno')

    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id richiesto' }, { status: 400 })
    }

    let query = supabase
      .from('employee_absences')
      .select('*')
      .eq('employee_id', employeeId)
      .order('data_inizio', { ascending: false })

    if (anno) {
      query = query
        .gte('data_inizio', `${anno}-01-01`)
        .lte('data_fine', `${anno}-12-31`)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ absences: data || [] })
  } catch (error) {
    console.error('Errore GET absences:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const {
      employee_id,
      tipo,
      data_inizio,
      data_fine,
      ore_totali,
      approvato,
      note
    } = await request.json()

    if (!employee_id || !tipo || !data_inizio || !data_fine) {
      return NextResponse.json(
        { error: 'employee_id, tipo, data_inizio e data_fine richiesti' },
        { status: 400 }
      )
    }

    // Se ore_totali non fornite, calcolale automaticamente
    let oreTotali = ore_totali
    if (!oreTotali) {
      oreTotali = calculateAbsenceHours(data_inizio, data_fine)
    }

    const { data, error } = await supabase
      .from('employee_absences')
      .insert({
        employee_id,
        tipo,
        data_inizio,
        data_fine,
        ore_totali: parseFloat(oreTotali),
        approvato: approvato || false,
        note
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, absence: data })
  } catch (error) {
    console.error('Errore POST absence:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const {
      id,
      tipo,
      data_inizio,
      data_fine,
      ore_totali,
      approvato,
      note
    } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const updateData = {}
    if (tipo !== undefined) updateData.tipo = tipo
    if (data_inizio !== undefined) updateData.data_inizio = data_inizio
    if (data_fine !== undefined) updateData.data_fine = data_fine
    if (ore_totali !== undefined) updateData.ore_totali = parseFloat(ore_totali)
    if (approvato !== undefined) updateData.approvato = approvato
    if (note !== undefined) updateData.note = note

    // Ricalcola ore_totali se le date sono cambiate
    if ((data_inizio !== undefined || data_fine !== undefined) && ore_totali === undefined) {
      const { data: currentAbsence } = await supabase
        .from('employee_absences')
        .select('data_inizio, data_fine')
        .eq('id', id)
        .single()

      const start = data_inizio || currentAbsence.data_inizio
      const end = data_fine || currentAbsence.data_fine
      updateData.ore_totali = calculateAbsenceHours(start, end)
    }

    const { data, error } = await supabase
      .from('employee_absences')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, absence: data })
  } catch (error) {
    console.error('Errore PATCH absence:', error)
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
      .from('employee_absences')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE absence:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
