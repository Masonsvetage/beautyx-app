import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        }
      }
    })

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const centro_id = searchParams.get('centro_id') || null

    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const yearMonth = new Date().toISOString().slice(0, 7)

    // Get user's current piano
    const { data: profile } = await admin
      .from('user_profiles')
      .select('piano')
      .eq('id', user.id)
      .maybeSingle()

    const piano = profile?.piano || 'demo'

    // Get minutes plan for this piano
    const { data: planData } = await admin
      .from('hpa_minute_plans')
      .select('minuti_mensili, descrizione')
      .eq('piano', piano)
      .maybeSingle()

    const minutesTotal = planData?.minuti_mensili || 30

    // Get or create credits for this month
    let { data: credits } = await admin
      .from('hpa_minute_credits')
      .select('*')
      .eq('user_id', user.id)
      .eq('year_month', yearMonth)
      .maybeSingle()

    if (!credits) {
      const { data: newCredits, error } = await admin
        .from('hpa_minute_credits')
        .insert({
          user_id: user.id,
          centro_id,
          year_month: yearMonth,
          minutes_total: minutesTotal,
          minutes_used: 0,
          minutes_extra: 0
        })
        .select()
        .single()

      if (error) throw error
      credits = newCredits
    }

    const remaining = Math.max(0, credits.minutes_total + credits.minutes_extra - credits.minutes_used)

    return Response.json({ credits, piano, remaining, plan_description: planData?.descrizione })
  } catch (error) {
    console.error('Errore minutes GET:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
