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

// DELETE: rimuove un servizio importato da koibox_servizi
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const referenza = searchParams.get('referenza')
    const nome = searchParams.get('nome')

    if (!referenza && !nome)
      return NextResponse.json({ error: 'referenza o nome obbligatori' }, { status: 400 })

    const { error, admin, centroId } = await getAuth()
    if (error) return error

    let query = admin.from('koibox_servizi').delete().eq('centro_id', centroId)
    if (referenza) query = query.eq('referenza', referenza)
    else query = query.eq('nome', nome)

    const { error: delErr } = await query
    if (delErr) throw delErr

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/centro/servizi/importati:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
