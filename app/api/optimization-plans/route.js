import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/optimization-plans
 * Recupera i piani di ottimizzazione per un centro
 * Query params: centro_id, stato (opzionale), categoria (opzionale)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const stato = searchParams.get('stato')
    const categoria = searchParams.get('categoria')

    if (!centroId) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    let query = supabase
      .from('optimization_plans')
      .select(`
        *,
        optimization_actions (*),
        optimization_logs (*)
      `)
      .eq('centro_id', centroId)
      .order('created_at', { ascending: false })

    if (stato) {
      query = query.eq('stato', stato)
    }

    if (categoria) {
      query = query.eq('categoria', categoria)
    }

    const { data, error } = await query

    if (error) {
      console.error('Errore recupero piani:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calcola statistiche
    const stats = {
      totale: data.length,
      attivi: data.filter(p => p.stato === 'attivo').length,
      inCorso: data.filter(p => p.stato === 'in_corso').length,
      completati: data.filter(p => p.stato === 'completato').length,
      risparmioTotale: data
        .filter(p => p.risparmio_effettivo)
        .reduce((sum, p) => sum + parseFloat(p.risparmio_effettivo || 0), 0)
    }

    return NextResponse.json({ plans: data, stats })

  } catch (err) {
    console.error('Errore API optimization-plans GET:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * POST /api/optimization-plans
 * Crea un nuovo piano di ottimizzazione
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      centro_id,
      categoria,
      importo_rilevato,
      percentuale_rilevata,
      tipo_rilevazione,
      periodo_riferimento,
      titolo,
      descrizione,
      obiettivo_risparmio,
      priorita,
      data_scadenza,
      azioni // Array di azioni iniziali (opzionale)
    } = body

    if (!centro_id || !categoria || !titolo) {
      return NextResponse.json(
        { error: 'centro_id, categoria e titolo sono richiesti' },
        { status: 400 }
      )
    }

    // Crea il piano
    const { data: plan, error: planError } = await supabase
      .from('optimization_plans')
      .insert({
        centro_id,
        categoria,
        importo_rilevato: importo_rilevato || 0,
        percentuale_rilevata,
        tipo_rilevazione: tipo_rilevazione || 'manuale',
        periodo_riferimento,
        titolo,
        descrizione,
        obiettivo_risparmio,
        priorita: priorita || 2,
        data_scadenza
      })
      .select()
      .single()

    if (planError) {
      console.error('Errore creazione piano:', planError)
      return NextResponse.json({ error: planError.message }, { status: 500 })
    }

    // Se ci sono azioni iniziali, le crea
    if (azioni && azioni.length > 0) {
      const azioniDaInserire = azioni.map((a, idx) => ({
        plan_id: plan.id,
        descrizione: a.descrizione,
        tipo_azione: a.tipo_azione,
        data_scadenza: a.data_scadenza,
        ordine: idx
      }))

      const { error: actionsError } = await supabase
        .from('optimization_actions')
        .insert(azioniDaInserire)

      if (actionsError) {
        console.error('Errore creazione azioni:', actionsError)
        // Non blocchiamo, il piano è stato creato
      }
    }

    // Ricarica il piano con le azioni e i logs
    const { data: fullPlan } = await supabase
      .from('optimization_plans')
      .select(`*, optimization_actions (*), optimization_logs (*)`)
      .eq('id', plan.id)
      .single()

    return NextResponse.json({ plan: fullPlan })

  } catch (err) {
    console.error('Errore API optimization-plans POST:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/optimization-plans
 * Aggiorna un piano esistente
 */
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    // Campi aggiornabili
    const allowedFields = [
      'titolo', 'descrizione', 'obiettivo_risparmio', 'stato',
      'priorita', 'data_scadenza', 'data_completamento',
      'importo_post_ottimizzazione', 'risparmio_effettivo', 'note_esito'
    ]

    const updateData = {}
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field]
      }
    })

    // Se stato diventa 'completato', imposta data_completamento
    if (updates.stato === 'completato' && !updates.data_completamento) {
      updateData.data_completamento = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabase
      .from('optimization_plans')
      .update(updateData)
      .eq('id', id)
      .select(`*, optimization_actions (*), optimization_logs (*)`)
      .single()

    if (error) {
      console.error('Errore aggiornamento piano:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ plan: data })

  } catch (err) {
    console.error('Errore API optimization-plans PATCH:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/optimization-plans
 * Elimina un piano (e le sue azioni in cascade)
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const { error } = await supabase
      .from('optimization_plans')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Errore eliminazione piano:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Errore API optimization-plans DELETE:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
