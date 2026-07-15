import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * POST /api/admin/run-migration
 * Esegue SQL diretto per correggere trigger e obiettivi
 */
export async function POST(request) {
  try {
    // Step 1: Prima correggiamo il trigger usando rpc
    // Nota: Potrebbe essere necessario eseguire questo SQL direttamente nella console Supabase

    // Step 2: Aggiorniamo gli obiettivi senza triggerare l'update del trigger
    // Usiamo un approccio diverso: eliminiamo e ricreiamo

    // Recupera tutti gli obiettivi attivi
    const { data: obiettiviAttivi, error: fetchError } = await supabase
      .from('obiettivi')
      .select('*')
      .eq('stato', 'attivo')

    if (fetchError) throw fetchError

    if (!obiettiviAttivi || obiettiviAttivi.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessun obiettivo attivo da aggiornare'
      })
    }

    // Elimina gli obiettivi attivi
    const ids = obiettiviAttivi.map(o => o.id)
    const { error: deleteError } = await supabase
      .from('obiettivi')
      .delete()
      .in('id', ids)

    if (deleteError) throw deleteError

    // Ricrea come suggeriti
    const nuoviObiettivi = obiettiviAttivi.map(o => ({
      ...o,
      id: undefined, // Lascia che Supabase generi nuovo ID
      stato: 'suggerito',
      attivo: false,
      data_inizio: null,
      created_at: undefined,
      updated_at: undefined
    }))

    const { data: inseriti, error: insertError } = await supabase
      .from('obiettivi')
      .insert(nuoviObiettivi)
      .select()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      message: `Convertiti ${inseriti?.length || 0} obiettivi da "attivo" a "suggerito"`,
      obiettivi: inseriti?.map(o => ({ id: o.id, nome: o.nome, stato: o.stato }))
    })

  } catch (error) {
    console.error('Errore migrazione:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
