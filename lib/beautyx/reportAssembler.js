// Assemblaggio DETERMINISTICO del report CARE (task #153).
//
// Non genera testo via AI (costo + rischio di uscire dai testi approvati
// riga-per-riga da Elena): seleziona i blocchi già scritti da Federica
// (REPORT_CONTENT, trascritti da contenuti-report-5-elementi.md) in base al
// blocco individuato dallo scoring (elemento dominante + tipo_blocco), e li
// compone nelle 5 Parti della "Struttura proposta del report"
// (beautyx-report-profiling-note.md).
//
// Fonte del testo: lib/beautyx/reportContent.js (FILE GENERATO da
// scripts/gen-report-content.mjs). Qui NON si riscrive né si parafrasa nulla.

import { REPORT_CONTENT } from './reportContent'

const ELEMENTI = ['fuoco', 'acqua', 'aria', 'terra', 'metallo']

function paragrafiHtml(testo) {
  return String(testo || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join('\n')
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * Compone il report a partire dallo scoring finale.
 * @param {object} scores - riga profiling_element_scores (o oggetto equivalente):
 *   { elemento_dominante, elemento_eccesso, elemento_carenza, leva_riequilibrio,
 *     tipo_blocco, punti_*, breakdown_per_ambito, mostra_differenza_ambito }
 * @returns {{contenuto_json: object, contenuto_html: string}}
 */
export function assemblaReport(scores) {
  const dominante = scores.elemento_dominante
  if (!ELEMENTI.includes(dominante)) {
    throw new Error(`assemblaReport: elemento_dominante non valido: ${dominante}`)
  }

  // La spina del report è sempre l'elemento dominante (= eccesso), coerente con
  // la NOTA di Parte 1 ("attiva il blocco corrispondente all'elemento con
  // punteggio totale più alto"). La variante di ritratto è il tipo_blocco.
  const varianteRitratto = ['eccesso_trasversale', 'eccesso_localizzato', 'carenza_non_nutrita']
    .includes(scores.tipo_blocco)
    ? scores.tipo_blocco
    : 'eccesso_trasversale'

  const apertura = REPORT_CONTENT.apertura[dominante]
  const mostraDiff = !!scores.mostra_differenza_ambito && !!apertura.differenzaAmbito
  const testoApertura = mostraDiff
    ? `${apertura.base} ${apertura.differenzaAmbito}`.replace(/\s{2,}/g, ' ').trim()
    : apertura.base

  const ritratto = REPORT_CONTENT.ritratto[dominante][varianteRitratto]
  const applicazione = REPORT_CONTENT.applicazione[dominante]
  const frase = REPORT_CONTENT.fraseMotivazionale[dominante]
  const cta = REPORT_CONTENT.ctaFinale

  const contenuto_json = {
    versione: 1,
    parte1_apertura: testoApertura,
    parte2_ritratto: { testo: ritratto, variante: varianteRitratto },
    parte3_applicazione: { domande: applicazione.domande, gia_fluisce: applicazione.giaFluisce },
    parte4_frase: frase,
    parte5_cta: cta,
    // Meta interna (NON destinata alla titolare) — utile per audit/consulenza.
    meta: {
      elemento_dominante: dominante,
      elemento_eccesso: scores.elemento_eccesso,
      elemento_carenza: scores.elemento_carenza,
      leva_riequilibrio: scores.leva_riequilibrio,
      tipo_blocco: varianteRitratto,
      differenza_ambito_mostrata: mostraDiff,
      punteggi: {
        fuoco: scores.punti_fuoco, acqua: scores.punti_acqua, aria: scores.punti_aria,
        terra: scores.punti_terra, metallo: scores.punti_metallo,
      },
    },
  }

  const contenuto_html = renderHtml(contenuto_json)
  return { contenuto_json, contenuto_html }
}

// Resa HTML formato-agnostica (fragment auto-stilato con la palette Beautyx —
// oro #c9a34a, Playfair/Inter). Nessun nome di elemento nel testo: il report
// mostra solo i blocchi comportamentali. La meta non viene MAI resa in HTML.
function renderHtml(json) {
  return `<article class="care-report" style="max-width:680px;margin:0 auto;font-family:var(--font-inter,system-ui,sans-serif);color:#4a4636;line-height:1.6;">
  <style>
    .care-report h2{font-family:var(--font-playfair,Georgia,serif);font-weight:700;font-style:italic;color:#1a1a0f;font-size:1.5rem;margin:2rem 0 .6rem;}
    .care-report .kicker{font-size:.72rem;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#a97e1f;margin-top:2rem;}
    .care-report p{margin:0 0 1rem;}
    .care-report .care-cta{background:#faf3df;border:1px solid #e3d9c2;border-radius:16px;padding:20px 24px;margin-top:2rem;}
    .care-report .care-frase{font-family:var(--font-playfair,Georgia,serif);font-style:italic;font-size:1.15rem;color:#1a1a0f;border-left:3px solid #c9a34a;padding-left:16px;margin:2rem 0;}
  </style>
  <div class="kicker">Il tuo profilo</div>
  ${paragrafiHtml(json.parte1_apertura)}

  <h2>Il ritratto di come guidi il tuo centro</h2>
  ${paragrafiHtml(json.parte2_ritratto.testo)}

  <h2>Dove la tua energia può scorrere ancora meglio</h2>
  ${paragrafiHtml(json.parte3_applicazione.domande)}

  <div class="kicker">Quello che già fluisce bene</div>
  ${paragrafiHtml(json.parte3_applicazione.gia_fluisce)}

  <p class="care-frase">${escapeHtml(json.parte4_frase)}</p>

  <div class="care-cta">
    ${paragrafiHtml(json.parte5_cta)}
  </div>
</article>`
}
