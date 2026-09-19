import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requirePiattaformaPlanForUser } from '@/lib/auth/verifyCentroOwnership'

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
    .from('user_profiles').select('centro_id, ruolo, ruolo_livello').eq('id', user.id).maybeSingle()

  if (!profile?.centro_id)
    return { error: NextResponse.json({ error: 'Nessun centro' }, { status: 400 }) }

  // Task #183: gate piano piattaforma sullo STESSO utente autenticato (mai
  // sull'ownership, già garantita sopra da profile.centro_id) — admin/hpa
  // bypassano, stesso comportamento di verifyCentroOwnership/usePiattaformaPlan.js.
  const isAdminOrHpa = profile.ruolo === 'admin' || profile.ruolo_livello === 'admin'
    || profile.ruolo === 'hpa' || profile.ruolo_livello === 'hpa'
  if (!isAdminOrHpa) {
    const planCheck = await requirePiattaformaPlanForUser(user.id)
    if (!planCheck.ok) {
      return { error: NextResponse.json({ error: planCheck.error }, { status: planCheck.status }) }
    }
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return { user, admin, centroId: profile.centro_id }
}

export async function PUT(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const body = await request.json()
    const { nome, percentuale, predefinita } = body

    if (predefinita) {
      await admin.from('iva_aliquote').update({ predefinita: false }).eq('centro_id', centroId)
    }

    const { data, error: updErr } = await admin
      .from('iva_aliquote')
      .update({ nome, percentuale, predefinita: predefinita || false })
      .eq('id', params.id)
      .eq('centro_id', centroId)
      .select().single()

    if (updErr) throw updErr
    return NextResponse.json({ aliquota: data })
  } catch (err) {
    console.error('PUT /api/centro/iva-aliquote/[id]:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const { error: delErr } = await admin
      .from('iva_aliquote')
      .delete()
      .eq('id', params.id)
      .eq('centro_id', centroId)

    if (delErr) throw delErr
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/centro/iva-aliquote/[id]:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
