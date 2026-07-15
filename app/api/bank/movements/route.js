import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * GET /api/bank/movements?centro_id=xxx
 * Recupera tutti i movimenti di un centro
 */
export async function GET(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')

    if (!centroId) {
      return NextResponse.json(
        { error: 'centro_id è obbligatorio' },
        { status: 400 }
      )
    }

    // Supabase ha limite default 1000 righe che non può essere aumentato facilmente
    // Recuperiamo TUTTI i movimenti con paginazione automatica
    console.log('[MOVEMENTS API] Recupero movimenti con paginazione...')

    const PAGE_SIZE = 1000
    let allMovements = []
    let page = 0
    let hasMore = true

    while (hasMore) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data: pageData, error: pageError } = await supabase
        .from('bank_movements')
        .select('*')
        .eq('centro_id', centroId)
        .order('data', { ascending: false })
        .range(from, to)

      if (pageError) throw pageError

      if (pageData && pageData.length > 0) {
        allMovements = allMovements.concat(pageData)
        console.log(`[MOVEMENTS API] Pagina ${page + 1}: ${pageData.length} movimenti (totale: ${allMovements.length})`)
        page++
        hasMore = pageData.length === PAGE_SIZE // Se meno di PAGE_SIZE, è l'ultima pagina
      } else {
        hasMore = false
      }
    }

    console.log(`[MOVEMENTS API] ✅ Recuperati ${allMovements.length} movimenti totali`)

    return NextResponse.json({
      movements: allMovements,
      total_count: allMovements.length,
      returned_count: allMovements.length,
      pages_fetched: page
    })

  } catch (error) {
    console.error('Errore recupero movimenti:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero dei movimenti' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bank/movements
 * Salva movimenti importati
 */
export async function POST(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { movements } = await request.json()

    if (!movements || !Array.isArray(movements)) {
      return NextResponse.json(
        { error: 'movements array è obbligatorio' },
        { status: 400 }
      )
    }

    const centroId = movements[0]?.centro_id
    if (!centroId) {
      return NextResponse.json(
        { error: 'centro_id mancante nei movimenti' },
        { status: 400 }
      )
    }

    // Recupera movimenti esistenti per evitare duplicati
    // Usa firma completa: data+importo+tipo+descrizione_parziale
    const { data: existingMovements } = await supabase
      .from('bank_movements')
      .select('data, importo, tipo, descrizione')
      .eq('centro_id', centroId)

    const existingSignatures = new Set(
      existingMovements?.map(m => {
        // Usa primi 50 caratteri della descrizione per distinguere transazioni simili
        const descShort = (m.descrizione || '').substring(0, 50).trim()
        return `${m.data}|${m.importo}|${m.tipo}|${descShort}`
      }) || []
    )

    // Rimuovi il campo vendor_key e is_categorized prima di salvare
    const cleanMovements = movements.map(({ vendor_key, is_categorized, ...mov }) => mov)

    // Filtra movimenti duplicati usando la stessa firma
    const newMovements = cleanMovements.filter(m => {
      const descShort = (m.descrizione || '').substring(0, 50).trim()
      const signature = `${m.data}|${m.importo}|${m.tipo}|${descShort}`
      return !existingSignatures.has(signature)
    })

    if (newMovements.length === 0) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        skipped: movements.length,
        message: 'Tutti i movimenti erano già presenti nel database'
      })
    }

    // Inserisci solo movimenti nuovi
    const { data, error } = await supabase
      .from('bank_movements')
      .insert(newMovements)
      .select()

    if (error) throw error

    const skippedCount = movements.length - newMovements.length

    return NextResponse.json({
      success: true,
      inserted: data.length,
      skipped: skippedCount,
      message: skippedCount > 0
        ? `${data.length} movimenti nuovi inseriti, ${skippedCount} duplicati saltati`
        : `${data.length} movimenti inseriti con successo`
    })

  } catch (error) {
    console.error('Errore salvataggio movimenti:', error)
    return NextResponse.json(
      {
        error: 'Errore durante il salvataggio dei movimenti',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/bank/movements
 * Aggiorna la categoria di un movimento
 */
export async function PATCH(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { id, categoria } = await request.json()

    if (!id || !categoria) {
      return NextResponse.json(
        { error: 'id e categoria sono obbligatori' },
        { status: 400 }
      )
    }

    // Imposta categorized_manually = true per proteggere questa modifica
    // dalle future applicazioni automatiche delle regole
    const { data, error } = await supabase
      .from('bank_movements')
      .update({
        categoria,
        categorized_manually: true
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      movement: data
    })

  } catch (error) {
    console.error('Errore aggiornamento movimento:', error)
    return NextResponse.json(
      { error: 'Errore durante l\'aggiornamento del movimento' },
      { status: 500 }
    )
  }
}
