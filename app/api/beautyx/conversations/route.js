import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Recupera conversazioni (escluse quelle eliminate)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centro_id = searchParams.get('centro_id')
    const attiva = searchParams.get('attiva')
    const include_deleted = searchParams.get('include_deleted') === 'true'

    if (!centro_id) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    let query = supabase
      .from('beautyx_conversations')
      .select('*')
      .eq('centro_id', centro_id)
      .order('data_ultimo_messaggio', { ascending: false })

    // Escludi conversazioni eliminate (soft-delete) a meno che non esplicitamente richiesto
    if (!include_deleted) {
      query = query.is('deleted_at', null)
    }

    if (attiva === 'true') {
      query = query.eq('attiva', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Errore GET conversations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ conversations: data || [] })
  } catch (error) {
    console.error('Errore GET conversations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Crea nuova conversazione
export async function POST(request) {
  try {
    const body = await request.json()
    const { centro_id, titolo, ultimo_contesto } = body

    if (!centro_id) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('beautyx_conversations')
      .insert({
        centro_id,
        titolo: titolo || 'Nuova conversazione',
        ultimo_contesto: ultimo_contesto || {},
        attiva: true
      })
      .select()
      .single()

    if (error) {
      console.error('Errore POST conversation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, conversation: data })
  } catch (error) {
    console.error('Errore POST conversation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - Aggiorna conversazione (include pin/unpin per HPA)
export async function PATCH(request) {
  try {
    const body = await request.json()
    const {
      id,
      titolo,
      ultimo_contesto,
      attiva,
      // Campi per pin (solo HPA)
      pinned_by_hpa,
      pinned_by,
      pinned_reason,
      is_hpa // Flag che indica se la richiesta viene da un HPA
    } = body

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const updates = {}
    if (titolo !== undefined) updates.titolo = titolo
    if (ultimo_contesto !== undefined) updates.ultimo_contesto = ultimo_contesto
    if (attiva !== undefined) updates.attiva = attiva

    // Gestione pin/unpin (solo per HPA)
    if (pinned_by_hpa !== undefined && is_hpa) {
      updates.pinned_by_hpa = pinned_by_hpa
      if (pinned_by_hpa) {
        updates.pinned_at = new Date().toISOString()
        updates.pinned_by = pinned_by || null
        updates.pinned_reason = pinned_reason || null
      } else {
        // Unpin: reset dei campi
        updates.pinned_at = null
        updates.pinned_by = null
        updates.pinned_reason = null
      }
    }

    const { data, error } = await supabase
      .from('beautyx_conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Errore PATCH conversation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, conversation: data })
  } catch (error) {
    console.error('Errore PATCH conversation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Elimina conversazione (soft-delete)
// L'utente può eliminare solo se la conversazione NON è pinnata da HPA
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const user_id = searchParams.get('user_id') // UUID dell'utente che elimina

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    // Prima verifica se la conversazione è pinnata
    const { data: conversation, error: fetchError } = await supabase
      .from('beautyx_conversations')
      .select('pinned_by_hpa')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Errore fetch conversation per DELETE:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Blocca eliminazione se pinnata da HPA
    if (conversation?.pinned_by_hpa) {
      return NextResponse.json({
        error: 'Questa conversazione è stata protetta da un professionista e non può essere eliminata',
        code: 'CONVERSATION_PINNED'
      }, { status: 403 })
    }

    // Soft-delete: imposta deleted_at invece di eliminare fisicamente
    const { data, error } = await supabase
      .from('beautyx_conversations')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user_id || null,
        attiva: false // Marca anche come non attiva
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Errore DELETE conversation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deleted: true })
  } catch (error) {
    console.error('Errore DELETE conversation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
