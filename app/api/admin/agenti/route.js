import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const AGENTS = [
  { name: 'beautyx',      label: 'BeautyX Coordinator', model: 'claude-sonnet-4-20250514', icon: '🤖', color: 'teal' },
  { name: 'receptionist', label: 'Receptionist',         model: 'claude-haiku-4-5-20251001', icon: '📓', color: 'blue' },
  { name: 'analista',     label: 'Analista',             model: 'claude-sonnet-4-20250514', icon: '📊', color: 'amber' },
  { name: 'marketing',    label: 'Marketing',            model: 'claude-sonnet-4-20250514', icon: '📣', color: 'purple' },
]

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

// GET /api/admin/agenti — lista agenti con versione attiva e contatore versioni
export async function GET() {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { data: rows } = await admin
    .from('agent_prompts')
    .select('agent_name, version, is_active, updated_at, notes')
    .order('version', { ascending: false })

  const agentsWithStatus = AGENTS.map(ag => {
    const agentRows = (rows || []).filter(r => r.agent_name === ag.name)
    const active = agentRows.find(r => r.is_active)
    return {
      ...ag,
      active_version: active?.version || null,
      total_versions: agentRows.length,
      last_updated: active?.updated_at || null,
      has_prompt: agentRows.length > 0
    }
  })

  return NextResponse.json({ agents: agentsWithStatus })
}

export { AGENTS }
