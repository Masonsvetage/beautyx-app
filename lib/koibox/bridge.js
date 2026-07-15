/**
 * Koibox Bridge — koibox_casse → registro_giornate + registro_pagamenti
 *
 * Dopo ogni sync Koibox, i dati di cassa vengono copiati nel registro
 * così tutti i widget (dashboard, analytics, BeautyX) li vedono.
 *
 * Regole merge:
 * - Se il giorno non ha dati manuali → upsert completo (source='koibox')
 * - Se il giorno ha dati manuali → merge: Koibox aggiorna solo incasso_effettivo
 *   e n_clienti (più affidabili), lascia intatti spese, note e altri campi manuali
 * - registro_pagamenti source='manuale' non viene mai toccato
 * - registro_spese e registro_crediti non vengono mai toccati
 */

import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

/**
 * Mappa metodi Koibox → metodo registro_pagamenti
 * (i CHECK constraint accettano: pos, contanti, satispay, bonifico, bizum, paypal, altro)
 */
const KOIBOX_METODO_MAP = [
  { campo: 'incasso_contanti',       metodo: 'contanti', label: 'contanti'       },
  { campo: 'incasso_carta',          metodo: 'pos',      label: 'carta'          },
  { campo: 'incasso_online',         metodo: 'satispay', label: 'online'         },
  { campo: 'incasso_bonifico',       metodo: 'bonifico', label: 'bonifico'       },
  { campo: 'incasso_bizum',          metodo: 'bizum',    label: 'bizum'          },
  { campo: 'incasso_paypal',         metodo: 'paypal',   label: 'paypal'         },
  { campo: 'incasso_coupon',         metodo: 'altro',    label: 'coupon'         },
  { campo: 'incasso_carta_regalo',   metodo: 'altro',    label: 'carta regalo'   },
  { campo: 'incasso_carta_fedelta',  metodo: 'altro',    label: 'carta fedeltà'  },
  // Debiti pagati — somma con il metodo corrispondente (contante o POS)
  { campo: 'debiti_contanti',        metodo: 'contanti', label: 'debiti contanti' },
  { campo: 'debiti_carta',           metodo: 'pos',      label: 'debiti carta'    },
  { campo: 'debiti_altri',           metodo: 'altro',    label: 'debiti altri'    },
]

/**
 * Esegue il bridge per un centro, limitato all'intervallo di date sincronizzato.
 * @param {string} centroId
 * @param {string} dataFrom  — 'YYYY-MM-DD'
 * @param {string} dataTo    — 'YYYY-MM-DD'
 * @returns {{ bridged: number, skipped: number, errors: string[] }}
 */
// Soglia massima plausibile per un centro estetico (€/giorno)
// Se superata, il dato è corrotto (es. loop paginazione Koibox) e non va bridgiato
const BRIDGE_SANITY_MAX = 15000

export async function bridgeKoiboxToRegistro(centroId, dataFrom, dataTo) {
  const stats  = { bridged: 0, skipped: 0, skipped_anomali: 0 }
  const errors = []

  // 1. Carica tutte le righe casse per l'intervallo
  const { data: casseRows, error: casseErr } = await admin
    .from('koibox_casse')
    .select('*')
    .eq('centro_id', centroId)
    .gte('data', dataFrom)
    .lte('data', dataTo)
    .order('data', { ascending: true })

  if (casseErr) return { ...stats, errors: [`Lettura koibox_casse: ${casseErr.message}`] }
  if (!casseRows?.length) return { ...stats, errors: [] }

  // 2. Carica le giornate già esistenti nell'intervallo
  const { data: giornateEsistenti } = await admin
    .from('registro_giornate')
    .select('id, data, source')
    .eq('centro_id', centroId)
    .gte('data', dataFrom)
    .lte('data', dataTo)

  const giornatePerData = {}
  for (const g of giornateEsistenti || []) {
    giornatePerData[g.data] = g
  }

  // 3. Processa ogni giorno Koibox
  for (const cassa of casseRows) {
    try {
      const dataStr = cassa.data // 'YYYY-MM-DD'
      const esistente = giornatePerData[dataStr]

      // Salta giorni con totale anomalo (dati corrotti da loop paginazione)
      if ((cassa.totale_giorno || 0) > BRIDGE_SANITY_MAX) {
        stats.skipped_anomali++
        errors.push(`Giorno ${dataStr} ignorato: totale €${cassa.totale_giorno} supera soglia €${BRIDGE_SANITY_MAX}`)
        continue
      }

      let giornataId

      if (esistente && esistente.source !== 'koibox') {
        // MERGE: giornata inserita manualmente — Koibox aggiorna solo incasso e clienti,
        // lascia intatti spese, note e qualsiasi altro campo manuale
        const { error: mergeErr } = await admin
          .from('registro_giornate')
          .update({
            incasso_effettivo: cassa.totale_giorno || 0,
            n_clienti:         cassa.n_scontrini || 0,
            source:            'koibox',
            updated_at:        new Date().toISOString(),
          })
          .eq('id', esistente.id)
        if (mergeErr) throw new Error(mergeErr.message)
        giornataId = esistente.id
      } else {
        // UPSERT: nessuna giornata esistente, oppure già source='koibox'
        const { data: giornata, error: upsertErr } = await admin
          .from('registro_giornate')
          .upsert({
            centro_id:         centroId,
            data:              dataStr,
            incasso_effettivo: cassa.totale_giorno || 0,
            n_clienti:         cassa.n_scontrini || 0,
            n_servizi:         0,
            n_prodotti:        0,
            spese_totali:      0,
            incasso_maturato:  0,
            source:            'koibox',
            updated_at:        new Date().toISOString(),
          }, { onConflict: 'centro_id,data' })
          .select('id')
          .maybeSingle()
        if (upsertErr) throw new Error(upsertErr.message)
        giornataId = giornata?.id || esistente?.id
      }

      // Aggiorna registro_pagamenti: cancella solo quelli koibox, lascia intatti i manuali
      if (giornataId) {
        await admin
          .from('registro_pagamenti')
          .delete()
          .eq('centro_id', centroId)
          .eq('data', dataStr)
          .eq('source', 'koibox')
      }

      // Inserisce un registro_pagamenti per ogni metodo con importo > 0
      const pagamentiDaInserire = []
      for (const { campo, metodo, label } of KOIBOX_METODO_MAP) {
        const importo = parseFloat(cassa[campo] || 0)
        if (importo > 0) {
          pagamentiDaInserire.push({
            centro_id:   centroId,
            giornata_id: giornataId || null,
            data:        dataStr,
            metodo,
            importo,
            descrizione: `Koibox – ${label}`,
            source:      'koibox',
          })
        }
      }

      if (pagamentiDaInserire.length > 0) {
        const { error: insErr } = await admin
          .from('registro_pagamenti')
          .insert(pagamentiDaInserire)
        if (insErr) throw new Error(insErr.message)
      }

      stats.bridged++
    } catch (err) {
      errors.push(`Bridge ${cassa.data}: ${err.message}`)
    }
  }

  return { ...stats, errors }
}
