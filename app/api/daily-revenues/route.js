import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * GET /api/daily-revenues?centro_id=xxx&data=2025-01-12
 * GET /api/daily-revenues?centro_id=xxx&from=2025-01-06&to=2025-01-12 (range)
 * Recupera incasso giornaliero o range di incassi
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const data = searchParams.get('data')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    if (!centroId) {
      return NextResponse.json(
        { error: 'centro_id è obbligatorio' },
        { status: 400 }
      )
    }

    // Se richiesto un range di date
    if (fromDate && toDate) {
      const [legacyRes, registroRes] = await Promise.all([
        supabase.from('daily_revenues').select('data, totale').eq('centro_id', centroId).gte('data', fromDate).lte('data', toDate),
        supabase.from('registro_giornate').select('data, incasso_effettivo').eq('centro_id', centroId).gte('data', fromDate).lte('data', toDate)
      ])

      // Merge: registro_giornate prende priorità su daily_revenues legacy
      const map = {}
      for (const r of (legacyRes.data || [])) {
        map[r.data] = { data: r.data, totale: r.totale }
      }
      for (const r of (registroRes.data || [])) {
        map[r.data] = { data: r.data, totale: r.incasso_effettivo }
      }
      const revenues = Object.values(map).sort((a, b) => a.data.localeCompare(b.data))

      return NextResponse.json({ revenues })
    }

    // Singola data
    const targetDate = data || new Date().toISOString().split('T')[0]

    // Controlla prima registro_giornate (BeautyX), poi daily_revenues (legacy)
    const { data: giornata } = await supabase
      .from('registro_giornate')
      .select('incasso_effettivo')
      .eq('centro_id', centroId)
      .eq('data', targetDate)
      .maybeSingle()

    if (giornata) {
      return NextResponse.json({ revenue: { totale: giornata.incasso_effettivo || 0 } })
    }

    const { data: revenue, error } = await supabase
      .from('daily_revenues')
      .select('*')
      .eq('centro_id', centroId)
      .eq('data', targetDate)
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({
      revenue: revenue || { pos: 0, contanti: 0, bonifici: 0, altro: 0, totale: 0 }
    })

  } catch (error) {
    console.error('Errore recupero incasso:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero dell\'incasso' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/daily-revenues
 * Salva o aggiorna incasso giornaliero
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { centro_id, data, pos, contanti, bonifici, altro, note } = body

    if (!centro_id) {
      return NextResponse.json(
        { error: 'centro_id è obbligatorio' },
        { status: 400 }
      )
    }

    const targetDate = data || new Date().toISOString().split('T')[0]
    const totale = (parseFloat(pos) || 0) +
                   (parseFloat(contanti) || 0) +
                   (parseFloat(bonifici) || 0) +
                   (parseFloat(altro) || 0)

    // Upsert (insert o update se esiste)
    const { data: revenue, error } = await supabase
      .from('daily_revenues')
      .upsert({
        centro_id,
        data: targetDate,
        pos: parseFloat(pos) || 0,
        contanti: parseFloat(contanti) || 0,
        bonifici: parseFloat(bonifici) || 0,
        altro: parseFloat(altro) || 0,
        totale,
        note: note || null
      }, {
        onConflict: 'centro_id,data'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      revenue
    })

  } catch (error) {
    console.error('Errore salvataggio incasso:', error)
    return NextResponse.json(
      { error: 'Errore durante il salvataggio dell\'incasso' },
      { status: 500 }
    )
  }
}
