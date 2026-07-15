import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * GET /api/optimization-actions
 * Recupera le azioni di un piano specifico
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('plan_id')

    if (!planId) {
      return NextResponse.json({ error: 'plan_id richiesto' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('optimization_actions')
      .select('*')
      .eq('plan_id', planId)
      .order('ordine', { ascending: true })

    if (error) {
      console.error('Errore recupero azioni:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ actions: data })

  } catch (err) {
    console.error('Errore API optimization-actions GET:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * POST /api/optimization-actions
 * Aggiunge una nuova azione a un piano
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      plan_id,
      descrizione,
      tipo_azione,
      data_scadenza,
      note
    } = body

    if (!plan_id || !descrizione) {
      return NextResponse.json(
        { error: 'plan_id e descrizione sono richiesti' },
        { status: 400 }
      )
    }

    // Trova l'ordine massimo esistente
    const { data: existingActions } = await supabase
      .from('optimization_actions')
      .select('ordine')
      .eq('plan_id', plan_id)
      .order('ordine', { ascending: false })
      .limit(1)

    const nextOrder = existingActions?.length > 0 ? existingActions[0].ordine + 1 : 0

    const { data, error } = await supabase
      .from('optimization_actions')
      .insert({
        plan_id,
        descrizione,
        tipo_azione,
        data_scadenza,
        note,
        ordine: nextOrder
      })
      .select()
      .single()

    if (error) {
      console.error('Errore creazione azione:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ action: data })

  } catch (err) {
    console.error('Errore API optimization-actions POST:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/optimization-actions
 * Aggiorna un'azione esistente
 */
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const allowedFields = [
      'descrizione', 'tipo_azione', 'stato', 'data_scadenza',
      'data_completamento', 'note', 'risultato', 'ordine'
    ]

    const updateData = {}
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field]
      }
    })

    // Se stato diventa 'completed', imposta data_completamento
    if (updates.stato === 'completed' && !updates.data_completamento) {
      updateData.data_completamento = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('optimization_actions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Errore aggiornamento azione:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Se l'azione è stata completata, controlla se tutte le azioni del piano sono completate
    if (updates.stato === 'completed' || updates.stato === 'skipped') {
      await checkAndUpdatePlanStatus(data.plan_id)
    }

    return NextResponse.json({ action: data })

  } catch (err) {
    console.error('Errore API optimization-actions PATCH:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/optimization-actions
 * Elimina un'azione
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const { error } = await supabase
      .from('optimization_actions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Errore eliminazione azione:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Errore API optimization-actions DELETE:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * Helper: Controlla se tutte le azioni di un piano sono completate
 * e aggiorna lo stato del piano di conseguenza
 */
async function checkAndUpdatePlanStatus(planId) {
  try {
    const { data: actions } = await supabase
      .from('optimization_actions')
      .select('stato')
      .eq('plan_id', planId)

    if (!actions || actions.length === 0) return

    const allCompleted = actions.every(a =>
      a.stato === 'completed' || a.stato === 'skipped'
    )

    const someInProgress = actions.some(a => a.stato === 'in_progress')

    if (allCompleted) {
      // Tutte le azioni completate, ma non completiamo automaticamente il piano
      // L'utente deve confermare e inserire i risultati
      // Però possiamo suggerire mettendo lo stato a 'in_corso' se era 'attivo'
      const { data: plan } = await supabase
        .from('optimization_plans')
        .select('stato')
        .eq('id', planId)
        .single()

      if (plan?.stato === 'attivo') {
        await supabase
          .from('optimization_plans')
          .update({ stato: 'in_corso' })
          .eq('id', planId)
      }
    } else if (someInProgress) {
      // Se ci sono azioni in corso, il piano dovrebbe essere in_corso
      await supabase
        .from('optimization_plans')
        .update({ stato: 'in_corso' })
        .eq('id', planId)
    }
  } catch (err) {
    console.error('Errore checkAndUpdatePlanStatus:', err)
  }
}
