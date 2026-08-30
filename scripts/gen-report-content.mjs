// Generatore deterministico dei contenuti del report CARE.
//
// Estrae i blocchi "TESTO PER LA TITOLARE" da `contenuti-report-5-elementi.md`
// (fonte editoriale unica, mantenuta da Federica/Elena) e li trascrive UNA
// TANTUM in `lib/beautyx/reportContent.js`, che è ciò che il motore di
// assemblaggio importa a runtime. Motivazione (piano-sviluppo-report-care.md,
// punto 7): NON un parsing fragile del Markdown a runtime, ma un passaggio di
// trascrizione controllato, così il .md resta la sorgente per il controllo
// riga-per-riga di Elena e il codice non diverge dal testo approvato.
//
// Uso: `node scripts/gen-report-content.mjs` dalla root del repo.
// Rigenerare ogni volta che `contenuti-report-5-elementi.md` cambia.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'contenuti-report-5-elementi.md')
const OUT = join(ROOT, 'lib', 'beautyx', 'reportContent.js')

const ELEMENTI = ['fuoco', 'acqua', 'aria', 'terra', 'metallo']
const TAG_TO_KEY = { FUOCO: 'fuoco', ACQUA: 'acqua', ARIA: 'aria', TERRA: 'terra', METALLO: 'metallo' }

const raw = readFileSync(SRC, 'utf8')
const lines = raw.split(/\r?\n/)

// Un heading markdown: livello + testo.
function heading(line) {
  const m = /^(#{1,6})\s+(.*)$/.exec(line)
  return m ? { level: m[1].length, text: m[2] } : null
}

// True se la riga chiude un blocco di "TESTO PER LA TITOLARE".
function isBoundary(line) {
  return /^#{1,6}\s/.test(line) || /^---\s*$/.test(line) || /^\*\*NOTA/.test(line) || /^\*\*TESTO/.test(line)
}

// Raccoglie il testo che segue il marker "**TESTO PER LA TITOLARE:**" a partire
// dall'indice `start` (prima riga marker) fino al primo boundary. Restituisce
// { text, nextIndex }. I capoversi (righe vuote) diventano \n\n; le righe
// soft-wrapped dentro lo stesso capoverso si uniscono con uno spazio.
function collectTesto(startIdx) {
  let i = startIdx + 1
  const paragraphs = []
  let cur = []
  for (; i < lines.length; i++) {
    const line = lines[i]
    if (isBoundary(line)) break
    if (line.trim() === '') {
      if (cur.length) { paragraphs.push(cur.join(' ')); cur = [] }
      continue
    }
    cur.push(line.trim())
  }
  if (cur.length) paragraphs.push(cur.join(' '))
  return { text: paragraphs.join('\n\n').trim(), nextIndex: i }
}

// Trova l'indice della prossima riga "**TESTO PER LA TITOLARE:**" tra [from, to).
function findTesto(from, to) {
  for (let i = from; i < to; i++) {
    if (/^\*\*TESTO PER LA TITOLARE:\*\*/.test(lines[i])) return i
  }
  return -1
}

// ─── 1. Individua i confini delle sezioni di capitolo (i 5 elementi) e delle Parti 1/4/5.
const sections = [] // { kind:'capitolo'|'parte1'|'parte4'|'parte5', element?, start, end }
for (let i = 0; i < lines.length; i++) {
  const h = heading(lines[i])
  if (!h || h.level !== 1) continue
  const capitolo = /capitolo (FUOCO|ACQUA|ARIA|TERRA|METALLO)/.exec(h.text)
  if (capitolo) sections.push({ kind: 'capitolo', element: TAG_TO_KEY[capitolo[1]], start: i })
}
// Heading di livello 2 per le Parti 1/4/5.
const parteMarkers = []
for (let i = 0; i < lines.length; i++) {
  const h = heading(lines[i])
  if (!h || h.level !== 2) continue
  if (/^Parte 1 —/.test(h.text)) parteMarkers.push({ kind: 'parte1', start: i })
  if (/^Parte 4 —/.test(h.text)) parteMarkers.push({ kind: 'parte4', start: i })
  if (/^Parte 5 —/.test(h.text)) parteMarkers.push({ kind: 'parte5', start: i })
}

// Confini: ogni capitolo termina dove inizia il successivo capitolo o la prima Parte.
const firstParte = parteMarkers.length ? Math.min(...parteMarkers.map((p) => p.start)) : lines.length
for (let s = 0; s < sections.length; s++) {
  sections[s].end = s + 1 < sections.length ? sections[s + 1].start : firstParte
}

const out = {
  apertura: {},          // element -> { base, differenzaAmbito }
  ritratto: {},          // element -> { eccesso_trasversale, eccesso_localizzato, carenza_non_nutrita }
  applicazione: {},      // element -> { domande, giaFluisce }
  fraseMotivazionale: {},// element -> string
  ctaFinale: '',         // unica
}

// ─── 2. Capitoli: ritratto (3 varianti) + applicazione pratica + "già fluisce".
for (const sec of sections) {
  const el = sec.element
  out.ritratto[el] = {}
  out.applicazione[el] = {}
  // Scorri gli heading livello 3 dentro il capitolo.
  const subs = []
  for (let i = sec.start; i < sec.end; i++) {
    const h = heading(lines[i])
    if (h && h.level === 3) subs.push({ text: h.text, start: i })
  }
  for (let k = 0; k < subs.length; k++) {
    const sub = subs[k]
    const subEnd = k + 1 < subs.length ? subs[k + 1].start : sec.end
    const testoIdx = findTesto(sub.start, subEnd)
    if (testoIdx === -1) continue
    const { text } = collectTesto(testoIdx)
    if (/^Variante 1/.test(sub.text)) out.ritratto[el].eccesso_trasversale = text
    else if (/^Variante 2/.test(sub.text)) out.ritratto[el].eccesso_localizzato = text
    else if (/^Variante 3/.test(sub.text)) out.ritratto[el].carenza_non_nutrita = text
  }
  // "Quello che già fluisce bene": il testo segue DIRETTAMENTE l'heading di
  // livello 3, senza marker "**TESTO PER LA TITOLARE:**".
  for (let k = 0; k < subs.length; k++) {
    if (!/^Quello che gi/.test(subs[k].text)) continue
    const { text } = collectTesto(subs[k].start) // parte subito dopo l'heading, si ferma al boundary
    out.applicazione[el].giaFluisce = text
  }
  // Applicazione pratica (sezione "## B. Applicazione pratica"): il primo
  // "**TESTO PER LA TITOLARE:**" dopo l'heading "B." e prima del sub "Quello
  // che già fluisce bene".
  let bStart = -1
  let bEnd = sec.end
  for (let i = sec.start; i < sec.end; i++) {
    const h = heading(lines[i])
    if (h && h.level === 2 && /Applicazione pratica/.test(h.text)) { bStart = i }
    if (h && h.level === 3 && /^Quello che gi/.test(h.text) && bStart !== -1) { bEnd = i; break }
  }
  if (bStart !== -1) {
    const testoIdx = findTesto(bStart, bEnd)
    if (testoIdx !== -1) out.applicazione[el].domande = collectTesto(testoIdx).text
  }
}

// ─── 3. Parte 1 — apertura per elemento dominante.
const parte1 = parteMarkers.find((p) => p.kind === 'parte1')
const parte4 = parteMarkers.find((p) => p.kind === 'parte4')
const parte5 = parteMarkers.find((p) => p.kind === 'parte5')
if (parte1) {
  const p1End = parte4 ? parte4.start : lines.length
  const subs = []
  for (let i = parte1.start; i < p1End; i++) {
    const h = heading(lines[i])
    if (h && h.level === 3) {
      const m = /\(nota interna:\s*(FUOCO|ACQUA|ARIA|TERRA|METALLO)/.exec(h.text)
      if (m) subs.push({ element: TAG_TO_KEY[m[1]], start: i })
    }
  }
  for (let k = 0; k < subs.length; k++) {
    const sub = subs[k]
    const subEnd = k + 1 < subs.length ? subs[k + 1].start : p1End
    const testoIdx = findTesto(sub.start, subEnd)
    if (testoIdx === -1) continue
    let { text } = collectTesto(testoIdx)
    // Estrae la clausola condizionale [SE DIFFERENZA AMBITO: ...].
    let differenzaAmbito = ''
    const brm = /\[SE DIFFERENZA AMBITO:\s*([\s\S]*?)\]/.exec(text)
    if (brm) {
      differenzaAmbito = brm[1].replace(/\s+/g, ' ').trim()
      // Rimuove il segnaposto (e lo spazio superfluo) dal testo base.
      text = text.replace(/\s*\[SE DIFFERENZA AMBITO:[\s\S]*?\]\s*/, ' ').replace(/\s{2,}/g, ' ').trim()
    }
    out.apertura[sub.element] = { base: text, differenzaAmbito }
  }
}

// ─── 4. Parte 4 — frase motivazionale (bullet per elemento).
if (parte4) {
  const p4End = parte5 ? parte5.start : lines.length
  const testoIdx = findTesto(parte4.start, p4End)
  if (testoIdx !== -1) {
    // Raccogli tutte le righe fino al boundary, poi ricomponi i bullet.
    let i = testoIdx + 1
    const buf = []
    for (; i < p4End; i++) {
      if (isBoundary(lines[i])) break
      buf.push(lines[i])
    }
    // Unisci e risuddividi sui bullet "- *(TAG ...)*".
    const joined = buf.join('\n')
    const items = joined.split(/\n(?=-\s*\*\()/)
    for (const item of items) {
      const m = /-\s*\*\((FUOCO|ACQUA|ARIA|TERRA|METALLO)[^)]*\)\*\s*([\s\S]*)/.exec(item.trim())
      if (m) {
        const key = TAG_TO_KEY[m[1]]
        out.fraseMotivazionale[key] = m[2].replace(/\s+/g, ' ').trim()
      }
    }
  }
}

// ─── 5. Parte 5 — CTA finale (testo unico).
if (parte5) {
  // La Parte 5 può avere più blocchi TESTO nel changelog; prendiamo il PRIMO
  // dopo l'heading di Parte 5, che è la CTA vera (prima delle "Note per il
  // Coordinatore").
  let p5End = lines.length
  for (let i = parte5.start + 1; i < lines.length; i++) {
    const h = heading(lines[i])
    if (h && h.level === 2) { p5End = i; break }
  }
  const testoIdx = findTesto(parte5.start, p5End)
  if (testoIdx !== -1) out.ctaFinale = collectTesto(testoIdx).text
}

// ─── 6. Validazione minima: tutti i blocchi presenti per tutti gli elementi.
const problemi = []
for (const el of ELEMENTI) {
  if (!out.apertura[el]?.base) problemi.push(`apertura.${el}.base mancante`)
  for (const v of ['eccesso_trasversale', 'eccesso_localizzato', 'carenza_non_nutrita']) {
    if (!out.ritratto[el]?.[v]) problemi.push(`ritratto.${el}.${v} mancante`)
  }
  if (!out.applicazione[el]?.domande) problemi.push(`applicazione.${el}.domande mancante`)
  if (!out.applicazione[el]?.giaFluisce) problemi.push(`applicazione.${el}.giaFluisce mancante`)
  if (!out.fraseMotivazionale[el]) problemi.push(`fraseMotivazionale.${el} mancante`)
}
if (!out.ctaFinale) problemi.push('ctaFinale mancante')
if (problemi.length) {
  console.error('ERRORE: blocchi mancanti nella trascrizione:\n - ' + problemi.join('\n - '))
  process.exit(1)
}

// ─── 7. Scrittura del modulo.
const header = `// ⚠️ FILE GENERATO — non modificare a mano.
// Prodotto da scripts/gen-report-content.mjs a partire da
// contenuti-report-5-elementi.md (fonte editoriale unica, Federica/Elena).
// Rigenerare con: node scripts/gen-report-content.mjs
//
// Contiene SOLO i blocchi "TESTO PER LA TITOLARE" (mai le NOTE INTERNE, mai i
// nomi degli elementi nel testo). Usato da lib/beautyx/reportContent per
// l'assemblaggio deterministico del report (task #153).
`
const body = `export const REPORT_CONTENT = ${JSON.stringify(out, null, 2)}\n`
writeFileSync(OUT, header + '\n' + body, 'utf8')
console.log('OK: generato', OUT)
console.log('Elementi:', ELEMENTI.join(', '))
console.log('CTA finale (primi 60):', out.ctaFinale.slice(0, 60) + '...')
