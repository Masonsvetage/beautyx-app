import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getAuth() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('user_profiles').select('centro_id').eq('id', user.id).maybeSingle()

  if (!profile?.centro_id)
    return { error: NextResponse.json({ error: 'Nessun centro associato' }, { status: 400 }) }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return { user, admin, centroId: profile.centro_id }
}

// GET: legge config + calcola costo auto dai movimenti (ultimi 365 gg, valore mobile)
export async function GET() {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    // Config salvata
    const { data: config } = await admin
      .from('costi_esercizio')
      .select('*')
      .eq('centro_id', centroId)
      .maybeSingle()

    // Conteggio dipendenti attivi (suggerimento per nr_operatrici_operative)
    const { count: dipendentiAttivi } = await admin
      .from('dipendenti')
      .select('id', { count: 'exact', head: true })
      .eq('centro_id', centroId)
      .eq('attivo', true)

    // nr_operatrici_operative: usa il valore salvato manualmente, altrimenti il conteggio auto
    const nrOpCentro = config?.nr_operatrici_operative ?? dipendentiAttivi ?? 1

    // Calcolo automatico: spese ultimi 365 gg (valore mobile) / ore apertura annuali
    let costoOraAuto = null
    try {
      const unAnnoFa = new Date()
      unAnnoFa.setFullYear(unAnnoFa.getFullYear() - 1)

      const [{ data: movimenti }, { data: orari }] = await Promise.all([
        admin.from('movimenti')
          .select('importo')
          .eq('centro_id', centroId)
          .eq('tipo', 'uscita')
          .gte('data', unAnnoFa.toISOString().split('T')[0]),
        admin.from('opening_hours')
          .select('giorno_settimana, aperto, orario_apertura, orario_chiusura')
          .eq('centro_id', centroId)
          .eq('aperto', true),
      ])

      if (movimenti?.length && orari?.length) {
        const totaleSpese = movimenti.reduce((s, m) => s + Math.abs(Number(m.importo) || 0), 0)

        // Ore di apertura annuali (52 settimane × ore settimanali)
        const oreSettimana = orari.reduce((sum, g) => {
          if (!g.orario_apertura || !g.orario_chiusura) return sum
          const [hA, mA] = g.orario_apertura.split(':').map(Number)
          const [hC, mC] = g.orario_chiusura.split(':').map(Number)
          return sum + ((hC * 60 + mC) - (hA * 60 + mA)) / 60
        }, 0)

        if (oreSettimana > 0) {
          const oreAnnuali = oreSettimana * 52
          // Costo grezzo per ora di apertura (intero centro)
          costoOraAuto = +(totaleSpese / oreAnnuali).toFixed(2)
        }
      }
    } catch {
      // silenzioso: calcolo auto non disponibile
    }

    // Costo effettivo grezzo (spese/ore): base per calcolaServizio
    const costoOraEffettivo = config?.usa_calcolo_automatico !== false
      ? (costoOraAuto ?? config?.costo_ora_manuale ?? 40)
      : (config?.costo_ora_manuale ?? costoOraAuto ?? 40)

    return NextResponse.json({
      config: config || { usa_calcolo_automatico: true, costo_ora_manuale: null, nr_operatrici_operative: null },
      costo_ora_auto: costoOraAuto,
      costo_ora_effettivo: costoOraEffettivo,
      // Nr operatrici operative usato per il calcolo costo servizi
      nr_op_centro: nrOpCentro,
      nr_op_dipendenti_attivi: dipendentiAttivi ?? 0, // suggerimento per la UI
    })
  } catch (err) {
    console.error('GET /api/centro/costi-esercizio:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: salva configurazione
export async function PUT(request) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const body = await request.json()
    const { costo_ora_manuale, usa_calcolo_automatico, nr_operatrici_operative } = body

    const { data, error: upsertErr } = await admin
      .from('costi_esercizio')
      .upsert(
        {
          centro_id: centroId,
          costo_ora_manuale,
          usa_calcolo_automatico,
          nr_operatrici_operative: nr_operatrici_operative ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'centro_id' }
      )
      .select().single()

    if (upsertErr) throw upsertErr
    return NextResponse.json({ config: data })
  } catch (err) {
    console.error('PUT /api/centro/costi-esercizio:', err)
    return NextResponse.json({ error: 'Errore salvataggio' }, { status: 500 })
  }
}
