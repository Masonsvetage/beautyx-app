import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/registro/stats?centro_id=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Ritorna aggregati di registro_giornate per il periodo richiesto.
 * Usato da analytics per mostrare incasso operativo (Registro/Koibox).
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const centroId = searchParams.get('centro_id')
  const from     = searchParams.get('from')
  const to       = searchParams.get('to')

  if (!centroId) return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })

  const ownership = await verifyCentroOwnership(request, centroId)
  if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

  let query = admin
    .from('registro_giornate')
    .select('data, incasso_effettivo, spese_totali, n_clienti, n_servizi, source')
    .eq('centro_id', centroId)
    .order('data', { ascending: true })

  if (from) query = query.gte('data', from)
  if (to)   query = query.lte('data', to)

  const { data: righe, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!righe?.length) {
    return NextResponse.json({
      totale_incasso: 0,
      totale_spese:   0,
      n_giorni:       0,
      n_clienti:      0,
      media_giornaliera: 0,
      righe: [],
    })
  }

  const totale_incasso = righe.reduce((s, r) => s + (parseFloat(r.incasso_effettivo) || 0), 0)
  const totale_spese   = righe.reduce((s, r) => s + (parseFloat(r.spese_totali) || 0), 0)
  const n_clienti      = righe.reduce((s, r) => s + (r.n_clienti || 0), 0)
  const n_giorni       = righe.length

  return NextResponse.json({
    totale_incasso,
    totale_spese,
    n_giorni,
    n_clienti,
    media_giornaliera: n_giorni > 0 ? totale_incasso / n_giorni : 0,
    righe: righe.map(r => ({ data: r.data, incasso: r.incasso_effettivo, source: r.source })),
  })
}
