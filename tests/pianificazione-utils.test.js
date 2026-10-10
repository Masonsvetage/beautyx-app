// Test di lib/pianificazione-utils.js: liquidita, allocazioni incasso, budget, ore dipendenti.
// Valori attesi calcolati A MANO. Fuso orario forzato a Europe/Rome per i test sul cambio ora legale.
process.env.TZ = 'Europe/Rome'
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateLiquidity, calculateSuggestedAllocations, validateAllocations,
  calculateAccantonamentoProgress, calculateBudgetComparison, distributeAnnualBudget,
  calculateYearlyBudget, getWeeksInMonth, calculateMonthlyContractedHours,
  calculateOvertimeMonth, calculateAbsenceHours, calculateVacationBalance, matchesMonth,
} from '../lib/pianificazione-utils.js'

// ───────────── Liquidita (banca - accantonamenti attivi) ─────────────

test('calculateLiquidity: banca 749,75 - accantonato 300,75 = disponibile 449,00', () => {
  // banca: +1000 -300,10 -0,20 +50,05 = 749,75
  // accantonato: 200,50 + 100,25 = 300,75 (il non attivo da 999 NON conta)
  const r = calculateLiquidity(
    [
      { tipo: 'entrata', importo: '1000' }, { tipo: 'uscita', importo: 300.1 },
      { tipo: 'uscita', importo: 0.2 }, { tipo: 'entrata', importo: 50.05 },
    ],
    [{ attivo: true, saldo_attuale: 200.5 }, { attivo: false, saldo_attuale: 999 }, { attivo: true, saldo_attuale: '100.25' }]
  )
  assert.equal(r.totalBank, 749.75)
  assert.equal(r.totalReserved, 300.75)
  assert.equal(r.available, 449)
})

test('calculateLiquidity: accantonato > banca => disponibile NEGATIVO (-150), non nascosto', () => {
  const r = calculateLiquidity([{ tipo: 'entrata', importo: 100 }], [{ attivo: true, saldo_attuale: 250 }])
  assert.equal(r.available, -150)
})

test('calculateLiquidity: vuoto => tutto 0', () => {
  assert.deepEqual(calculateLiquidity([], []), { totalBank: 0, totalReserved: 0, available: 0 })
})

test('calculateLiquidity: errori di virgola mobile (0,1+0,2 uscite) non sporcano i centesimi', () => {
  // banca: +1 -0,1 -0,2 = 0,70
  const r = calculateLiquidity(
    [{ tipo: 'entrata', importo: 1 }, { tipo: 'uscita', importo: 0.1 }, { tipo: 'uscita', importo: 0.2 }], []
  )
  assert.equal(r.totalBank, 0.7)
})

// ───────────── Allocazioni da incasso giornaliero ─────────────

test('calculateSuggestedAllocations: solo attivi con tipo percentuale_incasso e % > 0', () => {
  // incasso 1234,56 ; A 10% = 123,456 -> 123,46 ; B 3,5% = 43,2096 -> 43,21
  // totale allocato = 166,67 ; non allocato = 1234,56 - 166,67 = 1067,89
  const r = calculateSuggestedAllocations([
    { id: 'A', nome: 'Tasse', attivo: true, tipo_versamento: 'percentuale_incasso', percentuale_incasso: 10 },
    { id: 'B', nome: 'Macchinari', attivo: true, tipo_versamento: 'percentuale_incasso', percentuale_incasso: '3.5' },
    { id: 'C', nome: 'Fisso', attivo: true, tipo_versamento: 'fisso_mensile', percentuale_incasso: 50 },
    { id: 'D', nome: 'Zero', attivo: true, tipo_versamento: 'percentuale_incasso', percentuale_incasso: 0 },
    { id: 'E', nome: 'Spento', attivo: false, tipo_versamento: 'percentuale_incasso', percentuale_incasso: 20 },
  ], 1234.56)
  assert.deepEqual(r.suggestions.map(s => [s.accantonamento_id, s.importo_suggerito]), [['A', 123.46], ['B', 43.21]])
  assert.equal(r.totalAllocated, 166.67)
  assert.equal(r.unallocated, 1067.89)
})

test('calculateSuggestedAllocations: incasso 0 => nessun importo, non allocato 0', () => {
  const r = calculateSuggestedAllocations(
    [{ id: 'A', attivo: true, tipo_versamento: 'percentuale_incasso', percentuale_incasso: 10 }], 0)
  assert.equal(r.totalAllocated, 0)
  assert.equal(r.unallocated, 0)
})

test('calculateSuggestedAllocations: 3 accantonamenti al 33,33% su 100 EUR => 99,99 allocati, 0,01 residui', () => {
  const acc = ['A', 'B', 'C'].map(id => ({ id, attivo: true, tipo_versamento: 'percentuale_incasso', percentuale_incasso: 33.33 }))
  const r = calculateSuggestedAllocations(acc, 100)
  assert.equal(r.totalAllocated, 99.99)
  assert.equal(r.unallocated, 0.01)
})

test('validateAllocations: somma sopra l incasso => non valida, eccedenza 5,00', () => {
  const r = validateAllocations([{ importo_finale: 60 }, { importo_finale: 45 }], 100)
  assert.equal(r.isValid, false)
  assert.equal(r.totalAllocated, 105)
  assert.equal(r.exceededBy, 5)
  assert.equal(r.remaining, -5)
})

test('validateAllocations: somma esattamente uguale all incasso => valida (0,1 + 0,2 su 0,30)', () => {
  // 0,10 + 0,20 = 0,30 = incasso 0,30: DEVE essere valida (residuo 0)
  const r = validateAllocations([{ importo_finale: 0.1 }, { importo_finale: 0.2 }], 0.3)
  assert.equal(r.isValid, true)
  assert.equal(r.remaining, 0)
})

test('validateAllocations: ripartizione 100% di 100,30 in tre quote (33,43 + 33,43 + 33,44) => valida', () => {
  // 33,43 + 33,43 + 33,44 = 100,30 esatto
  const r = validateAllocations([{ importo_finale: 33.43 }, { importo_finale: 33.43 }, { importo_finale: 33.44 }], 100.3)
  assert.equal(r.isValid, true)
})

test('validateAllocations: importi mancanti/stringa vengono letti come numeri', () => {
  const r = validateAllocations([{ importo_finale: '10.50' }, {}], 20)
  assert.equal(r.totalAllocated, 10.5)
  assert.equal(r.isValid, true)
})

// ───────────── Accantonamenti: avanzamento ─────────────

test('calculateAccantonamentoProgress: 150/600 = 25%, oltre obiettivo = max 100%, obiettivo 0/null = 0', () => {
  assert.equal(calculateAccantonamentoProgress(150, 600), 25)
  assert.equal(calculateAccantonamentoProgress(700, 600), 100)
  assert.equal(calculateAccantonamentoProgress(100, 0), 0)
  assert.equal(calculateAccantonamentoProgress(100, null), 0)
  assert.equal(calculateAccantonamentoProgress('150', '600'), 25)
  assert.equal(calculateAccantonamentoProgress(100, 300), 33.33)
})

// ───────────── Budget ─────────────

test('calculateBudgetComparison: soglie semaforo 80% giallo, 100% rosso', () => {
  const budget = [{ mese: 3, importo_mensile: '1000' }]
  const mov = v => [{ categoria: 'Affitto', data: '2026-03-10', importo: v }]
  const cmp = v => calculateBudgetComparison(budget, mov(v), 'Affitto', 3, 2026)
  assert.equal(cmp(799.99).status, 'green')
  assert.equal(cmp(800).status, 'yellow')
  assert.equal(cmp(999.99).status, 'yellow')
  assert.equal(cmp(1000).status, 'red')
  assert.equal(cmp(1250).percentage, 125)
  assert.equal(cmp(1250).difference, -250)
})

test('calculateBudgetComparison: ignora altre categorie e altri mesi, somma piu movimenti', () => {
  const budget = [{ mese: 3, importo_mensile: 500 }]
  const mov = [
    { categoria: 'Utenze', data: '2026-03-02', importo: 100 },
    { categoria: 'Utenze', data: '2026-03-31', importo: '50.50' },
    { categoria: 'Utenze', data: '2026-04-01', importo: 999 },
    { categoria: 'Altro', data: '2026-03-15', importo: 999 },
  ]
  const r = calculateBudgetComparison(budget, mov, 'Utenze', 3, 2026)
  assert.equal(r.actual, 150.5)
  assert.equal(r.difference, 349.5)
  assert.equal(r.percentage, 30.1)
})

test('calculateYearlyBudget: somma importi annuali', () => {
  assert.equal(calculateYearlyBudget([{ importo_annuale: '1200.50' }, { importo_annuale: 799.5 }, {}]), 2000)
})

test('distributeAnnualBudget: 12 mesi, la SOMMA deve fare esattamente l importo annuale (1000 EUR)', () => {
  // 1000/12 = 83,3333.. ; arrotondando ogni mese a 83,33 la somma farebbe 999,96 (persi 4 centesimi)
  const m = distributeAnnualBudget(1000)
  assert.equal(m.length, 12)
  assert.deepEqual(m.map(x => x.mese), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  const cents = m.reduce((s, x) => s + Math.round(x.importo_mensile * 100), 0)
  assert.equal(cents, 100000)
})

test('distributeAnnualBudget: importo divisibile (1200 => 100,00 al mese) e importo 0', () => {
  assert.ok(distributeAnnualBudget(1200).every(x => x.importo_mensile === 100))
  assert.ok(distributeAnnualBudget(0).every(x => x.importo_mensile === 0))
})

// ───────────── Dipendenti: ore, straordinari, assenze ─────────────

test('getWeeksInMonth: giorni/7 (feb 2026 = 28/7 = 4 ; mar 2026 = 31/7 = 4,43)', () => {
  assert.equal(getWeeksInMonth(2, 2026), 4)
  assert.equal(getWeeksInMonth(3, 2026), 4.43)
  assert.equal(getWeeksInMonth(2, 2024), 4.14) // bisestile: 29/7 = 4,142857
})

test('calculateMonthlyContractedHours: 40 h/sett, feb 2026 = 160 h', () => {
  assert.equal(calculateMonthlyContractedHours(40, 2, 2026), 160)
})

test('calculateMonthlyContractedHours: 40 h/sett, marzo 2026 = 40*31/7 = 177,14 h (non 177,2)', () => {
  // 1240/7 = 177,142857 -> 177,14. Moltiplicare per le settimane GIA' arrotondate (4,43) darebbe 177,20.
  assert.equal(calculateMonthlyContractedHours(40, 3, 2026), 177.14)
})

test('calculateOvertimeMonth: 180 h lavorate su 177,14 contrattuali => 2,86 h straordinario, 101,61%', () => {
  const r = calculateOvertimeMonth(
    { ore_contrattuali_settimanali: 40 },
    [{ data: '2026-03-05', ore_lavorate: 100 }, { data: '2026-03-20', ore_lavorate: '80' }, { data: '2026-04-02', ore_lavorate: 50 }],
    3, 2026
  )
  assert.equal(r.contractedHours, 177.14)
  assert.equal(r.actualHours, 180)
  assert.equal(r.overtime, 2.86)
  assert.equal(r.percentage, 101.61)
})

test('calculateOvertimeMonth: sotto le ore contrattuali => straordinario 0 (mai negativo)', () => {
  const r = calculateOvertimeMonth({ ore_contrattuali_settimanali: 40 }, [{ data: '2026-02-03', ore_lavorate: 100 }], 2, 2026)
  assert.equal(r.overtime, 0)
  assert.equal(r.percentage, 62.5) // 100/160
})

test('calculateOvertimeMonth: contratto 0 ore => nessuna divisione per zero', () => {
  const r = calculateOvertimeMonth({ ore_contrattuali_settimanali: 0 }, [{ data: '2026-02-03', ore_lavorate: 10 }], 2, 2026)
  assert.equal(r.percentage, 0)
  assert.equal(r.overtime, 10)
})

test('calculateAbsenceHours: lun 2 -> ven 6 marzo 2026 = 5 giorni lavorativi = 40 h', () => {
  assert.equal(calculateAbsenceHours('2026-03-02', '2026-03-06'), 40)
})

test('calculateAbsenceHours: sabato e domenica non contano (ven 6 -> lun 9 marzo = 2 giorni = 16 h)', () => {
  assert.equal(calculateAbsenceHours('2026-03-06', '2026-03-09'), 16)
})

test('calculateAbsenceHours: un solo giorno, ore giornaliere personalizzate (6 h)', () => {
  assert.equal(calculateAbsenceHours('2026-03-04', '2026-03-04', 6), 6)
})

test('calculateAbsenceHours: attraverso il cambio ora legale AUTUNNALE (ven 23 -> lun 26 ottobre 2026) = 2 giorni = 16 h', () => {
  // Il 25/10/2026 alle 03:00 le lancette tornano indietro: quel giorno dura 25 ore.
  assert.equal(calculateAbsenceHours('2026-10-23', '2026-10-26'), 16)
})

test('calculateAbsenceHours: attraverso il cambio ora legale PRIMAVERILE (ven 27 -> lun 30 marzo 2026) = 2 giorni = 16 h', () => {
  assert.equal(calculateAbsenceHours('2026-03-27', '2026-03-30'), 16)
})

test('calculateAbsenceHours: dal 1 al 31 ottobre 2026 (attraversa fine ora legale) = 22 giorni lavorativi = 176 h', () => {
  // ottobre 2026: 1 e' giovedi. 31 giorni = 4 settimane complete (28) + 3 giorni (gio 29, ven 30, sab 31)
  // lavorativi: 20 nelle 4 settimane + gio + ven = 22
  assert.equal(calculateAbsenceHours('2026-10-01', '2026-10-31'), 176)
})

test('calculateVacationBalance: 40 h/sett => 8 h/giorno * 26 = 208 h ; usate 40 => rimanenti 168', () => {
  const r = calculateVacationBalance(
    { ore_contrattuali_settimanali: 40 },
    [{ tipo: 'ferie', ore_totali: 24 }, { tipo: 'malattia', ore_totali: 16 }, { tipo: 'ferie', ore_totali: '16' }]
  )
  assert.equal(r.totali, 208)
  assert.equal(r.usate, 40)
  assert.equal(r.rimanenti, 168)
})

test('calculateVacationBalance: part-time 20 h/sett => 4 h/giorno * 26 = 104 h', () => {
  assert.equal(calculateVacationBalance({ ore_contrattuali_settimanali: 20 }, []).totali, 104)
})

test('matchesMonth: confini di mese (31/03 si, 01/04 no) e date non valide', () => {
  assert.equal(matchesMonth('2026-03-31', 3, 2026), true)
  assert.equal(matchesMonth('2026-04-01', 3, 2026), false)
  assert.equal(matchesMonth('2026-03-31', 3, 2025), false)
})
