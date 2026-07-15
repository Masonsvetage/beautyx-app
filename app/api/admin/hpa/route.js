import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// Helpers per auth check
async function getAdminUser(cookieStore) {
  const supabase = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      }
    }
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ruolo_livello, ruolo')
    .eq('id', user.id)
    .single()
  if (profile?.ruolo_livello !== 'admin' && profile?.ruolo !== 'admin') return null
  return user
}

// GET: Ritorna centri, hpa list, e assegnazioni esistenti
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const user = await getAdminUser(cookieStore)
    if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    const [
      { data: hpaList, error: hpaError },
      { data: centri, error: centriError },
      { data: assignments, error: assignError }
    ] = await Promise.all([
      admin.from('user_profiles')
        .select('id, email, nome, cognome, telefono, bio, specializzazione')
        .eq('ruolo_livello', 'hpa')
        .eq('attivo', true)
        .order('cognome'),
      admin.from('beauty_centers')
        .select('id, nome, indirizzo, citta')
        .order('nome'),
      admin.from('hpa_centro_assignments')
        .select(`
          id, hpa_id, centro_id,
          puo_creare_obiettivi, puo_pinnare_conversazioni,
          puo_vedere_movimenti, puo_modificare_budget,
          data_inizio, data_fine, note, created_at,
          hpa:user_profiles!hpa_id(id, email, nome, cognome),
          centro:beauty_centers!centro_id(id, nome, citta)
        `)
        .is('data_fine', null)
        .order('created_at', { ascending: false })
    ])

    if (hpaError) throw new Error(`hpaList query failed: ${hpaError.message}`)
    if (centriError) throw new Error(`centri query failed: ${centriError.message}`)
    if (assignError) throw new Error(`assignments query failed: ${assignError.message}`)

    return Response.json({
      hpaList: hpaList || [],
      centri: centri || [],
      assignments: assignments || []
    })
  } catch (error) {
    console.error('Errore GET admin/hpa:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST: Crea una o più assegnazioni per un HPA
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const user = await getAdminUser(cookieStore)
    if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    const body = await request.json()
    const { hpa_id, centro_ids, permissions } = body

    if (!hpa_id || !centro_ids?.length) {
      return Response.json({ error: 'hpa_id e almeno un centro_id richiesti' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    const rows = centro_ids.map(centro_id => ({
      hpa_id,
      centro_id,
      puo_creare_obiettivi: permissions?.puo_creare_obiettivi ?? true,
      puo_pinnare_conversazioni: permissions?.puo_pinnare_conversazioni ?? true,
      puo_vedere_movimenti: permissions?.puo_vedere_movimenti ?? true,
      puo_modificare_budget: permissions?.puo_modificare_budget ?? false,
      created_by: user.id
    }))

    const { data, error } = await admin
      .from('hpa_centro_assignments')
      .upsert(rows, { onConflict: 'hpa_id,centro_id', ignoreDuplicates: false })
      .select(`
        id, hpa_id, centro_id,
        puo_creare_obiettivi, puo_pinnare_conversazioni,
        puo_vedere_movimenti, puo_modificare_budget,
        data_inizio, created_at,
        hpa:user_profiles!hpa_id(id, email, nome, cognome),
        centro:beauty_centers!centro_id(id, nome, citta)
      `)

    if (error) throw error

    return Response.json({ success: true, assignments: data })
  } catch (error) {
    console.error('Errore POST admin/hpa:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Rimuove un'assegnazione
export async function DELETE(request) {
  try {
    const cookieStore = await cookies()
    const user = await getAdminUser(cookieStore)
    if (!user) return Response.json({ error: 'Non autorizzato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ error: 'id richiesto' }, { status: 400 })

    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await admin.from('hpa_centro_assignments').delete().eq('id', id)
    if (error) throw error

    return Response.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE admin/hpa:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
