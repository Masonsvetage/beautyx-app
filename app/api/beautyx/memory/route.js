import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function getAuth() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET /api/beautyx/memory?centro_id=...
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const centro_id = searchParams.get('centro_id')
  if (!centro_id) return NextResponse.json({ contenuto: '' })

  const ownership = await verifyCentroOwnership(request, centro_id)
  if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

  const { data } = await supabaseAdmin
    .from('beautyx_memory')
    .select('contenuto, updated_at')
    .eq('centro_id', centro_id)
    .maybeSingle()

  return NextResponse.json({ contenuto: data?.contenuto || '', updated_at: data?.updated_at || null })
}

// PUT /api/beautyx/memory — chiamato solo dall'API chat (service key)
// Body: { centro_id, contenuto }
export async function PUT(request) {
  try {
    const { centro_id, contenuto } = await request.json()
    if (!centro_id || contenuto === undefined) {
      return NextResponse.json({ error: 'centro_id e contenuto richiesti' }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data, error } = await supabaseAdmin
      .from('beautyx_memory')
      .upsert(
        { centro_id, contenuto, updated_at: new Date().toISOString() },
        { onConflict: 'centro_id' }
      )
      .select('contenuto, updated_at')
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ ok: true, contenuto: data?.contenuto, updated_at: data?.updated_at })
  } catch (err) {
    console.error('[BeautyX Memory] PUT error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
