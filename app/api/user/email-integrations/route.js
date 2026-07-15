import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { encryptPassword } from '@/lib/emailCrypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getClient(cookieStore) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
    }
  })
}

// GET - Lista integrazioni email dell'utente (senza password)
export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = getClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { data, error } = await supabase
      .from('email_integrations')
      .select('id, label, email_address, centro_id, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, active, last_synced_at, last_error, created_at')
      .eq('user_id', user.id)
      .order('created_at')

    if (error) throw new Error(error.message)
    return Response.json({ integrations: data || [] })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST - Crea nuova integrazione
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = getClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const body = await request.json()
    const {
      label, email_address, centro_id,
      imap_host, imap_port, imap_user, imap_password, imap_secure,
      smtp_host, smtp_port, smtp_user, smtp_password, smtp_secure
    } = body

    if (!email_address || !imap_host || !smtp_host || !imap_password || !smtp_password) {
      return Response.json({ error: 'Campi obbligatori mancanti' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('email_integrations')
      .insert({
        user_id: user.id,
        centro_id: centro_id || null,
        label: label || email_address,
        email_address,
        imap_host, imap_port: imap_port || 993,
        imap_user: imap_user || email_address,
        imap_password: encryptPassword(imap_password),
        imap_secure: imap_secure !== false,
        smtp_host, smtp_port: smtp_port || 587,
        smtp_user: smtp_user || email_address,
        smtp_password: encryptPassword(smtp_password),
        smtp_secure: smtp_secure === true
      })
      .select('id, label, email_address, centro_id, active, created_at')
      .single()

    if (error) throw new Error(error.message)
    return Response.json({ success: true, integration: data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
