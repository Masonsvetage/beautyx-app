import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

// GET: Punteggio dettagliato di un singolo centro
export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Non autenticato' }, { status: 401 })
    }

    const { id: centroId } = await params

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // Ottieni score del centro
    const { data: score, error: scoreError } = await supabase
      .from('client_scores')
      .select('*')
      .eq('centro_id', centroId)
      .single()

    if (scoreError && scoreError.code !== 'PGRST116') throw scoreError

    // Ottieni storico transazioni punti (ultime 20)
    // SICUREZZA (difesa in profondità, 2026-08-23 — audit Riccardo, stesso
    // schema del fix già fatto su progressi-obiettivi): `obiettivo:obiettivi(titolo)`
    // non filtrava mai `obiettivi.centro_id` — se mai esistesse una riga
    // score_transactions con un obiettivo_id di un centro diverso, questo
    // endpoint esporrebbe il titolo di un obiettivo altrui.
    // A differenza di progressi-obiettivi però qui NON si può usare
    // `obiettivi!inner` + `.eq('obiettivo.centro_id', ...)`: `obiettivo_id` in
    // `score_transactions` è una FK NULLABILE per design (vedi migrazione
    // `20260205_05_client_scoring.sql` — righe di tipo `streak_bonus`,
    // `bonus_admin`/`malus_admin` e `reset_mensile` sono inserite SENZA
    // obiettivo_id). Un inner join scarterebbe dall'elenco proprio queste
    // transazioni legittime (non solo quelle davvero cross-tenant), rompendo
    // lo storico punteggio. Si filtra quindi lato applicativo, DOPO la query:
    // si azzera solo il campo `obiettivo` (mai l'intera riga) quando il
    // centro_id dell'obiettivo collegato non coincide col centro verificato —
    // stessa garanzia di sicurezza del pattern !inner, zero rischio di far
    // sparire transazioni legittime senza obiettivo collegato.
    const { data: rawTransactions, error: txError } = await supabase
      .from('score_transactions')
      .select(`
        *,
        obiettivo:obiettivi(titolo, centro_id)
      `)
      .eq('centro_id', centroId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (txError) throw txError

    const transactions = (rawTransactions || []).map(tx => {
      if (!tx.obiettivo) return tx
      if (String(tx.obiettivo.centro_id) !== String(centroId)) {
        return { ...tx, obiettivo: null }
      }
      // centro_id era necessario solo per il controllo sopra, non va esposto
      const { centro_id: _omit, ...obiettivoSafe } = tx.obiettivo
      return { ...tx, obiettivo: obiettivoSafe }
    })

    // Ottieni info centro
    const { data: centro } = await supabase
      .from('beauty_centers')
      .select('id, nome')
      .eq('id', centroId)
      .single()

    return Response.json({
      centro: centro || { id: centroId },
      score: score || {
        punteggio_totale: 0,
        punteggio_mese_corrente: 0,
        obiettivi_completati: 0,
        obiettivi_in_anticipo: 0,
        obiettivi_in_ritardo: 0,
        streak_obiettivi: 0,
        livello: 1
      },
      transactions: transactions || []
    })
  } catch (error) {
    console.error('Errore get score centro:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
