import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/optimization-logs
 * Recupera i log di un piano di ottimizzazione
 * Query params: plan_id (obbligatorio)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('plan_id')

    if (!planId) {
      return NextResponse.json({ error: 'plan_id richiesto' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('optimization_logs')
      .select('*')
      .eq('plan_id', planId)
      .order('data_attivita', { ascending: false })

    if (error) {
      console.error('Errore recupero logs:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ logs: data })

  } catch (err) {
    console.error('Errore API optimization-logs GET:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * POST /api/optimization-logs
 * Aggiunge un nuovo log a un piano
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { plan_id, data_attivita, descrizione, esito } = body

    if (!plan_id || !descrizione) {
      return NextResponse.json(
        { error: 'plan_id e descrizione sono richiesti' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('optimization_logs')
      .insert({
        plan_id,
        data_attivita: data_attivita || new Date().toISOString().split('T')[0],
        descrizione,
        esito: esito || null
      })
      .select()
      .single()

    if (error) {
      console.error('Errore creazione log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ log: data })

  } catch (err) {
    console.error('Errore API optimization-logs POST:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * PATCH /api/optimization-logs
 * Aggiorna un log esistente
 */
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, data_attivita, descrizione, esito } = body

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const updateData = {}
    if (data_attivita !== undefined) updateData.data_attivita = data_attivita
    if (descrizione !== undefined) updateData.descrizione = descrizione
    if (esito !== undefined) updateData.esito = esito

    const { data, error } = await supabase
      .from('optimization_logs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Errore aggiornamento log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ log: data })

  } catch (err) {
    console.error('Errore API optimization-logs PATCH:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/optimization-logs
 * Elimina un log
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const { error } = await supabase
      .from('optimization_logs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Errore eliminazione log:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Errore API optimization-logs DELETE:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
