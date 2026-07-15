import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { decryptPassword } from '@/lib/emailCrypto'
import { testImapConnection, testSmtpConnection } from '@/lib/emailClient'

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

// POST - Testa connessione IMAP + SMTP
export async function POST(request, { params }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = getClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: integration, error } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !integration) return Response.json({ error: 'Integrazione non trovata' }, { status: 404 })

    const imapPassword = decryptPassword(integration.imap_password)
    const smtpPassword = decryptPassword(integration.smtp_password)

    const results = { imap: false, smtp: false, errors: {} }

    try {
      await testImapConnection({
        host: integration.imap_host, port: integration.imap_port,
        user: integration.imap_user, password: imapPassword, secure: integration.imap_secure
      })
      results.imap = true
    } catch (e) {
      results.errors.imap = e.message
    }

    try {
      await testSmtpConnection({
        host: integration.smtp_host, port: integration.smtp_port,
        user: integration.smtp_user, password: smtpPassword, secure: integration.smtp_secure
      })
      results.smtp = true
    } catch (e) {
      results.errors.smtp = e.message
    }

    return Response.json({ success: results.imap && results.smtp, ...results })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
