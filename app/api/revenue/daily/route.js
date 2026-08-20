import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * POST /api/revenue/daily
 * Registra incasso giornaliero e calcola allocazioni suggerite
 */
export async function POST(request) {
  try {
    const {
      centro_id,
      data,
      importo_totale,
      numero_clienti,
      note
    } = await request.json()

    // Validazione input
    if (!centro_id || !data || importo_totale === undefined) {
      return NextResponse.json(
        { error: 'centro_id, data e importo_totale sono richiesti' },
        { status: 400 }
      )
    }

    if (parseFloat(importo_totale) < 0) {
      return NextResponse.json(
        { error: 'importo_totale deve essere >= 0' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // Inserisci o aggiorna daily_revenue
    const { data: dailyRevenue, error: revenueError } = await supabase
      .from('daily_revenues')
      .upsert({
        centro_id,
        data,
        importo_totale: parseFloat(importo_totale),
        numero_clienti: parseInt(numero_clienti || 0),
        note,
        allocations_confirmed: false
      }, {
        onConflict: 'centro_id,data'
      })
      .select()
      .single()

    if (revenueError) {
      console.error('Errore inserimento daily_revenue:', revenueError)
      throw revenueError
    }

    // Recupera accantonamenti attivi con tipo_versamento = 'percentuale_incasso'
    const { data: accantonamenti, error: accError } = await supabase
      .from('accantonamenti')
      .select('id, nome, tipo_versamento, percentuale_incasso, colore, icona')
      .eq('centro_id', centro_id)
      .eq('attivo', true)
      .eq('tipo_versamento', 'percentuale_incasso')

    if (accError) {
      console.error('Errore caricamento accantonamenti:', accError)
      throw accError
    }

    // Calcola allocazioni suggerite
    const suggestedAllocations = []
    let totalAllocated = 0

    for (const acc of (accantonamenti || [])) {
      const percentuale = parseFloat(acc.percentuale_incasso || 0)
      if (percentuale > 0) {
        const importo = (parseFloat(importo_totale) * percentuale) / 100
        const importoArrotondato = parseFloat(importo.toFixed(2))

        suggestedAllocations.push({
          accantonamento_id: acc.id,
          nome: acc.nome,
          tipo_versamento: acc.tipo_versamento,
          percentuale: percentuale,
          importo_suggerito: importoArrotondato,
          colore: acc.colore || '#8b5cf6',
          icona: acc.icona || '💰'
        })

        totalAllocated += importoArrotondato
      }
    }

    const importoNonAllocato = parseFloat((parseFloat(importo_totale) - totalAllocated).toFixed(2))

    return NextResponse.json({
      success: true,
      daily_revenue: dailyRevenue,
      suggested_allocations: suggestedAllocations,
      importo_non_allocato: importoNonAllocato,
      total_allocated: totalAllocated
    })

  } catch (error) {
    console.error('Errore POST /api/revenue/daily:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/revenue/daily
 * Ottieni incassi giornalieri per un centro
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const data = searchParams.get('data')

    if (!centroId) {
      return NextResponse.json(
        { error: 'centro_id richiesto' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    let query = supabase
      .from('daily_revenues')
      .select('*')
      .eq('centro_id', centroId)
      .order('data', { ascending: false })

    if (data) {
      query = query.eq('data', data)
    }

    const { data: revenues, error } = await query

    if (error) throw error

    return NextResponse.json({ revenues: revenues || [] })

  } catch (error) {
    console.error('Errore GET /api/revenue/daily:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
