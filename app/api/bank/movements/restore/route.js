import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * POST /api/bank/movements/restore?backup_id=xxx
 * Ripristina movimenti da un backup
 */
export async function POST(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { searchParams } = new URL(request.url)
    const backupId = searchParams.get('backup_id')

    if (!backupId) {
      return NextResponse.json(
        { error: 'backup_id è obbligatorio' },
        { status: 400 }
      )
    }

    console.log(`[RESTORE] 🔄 Inizio ripristino da backup ${backupId}`)

    // 1. Recupera il backup
    const { data: backup, error: fetchError } = await supabase
      .from('bank_movements_backups')
      .select('*')
      .eq('id', backupId)
      .single()

    if (fetchError || !backup) {
      console.error('[RESTORE] ❌ Backup non trovato:', fetchError)
      return NextResponse.json(
        { error: 'Backup non trovato' },
        { status: 404 }
      )
    }

    if (backup.restored) {
      console.warn(`[RESTORE] ⚠️  Backup già ripristinato il ${backup.restored_at}`)
      return NextResponse.json({
        success: false,
        error: 'Questo backup è già stato ripristinato',
        restored_at: backup.restored_at
      }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, backup.centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const movementsToRestore = backup.movements_data
    const count = movementsToRestore.length

    console.log(`[RESTORE] 📦 Backup trovato: ${count} movimenti dal ${backup.date_from} al ${backup.date_to}`)

    // 2. Verifica se esistono già movimenti in quel periodo
    const { data: existingMovements, error: checkError } = await supabase
      .from('bank_movements')
      .select('id, data')
      .eq('centro_id', backup.centro_id)
      .gte('data', backup.date_from)
      .lte('data', backup.date_to)

    if (checkError) throw checkError

    if (existingMovements && existingMovements.length > 0) {
      console.warn(`[RESTORE] ⚠️  Trovati ${existingMovements.length} movimenti già presenti nel periodo`)
      return NextResponse.json({
        success: false,
        error: `Esistono già ${existingMovements.length} movimenti nel periodo ${backup.date_from} - ${backup.date_to}`,
        suggestion: 'Cancella prima i movimenti esistenti o usa force=true per sovrascrivere'
      }, { status: 409 })
    }

    // 3. Prepara i movimenti per l'insert (rimuovi ID e created_at per rigenerare)
    const movementsClean = movementsToRestore.map(mov => {
      const { id, created_at, ...rest } = mov
      return rest
    })

    console.log(`[RESTORE] 💾 Inserimento ${movementsClean.length} movimenti...`)

    // 4. Inserisci i movimenti
    const { data: restoredMovements, error: insertError } = await supabase
      .from('bank_movements')
      .insert(movementsClean)
      .select()

    if (insertError) {
      console.error('[RESTORE] ❌ Errore inserimento:', insertError)
      throw insertError
    }

    // 5. Marca il backup come ripristinato
    const { error: updateError } = await supabase
      .from('bank_movements_backups')
      .update({
        restored: true,
        restored_at: new Date().toISOString()
      })
      .eq('id', backupId)

    if (updateError) {
      console.warn('[RESTORE] ⚠️  Errore aggiornamento stato backup:', updateError)
    }

    console.log(`[RESTORE] ✅ Ripristinati ${restoredMovements.length} movimenti`)

    return NextResponse.json({
      success: true,
      restored_count: restoredMovements.length,
      backup_id: backupId,
      period: {
        from: backup.date_from,
        to: backup.date_to
      },
      message: `${restoredMovements.length} movimenti ripristinati con successo`
    })

  } catch (error) {
    console.error('Errore ripristino movimenti:', error)
    return NextResponse.json(
      {
        error: 'Errore durante il ripristino dei movimenti',
        details: error.message
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/bank/movements/restore?centro_id=xxx
 * Lista backup disponibili
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

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data: backups, error } = await supabase
      .from('bank_movements_backups')
      .select('id, backup_type, reason, date_from, date_to, movements_count, created_at, restored, restored_at')
      .eq('centro_id', centroId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      backups: backups || [],
      count: backups?.length || 0
    })

  } catch (error) {
    console.error('Errore recupero backups:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero dei backup' },
      { status: 500 }
    )
  }
}
