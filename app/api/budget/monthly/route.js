import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const budgetPlanId = searchParams.get('budget_plan_id')

    if (!budgetPlanId) {
      return NextResponse.json({ error: 'budget_plan_id richiesto' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('budget_monthly_breakdown')
      .select('*')
      .eq('budget_plan_id', budgetPlanId)
      .order('mese', { ascending: true })

    if (error) throw error

    return NextResponse.json({ monthly: data || [] })
  } catch (error) {
    console.error('Errore GET monthly breakdown:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { budget_plan_id, monthly_data } = await request.json()

    if (!budget_plan_id || !monthly_data || !Array.isArray(monthly_data)) {
      return NextResponse.json(
        { error: 'budget_plan_id e monthly_data (array) richiesti' },
        { status: 400 }
      )
    }

    // Upsert per tutti i 12 mesi
    const updates = []
    for (const item of monthly_data) {
      const { data, error } = await supabase
        .from('budget_monthly_breakdown')
        .upsert({
          budget_plan_id,
          mese: item.mese,
          importo_mensile: parseFloat(item.importo_mensile || 0)
        }, {
          onConflict: 'budget_plan_id,mese'
        })
        .select()
        .single()

      if (error) throw error
      updates.push(data)
    }

    return NextResponse.json({ success: true, monthly: updates })
  } catch (error) {
    console.error('Errore POST monthly breakdown:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, importo_mensile } = await request.json()

    if (!id || importo_mensile === undefined) {
      return NextResponse.json({ error: 'id e importo_mensile richiesti' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('budget_monthly_breakdown')
      .update({ importo_mensile: parseFloat(importo_mensile) })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, monthly: data })
  } catch (error) {
    console.error('Errore PATCH monthly breakdown:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
