import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getKoiboxMovimientosCaja, getKoiboxVentas } from '@/lib/koibox/apiClient'

const ALLOWED_ROLES = ['admin', 'hpa', 'titolare', 'direttore', 'amministrativo']

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function getAuthorizedUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin
    .from('user_profiles')
    .select('ruolo_livello, centro_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile || !ALLOWED_ROLES.includes(profile.ruolo_livello) || !profile.centro_id) return null
  return { user, profile }
}

/**
 * GET /api/user/koibox/diagnostic
 * Mostra:
 * 1. Raw delle ultime 5 ventas dall'API Koibox (struttura campi reale)
 * 2. Breakdown per metodo in koibox_casse (ultimi 30 gg)
 * 3. Breakdown per metodo in registro_pagamenti (ultimi 30 gg)
 */
export async function GET() {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const centroId = auth.profile.centro_id
  const oggi = new Date()
  const fmtDate = d => d.toISOString().split('T')[0]
  const trenta = fmtDate(new Date(oggi.getTime() - 30 * 86400000))
  const oggiStr = fmtDate(oggi)

  // 1a. Raw /ventas/ — senza filtri data (Koibox ignora i filtri e restituisce solo recenti)
  // Fetch senza date per garantire di avere dati reali e poter ispezionare i campi
  let rawVentas = null
  let rawVentasError = null
  try {
    const data = await getKoiboxVentas(centroId, { page: 1, limit: 5 })
    const items = data.results || (Array.isArray(data) ? data : [])
    const giorni = [...new Set(items.map(i => String(i.fecha || i.date || '').substring(0, 10)).filter(Boolean))]
    rawVentas = {
      endpoint: '/ventas/ (senza filtri data — Koibox restituisce sempre solo i dati recenti)',
      count_totale: data.count || items.length,
      has_next: !!data.next,
      giorni_nel_campione: giorni,
      sample: items.slice(0, 3),
      campi_primo_record: items[0] ? Object.keys(items[0]) : [],
    }
  } catch (err) {
    rawVentasError = err.message
  }

  // 1b. Raw /movimientos-caja/ (prime 5, ultimi 30 giorni) — confronto
  let rawMovim = null
  let rawMovimError = null
  try {
    const data = await getKoiboxMovimientosCaja(centroId, {
      fecha_desde: `${trenta}T00:00:00`,
      fecha_hasta: `${oggiStr}T23:59:59`,
      page: 1,
      limit: 5,
    })
    const items = data.results || (Array.isArray(data) ? data : [])
    const giorni = [...new Set(items.map(i => String(i.fecha || '').substring(0, 10)).filter(Boolean))]
    rawMovim = {
      endpoint: '/movimientos-caja/',
      count_totale: data.count || items.length,
      has_next: !!data.next,
      giorni_nel_campione: giorni,
      sample: items.slice(0, 3),
    }
  } catch (err) {
    rawMovimError = err.message
  }

  // 2. Breakdown koibox_casse per metodo (ultimi 30 gg)
  const { data: casse } = await admin
    .from('koibox_casse')
    .select('data, incasso_contanti, incasso_carta, incasso_online, incasso_bonifico, incasso_bizum, incasso_paypal, incasso_coupon, incasso_carta_regalo, incasso_carta_fedelta, totale_giorno, n_scontrini')
    .eq('centro_id', centroId)
    .gte('data', trenta)
    .order('data', { ascending: false })

  const casseSummary = {
    giorni: casse?.length || 0,
    totale_contanti:       casse?.reduce((s, r) => s + (r.incasso_contanti || 0), 0) || 0,
    totale_carta:          casse?.reduce((s, r) => s + (r.incasso_carta || 0), 0) || 0,
    totale_online:         casse?.reduce((s, r) => s + (r.incasso_online || 0), 0) || 0,
    totale_bonifico:       casse?.reduce((s, r) => s + (r.incasso_bonifico || 0), 0) || 0,
    totale_bizum:          casse?.reduce((s, r) => s + (r.incasso_bizum || 0), 0) || 0,
    totale_paypal:         casse?.reduce((s, r) => s + (r.incasso_paypal || 0), 0) || 0,
    totale_coupon:         casse?.reduce((s, r) => s + (r.incasso_coupon || 0), 0) || 0,
    totale_carta_regalo:   casse?.reduce((s, r) => s + (r.incasso_carta_regalo || 0), 0) || 0,
    totale_carta_fedelta:  casse?.reduce((s, r) => s + (r.incasso_carta_fedelta || 0), 0) || 0,
    ultime_righe: casse?.slice(0, 7) || [],
  }

  // 3. Breakdown registro_pagamenti per metodo (source='koibox', ultimi 30 gg)
  const { data: pagamenti } = await admin
    .from('registro_pagamenti')
    .select('metodo, importo')
    .eq('centro_id', centroId)
    .eq('source', 'koibox')
    .gte('data', trenta)

  const pagamentiPerMetodo = {}
  for (const p of pagamenti || []) {
    pagamentiPerMetodo[p.metodo] = (pagamentiPerMetodo[p.metodo] || 0) + parseFloat(p.importo || 0)
  }

  // 4. Registro giornate (ultimi 30 gg) — con i giorni mancanti
  const { data: giornate } = await admin
    .from('registro_giornate')
    .select('data, incasso_effettivo, n_clienti, source')
    .eq('centro_id', centroId)
    .gte('data', trenta)
    .order('data', { ascending: false })

  return NextResponse.json({
    periodo: { da: trenta, a: oggiStr },
    api_ventas: { error: rawVentasError, ...rawVentas },
    api_movimientos_caja: { error: rawMovimError, ...rawMovim },
    koibox_casse: casseSummary,
    registro_pagamenti_per_metodo: pagamentiPerMetodo,
    registro_pagamenti_totale: pagamenti?.length || 0,
    registro_giornate: {
      giorni: giornate?.length || 0,
      righe: giornate || [],
    },
  })
}
