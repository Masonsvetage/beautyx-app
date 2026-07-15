import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * POST /api/migrations/add-manual-flag
 * Aggiunge il campo categorized_manually alla tabella bank_movements
 */
export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Esegui la query SQL tramite rpc se disponibile
    const sql = `
      ALTER TABLE bank_movements
      ADD COLUMN IF NOT EXISTS categorized_manually BOOLEAN DEFAULT FALSE;
    `

    // Tentativo di eseguire tramite query raw
    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      // Se RPC non funziona, restituisci istruzioni
      return NextResponse.json({
        success: false,
        message: 'Non posso eseguire ALTER TABLE via API',
        instructions: 'Esegui questa query nel Supabase SQL Editor',
        sql: sql
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Campo categorized_manually aggiunto con successo'
    })

  } catch (error) {
    console.error('Errore migration:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      instructions: 'Esegui manualmente: ALTER TABLE bank_movements ADD COLUMN IF NOT EXISTS categorized_manually BOOLEAN DEFAULT FALSE;'
    }, { status: 500 })
  }
}
