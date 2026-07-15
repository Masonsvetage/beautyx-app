import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/obiettivi/storico?obiettivo_id=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const obiettivoId = searchParams.get('obiettivo_id')

    if (!obiettivoId) {
      return NextResponse.json({ error: 'obiettivo_id richiesto' }, { status: 400 })
    }

    const { data: storico, error } = await supabase
      .from('obiettivi_storico')
      .select('*')
      .eq('obiettivo_id', obiettivoId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ storico: storico || [] })
  } catch (error) {
    console.error('Errore GET storico:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
