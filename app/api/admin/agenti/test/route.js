import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const AGENT_MODELS = {
  beautyx:      'claude-sonnet-4-20250514',
  receptionist: 'claude-haiku-4-5-20251001',
  analista:     'claude-sonnet-4-20250514',
  marketing:    'claude-sonnet-4-20250514',
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

// POST /api/admin/agenti/test — testa un prompt contro Claude
export async function POST(request) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  const { agent_name, prompt, test_message } = await request.json()
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt richiesto' }, { status: 400 })
  if (!test_message?.trim()) return NextResponse.json({ error: 'test_message richiesto' }, { status: 400 })

  const model = AGENT_MODELS[agent_name] || 'claude-haiku-4-5-20251001'

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1000,
      system: prompt.trim(),
      messages: [{ role: 'user', content: test_message.trim() }]
    })

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('')

    return NextResponse.json({
      ok: true,
      response: text,
      model,
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
