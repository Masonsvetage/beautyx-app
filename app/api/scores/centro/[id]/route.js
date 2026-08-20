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
    const { data: transactions, error: txError } = await supabase
      .from('score_transactions')
      .select(`
        *,
        obiettivo:obiettivi(titolo)
      `)
      .eq('centro_id', centroId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (txError) throw txError

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
