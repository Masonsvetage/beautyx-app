/**
 * POST /api/user/koibox/import-casse-xls
 *
 * Importa il file "Riepilogo Casse" scaricato da Koibox (XLS/XLSX).
 * Questo file contiene dati aggregati per giorno che l'API pubblica
 * non sempre restituisce completamente (debiti, cuotas, ecc.).
 *
 * Per ogni giorno trovato nel file:
 * - Upsert in koibox_casse (con source='koibox')
 * - Bridge in registro_giornate (merge intelligente: Koibox sovrascrive
 *   incasso e clienti, lascia intatti spese e altri campi manuali)
 *
 * Accetta multipart/form-data con campo "file".
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { bridgeKoiboxToRegistro } from '@/lib/koibox/bridge'

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

/** Converte il serial Excel in YYYY-MM-DD */
function excelSerialToDate(serial) {
  // Excel epoch: 1 gennaio 1900 (con bug anno bisestile 1900, corretto da -25569)
  const ms = (serial - 25569) * 86400000
  return new Date(ms).toISOString().substring(0, 10)
}

/**
 * Parsa una riga del file Riepilogo Casse Koibox.
 * Restituisce null se la riga non è valida (es. riga "Totali:", intestazione).
 */
function parseRigaCasse(row) {
  const serial = row['Data']
  if (typeof serial !== 'number' || serial < 40000) return null // non è un serial Excel valido

  const contanti      = parseFloat(row['Vendite in contanti'] || 0)
  const carta         = parseFloat(row['Vendite con carta'] || 0)
  const online        = parseFloat(row['Vendite Online'] || 0)
  const bonifico      = parseFloat(row['Vendite con bonifico'] || 0)
  const coupon        = parseFloat(row['Vendite con coupon'] || 0)
  const bizum         = parseFloat(row['Vendite con Bizum'] || 0)
  const paypal        = parseFloat(row['Vendite Paypal'] || 0)
  const cartaRegalo   = parseFloat(row['Pagamento vendite con Carta Regalo'] || 0)
  const cartaFedelta  = parseFloat(row['Pagamento vendite con Carta Fedeltà'] || row['Pagamento vendite con Carta Fedelta'] || 0)
  const debitiCont    = parseFloat(row['Pagamenti debiti in contanti'] || 0)
  const debitiCarta   = parseFloat(row['Pagamenti debiti con carta'] || 0)
  const debitiAltri   = parseFloat(row['Pagamenti debiti con altre forme di pagamento'] || 0)
  // "Cassa del giorno" in Koibox include l'apertura di cassa (fondo cassa) che non è incasso.
  // Calcoliamo il totale reale sommando solo le voci di incasso.
  const totale = contanti + carta + online + bonifico + coupon + bizum + paypal + cartaRegalo + cartaFedelta + debitiCont + debitiCarta + debitiAltri

  return {
    data:                   excelSerialToDate(serial),
    incasso_contanti:       contanti,
    incasso_carta:          carta,
    incasso_online:         online,
    incasso_bonifico:       bonifico,
    incasso_coupon:         coupon,
    incasso_bizum:          bizum,
    incasso_paypal:         paypal,
    incasso_carta_regalo:   cartaRegalo,
    incasso_carta_fedelta:  cartaFedelta,
    debiti_contanti:        debitiCont,
    debiti_carta:           debitiCarta,
    debiti_altri:           debitiAltri,
    totale_giorno:          totale,
    n_scontrini:            0,
    imported_at:            new Date().toISOString(),
  }
}

export async function POST(request) {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const centroId = auth.profile.centro_id

  // Leggi il file dal form
  let formData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida (multipart atteso)' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Nessun file ricevuto' }, { status: 400 })
  }

  // Leggi i byte del file
  const buffer = Buffer.from(await file.arrayBuffer())

  // Parsa con xlsx
  let workbook
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' })
  } catch {
    return NextResponse.json({ error: 'File non leggibile. Assicurati che sia XLS o XLSX.' }, { status: 400 })
  }

  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return NextResponse.json({ error: 'Il file non contiene fogli' }, { status: 400 })
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: 0 })
  if (!rows.length) {
    return NextResponse.json({ error: 'Nessuna riga trovata nel file' }, { status: 400 })
  }

  // Parsa le righe valide
  const righe = rows.map(parseRigaCasse).filter(Boolean)
  if (!righe.length) {
    return NextResponse.json({ error: 'Nessun giorno valido trovato. Assicurati di usare il file "Riepilogo Casse" di Koibox.' }, { status: 400 })
  }

  // Determina intervallo date
  const date = righe.map(r => r.data).sort()
  const dataFrom = date[0]
  const dataTo   = date[date.length - 1]

  // Aggiungi centro_id a ogni riga
  const righeConCentro = righe.map(r => ({ ...r, centro_id: centroId }))

  // Upsert in koibox_casse (sovrascrive per centro_id+data)
  const BATCH = 50
  let casseSalvate = 0
  const erroriCasse = []
  for (let i = 0; i < righeConCentro.length; i += BATCH) {
    const batch = righeConCentro.slice(i, i + BATCH)
    const { error } = await admin
      .from('koibox_casse')
      .upsert(batch, { onConflict: 'centro_id,data' })
    if (error) erroriCasse.push(error.message)
    else casseSalvate += batch.length
  }

  // Bridge → registro_giornate + registro_pagamenti
  const bridgeResult = await bridgeKoiboxToRegistro(centroId, dataFrom, dataTo)

  return NextResponse.json({
    ok: erroriCasse.length === 0 && bridgeResult.errors.length === 0,
    giorni_importati: casseSalvate,
    intervallo: { da: dataFrom, a: dataTo },
    bridge: {
      bridged: bridgeResult.bridged,
      skipped: bridgeResult.skipped,
    },
    errori: [...erroriCasse, ...bridgeResult.errors],
    messaggio: `Importati ${casseSalvate} giorni (${dataFrom} → ${dataTo}). Aggiornati ${bridgeResult.bridged} giorni nel registro.`,
  })
}
