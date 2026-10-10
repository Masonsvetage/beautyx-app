// Test di lib/analytics.js (calculateKPIs, calculateYoYKPIs, groupByCategory) e
// lib/movement-classifier.js. Valori attesi calcolati A MANO.
process.env.TZ = 'Europe/Rome'
import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateKPIs, calculateYoYKPIs, groupByCategory, filterMovementsByPeriod } from '../lib/analytics.js'
import {
  classifyMovement, filterOperationalMovements, calculateOperationalTotal,
} from '../lib/movement-classifier.js'

const close = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) < tol, `atteso ${b}, ottenuto ${a}`)

// Settimana lun 2 - dom 8 marzo 2026. Centro aperto lun-sab, 09:00-17:00 (8 h/giorno = 48 h/sett).
const settimana = ['2026-03-02', '2026-03-08']
const orari = [0, 1, 2, 3, 4, 5].map(g => ({ giorno_settimana: g, aperto: true, orario_apertura: '09:00', orario_chiusura: '17:00' }))
const movimenti = [
  { tipo: 'entrata', categoria: 'POS', importo: '200', data: '2026-03-03' },
  { tipo: 'entrata', categoria: 'Servizi', importo: 800, data: '2026-03-04' },
  { tipo: 'uscita', categoria: 'Giroconti', importo: 300, data: '2026-03-05' },
  { tipo: 'uscita', categoria: 'Affitto', importo: 920, data: '2026-03-06' },
  { tipo: 'uscita', categoria: 'Fuori periodo', importo: 5000, data: '2026-04-01' },
]

test('calculateKPIs: entrate, uscite, saldo, margine (fuori periodo escluso)', () => {
  // entrate 200+800 = 1000 ; uscite 300+920 = 1220 ; saldo = -220 ; margine = -220/1000 = -22%
  const k = calculateKPIs(movimenti, ...settimana, orari, [])
  assert.equal(k.entrate, 1000)
  assert.equal(k.uscite, 1220)
  assert.equal(k.saldo, -220)
  assert.equal(k.margineOperativo, -22)
  assert.equal(k.movimentiTotali, 4)
})

test('calculateKPIs: compensazione giroconti/POS = min(300, 200) = 200 => uscite reali 1020', () => {
  const k = calculateKPIs(movimenti, ...settimana, orari, [])
  assert.equal(k.compensazione.giroconti, 300)
  assert.equal(k.compensazione.pos, 200)
  assert.equal(k.compensazione.importoCompensato, 200)
  assert.equal(k.compensazione.percentualeCompensata, 67) // 200/300 = 66,67 -> 67
  assert.equal(k.usciteReali, 1020)
})

test('calculateKPIs: IVA detraibile 22% = uscite reali * 22/122 ; netto = reali - IVA', () => {
  // 1020*22/122 = 183,934426 ; netto = 836,065574
  const k = calculateKPIs(movimenti, ...settimana, orari, [])
  close(k.ivaDetraibile, 183.9344)
  close(k.usciteNette, 836.0656)
})

test('calculateKPIs: IVA su 1220 EUR di spese = esattamente 220 (1220*22/122), netto 1000', () => {
  const k = calculateKPIs([{ tipo: 'uscita', categoria: 'Affitto', importo: 1220, data: '2026-03-03' }], ...settimana, orari, [])
  close(k.ivaDetraibile, 220, 1e-9)
  close(k.usciteNette, 1000, 1e-9)
})

test('calculateKPIs: giorni lavorativi = 6 (domenica chiusa) e costi/entrate medie giornaliere', () => {
  // giorni periodo 7 ; lavorativi 6 ; costo giornaliero lordo = 1020/6 = 170 ; netto = 836,0656/6 = 139,3443
  // entrata media giornaliera = 1000/6 = 166,6667
  const k = calculateKPIs(movimenti, ...settimana, orari, [])
  assert.equal(k.giorniPeriodo, 7)
  assert.equal(k.giorniLavorativiEffettivi, 6)
  assert.equal(k.oreSettimanali, 48)
  assert.equal(k.costoGiornalieroEsercizio, 170)
  close(k.costoGiornalieroNetto, 139.3443)
  close(k.entrataMediaGiornaliera, 166.6667)
})

test('calculateKPIs: chiusura eccezionale mercoledi 4 marzo => 5 giorni lavorativi', () => {
  const k = calculateKPIs(movimenti, ...settimana, orari, [{ data_inizio: '2026-03-04', data_fine: '2026-03-04' }])
  assert.equal(k.giorniLavorativiEffettivi, 5)
})

test('calculateKPIs: chiusura annuale ricorrente (4 marzo 2025 => ogni 4 marzo) => 5 giorni', () => {
  const k = calculateKPIs(movimenti, ...settimana, orari,
    [{ ricorrente: true, tipo_ricorrenza: 'annuale', data_inizio: '2025-03-04', data_fine: '2025-03-04' }])
  assert.equal(k.giorniLavorativiEffettivi, 5)
})

test('calculateKPIs: chiusura mensile ricorrente (ogni 5 del mese; 5 marzo 2026 e giovedi) => 5 giorni', () => {
  const k = calculateKPIs(movimenti, ...settimana, orari,
    [{ ricorrente: true, tipo_ricorrenza: 'mensile', data_inizio: '2026-01-05', data_fine: '2026-01-05' }])
  assert.equal(k.giorniLavorativiEffettivi, 5)
})

test('calculateKPIs: nessuna entrata => margine 0 (no divisione per zero)', () => {
  const k = calculateKPIs([{ tipo: 'uscita', categoria: 'Affitto', importo: 100, data: '2026-03-03' }], ...settimana, orari, [])
  assert.equal(k.margineOperativo, 0)
})

test('calculateKPIs: nessun movimento e nessun orario => tutto 0 e finito', () => {
  const k = calculateKPIs([], ...settimana, [], [])
  for (const [key, v] of Object.entries(k)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${key} non finito`)
  }
  assert.equal(k.entrate, 0)
  assert.equal(k.costoGiornalieroEsercizio, 0)
})

// BUG NOTO (non corretto, serve decisione di Mason sulle cifre mostrate in Analytics):
// calculateKPIs calcola le ore lavorative come (giorniLavorativi / 7) * oreSettimanali.
// Ma i giorni lavorativi sono GIA' solo i giorni aperti: 6 giorni x 8 h = 48 h, non (6/7)*48 = 41,14 h.
// Le ore risultano sottostimate di un fattore (giorni aperti a settimana / 7) e costoOrarioEsercizio /
// entrataMediaOraria sovrastimati (+16,7% per un centro aperto 6 giorni su 7).
test('calculateKPIs: ore lavorative = giorni aperti x ore del giorno (6 x 8 = 48 h)',
  { todo: 'BUG noto: ore sottostimate di (giorni aperti/7), vedi commento sopra' }, () => {
    const k = calculateKPIs(movimenti, ...settimana, orari, [])
    assert.equal(k.oreLavorativeTotali, 48)
    close(k.costoOrarioEsercizio, 1020 / 48) // 21,25 EUR/h
    close(k.entrataMediaOraria, 1000 / 48)   // 20,8333 EUR/h
  })

test('calculateYoYKPIs: variazioni % rispetto all anno prima (entrate +20%, uscite -25%, saldo +200%)', () => {
  const mov = [
    { tipo: 'entrata', categoria: 'Servizi', importo: 1200, data: '2026-03-10' },
    { tipo: 'uscita', categoria: 'Affitto', importo: 600, data: '2026-03-11' },
    { tipo: 'entrata', categoria: 'Servizi', importo: 1000, data: '2025-03-10' },
    { tipo: 'uscita', categoria: 'Affitto', importo: 800, data: '2025-03-11' },
  ]
  // 2026: saldo 600, margine 50% ; 2025: saldo 200, margine 20%
  const r = calculateYoYKPIs(mov, { startDate: '2026-03-01', endDate: '2026-03-31' }, [], [])
  assert.equal(r.current.saldo, 600)
  assert.equal(r.lastYear.saldo, 200)
  assert.equal(r.changes.entrate, 20)
  assert.equal(r.changes.uscite, -25)
  assert.equal(r.changes.saldo, 200)
  assert.equal(r.changes.margineOperativo, 150)
  assert.deepEqual(r.years.map(y => y.year), [2026, 2025, 2024, 2023])
})

test('calculateYoYKPIs: anno precedente a zero e anno corrente > 0 => +100% (convenzione), entrambi 0 => 0%', () => {
  const mov = [{ tipo: 'entrata', categoria: 'Servizi', importo: 500, data: '2026-03-10' }]
  const r = calculateYoYKPIs(mov, { startDate: '2026-03-01', endDate: '2026-03-31' }, [], [])
  assert.equal(r.changes.entrate, 100)
  assert.equal(r.changes.uscite, 0)
})

test('groupByCategory: somma entrate/uscite per categoria, ordinate per totale, "Non Categorizzato" se vuota', () => {
  const g = groupByCategory([
    { tipo: 'entrata', categoria: 'Servizi', importo: '100.50' },
    { tipo: 'entrata', categoria: 'Servizi', importo: 50 },
    { tipo: 'uscita', categoria: 'Affitto', importo: 400 },
    { tipo: 'uscita', importo: 25 },
  ])
  assert.deepEqual(g.map(x => x.categoria), ['Affitto', 'Servizi', 'Non Categorizzato'])
  assert.equal(g[1].entrate, 150.5)
  assert.equal(g[0].uscite, 400)
  assert.equal(g[2].uscite, 25)
})

test('filterMovementsByPeriod: estremi inclusi (1 e 31 marzo), 1 aprile escluso', () => {
  const m = [{ data: '2026-03-01' }, { data: '2026-03-31' }, { data: '2026-04-01' }, { data: '2026-02-28' }]
  assert.equal(filterMovementsByPeriod(m, '2026-03-01', '2026-03-31').length, 2)
})

// ───────────── movement-classifier ─────────────

test('classifyMovement: anticipo POS e Finanziamenti => finanziamento; Giroconti => tecnico; resto operativo', () => {
  assert.equal(classifyMovement({ tipo: 'entrata', categoria: 'POS', descrizione: 'ANTICIPO POS' }), 'finanziamento')
  assert.equal(classifyMovement({ tipo: 'entrata', categoria: 'POS', descrizione: 'accredito pos giornaliero' }), 'operativo')
  assert.equal(classifyMovement({ tipo: 'entrata', categoria: 'Finanziamenti', descrizione: 'mutuo' }), 'finanziamento')
  assert.equal(classifyMovement({ tipo: 'uscita', categoria: 'Giroconti', descrizione: 'rientro' }), 'tecnico')
  assert.equal(classifyMovement({ tipo: 'uscita', categoria: 'Affitto', importo: 3, descrizione: 'COMMISSIONI' }), 'operativo')
})

test('calculateOperationalTotal: esclude giroconti e finanziamenti, importi in valore assoluto', () => {
  const m = [
    { tipo: 'entrata', categoria: 'Servizi', importo: 100, descrizione: '' },
    { tipo: 'entrata', categoria: 'Finanziamenti', importo: 5000, descrizione: '' },
    { tipo: 'uscita', categoria: 'Giroconti', importo: 300, descrizione: '' },
    { tipo: 'uscita', categoria: 'Affitto', importo: -40, descrizione: '' },
    { tipo: 'uscita', categoria: 'Utenze', importo: '10.5', descrizione: '' },
  ]
  assert.equal(filterOperationalMovements(m).length, 3)
  assert.equal(calculateOperationalTotal(m, 'entrata'), 100)
  assert.equal(calculateOperationalTotal(m, 'uscita'), 50.5)
  assert.equal(calculateOperationalTotal(m), 150.5)
})
