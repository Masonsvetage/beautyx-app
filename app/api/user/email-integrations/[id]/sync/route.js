import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { decryptPassword } from '@/lib/emailCrypto'
import { fetchImapEmails, classifyEmailWithAI } from '@/lib/emailClient'

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

export const maxDuration = 60 // Vercel: max 60s per la sync

// POST - Scarica e classifica le nuove email
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

    // Scarica email dall'ultima sincronizzazione (o ultimi 30 giorni)
    const since = integration.last_synced_at || null
    let rawEmails = []

    try {
      rawEmails = await fetchImapEmails({
        host: integration.imap_host, port: integration.imap_port,
        user: integration.imap_user, password: imapPassword,
        secure: integration.imap_secure, since, maxMessages: 30
      })
    } catch (imapError) {
      await supabase.from('email_integrations').update({ last_error: imapError.message }).eq('id', id)
      return Response.json({ error: `Errore IMAP: ${imapError.message}` }, { status: 500 })
    }

    if (rawEmails.length === 0) {
      await supabase.from('email_integrations').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('id', id)
      return Response.json({ success: true, fetched: 0, classified: 0 })
    }

    // Filtra email già presenti nel DB
    const uids = rawEmails.map(e => e.uid)
    const { data: existing } = await supabase
      .from('email_messages')
      .select('message_uid')
      .eq('integration_id', id)
      .in('message_uid', uids)

    const existingUids = new Set((existing || []).map(e => e.message_uid))
    const newEmails = rawEmails.filter(e => !existingUids.has(e.uid))

    if (newEmails.length === 0) {
      await supabase.from('email_integrations').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('id', id)
      return Response.json({ success: true, fetched: rawEmails.length, classified: 0 })
    }

    // Classifica con AI (esclude automaticamente spam nella risposta)
    const classifications = await classifyEmailWithAI(newEmails)

    // Salva nel DB (escludi spam)
    const toInsert = newEmails
      .map((email, i) => ({ ...email, ...classifications[i] }))
      .filter(e => e.category !== 'spam')
      .map(e => ({
        integration_id: id,
        message_uid: e.uid,
        from_email: e.from_email,
        from_name: e.from_name,
        to_email: e.to_email,
        subject: e.subject,
        body_preview: e.body_preview,
        received_at: e.received_at,
        category: e.category,
        subcategory: e.subcategory,
        sentiment: e.sentiment,
        ai_summary: e.ai_summary,
        ai_amounts: e.ai_amounts || [],
        important: e.important || false
      }))

    if (toInsert.length > 0) {
      await supabase.from('email_messages').insert(toInsert)
    }

    // Aggiorna last_synced_at
    await supabase.from('email_integrations').update({
      last_synced_at: new Date().toISOString(),
      last_error: null
    }).eq('id', id)

    return Response.json({
      success: true,
      fetched: rawEmails.length,
      classified: toInsert.length,
      spam_filtered: newEmails.length - toInsert.length
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
