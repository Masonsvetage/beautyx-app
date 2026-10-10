// Test di lib/listino-calc.js (calcolaServizio, analizzaCongelato).
// REGOLA: i valori attesi sono calcolati A MANO (carta/penna) dalle formule di
// business, MAI copiati dall'output della funzione. Ogni test riporta il calcolo.
import test from 'node:test'
import assert from 'node:assert/strict'
import { calcolaServizio, analizzaCongelato } from '../lib/listino-calc.js'

// ───────────────────────── calcolaServizio ─────────────────────────

test('calcolaServizio: esempio Pressoterapia del commento di listino-calc.js (IVA 22%, ricarico 30%)', () => {
  // Centro: 3 operatrici, costoMinuto 0,20 => costoOra 12 €/h. Servizio sovrapponibile.
  // minPieno = 10+10+5 = 25 ; minRidotto = 20*2/3 = 13,333
  // costoPersonale = (25+13,333)*0,20*1/(3*0,5) = 7,6667/1,5 = 5,1111
  // prezzoNetto = 5,1111*1,30 = 6,6444 ; prezzoLordo = 6,6444*1,22 = 8,1062
  // prezzoMinimo = 5,1111*1,20*1,22 = 7,4827
  // scontoMax = (1 - 1,20/1,30)*100 = 7,6923 -> 7,7 ; margine = 30,0
  const r = calcolaServizio({
    servizio: {
      durata_preparazione_min: 10, durata_esecuzione_min: 20,
      durata_chiusura_min: 10, durata_sanificazione_min: 5,
      sovrapponibile: true, nr_operatrici: 1, ricarico_percentuale: 30,
    },
    costoOraEsercizio: 12, nrOpCentro: 3, aliquotaIvaPerc: 22,
  })
  assert.equal(r.durataTotale, 45)
  assert.equal(r.minPieno, 25)
  assert.equal(r.minRidotto, 13.3)
  assert.equal(r.costoPersonale, 5.11)
  assert.equal(r.costoMateriali, 0)
  assert.equal(r.costoVivo, 5.11)
  assert.equal(r.prezzoNetto, 6.64)
  assert.equal(r.prezzoLordo, 8.11)
  assert.equal(r.prezzoMinimo, 7.48)
  assert.equal(r.scontoMax, 7.7)
  assert.equal(r.marginePerc, 30)
})

test('calcolaServizio: 2 operatrici sulla stessa cliente raddoppiano il costo del personale', () => {
  // stesso caso: 7,6667*2/1,5 = 10,2222 -> 10,22
  const r = calcolaServizio({
    servizio: {
      durata_preparazione_min: 10, durata_esecuzione_min: 20,
      durata_chiusura_min: 10, durata_sanificazione_min: 5,
      sovrapponibile: true, nr_operatrici: 2, ricarico_percentuale: 30,
    },
    costoOraEsercizio: 12, nrOpCentro: 3, aliquotaIvaPerc: 22,
  })
  assert.equal(r.costoPersonale, 10.22)
})

test('calcolaServizio: servizio NON sovrapponibile + materiali + ricarico 100% + IVA 22%', () => {
  // costoOra 60 => 1 €/min. Centro 2 op => divisore 2*0,5 = 1.
  // minPieno = 5+30+5+0 = 40 (non sovrapponibile: esecuzione a costo pieno); minRidotto = 0
  // costoPersonale = 40*1*1/1 = 40
  // materiali = 3,50*2 + 1,25*1(quantita default) = 7,00 + 1,25 = 8,25
  // costoVivo = 48,25 ; netto = 96,50 ; lordo = 96,50*1,22 = 117,73
  // minimo = 48,25*1,2*1,22 = 70,638 -> 70,64 ; sconto = (1-1,2/2,0)*100 = 40,0 ; margine 100
  const r = calcolaServizio({
    servizio: {
      durata_preparazione_min: 5, durata_esecuzione_min: 30,
      durata_chiusura_min: 5, durata_sanificazione_min: 0,
      sovrapponibile: false, nr_operatrici: 1, ricarico_percentuale: 100,
      materiali: [{ costo_unitario: 3.5, quantita_uso: 2 }, { costo_unitario: 1.25 }],
    },
    costoOraEsercizio: 60, nrOpCentro: 2, aliquotaIvaPerc: 22,
  })
  assert.equal(r.minPieno, 40)
  assert.equal(r.minRidotto, 0)
  assert.equal(r.costoPersonale, 40)
  assert.equal(r.costoMateriali, 8.25)
  assert.equal(r.costoVivo, 48.25)
  assert.equal(r.prezzoNetto, 96.5)
  assert.equal(r.prezzoLordo, 117.73)
  assert.equal(r.prezzoMinimo, 70.64)
  assert.equal(r.scontoMax, 40)
  assert.equal(r.marginePerc, 100)
})

test('calcolaServizio: i materiali possono arrivare anche come servizi_materiali (join DB)', () => {
  // solo materiale: 10 * 1 = 10 ; ricarico 0 ; IVA 0 => lordo = netto = costoVivo = 10
  const r = calcolaServizio({
    servizio: { servizi_materiali: [{ costo_unitario: 10, quantita_uso: 1 }] },
    costoOraEsercizio: 0, nrOpCentro: 1, aliquotaIvaPerc: 0,
  })
  assert.equal(r.costoMateriali, 10)
  assert.equal(r.costoVivo, 10)
  assert.equal(r.prezzoLordo, 10)
})

test('calcolaServizio: IVA 0% => prezzo lordo uguale al netto', () => {
  // costoVivo 100 (materiale), ricarico 50 => netto 150 = lordo
  const r = calcolaServizio({
    servizio: { materiali: [{ costo_unitario: 100, quantita_uso: 1 }], ricarico_percentuale: 50 },
    costoOraEsercizio: 0, aliquotaIvaPerc: 0,
  })
  assert.equal(r.prezzoNetto, 150)
  assert.equal(r.prezzoLordo, 150)
})

test('calcolaServizio: ricarico 0 => prezzo sotto il minimo garantito, sconto max = 0', () => {
  // costoVivo 10 ; ricarico 0 ; IVA 22 : netto 10 ; lordo 12,20 ; minimo = 10*1,2*1,22 = 14,64
  // il prezzo (12,20) e' SOTTO il minimo (14,64) => nessuno sconto possibile, margine 0
  const r = calcolaServizio({
    servizio: { materiali: [{ costo_unitario: 10, quantita_uso: 1 }], ricarico_percentuale: 0 },
    costoOraEsercizio: 0, aliquotaIvaPerc: 22,
  })
  assert.equal(r.prezzoLordo, 12.2)
  assert.equal(r.prezzoMinimo, 14.64)
  assert.equal(r.scontoMax, 0)
  assert.equal(r.marginePerc, 0)
})

test('calcolaServizio: ricarico negativo (-10%) => margine -10%, sconto max 0', () => {
  // costoVivo 100 ; netto = 100*0,9 = 90 ; margine = (90/100-1)*100 = -10
  const r = calcolaServizio({
    servizio: { materiali: [{ costo_unitario: 100, quantita_uso: 1 }], ricarico_percentuale: -10 },
    costoOraEsercizio: 0, aliquotaIvaPerc: 22,
  })
  assert.equal(r.prezzoNetto, 90)
  assert.equal(r.marginePerc, -10)
  assert.equal(r.scontoMax, 0)
})

test('calcolaServizio: tutto zero / servizio vuoto => nessun NaN, nessuna divisione per zero', () => {
  const r = calcolaServizio({ servizio: {}, costoOraEsercizio: 0, aliquotaIvaPerc: 22 })
  for (const [k, v] of Object.entries(r)) {
    assert.ok(Number.isFinite(v), `${k} non finito: ${v}`)
  }
  assert.equal(r.costoVivo, 0)
  assert.equal(r.prezzoLordo, 0)
  assert.equal(r.scontoMax, 0)
  assert.equal(r.marginePerc, 0)
})

test('calcolaServizio: input sporchi (stringhe, null, nr operatrici 0) vengono normalizzati', () => {
  // nr_operatrici 0 => trattato come 1 ; nrOpCentro 0 => 1 ; sovrapponibile 'true' (stringa DB) => true
  // prep=30 (stringa), resto 0 ; costoOra 60 -> 1 €/min ; divisore 1*0,5 = 0,5
  // costoPersonale = 30*1*1/0,5 = 60 ; ricarico 0, IVA 0 => lordo 60
  const r = calcolaServizio({
    servizio: { durata_preparazione_min: '30', durata_esecuzione_min: null, nr_operatrici: 0, sovrapponibile: 'true' },
    costoOraEsercizio: '60', nrOpCentro: 0, aliquotaIvaPerc: null,
  })
  assert.equal(r.minPieno, 30)
  assert.equal(r.costoPersonale, 60)
  assert.equal(r.prezzoLordo, 60)
})

test('calcolaServizio: piu operatrici nel centro abbassano il costo del singolo servizio', () => {
  // 30 min pieni, 1 €/min, nrOpS=1. Centro 1 op: 30/0,5 = 60. Centro 4 op: 30/2 = 15.
  const base = { servizio: { durata_preparazione_min: 30 }, costoOraEsercizio: 60, aliquotaIvaPerc: 0 }
  assert.equal(calcolaServizio({ ...base, nrOpCentro: 1 }).costoPersonale, 60)
  assert.equal(calcolaServizio({ ...base, nrOpCentro: 4 }).costoPersonale, 15)
})

test('calcolaServizio: arrotondamento a 2 decimali (costo esercizio 10 €/h, 10 min)', () => {
  // 10 min * (10/60) = 1,6667 ; centro 1 op => /0,5 = 3,3333 -> 3,33
  const r = calcolaServizio({
    servizio: { durata_preparazione_min: 10 }, costoOraEsercizio: 10, nrOpCentro: 1, aliquotaIvaPerc: 0,
  })
  assert.equal(r.costoPersonale, 3.33)
})

// ───────────────────────── analizzaCongelato ─────────────────────────

test('analizzaCongelato: esempio di business del commento (costo 10, prezzo 13, IVA 0, margine min 40%)', () => {
  // utile = 3 ; utileMin = 1,20 ; prezzoMin = 11,20 ; sconto = (13-11,2)/13 = 13,846 -> 13,8
  const r = analizzaCongelato({ prezzoPubblico: 13, costoVivoAttuale: 10, aliquotaIvaPerc: 0 })
  assert.equal(r.ppNetto, 13)
  assert.equal(r.utile, 3)
  assert.equal(r.utilePerc, 30)
  assert.equal(r.utileMin, 1.2)
  assert.equal(r.prezzoMin, 11.2)
  assert.equal(r.scontoMax, 13.8)
  assert.equal(r.stato, 'ok')
})

test('analizzaCongelato: IVA 22% (prezzo 122 lordo, costo 50)', () => {
  // netto = 122/1,22 = 100 ; utile 50 ; utilePerc 100 ; utileMin = 20
  // prezzoMinNetto 70 ; lordo = 70*1,22 = 85,40 ; sconto = (1 - 85,4/122) = 30%
  const r = analizzaCongelato({ prezzoPubblico: 122, costoVivoAttuale: 50, aliquotaIvaPerc: 22 })
  assert.equal(r.ppNetto, 100)
  assert.equal(r.utile, 50)
  assert.equal(r.utilePerc, 100)
  assert.equal(r.utileMin, 20)
  assert.equal(r.prezzoMin, 85.4)
  assert.equal(r.scontoMax, 30)
})

test('analizzaCongelato: prezzo sotto costo => stato perdita, sconto 0, utileMin 0', () => {
  // lordo 61 / 1,22 = 50 netto ; costo 60 ; utile -10 ; utilePerc = -10/60 = -16,7
  // utileMin = max(0,-10)*0,4 = 0 ; prezzoMin = 60*1,22 = 73,20 ; 61 < 73,2 => sconto 0
  const r = analizzaCongelato({ prezzoPubblico: 61, costoVivoAttuale: 60, aliquotaIvaPerc: 22 })
  assert.equal(r.utile, -10)
  assert.equal(r.utilePerc, -16.7)
  assert.equal(r.utileMin, 0)
  assert.equal(r.prezzoMin, 73.2)
  assert.equal(r.scontoMax, 0)
  assert.equal(r.stato, 'perdita')
})

test('analizzaCongelato: utile < 20% del costo => stato critico', () => {
  // netto 100 ; costo 90 ; utile 10 ; utilePerc = 11,1 (<20)
  const r = analizzaCongelato({ prezzoPubblico: 122, costoVivoAttuale: 90, aliquotaIvaPerc: 22 })
  assert.equal(r.utilePerc, 11.1)
  assert.equal(r.stato, 'critico')
})

test('analizzaCongelato: costi saliti del 25% dal congelamento => attenzione, delta 10 € / 25%', () => {
  // costo 50 vs 40 al congelamento : delta = 10 ; 10/40 = 25%
  const r = analizzaCongelato({ prezzoPubblico: 122, costoVivoAttuale: 50, costoVivoAlCongelamento: 40, aliquotaIvaPerc: 22 })
  assert.equal(r.deltaCosto, 10)
  assert.equal(r.deltaCostoPerc, 25)
  assert.equal(r.stato, 'attenzione')
})

test('analizzaCongelato: costi calati di oltre il 5% => migliorato', () => {
  // costo 50 vs 60 : delta -10 ; -10/60 = -16,7%
  const r = analizzaCongelato({ prezzoPubblico: 122, costoVivoAttuale: 50, costoVivoAlCongelamento: 60, aliquotaIvaPerc: 22 })
  assert.equal(r.deltaCosto, -10)
  assert.equal(r.deltaCostoPerc, -16.7)
  assert.equal(r.stato, 'migliorato')
})

test('analizzaCongelato: variazione esattamente +5% (soglia) resta ok; +6% va in attenzione', () => {
  // costo 42 vs 40 : +5,0% => NON > 5 => ok
  const a = analizzaCongelato({ prezzoPubblico: 122, costoVivoAttuale: 42, costoVivoAlCongelamento: 40, aliquotaIvaPerc: 22 })
  assert.equal(a.deltaCostoPerc, 5)
  assert.equal(a.stato, 'ok')
  // costo 42,4 vs 40 : +6% => attenzione
  const b = analizzaCongelato({ prezzoPubblico: 122, costoVivoAttuale: 42.4, costoVivoAlCongelamento: 40, aliquotaIvaPerc: 22 })
  assert.equal(b.deltaCostoPerc, 6)
  assert.equal(b.stato, 'attenzione')
})

test('analizzaCongelato: costo vivo 0 => utilePerc null, nessun NaN; sconto = 60% (tiene il 40% dell utile)', () => {
  // netto 100 ; costo 0 ; utile 100 ; utileMin 40 ; prezzoMin = 40*1,22 = 48,80 ; sconto = 1-48,8/122 = 60%
  const r = analizzaCongelato({ prezzoPubblico: 122, costoVivoAttuale: 0, aliquotaIvaPerc: 22 })
  assert.equal(r.utilePerc, null)
  assert.equal(r.prezzoMin, 48.8)
  assert.equal(r.scontoMax, 60)
  assert.equal(r.stato, 'ok')
})

test('analizzaCongelato: margineMinUtilePerc personalizzato (100% => nessuno sconto possibile)', () => {
  // tenere il 100% dell utile => prezzoMin = prezzo => sconto 0
  const r = analizzaCongelato({ prezzoPubblico: 122, costoVivoAttuale: 50, aliquotaIvaPerc: 22, margineMinUtilePerc: 100 })
  assert.equal(r.prezzoMin, 122)
  assert.equal(r.scontoMax, 0)
})

test('analizzaCongelato: prezzo 0 => nessun NaN', () => {
  const r = analizzaCongelato({ prezzoPubblico: 0, costoVivoAttuale: 10, aliquotaIvaPerc: 22 })
  for (const [k, v] of Object.entries(r)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `${k} non finito`)
  }
  assert.equal(r.scontoMax, 0)
  assert.equal(r.stato, 'perdita')
})

test('scontoMax: sconto applicato al limite lascia ESATTAMENTE il 40% dell utile (riprova incrociata)', () => {
  // prezzo 122 (netto 100), costo 50, utile 50. Con sconto 30% -> lordo 85,40 -> netto 70 -> utile 20 = 40% di 50.
  const r = analizzaCongelato({ prezzoPubblico: 122, costoVivoAttuale: 50, aliquotaIvaPerc: 22 })
  const lordoScontato = 122 * (1 - r.scontoMax / 100)
  const nettoScontato = lordoScontato / 1.22
  assert.ok(Math.abs((nettoScontato - 50) - 0.4 * 50) < 0.01)
})
