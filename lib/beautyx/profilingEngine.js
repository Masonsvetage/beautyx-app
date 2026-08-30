// Motore del questionario di profiling CARE — task #151 (piano-sviluppo-report-care.md,
// punto 3 "Motore del questionario in /api/beautyx/chat").
//
// Principi da rispettare (vedi piano e memory/davide.md):
// - Lo STATO di avanzamento vive interamente in `profiling_sessions` (fase,
//   ambito_corrente, scenari_somministrati, narrazioni_completate) — MAI nello
//   storico messaggi della chat. Ogni tool qui legge/scrive quello stato.
// - Le scelte forzate sono deterministiche: il punteggio si ricalcola SEMPRE
//   server-side (mai fidarsi del client) — vedi salvaRispostaScenario.
// - Il banco scenari (36, 3 ambiti × 12) resta contenuto Federica versionato
//   su file .md, trascritto in lib/beautyx/profilingScenarioBank.js — non è
//   una tabella DB (coerente con come agent_prompts separa già prompt
//   editabili da codice, vedi piano-sviluppo-report-care.md punto 1).
// - Tetto massimo per ambito: nucleo (6) + riserva (6) = 12, mai oltre.
//
// COSA NON è ancora implementato qui (fuori scope task #151, vedi task #152/153):
// - individuaBlocco / eccesso-carenza-leva sul ciclo a 5 elementi (scoring
//   engine finale, task #152) — qui uso solo un controllo di "ambiguità"
//   locale per ambito, per decidere se somministrare la riserva.
// - analisi AI del testo libero (task #152) — salvaNarrazioneLibera salva la
//   narrazione con analisi_ai=null, pronta per essere popolata in un secondo
//   momento da quel motore, senza bloccare il flusso.
// - assemblaggio del report finale da contenuti-report-5-elementi.md (task
//   #153) — genera_report_profiling qui crea solo il record 'bozza'.

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { AMBITI, NARRAZIONI_LIBERE, SCENARIO_ORDER, SCENARI } from './profilingScenarioBank'
import { assemblaReport } from './reportAssembler'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// Client Anthropic ISOLATO per la sola analisi del testo libero del profiling
// (task #152) — separato dal loop tool della chat gestionale, per tenere il
// costo di questa parte misurabile e distinto (vedi piano-sviluppo-report-care.md
// punto 6, "una chiamata Anthropic dedicata, non nel loop tool della chat").
const anthropicProfiling = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Punti per posizione nell'ordinamento ipsativo (1=più proprio, 5=meno proprio).
// Stessa tabella descritta in piano-sviluppo-report-care.md, punto 5.
const PUNTI_PER_POSIZIONE = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 0 }
const ELEMENTI_VALIDI = new Set(['fuoco', 'acqua', 'aria', 'terra', 'metallo'])

// Soglia di "ambiguità" per decidere se serve la riserva dopo il nucleo:
// se lo scarto tra il punteggio più alto e il secondo più alto (per ambito)
// è INFERIORE a questa soglia, il profilo è considerato ancora ambiguo.
// Placeholder prudenziale — da tarare con dati reali (vedi piano, punto 5,
// stesso identico avviso già presente lì: "parametro configurabile, non
// hardcoded nella logica"). Tenuta qui come costante di modulo per lo stesso
// motivo.
const SOGLIA_AMBIGUITA = 3

// ─────────────────────────────────────────────────────────────────────────────
// SCORING ENGINE — ciclo eccesso → controllore carente → leva (task #152)
//
// I DUE CICLI sono la FONTE UNICA DI VERITÀ del sistema (coerente con
// beautyx-report-profiling-note.md, memory/generale.md e la tabella fissa in
// memory/federica.md). Tutto il resto (controllore, nutritore, leva) si deriva
// da questi due array ciclici — MAI da tabelle scritte a mano due volte, così
// un eventuale futuro aggiustamento dei cicli non può disallinearsi (il piano,
// punto 5, avvisa esplicitamente di questo rischio).
//
// Ciclo di CONTROLLO/compensazione (ogni elemento è compensato dal SUCCESSIVO):
//   Fuoco → Acqua → Aria → Terra → Metallo → (Fuoco)
const CICLO_CONTROLLO = ['fuoco', 'acqua', 'aria', 'terra', 'metallo']
// Ciclo GENERATIVO/di nutrimento (ogni elemento nutre il SUCCESSIVO — stella a
// cinque punte del 25/08/2026):
//   Fuoco → Aria → Metallo → Acqua → Terra → (Fuoco)
const CICLO_GENERATIVO = ['fuoco', 'aria', 'metallo', 'acqua', 'terra']

const ELEMENTI = ['fuoco', 'acqua', 'aria', 'terra', 'metallo']

// Scarto minimo (dominante vs media degli altri) perché un eccesso sia
// considerato "significativo" (un blocco reale, non un profilo piatto).
// Placeholder configurabile — da tarare con dati reali, stessa cautela già
// richiesta nel piano (punto 5) per la soglia di significatività.
const SOGLIA_SIGNIFICATIVITA = 2

function successore(ciclo, elemento) {
  const i = ciclo.indexOf(elemento)
  return i === -1 ? null : ciclo[(i + 1) % ciclo.length]
}
function predecessore(ciclo, elemento) {
  const i = ciclo.indexOf(elemento)
  return i === -1 ? null : ciclo[(i - 1 + ciclo.length) % ciclo.length]
}
// Controllore di E = il SUCCESSIVO di E nel ciclo di controllo (chi compensa E).
export function controllore(elemento) { return successore(CICLO_CONTROLLO, elemento) }
// Nutritore di X = il PREDECESSORE di X nel ciclo generativo (chi nutre X).
export function nutritore(elemento) { return predecessore(CICLO_GENERATIVO, elemento) }

/**
 * Individua il blocco a 3 nodi a partire dai punteggi totali per elemento.
 * Legge fissa del sistema (Mason): l'eccesso significativo di un elemento E
 * implica SEMPRE la carenza del suo controllore C(E); la leva di riequilibrio è
 * SEMPRE il nutritore di C(E) nel ciclo generativo (mai limitare E direttamente).
 *   - eccesso  = elemento con punteggio totale più alto (= dominante)
 *   - carenza  = controllore(eccesso)
 *   - leva     = nutritore(carenza)
 * Restituisce anche `significativo` (l'eccesso spicca abbastanza sulla media?).
 */
export function individuaBlocco(totali) {
  const ordinati = ELEMENTI
    .map((e) => [e, Number(totali?.[e] || 0)])
    .sort((a, b) => b[1] - a[1])
  const eccesso = ordinati[0][0]
  const carenza = controllore(eccesso)
  const leva = nutritore(carenza)
  const somma = ordinati.reduce((s, [, v]) => s + v, 0)
  const media = ELEMENTI.length ? somma / ELEMENTI.length : 0
  const significativo = (ordinati[0][1] - media) >= SOGLIA_SIGNIFICATIVITA
  return { dominante: eccesso, eccesso, carenza, leva, significativo }
}

// Elemento con punteggio massimo in una mappa {elemento: punti} (ties: il
// primo in ordine ELEMENTI). Usato per il conteggio dei "lead" per ambito.
function elementoMax(mappa) {
  let best = null
  let bestV = -Infinity
  for (const e of ELEMENTI) {
    const v = Number(mappa?.[e] || 0)
    if (v > bestV) { bestV = v; best = e }
  }
  return best
}

function nextAmbito(ambitoCorrente) {
  const idx = AMBITI.indexOf(ambitoCorrente)
  if (idx === -1 || idx === AMBITI.length - 1) return null
  return AMBITI[idx + 1]
}

/**
 * Recupera la sessione di profiling attiva ('in_corso') per il centro, oppure
 * ne crea una nuova se non esiste (prima chiamata in assoluto). Idempotente
 * per costruzione: l'indice unico parziale su (centro_id) WHERE stato='in_corso'
 * garantisce che non ce ne sia mai più di una attiva.
 */
async function getOrCreateSessione(centro_id, user_id) {
  const { data: esistente, error: selectErr } = await supabase
    .from('profiling_sessions')
    .select('*')
    .eq('centro_id', centro_id)
    .eq('stato', 'in_corso')
    .maybeSingle()

  if (selectErr) throw new Error(`Errore lettura profiling_sessions: ${selectErr.message}`)
  if (esistente) return esistente

  const { data: nuova, error: insertErr } = await supabase
    .from('profiling_sessions')
    .insert({ centro_id, user_id, ambito_corrente: AMBITI[0] })
    .select('*')
    .single()

  if (insertErr) throw new Error(`Errore creazione profiling_sessions: ${insertErr.message}`)
  return nuova
}

function scenarioCodesPerAmbito(ambito) {
  const ordine = SCENARIO_ORDER[ambito]
  if (!ordine) return []
  return [...ordine.nucleo, ...ordine.riserva]
}

/**
 * Calcola i punteggi per ambito (elemento -> somma punti) leggendo le
 * risposte già salvate in profiling_scenario_responses per quella sessione.
 */
async function punteggiPerAmbito(session_id, ambito) {
  const { data: risposte, error } = await supabase
    .from('profiling_scenario_responses')
    .select('punteggi')
    .eq('session_id', session_id)
    .eq('ambito', ambito)

  if (error) throw new Error(`Errore lettura punteggi ambito: ${error.message}`)

  const totali = { fuoco: 0, acqua: 0, aria: 0, terra: 0, metallo: 0 }
  for (const riga of risposte || []) {
    for (const elemento of Object.keys(totali)) {
      totali[elemento] += Number(riga.punteggi?.[elemento] || 0)
    }
  }
  return totali
}

function isProfiloDefinito(totaliAmbito) {
  const valori = Object.values(totaliAmbito).sort((a, b) => b - a)
  const scarto = (valori[0] || 0) - (valori[1] || 0)
  return scarto >= SOGLIA_AMBIGUITA
}

/**
 * Tool: get_prossimo_scenario
 * Determina il prossimo passo del questionario per il centro corrente e lo
 * restituisce pronto per la UI (punto 8, non ancora costruita): scenario a
 * scelta forzata, oppure segnale di passare alla narrazione libera per
 * l'ambito corrente, oppure segnale di generare il report (fase completata).
 * NON espone mai il tag elemento delle opzioni.
 */
export async function getProssimoScenario(centro_id, user_id) {
  const sessione = await getOrCreateSessione(centro_id, user_id)

  if (sessione.fase === 'completato') {
    return { tipo: 'completato', messaggio: 'Il questionario è già completo. Usa genera_report_profiling per ottenere il report.' }
  }

  const ambito = sessione.ambito_corrente || AMBITI[0]
  const somministrati = new Set(sessione.scenari_somministrati || [])
  const narrazioniFatte = new Set(sessione.narrazioni_completate || [])
  const ordine = SCENARIO_ORDER[ambito]

  if (!ordine) {
    return { tipo: 'errore', messaggio: `Ambito non riconosciuto: ${ambito}` }
  }

  // 1. Nucleo — sempre proposto per intero prima di qualunque riserva.
  const nucleoMancante = ordine.nucleo.find((code) => !somministrati.has(code))
  if (nucleoMancante) {
    return costruisciRispostaScenario(nucleoMancante, ambito, sessione)
  }

  // 2. Nucleo esaurito — decide se serve la riserva per questo ambito.
  const totaliAmbito = await punteggiPerAmbito(sessione.id, ambito)
  const bastaIlNucleo = isProfiloDefinito(totaliAmbito)

  if (!bastaIlNucleo) {
    const riservaMancante = ordine.riserva.find((code) => !somministrati.has(code))
    if (riservaMancante) {
      return costruisciRispostaScenario(riservaMancante, ambito, sessione)
    }
    // Riserva esaurita (tetto massimo raggiunto per l'ambito): si procede
    // comunque alla narrazione, il profilo resta quello disponibile.
  }

  // 3. Scelte forzate esaurite (o profilo già definito) per questo ambito —
  //    passa alla narrazione libera, se non ancora fatta.
  if (!narrazioniFatte.has(ambito)) {
    const narrazione = NARRAZIONI_LIBERE[ambito]
    return {
      tipo: 'narrazione_libera',
      ambito,
      domanda_apertura: narrazione.domanda_apertura,
      istruzione: 'Usa il tool salva_narrazione_libera per registrare la risposta di questo ambito (narrazione + le 3 domande di controllo).',
    }
  }

  // 4. Ambito completo (scelte forzate + narrazione) — passa al prossimo
  //    ambito, oppure segna la fase come completata se era l'ultimo.
  const prossimo = nextAmbito(ambito)
  if (prossimo) {
    await supabase.from('profiling_sessions').update({ ambito_corrente: prossimo, updated_at: new Date().toISOString() }).eq('id', sessione.id)
    return getProssimoScenario(centro_id, user_id)
  }

  await supabase.from('profiling_sessions').update({ fase: 'completato', ambito_corrente: null, updated_at: new Date().toISOString() }).eq('id', sessione.id)
  return { tipo: 'completato', messaggio: 'Hai risposto a tutti gli ambiti. Usa genera_report_profiling per ottenere il report.' }
}

function costruisciRispostaScenario(scenario_code, ambito, sessione) {
  const scenario = SCENARI[scenario_code]
  if (!scenario) return { tipo: 'errore', messaggio: `Scenario non trovato: ${scenario_code}` }

  // Aggiorna la fase a 'nucleo' o 'riserva' in base a dove ci troviamo, per
  // trasparenza nello stato salvato (non cambia la logica sopra, che decide
  // sempre leggendo scenari_somministrati/punteggi, non il campo fase per gli
  // scenari — solo per la transizione fase 'nucleo'->'riserva'->'narrazione').
  const faseScenario = SCENARIO_ORDER[ambito].nucleo.includes(scenario_code) ? 'nucleo' : 'riserva'
  if (sessione.fase !== faseScenario) {
    supabase.from('profiling_sessions').update({ fase: faseScenario, updated_at: new Date().toISOString() }).eq('id', sessione.id)
      .then(() => {}, (err) => console.error('[profilingEngine] Errore aggiornamento fase (non bloccante):', err.message))
  }

  return {
    tipo: 'scenario',
    scenario_code,
    ambito,
    testo: scenario.testo,
    // Le opzioni vengono mostrate SENZA il tag elemento — la UI (tool
    // salva_risposta_scenario) deve rimandare l'elemento scelto per
    // posizione, non la lettera, per restare coerente col formato già
    // usato in piano-sviluppo-report-care.md (ordinamento per elemento).
    opzioni: scenario.opzioni.map(({ lettera, testo, elemento }) => ({ lettera, testo, elemento })),
    istruzione: 'Presenta il testo e le 5 opzioni nella UI del quiz. L\'utente le ordina dalla più alla meno vicina al proprio modo di agire. Poi chiama salva_risposta_scenario con l\'ordinamento completo (posizione 1-5 -> elemento).',
  }
}

/**
 * Tool: salva_risposta_scenario
 * input: { scenario_code, ordinamento: { "1": "fuoco", "2": "metallo", ... } }
 * Ricalcola SEMPRE i punteggi server-side (mai fidarsi del client), salva la
 * risposta (upsert, idempotente su session_id+scenario_code) e avanza lo
 * stato della sessione.
 */
export async function salvaRispostaScenario(centro_id, user_id, input) {
  const { scenario_code, ordinamento } = input || {}
  if (!scenario_code || !ordinamento) {
    return { ok: false, error: 'scenario_code e ordinamento sono obbligatori' }
  }

  const scenario = SCENARI[scenario_code]
  if (!scenario) return { ok: false, error: `Scenario sconosciuto: ${scenario_code}` }

  // Validazione: l'ordinamento deve contenere esattamente le posizioni 1-5,
  // ciascuna con uno dei 5 elementi validi, senza ripetizioni — mai fidarsi
  // del client per un dato che determina il contenuto del report pagato.
  const posizioni = Object.keys(ordinamento)
  if (posizioni.length !== 5 || !['1', '2', '3', '4', '5'].every((p) => posizioni.includes(p))) {
    return { ok: false, error: 'ordinamento deve avere esattamente le posizioni 1-5' }
  }
  const elementiForniti = Object.values(ordinamento)
  const elementiUnici = new Set(elementiForniti)
  if (elementiUnici.size !== 5 || [...elementiUnici].some((e) => !ELEMENTI_VALIDI.has(e))) {
    return { ok: false, error: 'ordinamento deve contenere esattamente i 5 elementi validi, senza ripetizioni' }
  }

  const sessione = await getOrCreateSessione(centro_id, user_id)

  const punteggi = {}
  for (const [posizione, elemento] of Object.entries(ordinamento)) {
    punteggi[elemento] = PUNTI_PER_POSIZIONE[Number(posizione)]
  }

  const { error: upsertErr } = await supabase
    .from('profiling_scenario_responses')
    .upsert(
      { session_id: sessione.id, scenario_code, ambito: scenario.ambito, ordinamento, punteggi },
      { onConflict: 'session_id,scenario_code' }
    )

  if (upsertErr) return { ok: false, error: upsertErr.message }

  const scenariAggiornati = Array.from(new Set([...(sessione.scenari_somministrati || []), scenario_code]))
  const { error: updateErr } = await supabase
    .from('profiling_sessions')
    .update({ scenari_somministrati: scenariAggiornati, updated_at: new Date().toISOString() })
    .eq('id', sessione.id)

  if (updateErr) return { ok: false, error: updateErr.message }

  return { ok: true, scenario_code, ambito: scenario.ambito, punteggi }
}

/**
 * Tool: salva_narrazione_libera
 * input: { ambito, narrazione_libera, risposta_controllo_1/2/3 }
 * Salva la narrazione (upsert su session_id+ambito) e avanza lo stato.
 * L'analisi AI (analisi_ai) resta NULL qui — popolata in un secondo momento
 * dal motore di analisi testo libero (task #152, non ancora costruito).
 */
export async function salvaNarrazioneLibera(centro_id, user_id, input) {
  const { ambito, narrazione_libera, risposta_controllo_1, risposta_controllo_2, risposta_controllo_3 } = input || {}

  if (!ambito || !AMBITI.includes(ambito)) {
    return { ok: false, error: `Ambito non valido: ${ambito}` }
  }
  if (!narrazione_libera || narrazione_libera.trim().length < 5) {
    return { ok: false, error: 'narrazione_libera obbligatoria (racconto reale, non una frase generica)' }
  }

  const sessione = await getOrCreateSessione(centro_id, user_id)

  const { error: upsertErr } = await supabase
    .from('profiling_narrative_responses')
    .upsert(
      {
        session_id: sessione.id,
        ambito,
        narrazione_libera,
        risposta_controllo_1: risposta_controllo_1 || null,
        risposta_controllo_2: risposta_controllo_2 || null,
        risposta_controllo_3: risposta_controllo_3 || null,
      },
      { onConflict: 'session_id,ambito' }
    )

  if (upsertErr) return { ok: false, error: upsertErr.message }

  const narrazioniAggiornate = Array.from(new Set([...(sessione.narrazioni_completate || []), ambito]))
  const { error: updateErr } = await supabase
    .from('profiling_sessions')
    .update({ narrazioni_completate: narrazioniAggiornate, fase: 'narrazione', updated_at: new Date().toISOString() })
    .eq('id', sessione.id)

  if (updateErr) return { ok: false, error: updateErr.message }

  // Analisi AI del testo libero (task #152) — best-effort, non blocca il
  // salvataggio: se la chiamata fallisce o manca la API key, la narrazione
  // resta salvata con analisi_ai=null e il flusso prosegue.
  let analisi = null
  try {
    analisi = await analizzaNarrazioneLibera({
      ambito,
      narrazione_libera,
      risposta_controllo_1: risposta_controllo_1 || null,
      risposta_controllo_2: risposta_controllo_2 || null,
      risposta_controllo_3: risposta_controllo_3 || null,
    })
    if (analisi) {
      await supabase
        .from('profiling_narrative_responses')
        .update({ analisi_ai: analisi })
        .eq('session_id', sessione.id)
        .eq('ambito', ambito)
    }
  } catch (err) {
    console.error('[profilingEngine] analisi testo libero fallita (non bloccante):', err.message)
  }

  return { ok: true, ambito, salvato: true, analisi_ai: analisi ? 'completata' : 'non disponibile' }
}

/**
 * Analisi AI ISOLATA della narrazione libera (task #152).
 * Chiamata Anthropic dedicata (client `anthropicProfiling`, separato dalla chat
 * gestionale), con prompt strutturato che restituisce SOLO JSON. Coerente col
 * tool-gating profiling: non passa da nessun tool gestionale, non tocca
 * dataHub.js. Restituisce { elemento_coerente, note_giustificazione, sintesi_breve }
 * oppure null se non disponibile/errore (mai lancia: chi la chiama la avvolge in
 * try/catch, ma qui degradiamo comunque a null per sicurezza).
 */
export async function analizzaNarrazioneLibera(input) {
  const { ambito, narrazione_libera, risposta_controllo_1, risposta_controllo_2, risposta_controllo_3 } = input || {}
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!narrazione_libera || String(narrazione_libera).trim().length < 5) return null

  const prompt = [
    'Sei un motore di analisi psicometrica interno. Analizzi il racconto di un episodio reale',
    'fatto dalla titolare di un centro estetico, per un profiling comportamentale a 5 tratti.',
    'I 5 tratti (usa ESATTAMENTE queste chiavi): fuoco (agisce subito, di istinto), acqua',
    '(si ferma, ascolta e capisce prima di agire), aria (rimette in discussione il sistema/le',
    'procedure per tutti), terra (si appoggia alla prassi consolidata, stabilità), metallo',
    '(controlla il dettaglio preciso, standard e rifinitura).',
    '',
    `Ambito del racconto: ${ambito}.`,
    `Racconto: """${String(narrazione_libera).trim()}"""`,
    risposta_controllo_1 ? `Controllo 1: """${String(risposta_controllo_1).trim()}"""` : '',
    risposta_controllo_2 ? `Controllo 2: """${String(risposta_controllo_2).trim()}"""` : '',
    risposta_controllo_3 ? `Controllo 3: """${String(risposta_controllo_3).trim()}"""` : '',
    '',
    'Restituisci SOLO un oggetto JSON valido, senza testo prima o dopo, con questa forma:',
    '{"elemento_coerente":"<uno tra: fuoco|acqua|aria|terra|metallo>",',
    '"note_giustificazione":<true|false: true se nelle risposte di controllo la titolare tende',
    'a giustificare/auto-proteggere il proprio comportamento invece di considerare davvero',
    'alternative>, "sintesi_breve":"<max 25 parole, descrizione comportamentale neutra, MAI il',
    'nome del tratto/elemento nella sintesi>"}',
  ].filter(Boolean).join('\n')

  const resp = await anthropicProfiling.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const testo = (resp?.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim()

  // Estrazione difensiva del primo blocco JSON (il modello potrebbe aggiungere
  // testo attorno, nonostante l'istruzione).
  const match = testo.match(/\{[\s\S]*\}/)
  if (!match) return null
  let parsed
  try { parsed = JSON.parse(match[0]) } catch { return null }

  const elemento = String(parsed.elemento_coerente || '').toLowerCase()
  return {
    elemento_coerente: ELEMENTI.includes(elemento) ? elemento : null,
    note_giustificazione: parsed.note_giustificazione === true,
    sintesi_breve: typeof parsed.sintesi_breve === 'string' ? parsed.sintesi_breve.trim() : null,
    _model: 'claude-sonnet-4-20250514',
  }
}

/**
 * Tool: verifica_profilo_definito
 * Non muta mai lo stato — restituisce solo i punteggi correnti per ambito e
 * se il profilo è già "coerente a sufficienza" secondo la stessa soglia usata
 * internamente da get_prossimo_scenario. Utile per far comunicare a Beautyx
 * l'avanzamento reale alla titolare durante la conversazione.
 */
export async function verificaProfiloDefinito(centro_id, user_id, input) {
  const { ambito } = input || {}
  const sessione = await getOrCreateSessione(centro_id, user_id)
  const ambitoDaVerificare = ambito || sessione.ambito_corrente || AMBITI[0]

  if (!AMBITI.includes(ambitoDaVerificare)) {
    return { ok: false, error: `Ambito non valido: ${ambitoDaVerificare}` }
  }

  const totali = await punteggiPerAmbito(sessione.id, ambitoDaVerificare)
  const definito = isProfiloDefinito(totali)
  const elementoDominante = Object.entries(totali).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  return { ok: true, ambito: ambitoDaVerificare, punteggi: totali, definito, elemento_dominante_ambito: elementoDominante }
}

/**
 * Calcola i punteggi finali aggregati per una sessione, SEMPRE server-side
 * (mai fidarsi del client — verifica ricalcolata dalle risposte già salvate).
 * Somma i punteggi per elemento su tutti gli scenari somministrati (globale +
 * breakdown per ambito), individua il blocco (eccesso→controllore carente→leva)
 * e la variante di ritratto (tipo_blocco), poi fa upsert su
 * profiling_element_scores. Restituisce l'oggetto scores calcolato.
 */
export async function calcolaPunteggiFinali(session_id) {
  const { data: risposte, error } = await supabase
    .from('profiling_scenario_responses')
    .select('ambito, punteggi')
    .eq('session_id', session_id)

  if (error) throw new Error(`Errore lettura risposte per scoring: ${error.message}`)

  const globali = { fuoco: 0, acqua: 0, aria: 0, terra: 0, metallo: 0 }
  const perAmbito = {
    clienti: { fuoco: 0, acqua: 0, aria: 0, terra: 0, metallo: 0 },
    personale: { fuoco: 0, acqua: 0, aria: 0, terra: 0, metallo: 0 },
    spese: { fuoco: 0, acqua: 0, aria: 0, terra: 0, metallo: 0 },
  }
  for (const r of risposte || []) {
    for (const e of ELEMENTI) {
      const v = Number(r.punteggi?.[e] || 0)
      globali[e] += v
      if (perAmbito[r.ambito]) perAmbito[r.ambito][e] += v
    }
  }

  const blocco = individuaBlocco(globali)
  const dominante = blocco.dominante

  // tipo_blocco: quanti ambiti sono "guidati" dal dominante (è il massimo di
  // quell'ambito). Guida tutti e 3 → trasversale; meno → localizzato. La
  // variante 'carenza_non_nutrita' resta disponibile nei contenuti ma NON è
  // auto-selezionata in questa v1 (richiede una calibrazione di Federica/Mason
  // sul peso testo-libero vs scelta-forzata — vedi piano, punto 6, e Note
  // Federica in contenuti-report-5-elementi.md). Segnalato a Riccardo/Mason.
  let lead = 0
  const ambitiGuidati = []
  for (const a of AMBITI) {
    if (elementoMax(perAmbito[a]) === dominante) { lead += 1; ambitiGuidati.push(a) }
  }
  const tipo_blocco = lead >= 3 ? 'eccesso_trasversale' : 'eccesso_localizzato'
  // La clausola [SE DIFFERENZA AMBITO] di Parte 1 si mostra quando il dominante
  // NON guida in modo uniforme tutti gli ambiti (coerente con l'uso della
  // Variante 2 "localizzata" in Parte 2).
  const mostra_differenza_ambito = lead < 3

  const scores = {
    punti_fuoco: globali.fuoco,
    punti_acqua: globali.acqua,
    punti_aria: globali.aria,
    punti_terra: globali.terra,
    punti_metallo: globali.metallo,
    breakdown_per_ambito: perAmbito,
    elemento_dominante: dominante,
    elemento_eccesso: blocco.eccesso,
    elemento_carenza: blocco.carenza,
    leva_riequilibrio: blocco.leva,
    tipo_blocco,
    // campi non persistiti nella tabella (colonne inesistenti) ma usati
    // dall'assemblatore: restano nell'oggetto restituito, filtrati prima
    // dell'upsert.
    mostra_differenza_ambito,
    significativo: blocco.significativo,
    ambiti_guidati: ambitiGuidati,
  }

  // Upsert su profiling_element_scores (solo le colonne reali della tabella).
  const rigaDb = {
    session_id,
    punti_fuoco: scores.punti_fuoco,
    punti_acqua: scores.punti_acqua,
    punti_aria: scores.punti_aria,
    punti_terra: scores.punti_terra,
    punti_metallo: scores.punti_metallo,
    breakdown_per_ambito: scores.breakdown_per_ambito,
    elemento_dominante: scores.elemento_dominante,
    elemento_eccesso: scores.elemento_eccesso,
    elemento_carenza: scores.elemento_carenza,
    leva_riequilibrio: scores.leva_riequilibrio,
    tipo_blocco: scores.tipo_blocco,
    calcolato_al: new Date().toISOString(),
  }
  const { error: upsertErr } = await supabase
    .from('profiling_element_scores')
    .upsert(rigaDb, { onConflict: 'session_id' })
  if (upsertErr) throw new Error(`Errore upsert profiling_element_scores: ${upsertErr.message}`)

  return scores
}

/**
 * Tool: genera_report_profiling
 * Trigger finale. Calcola i punteggi finali server-side, individua il blocco,
 * ASSEMBLA il report in modo deterministico dai contenuti di Federica
 * (reportAssembler) e lo salva su profiling_reports (contenuto_json +
 * contenuto_html, stato 'generato'). Idempotente: se il report esiste già lo
 * restituisce senza riassemblare.
 */
export async function generaReportProfiling(centro_id, user_id) {
  const sessione = await getOrCreateSessione(centro_id, user_id)

  if (sessione.fase !== 'completato') {
    return {
      ok: false,
      error: 'Il questionario non è ancora completo per tutti e 3 gli ambiti — continua con get_prossimo_scenario prima di generare il report.',
      fase_attuale: sessione.fase,
      ambito_corrente: sessione.ambito_corrente,
    }
  }

  const { data: reportEsistente } = await supabase
    .from('profiling_reports')
    .select('id, stato')
    .eq('session_id', sessione.id)
    .maybeSingle()

  if (reportEsistente && reportEsistente.stato !== 'bozza') {
    return { ok: true, report_id: reportEsistente.id, stato: reportEsistente.stato, messaggio: 'Report già generato per questa sessione.' }
  }

  // 1. Scoring finale server-side (verifica ricalcolata, mai dal client).
  let scores
  try {
    scores = await calcolaPunteggiFinali(sessione.id)
  } catch (err) {
    return { ok: false, error: `Scoring finale fallito: ${err.message}` }
  }

  // 2. Assemblaggio deterministico dai contenuti approvati.
  let assemblato
  try {
    assemblato = assemblaReport(scores)
  } catch (err) {
    return { ok: false, error: `Assemblaggio report fallito: ${err.message}` }
  }

  // 3. Persistenza del report (upsert su session_id).
  const rigaReport = {
    session_id: sessione.id,
    centro_id,
    purchase_id: sessione.purchase_id || null,
    contenuto_json: assemblato.contenuto_json,
    contenuto_html: assemblato.contenuto_html,
    stato: 'generato',
    generato_il: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { data: reportSalvato, error: reportErr } = await supabase
    .from('profiling_reports')
    .upsert(rigaReport, { onConflict: 'session_id' })
    .select('id, stato')
    .single()

  if (reportErr) return { ok: false, error: reportErr.message }

  await supabase
    .from('profiling_sessions')
    .update({ stato: 'completato', completed_at: new Date().toISOString() })
    .eq('id', sessione.id)

  return {
    ok: true,
    report_id: reportSalvato.id,
    stato: reportSalvato.stato,
    elemento_dominante: scores.elemento_dominante,
    tipo_blocco: scores.tipo_blocco,
    messaggio: 'Questionario completo! Il report CARE è stato generato ed è pronto da mostrare alla titolare.',
  }
}
