import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { syncKoibox } from '@/lib/koibox/sync'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * GET /api/cron/koibox-sync
 * Sincronizzazione automatica Koibox per tutti i centri attivi.
 * Eseguita 2 volte al giorno (7:00 e 22:00 ora italiana).
 * Protetta da CRON_SECRET (Vercel la invia automaticamente).
 */
export async function GET(request) {
  // Verifica CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const startedAt = Date.now()

  // Recupera tutti i centri con integrazione Koibox attiva
  const { data: integrazioni, error } = await admin
    .from('centro_integrazioni')
    .select('centro_id')
    .eq('gestionale', 'koibox')
    .eq('is_active', true)
    .not('api_key', 'is', null)

  if (error) {
    console.error('[cron/koibox-sync] Errore lettura integrazioni:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!integrazioni?.length) {
    return NextResponse.json({ ok: true, centri: 0, msg: 'Nessun centro con Koibox attivo' })
  }

  // Opzioni sync: ultimi 7 giorni agenda + casse (leggero, dati recenti)
  const opts = {
    giorni_agenda: 7,
    giorni_casse:  7,
    clienti:  false,
    servizi:  false,
  }

  // Sincronizza tutti i centri in parallelo
  const results = await Promise.allSettled(
    integrazioni.map(({ centro_id }) => syncKoibox(centro_id, opts))
  )

  const centri_ok     = results.filter(r => r.status === 'fulfilled' && r.value?.ok).length
  const centri_parziali = results.filter(r => r.status === 'fulfilled' && !r.value?.ok).length
  const centri_errore = results.filter(r => r.status === 'rejected').length

  const log = results.map((r, i) => ({
    centro_id: integrazioni[i].centro_id,
    ok:        r.status === 'fulfilled' ? r.value?.ok : false,
    msg:       r.status === 'fulfilled' ? r.value?.messaggio : r.reason?.message,
  }))

  console.log(`[cron/koibox-sync] ${integrazioni.length} centri — ok:${centri_ok} parz:${centri_parziali} err:${centri_errore} in ${Date.now() - startedAt}ms`)

  return NextResponse.json({
    ok:               centri_errore === 0,
    centri_totali:    integrazioni.length,
    centri_ok,
    centri_parziali,
    centri_errore,
    durata_ms:        Date.now() - startedAt,
    timestamp:        new Date().toISOString(),
    dettaglio:        log,
  })
}
