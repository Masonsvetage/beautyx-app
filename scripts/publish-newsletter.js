// Pubblica (o aggiorna) un numero di newsletter nell'archivio storico
// pubblico di /newsletter (tabella public.newsletter_posts).
//
// Da eseguire SOLO dopo che Mason ha approvato definitivamente il testo.
// Usa la service key (bypassa RLS) — non esporre mai questo script o le
// sue variabili d'ambiente lato client.
//
// Uso:
//   node scripts/publish-newsletter.js \
//     --slug=agenda-buco-nero \
//     --titolo="Il buco in agenda che ti sta svuotando il conto" \
//     --file=testi/newsletter-2026-08-11.md \
//     --tags="Agenda & tempo,Numeri & margini" \
//     [--estratto="Sommario breve per la card..."] \
//     [--bozza]   (salva pubblicato=false invece di pubblicarlo subito)
//
// Il file --file può essere .md (markdown semplice: #, ##, **, *, liste "- ",
// paragrafi separati da riga vuota, --- come separatore) oppure .html/.htm
// (usato così com'è, incollato nel corpo). Se il file è .md viene convertito
// con un parser minimale pensato per il tono Beautyx (niente tabelle/immagini
// complesse) — per contenuti più ricchi scrivi direttamente l'HTML.
//
// Rieseguire lo script con lo stesso --slug aggiorna l'articolo esistente
// (upsert su slug) invece di duplicarlo.

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

dotenv.config({ path: '.env.local' })

const TAG_TASSONOMIA = [
  'Mindset & identità',
  'Numeri & margini',
  'Agenda & tempo',
  'Clienti & relazione',
  'Marketing & posizionamento',
  'Vendita & pacchetti',
  'Squadra & delega',
  'Normative & strumenti',
]

function parseArgs(argv) {
  const out = {}
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue
    const eq = raw.indexOf('=')
    if (eq === -1) {
      out[raw.slice(2)] = true
    } else {
      out[raw.slice(2, eq)] = raw.slice(eq + 1)
    }
  }
  return out
}

// Markdown -> HTML minimale, coerente con le classi .bx-article già in app/newsletter/page.js
function markdownToHtml(md) {
  const blocks = md.replace(/\r\n/g, '\n').split(/\n{2,}/)
  const inline = (s) =>
    s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(?<!\*)\*(?!\*)(.+?)\*(?!\*)/g, '<em>$1</em>')

  return blocks
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''
      if (/^---+$/.test(trimmed)) return '<hr />'
      const h = trimmed.match(/^(#{1,3})\s+(.*)$/)
      if (h) {
        const level = Math.min(h[1].length + 1, 4) // # newsletter → h2/h3 (h1 è il titolo della pagina)
        return `<h${level}>${inline(h[2])}</h${level}>`
      }
      const lines = trimmed.split('\n')
      if (lines.every((l) => /^[-*]\s+/.test(l.trim()))) {
        const items = lines.map((l) => `<li>${inline(l.trim().replace(/^[-*]\s+/, ''))}</li>`).join('')
        return `<ul>${items}</ul>`
      }
      return `<p>${inline(lines.join('<br />'))}</p>`
    })
    .filter(Boolean)
    .join('\n')
}

function leggiContenuto(filePath) {
  const full = path.resolve(process.cwd(), filePath)
  const raw = fs.readFileSync(full, 'utf8')
  const ext = path.extname(full).toLowerCase()
  if (ext === '.html' || ext === '.htm') return raw
  return markdownToHtml(raw)
}

function estraiEstratto(html, maxLen = 160) {
  const testo = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (testo.length <= maxLen) return testo
  return `${testo.slice(0, maxLen).trim()}…`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const mancanti = ['slug', 'titolo', 'file'].filter((k) => !args[k])
  if (mancanti.length > 0) {
    console.error(`❌ Parametri obbligatori mancanti: ${mancanti.join(', ')}`)
    console.error('Uso: node scripts/publish-newsletter.js --slug=... --titolo="..." --file=percorso.md --tags="tag1,tag2" [--estratto="..."] [--bozza]')
    process.exit(1)
  }

  const slug = String(args.slug).trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  const titolo = String(args.titolo)
  const tags = args.tags
    ? String(args.tags).split(',').map((t) => t.trim()).filter(Boolean)
    : []

  const tagSconosciuti = tags.filter((t) => !TAG_TASSONOMIA.includes(t))
  if (tagSconosciuti.length > 0) {
    console.warn(`⚠️  Tag non presenti nella tassonomia definitiva (verrà comunque salvato, ma segnalalo ad Alessia): ${tagSconosciuti.join(', ')}`)
  }

  let contenuto
  try {
    contenuto = leggiContenuto(args.file)
  } catch (err) {
    console.error(`❌ Impossibile leggere il file "${args.file}": ${err.message}`)
    process.exit(1)
  }

  const estratto = args.estratto ? String(args.estratto) : estraiEstratto(contenuto)
  const pubblicato = !args.bozza

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_KEY mancanti in .env.local')
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const row = {
    slug,
    titolo,
    contenuto,
    estratto,
    tags,
    pubblicato,
    data_pubblicazione: pubblicato ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  }

  console.log(`\n${pubblicato ? '📰 Pubblico' : '📝 Salvo come bozza'}: "${titolo}" (slug: ${slug})`)
  console.log(`   Tag: ${tags.length > 0 ? tags.join(', ') : '(nessuno)'}`)
  console.log(`   Estratto: ${estratto}`)

  const { data, error } = await supabase
    .from('newsletter_posts')
    .upsert(row, { onConflict: 'slug' })
    .select()
    .single()

  if (error) {
    console.error('❌ Errore Supabase:', error.message)
    process.exit(1)
  }

  console.log(`\n✅ Fatto. Riga id=${data.id}, aggiornata su public.newsletter_posts.`)
  if (pubblicato) console.log('   Comparirà in /newsletter → "Newsletter già uscite" (fino a 12 più recenti).')
}

main().catch((err) => {
  console.error('❌ Errore imprevisto:', err)
  process.exit(1)
})
