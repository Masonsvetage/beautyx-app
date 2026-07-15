import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { tokensToChars } from '@/lib/token-utils'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Inizio giornata corrente in UTC
    const todayStart = new Date()
    todayStart.setUTCHours(0, 0, 0, 0)

    const { data, error } = await supabaseAdmin
      .from('ai_usage_log')
      .select('token_totali, modello')
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString())

    if (error) {
      console.error('[today-usage]', error.message)
      return NextResponse.json({ tokens_today: 0, chars_today: 0, model: null })
    }

    const tokens_today = (data ?? []).reduce((sum, r) => sum + (r.token_totali || 0), 0)
    const model = data?.find(r => r.modello)?.modello ?? 'claude-sonnet-4'

    return NextResponse.json({
      tokens_today,
      chars_today: tokensToChars(tokens_today),
      model,
    })
  } catch (e) {
    console.error('[today-usage]', e.message)
    return NextResponse.json({ tokens_today: 0, chars_today: 0, model: null })
  }
}
