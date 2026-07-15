import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/obiettivi/valutazione?obiettivo_id=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const obiettivoId = searchParams.get('obiettivo_id')

    if (!obiettivoId) {
      return NextResponse.json({ error: 'obiettivo_id richiesto' }, { status: 400 })
    }

    const { data: valutazioni, error } = await supabase
      .from('obiettivi_valutazioni')
      .select('*')
      .eq('obiettivo_id', obiettivoId)
      .order('data_valutazione', { ascending: false })

    if (error) throw error

    return NextResponse.json({ valutazioni: valutazioni || [] })
  } catch (error) {
    console.error('Errore GET valutazioni:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/obiettivi/valutazione
 */
export async function POST(request) {
  try {
    const body = await request.json()

    const { data: valutazione, error } = await supabase
      .from('obiettivi_valutazioni')
      .insert({
        ...body,
        data_valutazione: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ valutazione })
  } catch (error) {
    console.error('Errore POST valutazione:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
