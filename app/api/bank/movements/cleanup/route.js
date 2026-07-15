import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * DELETE /api/bank/movements/cleanup?centro_id=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Cancella movimenti in un periodo specifico (per re-import)
 */
export async function DELETE(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const reason = searchParams.get('reason') || 'Cleanup manuale'

    if (!centroId || !fromDate || !toDate) {
      return NextResponse.json(
        { error: 'centro_id, from e to sono obbligatori' },
        { status: 400 }
      )
    }

    console.log(`[CLEANUP] 🔄 Inizio cancellazione movimenti da ${fromDate} a ${toDate}`)

    // 1. BACKUP: Recupera i movimenti che verranno cancellati
    const { data: movementsToDelete, error: fetchError } = await supabase
      .from('bank_movements')
      .select('*')
      .eq('centro_id', centroId)
      .gte('data', fromDate)
      .lte('data', toDate)

    if (fetchError) throw fetchError

    const count = movementsToDelete?.length || 0

    if (count === 0) {
      console.log(`[CLEANUP] ℹ️  Nessun movimento da cancellare nel periodo`)
      return NextResponse.json({
        success: true,
        deleted_count: 0,
        backup_id: null,
        message: 'Nessun movimento trovato nel periodo specificato'
      })
    }

    console.log(`[CLEANUP] 📦 Trovati ${count} movimenti - Creazione backup...`)

    // 2. SALVA BACKUP
    const { data: backup, error: backupError } = await supabase
      .from('bank_movements_backups')
      .insert({
        centro_id: centroId,
        backup_type: 'pre_cleanup',
        reason,
        date_from: fromDate,
        date_to: toDate,
        movements_count: count,
        movements_data: movementsToDelete,
        metadata: {
          cleanup_timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent')
        }
      })
      .select()
      .single()

    if (backupError) {
      console.error('[CLEANUP] ❌ Errore creazione backup:', backupError)
      // Non bloccare la cancellazione se il backup fallisce, ma avvisa
      console.warn('[CLEANUP] ⚠️  Procedura backup fallita, continuo comunque')
    } else {
      console.log(`[CLEANUP] ✅ Backup salvato con ID: ${backup.id}`)
    }

    // 3. CANCELLA i movimenti
    const { error: deleteError } = await supabase
      .from('bank_movements')
      .delete()
      .eq('centro_id', centroId)
      .gte('data', fromDate)
      .lte('data', toDate)

    if (deleteError) throw deleteError

    console.log(`[CLEANUP] ✅ Cancellati ${count} movimenti`)
    console.log(`[CLEANUP] 💾 Backup disponibile per ripristino: ${backup?.id || 'N/A'}`)

    return NextResponse.json({
      success: true,
      deleted_count: count,
      backup_id: backup?.id || null,
      backup_created: !!backup,
      message: `${count} movimenti cancellati dal ${fromDate} al ${toDate}`,
      restore_info: backup ? `Puoi ripristinare con: POST /api/bank/movements/restore?backup_id=${backup.id}` : null
    })

  } catch (error) {
    console.error('Errore cleanup movimenti:', error)
    return NextResponse.json(
      {
        error: 'Errore durante la cancellazione dei movimenti',
        details: error.message
      },
      { status: 500 }
    )
  }
}
