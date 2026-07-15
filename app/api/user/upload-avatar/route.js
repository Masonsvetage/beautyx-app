import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

export async function PUT(request) {
  try {
    const cookieStore = await cookies()

    // Verifica autenticazione
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

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) return Response.json({ error: 'File mancante' }, { status: 400 })

    // Validazione
    const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validFormats.includes(file.type)) {
      return Response.json({ error: 'Formato non valido. Usa PNG, JPG o WebP.' }, { status: 400 })
    }
    if (file.size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File troppo grande. Massimo 5MB.' }, { status: 400 })
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    const ext = file.name.split('.').pop()
    const fileName = `avatar-${user.id}-${Date.now()}.${ext}`

    // Upload su Supabase Storage (bucket "avatars")
    const { error: uploadError } = await admin.storage
      .from('avatars')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })

    if (uploadError) throw new Error(uploadError.message)

    // Ottieni URL pubblico
    const { data: urlData } = admin.storage.from('avatars').getPublicUrl(fileName)
    const publicUrl = urlData.publicUrl

    // Salva URL nel profilo
    const { error: updateError } = await admin
      .from('user_profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', user.id)

    if (updateError) throw new Error(updateError.message)

    return Response.json({ success: true, avatar_url: publicUrl })
  } catch (error) {
    console.error('Errore upload avatar:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: Rimuove la foto profilo
export async function DELETE(request) {
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

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    await admin.from('user_profiles').update({ avatar_url: null }).eq('id', user.id)

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
