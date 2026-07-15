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
    return { error: NextResponse.json({ error: 'Nessun centro' }, { status: 400 }) }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return { user, admin, centroId: profile.centro_id }
}

async function fetchServizioCompleto(admin, id, centroId) {
  const { data, error } = await admin
    .from('servizi')
    .select(`*, iva:iva_aliquote(id, nome, percentuale), materiali:servizi_materiali(*)`)
    .eq('id', id)
    .eq('centro_id', centroId)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * POST /api/centro/servizi/[id]/congela
 * Body: { prezzo_pubblico, costo_vivo_al_congelamento, margine_min_utile_perc? }
 */
export async function POST(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const resolvedParams = await params
    const { prezzo_pubblico, costo_vivo_al_congelamento, margine_min_utile_perc } = await request.json()

    if (!prezzo_pubblico || Number(prezzo_pubblico) <= 0)
      return NextResponse.json({ error: 'Prezzo non valido' }, { status: 400 })

    const update = {
      prezzo_pubblico: Number(prezzo_pubblico),
      prezzo_congelato_at: new Date().toISOString(),
      costo_vivo_al_congelamento: costo_vivo_al_congelamento != null
        ? Number(costo_vivo_al_congelamento)
        : null,
      updated_at: new Date().toISOString(),
    }
    if (margine_min_utile_perc != null)
      update.margine_min_utile_perc = Number(margine_min_utile_perc)

    // UPDATE senza select di relazioni inverse (PostgREST non le supporta in update)
    const { error: updErr } = await admin
      .from('servizi')
      .update(update)
      .eq('id', resolvedParams.id)
      .eq('centro_id', centroId)

    if (updErr) throw updErr

    // Rileggi il servizio completo con join
    const servizio = await fetchServizioCompleto(admin, resolvedParams.id, centroId)
    if (!servizio) return NextResponse.json({ error: 'Servizio non trovato' }, { status: 404 })

    return NextResponse.json({ servizio })
  } catch (err) {
    console.error('POST /api/centro/servizi/[id]/congela:', err)
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 })
  }
}

/**
 * DELETE /api/centro/servizi/[id]/congela
 * Scongela il prezzo.
 */
export async function DELETE(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const resolvedParams = await params

    const { error: updErr } = await admin
      .from('servizi')
      .update({
        prezzo_pubblico: null,
        prezzo_congelato_at: null,
        costo_vivo_al_congelamento: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedParams.id)
      .eq('centro_id', centroId)

    if (updErr) throw updErr

    const servizio = await fetchServizioCompleto(admin, resolvedParams.id, centroId)
    if (!servizio) return NextResponse.json({ error: 'Servizio non trovato' }, { status: 404 })

    return NextResponse.json({ servizio })
  } catch (err) {
    console.error('DELETE /api/centro/servizi/[id]/congela:', err)
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 })
  }
}
