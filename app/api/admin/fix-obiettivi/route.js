import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/admin/fix-obiettivi
 * Corregge gli obiettivi di default: da "attivo" a "suggerito"
 * Da eseguire una sola volta
 */
export async function POST(request) {
  try {
    // Aggiorna tutti gli obiettivi attivi a suggerito
    const { data, error } = await supabase
      .from('obiettivi')
      .update({
        stato: 'suggerito',
        attivo: false,
        data_inizio: null
      })
      .eq('stato', 'attivo')
      .select('id, nome')

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Aggiornati ${data?.length || 0} obiettivi da "attivo" a "suggerito"`,
      obiettivi_aggiornati: data
    })
  } catch (error) {
    console.error('Errore fix obiettivi:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/fix-obiettivi
 * Mostra stato attuale degli obiettivi
 */
export async function GET(request) {
  try {
    const { data: attivi } = await supabase
      .from('obiettivi')
      .select('id, nome, stato')
      .eq('stato', 'attivo')

    const { data: suggeriti } = await supabase
      .from('obiettivi')
      .select('id, nome, stato')
      .eq('stato', 'suggerito')

    return NextResponse.json({
      attivi: attivi?.length || 0,
      suggeriti: suggeriti?.length || 0,
      dettaglio_attivi: attivi,
      dettaglio_suggeriti: suggeriti
    })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
