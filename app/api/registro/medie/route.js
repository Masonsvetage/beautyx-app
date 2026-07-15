/**
 * GET /api/registro/medie
 * Restituisce incasso medio giornaliero per 4 periodi (30/90/180/365 gg).
 * Auth via session — deriva centro_id dalla sessione utente.
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function getAuthorizedUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin
    .from('user_profiles')
    .select('centro_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.centro_id) return null
  return { user, centroId: profile.centro_id }
}

export async function GET() {
  const auth = await getAuthorizedUser()
  if (!auth) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { centroId } = auth
  const oggi = new Date().toISOString().split('T')[0]
  const periodi = [
    { label: '30gg',  giorni: 30  },
    { label: '90gg',  giorni: 90  },
    { label: '180gg', giorni: 180 },
    { label: '365gg', giorni: 365 },
  ]

  // Una sola query: prende tutti i dati degli ultimi 365 giorni
  const from365 = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]
  const { data: righe } = await admin
    .from('registro_giornate')
    .select('data, incasso_effettivo')
    .eq('centro_id', centroId)
    .gte('data', from365)
    .lte('data', oggi)
    .order('data', { ascending: false })

  // Calcola medie per ogni periodo
  const medie = periodi.map(({ label, giorni }) => {
    const cutoff = new Date(Date.now() - giorni * 86400000).toISOString().split('T')[0]
    const subset = (righe || []).filter(r => r.data >= cutoff)
    const totale  = subset.reduce((s, r) => s + parseFloat(r.incasso_effettivo || 0), 0)
    const n       = subset.length
    return {
      periodo:   label,
      giorni,
      n_giorni_con_dati: n,
      totale:    Math.round(totale * 100) / 100,
      media_gg:  n > 0 ? Math.round((totale / n) * 100) / 100 : 0,
    }
  })

  return NextResponse.json({ centro_id: centroId, medie })
}
