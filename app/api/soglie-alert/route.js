import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { SOGLIE_DEFAULT } from '@/lib/analytics-alerts'
import { verifyCentroOwnership, verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/soglie-alert?centro_id=xxx
 * Ritorna le soglie per un centro (merge di default + personalizzate)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')

    if (!centroId) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // Carica soglie personalizzate dal database
    const { data: soglieDB, error } = await supabase
      .from('soglie_alert')
      .select('*')
      .eq('centro_id', centroId)

    if (error) {
      console.error('Errore caricamento soglie:', error)
      // Se la tabella non esiste ancora, ritorna solo i default
      return NextResponse.json({
        soglie: SOGLIE_DEFAULT,
        personalizzate: [],
        usaDefault: true
      })
    }

    // Costruisci oggetto soglie finale (default + override utente)
    const soglieMerged = {
      maxSuCosti: { ...SOGLIE_DEFAULT.maxSuCosti },
      maxSuFatturato: { ...SOGLIE_DEFAULT.maxSuFatturato },
      minMargine: SOGLIE_DEFAULT.minMargine,
      maxCrescitaMensile: SOGLIE_DEFAULT.maxCrescitaMensile
    }

    // Applica personalizzazioni
    soglieDB?.forEach(s => {
      if (s.usa_default) return // Ignora se usa default

      if (s.tipo_soglia === 'costi') {
        if (s.categoria) {
          soglieMerged.maxSuCosti[s.categoria] = parseFloat(s.valore)
        } else {
          soglieMerged.maxSuCosti.default = parseFloat(s.valore)
        }
      } else if (s.tipo_soglia === 'fatturato') {
        if (s.categoria) {
          soglieMerged.maxSuFatturato[s.categoria] = parseFloat(s.valore)
        } else {
          soglieMerged.maxSuFatturato.default = parseFloat(s.valore)
        }
      } else if (s.tipo_soglia === 'margine') {
        soglieMerged.minMargine = parseFloat(s.valore)
      } else if (s.tipo_soglia === 'crescita') {
        soglieMerged.maxCrescitaMensile = parseFloat(s.valore)
      }
    })

    return NextResponse.json({
      soglie: soglieMerged,
      soglieDefault: SOGLIE_DEFAULT,
      personalizzate: soglieDB || [],
      usaDefault: !soglieDB || soglieDB.length === 0
    })

  } catch (error) {
    console.error('Errore API soglie:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST /api/soglie-alert
 * Salva o aggiorna una soglia personalizzata
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { centro_id, tipo_soglia, categoria, valore, usa_default } = body

    if (!centro_id || !tipo_soglia) {
      return NextResponse.json(
        { error: 'centro_id e tipo_soglia richiesti' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // Upsert: inserisci o aggiorna
    const { data, error } = await supabase
      .from('soglie_alert')
      .upsert({
        centro_id,
        tipo_soglia,
        categoria: categoria || null,
        valore: valore || 0,
        usa_default: usa_default || false
      }, {
        onConflict: 'centro_id,tipo_soglia,categoria'
      })
      .select()

    if (error) {
      console.error('Errore salvataggio soglia:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, soglia: data })

  } catch (error) {
    console.error('Errore API soglie POST:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/soglie-alert?id=xxx
 * Elimina una soglia personalizzata (torna al default)
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const centroId = searchParams.get('centro_id')
    const tipoSoglia = searchParams.get('tipo_soglia')
    const categoria = searchParams.get('categoria')

    if (id) {
      // Elimina per ID
      const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'soglie_alert', id })
      if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

      const { error } = await supabase
        .from('soglie_alert')
        .delete()
        .eq('id', id)

      if (error) throw error
    } else if (centroId && tipoSoglia) {
      const ownership = await verifyCentroOwnership(request, centroId)
      if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

      // Elimina per centro + tipo + categoria
      let query = supabase
        .from('soglie_alert')
        .delete()
        .eq('centro_id', centroId)
        .eq('tipo_soglia', tipoSoglia)

      if (categoria) {
        query = query.eq('categoria', categoria)
      } else {
        query = query.is('categoria', null)
      }

      const { error } = await query
      if (error) throw error
    } else {
      return NextResponse.json(
        { error: 'Specificare id oppure centro_id + tipo_soglia' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Errore API soglie DELETE:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
