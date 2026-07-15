import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { calculateBudgetComparison } from '@/lib/pianificazione-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const anno = parseInt(searchParams.get('anno'))
    const mese = searchParams.get('mese') ? parseInt(searchParams.get('mese')) : null

    if (!centroId || !anno) {
      return NextResponse.json({ error: 'centro_id e anno richiesti' }, { status: 400 })
    }

    // Carica budget plans per l'anno
    const { data: budgetPlans, error: budgetError } = await supabase
      .from('budget_plans')
      .select('*, budget_monthly_breakdown(*)')
      .eq('centro_id', centroId)
      .eq('anno', anno)

    if (budgetError) throw budgetError

    // Carica bank movements per l'anno
    const { data: movements, error: movementsError } = await supabase
      .from('bank_movements')
      .select('*')
      .eq('centro_id', centroId)
      .gte('data', `${anno}-01-01`)
      .lte('data', `${anno}-12-31`)

    if (movementsError) throw movementsError

    // Calcola comparisons per ogni categoria
    const comparisons = []
    for (const plan of budgetPlans || []) {
      if (mese) {
        // Confronto per mese specifico
        const comparison = calculateBudgetComparison(
          plan.budget_monthly_breakdown || [],
          movements || [],
          plan.categoria,
          mese,
          anno
        )
        comparisons.push({
          categoria: plan.categoria,
          anno,
          mese,
          ...comparison
        })
      } else {
        // Confronto per tutti i 12 mesi
        for (let m = 1; m <= 12; m++) {
          const comparison = calculateBudgetComparison(
            plan.budget_monthly_breakdown || [],
            movements || [],
            plan.categoria,
            m,
            anno
          )
          comparisons.push({
            categoria: plan.categoria,
            anno,
            mese: m,
            ...comparison
          })
        }
      }
    }

    return NextResponse.json({ comparisons })
  } catch (error) {
    console.error('Errore GET budget comparison:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
