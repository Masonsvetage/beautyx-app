import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function getAdminClient(cookieStore) {
  const authClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
    }
  })
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const { data: profile } = await authClient.from('user_profiles').select('ruolo_livello').eq('id', user.id).maybeSingle()
  if (profile?.ruolo_livello !== 'admin') return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

// GET ?section=news|reviews|config
export async function GET(request) {
  try {
    const cookieStore = await cookies()
    const admin = await getAdminClient(cookieStore)
    if (!admin) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')

    if (section === 'news') {
      const { data, error } = await admin
        .from('news_posts')
        .select('*')
        .order('ordine')
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ news: data || [] })
    }

    if (section === 'reviews') {
      const { data, error } = await admin
        .from('ratings')
        .select('id, target_type, target_name, rating, review, is_public, approved_at, created_at, updated_at')
        .not('review', 'is', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ reviews: data || [] })
    }

    if (section === 'config') {
      const { data, error } = await admin.from('marketing_config').select('*')
      if (error) throw error
      return Response.json({ config: data || [] })
    }

    if (section === 'leads') {
      const { data, error } = await admin
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return Response.json({ leads: data || [] })
    }

    return Response.json({ error: 'section parametro richiesto' }, { status: 400 })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST - crea news
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const admin = await getAdminClient(cookieStore)
    if (!admin) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const body = await request.json()
    const { action } = body

    if (action === 'create_news') {
      const { titolo, contenuto, excerpt, immagine_url, categoria, pubblicato, in_evidenza, ordine } = body
      const { data, error } = await admin.from('news_posts').insert({
        titolo, contenuto,
        excerpt: excerpt || contenuto.slice(0, 150),
        immagine_url: immagine_url || null,
        categoria: categoria || 'novita',
        pubblicato: pubblicato || false,
        in_evidenza: in_evidenza || false,
        ordine: ordine || 0,
        published_at: pubblicato ? new Date().toISOString() : null
      }).select().single()
      if (error) throw error
      return Response.json({ success: true, news: data })
    }

    if (action === 'approve_review') {
      const { review_id, approve } = body
      const { data: authClient } = await createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        cookies: {
          getAll() { return [] },
          setAll() {}
        }
      })
      const { data, error } = await admin.from('ratings').update({
        is_public: approve,
        approved_at: approve ? new Date().toISOString() : null
      }).eq('id', review_id).select().single()
      if (error) throw error
      return Response.json({ success: true, review: data })
    }

    if (action === 'update_config') {
      const { key, value } = body
      const { error } = await admin.from('marketing_config')
        .update({ value: String(value), updated_at: new Date().toISOString() })
        .eq('key', key)
      if (error) throw error
      return Response.json({ success: true })
    }

    if (action === 'mark_lead') {
      const { lead_id, contattato } = body
      const { error } = await admin.from('leads').update({ contattato }).eq('id', lead_id)
      if (error) throw error
      return Response.json({ success: true })
    }

    return Response.json({ error: 'action non valida' }, { status: 400 })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PUT - upload immagine news → Supabase Storage bucket 'avatars/news/'
export async function PUT(request) {
  try {
    const cookieStore = await cookies()
    const admin = await getAdminClient(cookieStore)
    if (!admin) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: 'File mancante' }, { status: 400 })

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return Response.json({ error: 'Formato non valido. Usa JPG, PNG o WebP.' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File troppo grande. Massimo 5MB.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop().toLowerCase()
    const fileName = `news/post-${Date.now()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })
    if (uploadError) throw new Error(uploadError.message)

    const { data: urlData } = admin.storage.from('avatars').getPublicUrl(fileName)
    return Response.json({ success: true, url: urlData.publicUrl })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PATCH - aggiorna news
export async function PATCH(request) {
  try {
    const cookieStore = await cookies()
    const admin = await getAdminClient(cookieStore)
    if (!admin) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { id, ...updates } = await request.json()
    if (!id) return Response.json({ error: 'id richiesto' }, { status: 400 })

    // Se si pubblica ora, imposta published_at
    if (updates.pubblicato && !updates.published_at) {
      updates.published_at = new Date().toISOString()
    }

    const { data, error } = await admin.from('news_posts').update(updates).eq('id', id).select().single()
    if (error) throw error
    return Response.json({ success: true, news: data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - elimina news
export async function DELETE(request) {
  try {
    const cookieStore = await cookies()
    const admin = await getAdminClient(cookieStore)
    if (!admin) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const { id } = await request.json()
    if (!id) return Response.json({ error: 'id richiesto' }, { status: 400 })

    const { error } = await admin.from('news_posts').delete().eq('id', id)
    if (error) throw error
    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
