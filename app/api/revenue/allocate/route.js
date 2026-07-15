import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * POST /api/revenue/allocate
 * Conferma ed esegue allocazione agli accantonamenti
 * Crea movimenti e salva record allocazioni
 */
export async function POST(request) {
  try {
    const {
      daily_revenue_id,
      allocations
    } = await request.json()

    // Validazione input
    if (!daily_revenue_id || !allocations || !Array.isArray(allocations)) {
      return NextResponse.json(
        { error: 'daily_revenue_id e allocations (array) richiesti' },
        { status: 400 }
      )
    }

    // Recupera daily_revenue per validazione
    const { data: dailyRevenue, error: revenueError } = await supabase
      .from('daily_revenues')
      .select('*')
      .eq('id', daily_revenue_id)
      .single()

    if (revenueError || !dailyRevenue) {
      return NextResponse.json(
        { error: 'Daily revenue non trovato' },
        { status: 404 }
      )
    }

    // Valida che allocazioni non superino l'incasso totale
    const totalAllocated = allocations.reduce(
      (sum, a) => sum + parseFloat(a.importo_finale || 0),
      0
    )

    if (totalAllocated > parseFloat(dailyRevenue.importo_totale)) {
      return NextResponse.json(
        {
          error: 'Le allocazioni superano l\'importo totale dell\'incasso',
          total_allocated: totalAllocated,
          importo_totale: dailyRevenue.importo_totale,
          excess: totalAllocated - parseFloat(dailyRevenue.importo_totale)
        },
        { status: 400 }
      )
    }

    // Array per raccogliere risultati
    const movementsCreated = []
    const allocationsCreated = []
    const updatedAccantonamenti = []

    // Processa ogni allocazione
    for (const allocation of allocations) {
      const { accantonamento_id, importo_proposto, importo_finale, modified_by_user } = allocation

      if (!accantonamento_id || importo_finale === undefined) {
        continue // Salta allocazioni incomplete
      }

      const importoFinale = parseFloat(importo_finale)

      // Skip allocazioni con importo 0
      if (importoFinale <= 0) {
        continue
      }

      // 1. Crea movimento accantonamento
      const { data: movement, error: movementError } = await supabase
        .from('accantonamento_movements')
        .insert({
          accantonamento_id,
          tipo: 'entrata',
          importo: importoFinale,
          descrizione: `Allocazione da incasso del ${dailyRevenue.data}`,
          data: dailyRevenue.data
        })
        .select()
        .single()

      if (movementError) {
        console.error('Errore creazione movimento:', movementError)
        throw movementError
      }

      movementsCreated.push(movement)

      // 2. Salva record allocazione
      const { data: allocationRecord, error: allocationError } = await supabase
        .from('daily_revenue_allocations')
        .insert({
          daily_revenue_id,
          accantonamento_id,
          importo_proposto: parseFloat(importo_proposto || importo_finale),
          importo_finale: importoFinale,
          modified_by_user: modified_by_user || false,
          accantonamento_movement_id: movement.id
        })
        .select()
        .single()

      if (allocationError) {
        console.error('Errore creazione allocation record:', allocationError)
        // Non è critico - il movimento è stato creato
      } else {
        allocationsCreated.push(allocationRecord)
      }

      // 3. Recupera saldo aggiornato (il trigger l'ha già ricalcolato)
      const { data: accantonamento } = await supabase
        .from('accantonamenti')
        .select('id, nome, saldo_attuale')
        .eq('id', accantonamento_id)
        .single()

      if (accantonamento) {
        updatedAccantonamenti.push(accantonamento)
      }
    }

    // 4. Aggiorna daily_revenue come confermato
    await supabase
      .from('daily_revenues')
      .update({ allocations_confirmed: true })
      .eq('id', daily_revenue_id)

    return NextResponse.json({
      success: true,
      movements_created: movementsCreated.length,
      allocations_saved: allocationsCreated.length,
      updated_accantonamenti: updatedAccantonamenti
    })

  } catch (error) {
    console.error('Errore POST /api/revenue/allocate:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/revenue/allocate
 * Ottieni allocazioni per un daily_revenue_id
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const dailyRevenueId = searchParams.get('daily_revenue_id')

    if (!dailyRevenueId) {
      return NextResponse.json(
        { error: 'daily_revenue_id richiesto' },
        { status: 400 }
      )
    }

    const { data: allocations, error } = await supabase
      .from('daily_revenue_allocations')
      .select('*, accantonamenti(nome, icona, colore)')
      .eq('daily_revenue_id', dailyRevenueId)

    if (error) throw error

    return NextResponse.json({ allocations: allocations || [] })

  } catch (error) {
    console.error('Errore GET /api/revenue/allocate:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
