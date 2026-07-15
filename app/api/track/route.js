import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function POST(request) {
  try {
    const { event_name, page, metadata } = await request.json()
    if (!event_name) return Response.json({ ok: true }) // silently ignore

    await supabase.from('conversion_events').insert({
      event_name,
      page: page || null,
      metadata: metadata || null,
    })

    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: true }) // never fail the client
  }
}
