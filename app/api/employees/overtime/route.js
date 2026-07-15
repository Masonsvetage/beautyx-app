import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateOvertimeMonth } from '@/lib/pianificazione-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employee_id')
    const mese = parseInt(searchParams.get('mese'))
    const anno = parseInt(searchParams.get('anno'))

    if (!employeeId || !mese || !anno) {
      return NextResponse.json(
        { error: 'employee_id, mese e anno richiesti' },
        { status: 400 }
      )
    }

    // Carica dipendente
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (empError) throw empError

    // Carica ore lavorate per il mese
    const startDate = `${anno}-${String(mese).padStart(2, '0')}-01`
    const endDate = `${anno}-${String(mese).padStart(2, '0')}-${new Date(anno, mese, 0).getDate()}`

    const { data: hours, error: hoursError } = await supabase
      .from('employee_hours')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('data', startDate)
      .lte('data', endDate)

    if (hoursError) throw hoursError

    // Calcola straordinari
    const overtime = calculateOvertimeMonth(employee, hours || [], mese, anno)

    return NextResponse.json({
      employee: {
        id: employee.id,
        nome: employee.nome,
        cognome: employee.cognome
      },
      mese,
      anno,
      ...overtime
    })
  } catch (error) {
    console.error('Errore GET overtime:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
