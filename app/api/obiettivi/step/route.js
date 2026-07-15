import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/obiettivi/step?obiettivo_id=xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const obiettivoId = searchParams.get('obiettivo_id')

    if (!obiettivoId) {
      return NextResponse.json({ error: 'obiettivo_id richiesto' }, { status: 400 })
    }

    const { data: steps, error } = await supabase
      .from('obiettivi_step')
      .select('*')
      .eq('obiettivo_id', obiettivoId)
      .order('ordine', { ascending: true })

    if (error) throw error

    return NextResponse.json({ steps: steps || [] })
  } catch (error) {
    console.error('Errore GET step:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/obiettivi/step
 */
export async function POST(request) {
  try {
    const body = await request.json()

    const { data: step, error } = await supabase
      .from('obiettivi_step')
      .insert(body)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ step })
  } catch (error) {
    console.error('Errore POST step:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PATCH /api/obiettivi/step
 */
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const { data: step, error } = await supabase
      .from('obiettivi_step')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ step })
  } catch (error) {
    console.error('Errore PATCH step:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
