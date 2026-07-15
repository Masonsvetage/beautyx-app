import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * POST /api/bank/movements/merge-categories
 * Unisce due categorie aggiornando tutti i movimenti dalla categoria sorgente alla categoria destinazione
 */
export async function POST(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { centro_id, source_category, target_category } = await request.json()

    if (!centro_id || !source_category || !target_category) {
      return NextResponse.json(
        { error: 'centro_id, source_category e target_category sono obbligatori' },
        { status: 400 }
      )
    }

    if (source_category === target_category) {
      return NextResponse.json(
        { error: 'La categoria sorgente e destinazione non possono essere uguali' },
        { status: 400 }
      )
    }

    // Aggiorna tutti i movimenti dalla categoria sorgente alla categoria destinazione
    const { data, error, count } = await supabase
      .from('bank_movements')
      .update({ categoria: target_category })
      .eq('centro_id', centro_id)
      .eq('categoria', source_category)
      .select()

    if (error) throw error

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      message: `${data?.length || 0} movimenti aggiornati da "${source_category}" a "${target_category}"`
    })

  } catch (error) {
    console.error('Errore unione categorie:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'unione delle categorie' },
      { status: 500 }
    )
  }
}
