import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { invalidatePromptCache } from '@/lib/beautyx/agentPrompts'

const VALID_AGENTS = ['beautyx', 'receptionist', 'analista', 'marketing']

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

async function getAdminUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin.from('user_profiles').select('ruolo_livello').eq('id', user.id).maybeSingle()
  if (profile?.ruolo_livello !== 'admin') return null
  return user
}

// GET /api/admin/agenti/[agent_name] — versioni + prompt attivo
export async function GET(request, { params }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { agent_name } = await params
  if (!VALID_AGENTS.includes(agent_name)) return NextResponse.json({ error: 'Agente non valido' }, { status: 400 })

  const { data: versions } = await admin
    .from('agent_prompts')
    .select('id, version, is_active, notes, created_at, updated_at')
    .eq('agent_name', agent_name)
    .order('version', { ascending: false })

  const active = (versions || []).find(v => v.is_active)
  let activePrompt = null
  if (active) {
    const { data } = await admin.from('agent_prompts').select('prompt').eq('id', active.id).maybeSingle()
    activePrompt = data?.prompt || null
  }

  return NextResponse.json({
    agent_name,
    versions: versions || [],
    active_id: active?.id || null,
    active_version: active?.version || null,
    active_prompt: activePrompt
  })
}

// POST /api/admin/agenti/[agent_name] — salva nuova versione
export async function POST(request, { params }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { agent_name } = await params
  if (!VALID_AGENTS.includes(agent_name)) return NextResponse.json({ error: 'Agente non valido' }, { status: 400 })

  const { prompt, notes, activate = true } = await request.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt richiesto' }, { status: 400 })

  // Calcola prossimo numero di versione
  const { data: last } = await admin
    .from('agent_prompts')
    .select('version')
    .eq('agent_name', agent_name)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextVersion = (last?.version || 0) + 1

  // Disattiva versione corrente se stiamo attivando la nuova
  if (activate) {
    await admin.from('agent_prompts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('agent_name', agent_name)
      .eq('is_active', true)
  }

  const { data: newRow, error } = await admin.from('agent_prompts').insert({
    agent_name,
    version: nextVersion,
    prompt: prompt.trim(),
    is_active: activate,
    notes: notes?.trim() || null,
    updated_by: user.id,
    updated_at: new Date().toISOString()
  }).select().maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (activate) invalidatePromptCache(agent_name)

  return NextResponse.json({ ok: true, version: newRow })
}

// PUT /api/admin/agenti/[agent_name] — attiva una versione precedente
export async function PUT(request, { params }) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { agent_name } = await params
  if (!VALID_AGENTS.includes(agent_name)) return NextResponse.json({ error: 'Agente non valido' }, { status: 400 })

  const { version_id } = await request.json()
  if (!version_id) return NextResponse.json({ error: 'version_id richiesto' }, { status: 400 })

  await admin.from('agent_prompts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('agent_name', agent_name)
    .eq('is_active', true)

  const { error } = await admin.from('agent_prompts')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('id', version_id)
    .eq('agent_name', agent_name)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  invalidatePromptCache(agent_name)
  return NextResponse.json({ ok: true })
}
