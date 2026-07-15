import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { decryptPassword } from '@/lib/emailCrypto'
import { sendSmtpEmail } from '@/lib/emailClient'

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

// POST - Invia email tramite SMTP dell'integrazione
export async function POST(request, { params }) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = getClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ error: 'Non autenticato' }, { status: 401 })

    const { data: integration } = await supabase
      .from('email_integrations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!integration) return Response.json({ error: 'Integrazione non trovata' }, { status: 404 })

    const { to, subject, text, html } = await request.json()
    if (!to || !subject || !text) return Response.json({ error: 'Campi to, subject, text obbligatori' }, { status: 400 })

    const smtpPassword = decryptPassword(integration.smtp_password)

    await sendSmtpEmail({
      host: integration.smtp_host, port: integration.smtp_port,
      user: integration.smtp_user, password: smtpPassword, secure: integration.smtp_secure,
      from: `${integration.label} <${integration.email_address}>`,
      to, subject, text, html
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
