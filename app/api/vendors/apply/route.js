import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * POST /api/vendors/apply
 * Applica i pattern dei fornitori ai movimenti non categorizzati o mal categorizzati
 */
export async function POST(request) {
  try {
    const { centro_id } = await request.json()

    if (!centro_id) {
      return NextResponse.json({ error: 'centro_id è obbligatorio' }, { status: 400 })
    }

    // Carica tutti i fornitori del centro
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('*')
      .eq('centro_id', centro_id)

    if (vendorsError) throw vendorsError

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessuna regola configurata',
        updated: 0
      })
    }

    // Carica tutti i movimenti del centro
    const { data: movements, error: movementsError } = await supabase
      .from('bank_movements')
      .select('*')
      .eq('centro_id', centro_id)

    if (movementsError) throw movementsError

    let updatedCount = 0
    const updates = []

    // Per ogni movimento, verifica se corrisponde a un pattern di fornitore
    for (const movement of movements) {
      // Salta i movimenti categorizzati manualmente per non sovrascrivere le correzioni dell'utente
      if (movement.categorized_manually === true) {
        continue
      }

      const descrizione = movement.descrizione?.toLowerCase() || ''

      for (const vendor of vendors) {
        // Supporta pattern multipli separati da virgola o punto e virgola
        const patterns = vendor.pattern_match
          .toLowerCase()
          .split(/[;,]/)
          .map(p => p.trim())
          .filter(p => p.length > 0)

        // Verifica se uno dei pattern matcha
        let matched = false
        for (const pattern of patterns) {
          if (descrizione.includes(pattern)) {
            matched = true
            break
          }
        }

        if (matched) {
          // Aggiorna solo se la categoria è diversa
          if (movement.categoria !== vendor.categoria) {
            updates.push({
              id: movement.id,
              categoria: vendor.categoria
            })
            updatedCount++
          }
          break // Usa il primo match trovato
        }
      }
    }

    // Applica gli aggiornamenti in batch
    if (updates.length > 0) {
      for (const update of updates) {
        await supabase
          .from('bank_movements')
          .update({ categoria: update.categoria })
          .eq('id', update.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `${updatedCount} movimenti ricategorizzati con successo`,
      updated: updatedCount
    })

  } catch (error) {
    console.error('Errore applicazione fornitori:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
