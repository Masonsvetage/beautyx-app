import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

const TABLES = [
  { key: 'clienti',      table: 'koibox_clienti' },
  { key: 'casse',        table: 'koibox_casse' },
  { key: 'servizi',      table: 'koibox_servizi' },
  { key: 'appuntamenti', table: 'koibox_appuntamenti' },
]

export async function GET() {
  try {
    const cookieStore = await cookies()
    const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: { getAll() { return cookieStore.getAll() } },
    })

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: profile } = await authClient
      .from('user_profiles')
      .select('centro_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.centro_id) {
      return Response.json({ status: {} })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const status = {}

    await Promise.all(TABLES.map(async ({ key, table }) => {
      const { data, error } = await adminClient
        .from(table)
        .select('imported_at')
        .eq('centro_id', profile.centro_id)
        .order('imported_at', { ascending: false })
        .limit(1)

      if (error || !data) {
        status[key] = { total: 0, last_import: null }
        return
      }

      const { count } = await adminClient
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('centro_id', profile.centro_id)

      status[key] = {
        total: count || 0,
        last_import: data[0]?.imported_at || null,
      }
    }))

    return Response.json({ status })
  } catch (error) {
    console.error('[KOIBOX STATUS]', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
