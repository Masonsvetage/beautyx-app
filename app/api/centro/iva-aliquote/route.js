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
    return { error: NextResponse.json({ error: 'Nessun centro associato' }, { status: 400 }) }

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

export async function GET() {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const { data, error: err } = await admin
      .from('iva_aliquote')
      .select('*')
      .eq('centro_id', centroId)
      .order('percentuale', { ascending: false })

    if (err) throw err
    return NextResponse.json({ aliquote: data || [] })
  } catch (err) {
    console.error('GET /api/centro/iva-aliquote:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { error, admin, centroId } = await getAuth()
    if (error) return error

    const body = await request.json()
    const { nome, percentuale, predefinita } = body

    if (!nome || percentuale === undefined)
      return NextResponse.json({ error: 'nome e percentuale obbligatori' }, { status: 400 })

    // Max 3 aliquote per centro
    const { count } = await admin
      .from('iva_aliquote').select('id', { count: 'exact', head: true }).eq('centro_id', centroId)
    if (count >= 3)
      return NextResponse.json({ error: 'Massimo 3 aliquote IVA per centro' }, { status: 400 })

    // Se predefinita, reset altre
    if (predefinita) {
      await admin.from('iva_aliquote').update({ predefinita: false }).eq('centro_id', centroId)
    }

    const { data, error: insErr } = await admin
      .from('iva_aliquote')
      .insert({ centro_id: centroId, nome, percentuale, predefinita: predefinita || false })
      .select().single()

    if (insErr) throw insErr
    return NextResponse.json({ aliquota: data }, { status: 201 })
  } catch (err) {
    console.error('POST /api/centro/iva-aliquote:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
