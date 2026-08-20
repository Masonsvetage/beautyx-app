import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * POST /api/bank/movements/dedup?centro_id=xxx
 * Rimuove movimenti duplicati mantenendo solo il primo per ogni firma
 */
export async function POST(request) {
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

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    console.log('[DEDUP] 🔍 Inizio ricerca duplicati...')

    // Recupera TUTTI i movimenti
    const { data: allMovements, error: fetchError } = await supabase
      .from('bank_movements')
      .select('*')
      .eq('centro_id', centroId)
      .order('created_at', { ascending: true }) // Prima i più vecchi

    if (fetchError) throw fetchError

    console.log(`[DEDUP] Analizzando ${allMovements.length} movimenti...`)

    // Trova duplicati usando firma: data+importo+tipo+descrizione(50 char)
    const seen = new Map()
    const duplicates = []

    allMovements.forEach(mov => {
      const descShort = (mov.descrizione || '').substring(0, 50).trim()
      const signature = `${mov.data}|${mov.importo}|${mov.tipo}|${descShort}`

      if (seen.has(signature)) {
        // Duplicato! Salva ID da cancellare
        duplicates.push({
          id: mov.id,
          data: mov.data,
          importo: mov.importo,
          tipo: mov.tipo,
          descrizione: mov.descrizione?.substring(0, 60)
        })
      } else {
        // Primo con questa firma, mantieni
        seen.set(signature, mov.id)
      }
    })

    console.log(`[DEDUP] ❌ Trovati ${duplicates.length} duplicati`)

    if (duplicates.length === 0) {
      return NextResponse.json({
        success: true,
        duplicates_found: 0,
        deleted: 0,
        message: 'Nessun duplicato trovato'
      })
    }

    // Log primi 10 duplicati
    console.log('[DEDUP] Esempi duplicati da rimuovere:')
    duplicates.slice(0, 10).forEach(d => {
      console.log(`  - ${d.data} ${d.importo}€ ${d.tipo}: ${d.descrizione}`)
    })

    // Cancella i duplicati
    const idsToDelete = duplicates.map(d => d.id)

    const { error: deleteError } = await supabase
      .from('bank_movements')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) throw deleteError

    console.log(`[DEDUP] ✅ Cancellati ${duplicates.length} movimenti duplicati`)

    return NextResponse.json({
      success: true,
      duplicates_found: duplicates.length,
      deleted: duplicates.length,
      kept: seen.size,
      message: `${duplicates.length} duplicati rimossi, ${seen.size} movimenti unici mantenuti`,
      examples: duplicates.slice(0, 10)
    })

  } catch (error) {
    console.error('Errore deduplicazione:', error)
    return NextResponse.json(
      {
        error: 'Errore durante la deduplicazione',
        details: error.message
      },
      { status: 500 }
    )
  }
}
