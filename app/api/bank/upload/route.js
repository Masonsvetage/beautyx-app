import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * Estrae il nome del fornitore dalla descrizione
 */
function extractVendorName(descrizione, causale) {
  if (!descrizione) return causale || 'Non specificato'

  let vendor = descrizione.trim().replace(/\s+/g, ' ')

  const patternsToRemove = [
    /\d{2}\/\d{2}\/\d{2,4}/g,
    /\d{6,}/g,
    /KEY:[^\s]+/gi,
    /SCT:[^\s]+/gi,
    /V\/ORDINE/gi,
    /DESCR\.OPERAZIONE/gi,
    /IDENTIFICATIVO/gi,
    /DEL \d{2}\/\d{2}\/\d{2}/gi,
    /<\*>/g,
    /\s{2,}/g
  ]

  patternsToRemove.forEach(pattern => {
    vendor = vendor.replace(pattern, ' ')
  })

  const words = vendor.trim().split(/\s+/)
  const significantWords = []

  for (let i = 0; i < Math.min(3, words.length); i++) {
    const word = words[i]
    if (word.length > 2 && !word.match(/^\d+$/)) {
      significantWords.push(word)
    }
  }

  return significantWords.length > 0
    ? significantWords.join(' ').substring(0, 50)
    : causale || 'Non specificato'
}

/**
 * Converte data formato italiano in ISO
 */
function parseItalianDate(dateStr) {
  if (!dateStr) return null

  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [day, month, year] = parts
    const fullYear = year.length === 2 ? '20' + year : year
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return null
}

/**
 * POST /api/bank/upload
 * Upload e parsing CSV bancario
 */
export async function POST(request) {
  const startTime = Date.now()

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const formData = await request.formData()
    const file = formData.get('file')
    const centroId = formData.get('centro_id')

    if (!file || !centroId) {
      return NextResponse.json(
        { error: 'File e centro_id sono obbligatori' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    console.log(`[CSV IMPORT] 📁 Inizio import file: ${file.name}`)

    // Leggi il file CSV
    const text = await file.text()
    const lines = text.split('\n')

    // Trova la riga con l'intestazione "Data Op."
    let headerIndex = -1
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Data Op.')) {
        headerIndex = i
        break
      }
    }

    if (headerIndex === -1) {
      return NextResponse.json(
        { error: 'Intestazione "Data Op." non trovata nel file CSV' },
        { status: 400 }
      )
    }

    // Processa le righe
    const movements = []
    const vendors = new Map()

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const fields = line.split(';')
      if (fields.length < 5) continue

      const dataOp = fields[0]
      const causale = fields[2]
      const descrizione = fields[3]
      const importoStr = fields[4]

      if (!dataOp || !importoStr) continue

      const data = parseItalianDate(dataOp)
      if (!data) continue

      // Processa importo
      // Rimuovi virgolette singole/doppie che possono essere presenti
      let cleanImporto = importoStr.trim()
        .replace(/['"]/g, '')  // Rimuovi virgolette
        .replace(/\s+/g, '')   // Rimuovi spazi
        .replace(/\./g, '')    // Rimuovi separatori migliaia
        .replace(',', '.')     // Decimale italiano -> punto

      let tipo = 'entrata'
      if (cleanImporto.startsWith('-')) {
        tipo = 'uscita'
        cleanImporto = cleanImporto.substring(1)
      } else if (cleanImporto.endsWith('-')) {
        // Formato italiano: "1234,56-" per negativo
        tipo = 'uscita'
        cleanImporto = cleanImporto.slice(0, -1)
      }

      const importo = parseFloat(cleanImporto)
      if (isNaN(importo) || importo === 0) continue

      // Log per debug (prime 5 righe)
      if (movements.length < 5) {
        console.log(`[CSV DEBUG] Riga ${i}:`, {
          data,
          causale,
          importoStr_originale: importoStr,
          cleanImporto,
          tipo,
          importo_finale: importo
        })
      }

      // Estrai vendor
      const vendor = extractVendorName(descrizione, causale)
      const vendorKey = vendor.toLowerCase().trim()

      // Aggiungi alla mappa dei vendor
      if (!vendors.has(vendorKey)) {
        vendors.set(vendorKey, {
          vendor_key: vendorKey,
          vendor_display: vendor,
          count: 0,
          examples: []
        })
      }

      const vendorInfo = vendors.get(vendorKey)
      vendorInfo.count++
      if (vendorInfo.examples.length < 3) {
        vendorInfo.examples.push(descrizione?.substring(0, 100))
      }

      movements.push({
        centro_id: centroId,
        data,
        tipo,
        importo,
        categoria: causale || 'Non specificato',
        descrizione: descrizione || '',
        vendor_key: vendorKey
      })
    }

    // Recupera i vendor mappings esistenti
    const { data: existingMappings } = await supabase
      .from('vendor_mappings')
      .select('vendor_key, categories(nome)')
      .eq('centro_id', centroId)

    const mappingMap = new Map()
    existingMappings?.forEach(m => {
      mappingMap.set(m.vendor_key, m.categories?.nome || null)
    })

    // Applica le categorie ai movimenti
    const categorizedMovements = movements.map(mov => ({
      ...mov,
      categoria: mappingMap.get(mov.vendor_key) || mov.categoria,
      is_categorized: mappingMap.has(mov.vendor_key)
    }))

    // Statistiche
    const uniqueVendors = Array.from(vendors.values())
    const uncategorizedVendors = uniqueVendors.filter(v => !mappingMap.has(v.vendor_key))

    // Calcola statistiche entrate/uscite e periodo
    const entrateCount = movements.filter(m => m.tipo === 'entrata').length
    const usciteCount = movements.filter(m => m.tipo === 'uscita').length
    const dates = movements.map(m => m.data).sort()
    const dateFrom = dates[0] || null
    const dateTo = dates[dates.length - 1] || null
    const processingTime = Date.now() - startTime

    console.log(`[CSV IMPORT] Statistiche:`, {
      totale_movimenti: movements.length,
      entrate: entrateCount,
      uscite: usciteCount,
      fornitori_unici: uniqueVendors.length,
      periodo: `${dateFrom} → ${dateTo}`,
      tempo_elaborazione: `${processingTime}ms`
    })

    // Salva log import per audit trail
    const { error: logError } = await supabase
      .from('csv_import_logs')
      .insert({
        centro_id: centroId,
        filename: file.name,
        date_from: dateFrom,
        date_to: dateTo,
        total_movements: movements.length,
        entrate_count: entrateCount,
        uscite_count: usciteCount,
        categorized_count: categorizedMovements.filter(m => m.is_categorized).length,
        uncategorized_count: categorizedMovements.filter(m => !m.is_categorized).length,
        duplicates_skipped: 0, // Verrà aggiornato dal POST movements
        new_inserted: 0,
        success: true,
        processing_time_ms: processingTime,
        metadata: {
          unique_vendors: uniqueVendors.length,
          uncategorized_vendors: uncategorizedVendors.length
        }
      })

    if (logError) {
      console.warn('[CSV IMPORT] ⚠️  Errore salvataggio log:', logError.message)
      // Non bloccare l'import se il log fallisce
    } else {
      console.log('[CSV IMPORT] ✅ Log salvato con successo')
    }

    return NextResponse.json({
      success: true,
      movements: categorizedMovements,
      stats: {
        total_movements: movements.length,
        entrate: entrateCount,
        uscite: usciteCount,
        categorized: categorizedMovements.filter(m => m.is_categorized).length,
        uncategorized: categorizedMovements.filter(m => !m.is_categorized).length,
        unique_vendors: uniqueVendors.length,
        uncategorized_vendors: uncategorizedVendors.length,
        period: { from: dateFrom, to: dateTo }
      },
      uncategorized_vendors: uncategorizedVendors
    })

  } catch (error) {
    console.error('Errore upload CSV:', error)
    return NextResponse.json(
      { error: 'Errore durante il caricamento del file' },
      { status: 500 }
    )
  }
}
