// Test del motore "Listino intelligente" PUBBLICO (app/listino/page.js).
// Il motore vive dentro una stringa di script (buildToolScript) e non e' importabile.
// Per testare il codice REALE (non una copia che puo' divergere) questo test legge
// page.js, estrae le righe delle funzioni pure (da `vMonthly` a `metrics`) e le valuta
// con uno stato controllato. Se qualcuno cambia quelle righe, il test usa la nuova versione.
//
// Valori attesi calcolati A MANO (vedi commenti), non dall'output della funzione.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const lines = readFileSync(path.join(here, '../app/listino/page.js'), 'utf8').split('\n')
const start = lines.findIndex(l => l.startsWith('  const vMonthly='))
const end = lines.findIndex(l => l.startsWith('  function metrics('))
assert.ok(start > 0 && end > start, 'estrazione funzioni pure del tool listino fallita: struttura di page.js cambiata')
const src = lines.slice(start, end + 1).join('\n')

function engine({ voci, operatori, state, services = [] }) {
  const WK = 4.33
  const factory = new Function(
    'state', 'voci', 'operatori', 'services', 'WK',
    `${src}\nreturn { vMonthly, cap, fixedMese, fixedNetMese, ivaCreditoMese, fattNetMese, breakEvenHour, ivaF, metrics }`
  )
  return factory(state, voci, operatori, services, WK)
}

const baseState = { oresett: 40, fill: 80, postazioni: 2, ferie: 10, giorni: 24, obiettivo: 55, fatturato: 240000, regime: 'ord', iva: 22, volmode: 'perc' }
// Costi: affitto 1000/mese IVA 22%, assicurazione 1200/anno IVA 0%.
const voci = [{ l: 'Affitto', v: 1000, per: 'mese', iva: 22 }, { l: 'Assicurazione', v: 1200, per: 'anno', iva: 0 }]
// Personale: 40h + 20h a settimana.
const operatori = [{ n: 'A', h: 40 }, { n: 'B', h: 20 }]

const close = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) < tol, `atteso ${b}, ottenuto ${a}`)

test('costi fissi mensili: voci annuali /12, IVA scorporata solo nel regime ordinario', () => {
  const e = engine({ voci, operatori, state: { ...baseState } })
  // lordo = 1000 + 1200/12 = 1100
  close(e.fixedMese(), 1100)
  // netto = 1000/1,22 + 100 = 819,672 + 100 = 919,672
  close(e.fixedNetMese(), 919.672)
  // IVA a credito = 1100 - 919,672 = 180,328
  close(e.ivaCreditoMese(), 180.328)
})

test('regime forfettario: nessuna IVA scorporata, nessun credito IVA', () => {
  const e = engine({ voci, operatori, state: { ...baseState, regime: 'forf' } })
  close(e.fixedNetMese(), 1100)
  assert.equal(e.ivaCreditoMese(), 0)
  assert.equal(e.ivaF(), 1)
})

test('capacita: ore fatturabili/mese = min(postazioni, personale con ferie) * riempimento * 4,33', () => {
  const e = engine({ voci, operatori, state: { ...baseState } })
  const c = e.cap()
  // personale: (40+20)=60 h/sett, ferie 10% => 54 ; postazioni: 2*40 = 80 ; vincolo = 54
  assert.equal(c.laborEff, 54)
  assert.equal(c.stationWk, 80)
  assert.equal(c.bottle, 'personale')
  // billMo = 54 * 0,80 * 4,33 = 187,056
  close(c.billMo, 187.056)
})

test('capacita: se le postazioni sono il collo di bottiglia vince il minimo', () => {
  const e = engine({ voci, operatori, state: { ...baseState, postazioni: 1 } })
  const c = e.cap()
  // postazioni 1*40 = 40 < personale 54 => billMo = 40*0,8*4,33 = 138,56
  assert.equal(c.bottle, 'postazioni')
  close(c.billMo, 138.56)
})

test('BREAK-EVEN orario = costi fissi netti / ore fatturabili', () => {
  const e = engine({ voci, operatori, state: { ...baseState } })
  // 919,672131 / 187,056 = 4,916560
  close(e.breakEvenHour(), 4.91656, 1e-4)
})

test('break-even: forfettario usa i costi lordi (1100/187,056 = 5,880592)', () => {
  const e = engine({ voci, operatori, state: { ...baseState, regime: 'forf' } })
  close(e.breakEvenHour(), 5.880592, 1e-4)
})

test('break-even: nessun personale/capacita 0 => 0, mai Infinity o NaN', () => {
  const e = engine({ voci, operatori: [], state: { ...baseState } })
  assert.equal(e.cap().billMo, 0)
  assert.equal(e.breakEvenHour(), 0)
})

test('fatturato annuo -> netto mensile: 240000/12/1,22 = 16393,44', () => {
  const e = engine({ voci, operatori, state: { ...baseState } })
  close(e.fattNetMese(), 16393.443, 1e-2)
})

test('metrics: servizio 60 EUR IVA incl., 60 min, nessuna promo => utile 44,26, margine 90%, stato verde', () => {
  const s = { p: 60, d: 60, promo: 0 }
  const e = engine({ voci, operatori, state: { ...baseState }, services: [s] })
  const m = e.metrics(s)
  close(m.net, 49.1803)              // 60/1,22
  close(m.quotaFissa, 4.91656, 1e-4) // break-even orario * 1h
  close(m.utileSeduta, 44.2638, 1e-3)
  close(m.margPct, 90.003, 1e-2)
  assert.equal(m.st, 'g')
  // prezzo minimo per obiettivo 55%: quota/(1-0,55) = 10,9257 netto => *1,22 = 13,3293 lordo
  close(m.consGrossPieno, 13.3293, 1e-3)
})

test('metrics: promo 20% e durata 90 min', () => {
  const s = { p: 60, d: 90, promo: 20 }
  const e = engine({ voci, operatori, state: { ...baseState }, services: [s] })
  const m = e.metrics(s)
  // netPromo = 49,1803*0,8 = 39,3443 ; quota = 4,91656*1,5 = 7,37484 ; utile = 31,9694 ; marg = 81,26%
  close(m.netPromo, 39.3443, 1e-3)
  close(m.quotaFissa, 7.37484, 1e-4)
  close(m.utileSeduta, 31.9694, 1e-3)
  close(m.margPct, 81.256, 1e-2)
  assert.equal(m.st, 'g')
})

test('metrics: margine tra 0 e obiettivo (55%) => stato "a" (regge)', () => {
  // 8,57 EUR lordi => netto 7,02459 ; quota 4,91656 ; utile 2,10803 ; margine 30,0%
  const s = { p: 8.57, d: 60, promo: 0 }
  const e = engine({ voci, operatori, state: { ...baseState }, services: [s] })
  const m = e.metrics(s)
  close(m.margPct, 30.009, 1e-2)
  assert.equal(m.st, 'a')
})

test('metrics: prezzo sotto il break-even => utile negativo, stato "r" (frena)', () => {
  // 5 EUR lordi => netto 4,09836 ; quota 4,91656 ; utile -0,81820 ; margine -19,96%
  const s = { p: 5, d: 60, promo: 0 }
  const e = engine({ voci, operatori, state: { ...baseState }, services: [s] })
  const m = e.metrics(s)
  close(m.utileSeduta, -0.8182, 1e-3)
  close(m.margPct, -19.964, 1e-2)
  assert.equal(m.st, 'r')
})

test('metrics: forfettario, nessuna IVA da scorporare (prezzo lordo = netto)', () => {
  const s = { p: 60, d: 60, promo: 0 }
  const e = engine({ voci, operatori, state: { ...baseState, regime: 'forf' }, services: [s] })
  const m = e.metrics(s)
  assert.equal(m.net, 60)
  // utile = 60 - 5,880592 = 54,119408
  close(m.utileSeduta, 54.1194, 1e-3)
})

test('metrics: prezzo 0 o capacita 0 non producono NaN/Infinity', () => {
  const s = { p: 0, d: 60, promo: 0 }
  const e = engine({ voci, operatori: [], state: { ...baseState }, services: [s] })
  const m = e.metrics(s)
  for (const [k, v] of Object.entries(m)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} non finito: ${v}`)
  }
})
