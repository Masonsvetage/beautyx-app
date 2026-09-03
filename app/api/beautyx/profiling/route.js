import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCentroOwnership } from '@/lib/auth/verifyCentroOwnership'
import {
  getProssimoScenario,
  salvaRispostaScenario,
  generaReportProfiling,
} from '@/lib/beautyx/profilingEngine'
import { AMBITI, SCENARIO_ORDER } from '@/lib/beautyx/profilingScenarioBank'

// ============================================
// Endpoint DEDICATO per la UI del quiz (task #153, collegamento end-to-end).
//
// Perché un endpoint separato da /api/beautyx/chat invece di riusare il loop
// LLM: la parte a scelta forzata (QuizScenario.js) è un componente puro che
// ordina 5 tessere — non serve nessuna generazione di linguaggio per
// proporla o per salvarla, il motore (lib/beautyx/profilingEngine.js) è già
// deterministico al 100% per queste due operazioni. Passare comunque per una
// chiamata Anthropic solo per "impacchettare" uno scenario in testo e poi
// "spacchettare" la risposta dell'utente sarebbe più lento, più costoso e
// meno affidabile (rischio che il modello alteri l'ordinamento). La
// narrazione libera resta invece SOLO nella chat esistente
// (/api/beautyx/chat, isProfilingMode) perché lì serve davvero una
// conversazione (follow-up se la risposta è vaga) — questo endpoint non la
// duplica, si limita a segnalare alla UI quando è il turno della narrazione
// (tipo: 'narrazione_libera') così la pagina può passare la mano alla chat.
//
// Stesso identico pattern di sicurezza già in uso in /api/beautyx/chat:
// - ownership verificata PRIMA di qualunque lettura/scrittura
//   (verifyCentroOwnership, mai un centro_id "dichiarato" dal client senza
//   controllo)
// - user_id sempre quello della sessione autenticata, mai dal body
// - il piano attivo si legge lato server (check_ai_limit RPC), mai da un
//   flag passato dal client — stesso gate 'report_profiling' già applicato
//   in app/api/beautyx/chat/route.js per isProfilingMode. Qui è indispensabile
//   ripeterlo: bypassando la chat, questo è l'UNICO punto che decide se un
//   utente può leggere/scrivere lo stato del questionario.
// ============================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const AMBITO_LABELS = { clienti: 'Clienti', personale: 'Personale', spese: 'Spese' }
const PREFISSO_AMBITO = { clienti: 'C', personale: 'P', spese: 'S' }

async function assertProfilingPlan(user_id) {
  try {
    const { data: limitCheck } = await supabase.rpc('check_ai_limit', { p_user_id: user_id })
    if (limitCheck && limitCheck.allowed === false) {
      return { ok: false, status: 403, error: 'Hai raggiunto il limite mensile di token AI per il tuo piano.' }
    }
    if (limitCheck?.piano !== 'report_profiling') {
      return { ok: false, status: 403, error: 'Il questionario CURA non è disponibile per il piano attivo su questo account.' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[BEAUTYX PROFILING API] check_ai_limit non disponibile:', err.message)
    return { ok: false, status: 500, error: 'Impossibile verificare il piano attivo.' }
  }
}

// Progress bar — SOLO cosmetica, non guida nessuna logica di avanzamento
// (quella resta interamente in profilingEngine.js/profiling_sessions). Legge
// lo stato attuale della sessione per stimare "a che punto sei" nell'ambito
// corrente. Il totale è la baseline del nucleo (6): se scatta la riserva il
// totale reale può superare la stima — accettabile per una barra indicativa.
async function buildProgress(centro_id, step) {
  if (!step || (step.tipo !== 'scenario' && step.tipo !== 'narrazione_libera')) return null
  const ambito = step.ambito
  if (!ambito || !AMBITI.includes(ambito)) return null

  const { data: sessione } = await supabase
    .from('profiling_sessions')
    .select('scenari_somministrati')
    .eq('centro_id', centro_id)
    .eq('stato', 'in_corso')
    .maybeSingle()

  const somministrati = sessione?.scenari_somministrati || []
  const prefisso = PREFISSO_AMBITO[ambito]
  const fattiInAmbito = somministrati.filter((code) => code?.startsWith(prefisso)).length
  const ambitoIndex = AMBITI.indexOf(ambito)
  const nucleoTotale = SCENARIO_ORDER[ambito]?.nucleo?.length || 6

  return {
    current: step.tipo === 'narrazione_libera' ? nucleoTotale : Math.min(fattiInAmbito + 1, nucleoTotale + (SCENARIO_ORDER[ambito]?.riserva?.length || 0)),
    total: nucleoTotale,
    ambitoLabel: AMBITO_LABELS[ambito] || ambito,
    faseLabel: `Ambito ${ambitoIndex + 1} di ${AMBITI.length}`,
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { action, centro_id, scenario_code, ordinamento } = body || {}

    if (!action) {
      return NextResponse.json({ error: 'action richiesta' }, { status: 400 })
    }

    const ownershipCheck = await verifyCentroOwnership(request, centro_id)
    if (!ownershipCheck.ok) {
      return NextResponse.json({ error: ownershipCheck.error }, { status: ownershipCheck.status })
    }
    const user_id = ownershipCheck.user.id

    // La lettura del report già generato resta accessibile anche se il piano
    // corrente è cambiato nel frattempo (il report è già stato "conquistato",
    // non deve sparire con un cambio di piano) — solo next/answer/generate
    // richiedono il piano report_profiling attivo, perché fanno avanzare o
    // consumano il questionario.
    if (action !== 'report') {
      const planCheck = await assertProfilingPlan(user_id)
      if (!planCheck.ok) {
        return NextResponse.json({ error: planCheck.error }, { status: planCheck.status })
      }
    }

    if (action === 'next') {
      const step = await getProssimoScenario(centro_id, user_id)
      const progress = await buildProgress(centro_id, step)
      return NextResponse.json({ step, progress })
    }

    if (action === 'answer') {
      if (!scenario_code || !ordinamento) {
        return NextResponse.json({ error: 'scenario_code e ordinamento sono obbligatori' }, { status: 400 })
      }
      const result = await salvaRispostaScenario(centro_id, user_id, { scenario_code, ordinamento })
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 })
      }
      const step = await getProssimoScenario(centro_id, user_id)
      const progress = await buildProgress(centro_id, step)
      return NextResponse.json({ result, step, progress })
    }

    if (action === 'generate') {
      const result = await generaReportProfiling(centro_id, user_id)
      if (!result.ok) {
        return NextResponse.json({ error: result.error, fase_attuale: result.fase_attuale, ambito_corrente: result.ambito_corrente }, { status: 400 })
      }
      return NextResponse.json({ result })
    }

    if (action === 'report') {
      const { data: report, error } = await supabase
        .from('profiling_reports')
        .select('id, stato, contenuto_html, generato_il')
        .eq('centro_id', centro_id)
        .order('generato_il', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      if (!report || report.stato !== 'generato' || !report.contenuto_html) {
        return NextResponse.json({ report: null })
      }
      return NextResponse.json({
        report: {
          contenuto_html: report.contenuto_html,
          generato_il: report.generato_il,
        },
      })
    }

    return NextResponse.json({ error: `action non valida: ${action}` }, { status: 400 })
  } catch (error) {
    console.error('[BEAUTYX PROFILING API] Errore:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
