// Test di lib/koibox-parsers.js (toNum: importi importati da Koibox) e
// lib/report/freeWindow.js (finestra dei 90 giorni gratuiti). Valori attesi a mano.
process.env.TZ = 'Europe/Rome'
import test from 'node:test'
import assert from 'node:assert/strict'
import { toNum } from '../lib/koibox-parsers.js'
import { isWithinReportFreeWindow, getReportFreeWindowDeadline } from '../lib/report/freeWindow.js'

test('toNum: numeri, virgola decimale, vuoti e testo', () => {
  assert.equal(toNum(12.5), 12.5)
  assert.equal(toNum('12,5'), 12.5)
  assert.equal(toNum('12.5'), 12.5)
  assert.equal(toNum('0'), 0)
  assert.equal(toNum(''), 0)
  assert.equal(toNum(null), 0)
  assert.equal(toNum(undefined), 0)
  assert.equal(toNum('abc'), 0)
  assert.equal(toNum('-45,90'), -45.9)
})

// BUG NOTO (non corretto: serve capire se Koibox esporta stringhe o celle numeriche, la correzione
// richiede un'euristica sul separatore): con migliaia in formato italiano/spagnolo "1.234,56"
// toNum sostituisce solo la virgola => "1.234.56" => parseFloat => 1,234 (invece di 1234,56): errore x1000.
test('toNum: "1.234,56" (migliaia con punto, decimali con virgola) = 1234,56',
  { todo: 'BUG noto: restituisce 1.234, errore di 1000x su importi con separatore delle migliaia' }, () => {
    assert.equal(toNum('1.234,56'), 1234.56)
  })

test('finestra 90 giorni: lancio 1 aprile 2026 => scade il 30 giugno 2026 alle 00:00', () => {
  process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE = '2026-04-01'
  // 1 aprile + 90 giorni: aprile 30 + maggio 31 = 61 giorni a fine maggio; +29 = 30 giugno
  assert.equal(isWithinReportFreeWindow(new Date('2026-06-29T23:59:00')), true)
  assert.equal(isWithinReportFreeWindow(new Date('2026-06-30T00:00:00')), false)
  assert.equal(isWithinReportFreeWindow(new Date('2026-04-01T00:00:00')), true)
})

test('finestra 90 giorni: data di lancio assente o non valida => sempre dentro la finestra (pre-lancio)', () => {
  delete process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE
  assert.equal(getReportFreeWindowDeadline(), null)
  assert.equal(isWithinReportFreeWindow(new Date('2030-01-01T00:00:00')), true)
  process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE = 'non-una-data'
  assert.equal(isWithinReportFreeWindow(new Date('2030-01-01T00:00:00')), true)
  delete process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE
})

// Scarto di 1 ora: la scadenza e' calcolata come lancio + 90*24 ore in millisecondi, ma se nel
// periodo cade il cambio ora legale i giorni di calendario non sono tutti di 24 h.
test('finestra 90 giorni: lancio 1 ottobre 2026 (attraversa fine ora legale) => scade il 30 dicembre alle 00:00',
  { todo: 'BUG minore: scade 1 ora prima (29 dicembre 23:00) per il cambio ora legale' }, () => {
    process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE = '2026-10-01'
    // ottobre 30 giorni residui (1->31) + novembre 30 + dicembre 30 => 30 dicembre
    assert.equal(isWithinReportFreeWindow(new Date('2026-12-29T23:30:00')), true)
    delete process.env.NEXT_PUBLIC_REPORT_LAUNCH_DATE
  })
