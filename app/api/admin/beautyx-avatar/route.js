import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

// GET - Ottieni URL avatar Beautyx globale (uguale per tutti i centri)
export async function GET() {
  try {
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await admin
      .from('app_settings')
      .select('value')
      .eq('key', 'beautyx_avatar_url')
      .single()

    if (error) {
      // Tabella non ancora creata o valore non trovato: usa default
      return Response.json({ avatar_url: '/beautyx-avatar.svg' })
    }

    return Response.json({
      success: true,
      avatar_url: data?.value || '/beautyx-avatar.svg'
    })
  } catch {
    return Response.json({ avatar_url: '/beautyx-avatar.svg' })
  }
}

// PUT - Carica nuovo avatar Beautyx (SOLO ADMIN)
export async function PUT(request) {
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

    const { data: profile } = await authClient
      .from('user_profiles')
      .select('ruolo_livello, ruolo')
      .eq('id', user.id)
      .single()

    if (profile?.ruolo_livello !== 'admin' && profile?.ruolo !== 'admin') {
      return Response.json({ error: 'Accesso negato. Solo gli amministratori.' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) return Response.json({ error: 'File mancante' }, { status: 400 })

    const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!validFormats.includes(file.type)) {
      return Response.json({ error: 'Formato non valido. Usa PNG, JPG, SVG o WebP.' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File troppo grande. Massimo 5MB.' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // Nome file FISSO con timestamp per cache-busting
    const ext = file.name.split('.').pop()
    const fileName = `beautyx-global-avatar-${Date.now()}.${ext}`

    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    const { data: urlData } = admin.storage.from('avatars').getPublicUrl(fileName)
    const publicUrl = urlData.publicUrl

    // Salva URL globale in app_settings
    const { error: settingsError } = await admin
      .from('app_settings')
      .upsert({ key: 'beautyx_avatar_url', value: publicUrl, updated_at: new Date().toISOString() })

    if (settingsError) throw new Error(settingsError.message)

    return Response.json({ success: true, avatar_url: publicUrl })
  } catch (error) {
    console.error('Errore upload avatar Beautyx:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST - Ripristina avatar default
export async function POST(request) {
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

    const { data: profile } = await authClient
      .from('user_profiles')
      .select('ruolo_livello, ruolo')
      .eq('id', user.id)
      .single()

    if (profile?.ruolo_livello !== 'admin' && profile?.ruolo !== 'admin') {
      return Response.json({ error: 'Accesso negato.' }, { status: 403 })
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey)
    await admin
      .from('app_settings')
      .upsert({ key: 'beautyx_avatar_url', value: '/beautyx-avatar.svg', updated_at: new Date().toISOString() })

    return Response.json({ success: true, avatar_url: '/beautyx-avatar.svg' })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
