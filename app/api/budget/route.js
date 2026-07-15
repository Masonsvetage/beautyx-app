import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { distributeAnnualBudget } from '@/lib/pianificazione-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const anno = searchParams.get('anno')

    if (!centroId) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    let query = supabase
      .from('budget_plans')
      .select('*')
      .eq('centro_id', centroId)
      .order('categoria', { ascending: true })

    if (anno) {
      query = query.eq('anno', parseInt(anno))
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ budgets: data || [] })
  } catch (error) {
    console.error('Errore GET budgets:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { centro_id, categoria, anno, importo_annuale, note } = await request.json()

    if (!centro_id || !categoria || !anno) {
      return NextResponse.json(
        { error: 'centro_id, categoria e anno sono richiesti' },
        { status: 400 }
      )
    }

    // Crea budget plan
    const { data: budgetPlan, error: budgetError } = await supabase
      .from('budget_plans')
      .insert({
        centro_id,
        categoria,
        anno: parseInt(anno),
        importo_annuale: parseFloat(importo_annuale || 0),
        note
      })
      .select()
      .single()

    if (budgetError) throw budgetError

    // Auto-crea 12 mesi con distribuzione equa
    const monthlyData = distributeAnnualBudget(importo_annuale)
    const monthlyInserts = monthlyData.map(m => ({
      budget_plan_id: budgetPlan.id,
      mese: m.mese,
      importo_mensile: m.importo_mensile
    }))

    const { error: monthlyError } = await supabase
      .from('budget_monthly_breakdown')
      .insert(monthlyInserts)

    if (monthlyError) throw monthlyError

    return NextResponse.json({ success: true, budget: budgetPlan })
  } catch (error) {
    console.error('Errore POST budget:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, importo_annuale, note } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const updateData = {}
    if (importo_annuale !== undefined) updateData.importo_annuale = parseFloat(importo_annuale)
    if (note !== undefined) updateData.note = note

    const { data, error } = await supabase
      .from('budget_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, budget: data })
  } catch (error) {
    console.error('Errore PATCH budget:', error)
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

    // Delete cascade rimuoverà anche i monthly breakdowns
    const { error } = await supabase
      .from('budget_plans')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE budget:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
