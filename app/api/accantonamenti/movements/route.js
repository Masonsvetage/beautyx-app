import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const accantonamentoId = searchParams.get('accantonamento_id')

    if (!accantonamentoId) {
      return NextResponse.json({ error: 'accantonamento_id richiesto' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('accantonamento_movements')
      .select('*')
      .eq('accantonamento_id', accantonamentoId)
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ movements: data || [] })
  } catch (error) {
    console.error('Errore GET accantonamento movements:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const {
      accantonamento_id,
      bank_movement_id,
      tipo,
      importo,
      descrizione,
      data
    } = await request.json()

    if (!accantonamento_id || !tipo || !importo || !data) {
      return NextResponse.json(
        { error: 'accantonamento_id, tipo, importo e data richiesti' },
        { status: 400 })
    }

    // Inserisci movimento (il trigger aggiornerà automaticamente il saldo)
    const { data: movement, error } = await supabase
      .from('accantonamento_movements')
      .insert({
        accantonamento_id,
        bank_movement_id,
        tipo,
        importo: parseFloat(importo),
        descrizione,
        data
      })
      .select()
      .single()

    if (error) throw error

    // Recupera il saldo aggiornato
    const { data: accantonamento } = await supabase
      .from('accantonamenti')
      .select('saldo_attuale')
      .eq('id', accantonamento_id)
      .single()

    return NextResponse.json({
      success: true,
      movement,
      saldo_attuale: accantonamento?.saldo_attuale || 0
    })
  } catch (error) {
    console.error('Errore POST accantonamento movement:', error)
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

    // Recupera accantonamento_id prima di eliminare
    const { data: movement } = await supabase
      .from('accantonamento_movements')
      .select('accantonamento_id')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('accantonamento_movements')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Recupera il saldo aggiornato (il trigger lo ha ricalcolato)
    const { data: accantonamento } = await supabase
      .from('accantonamenti')
      .select('saldo_attuale')
      .eq('id', movement.accantonamento_id)
      .single()

    return NextResponse.json({
      success: true,
      saldo_attuale: accantonamento?.saldo_attuale || 0
    })
  } catch (error) {
    console.error('Errore DELETE accantonamento movement:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
