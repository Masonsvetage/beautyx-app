import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── IMAP: recupera email recenti ────────────────────────────────────────────
export async function fetchImapEmails({ host, port, user, password, secure, since, maxMessages = 30 }) {
  const { ImapFlow } = await import('imapflow')

  const client = new ImapFlow({
    host,
    port,
    auth: { user, pass: password },
    secure,
    logger: false,
    tls: { rejectUnauthorized: false }
  })

  const messages = []

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      // Cerca messaggi da una certa data in poi
      const sinceDate = since ? new Date(since) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const uids = await client.search({ since: sinceDate })

      if (uids.length === 0) return []

      // Prendi gli ultimi N messaggi
      const toFetch = uids.slice(-maxMessages)

      for await (const msg of client.fetch(toFetch, {
        envelope: true,
        bodyStructure: true,
        bodyParts: ['text', '1']
      })) {
        try {
          const env = msg.envelope
          const fromAddr = env.from?.[0]
          const toAddr = env.to?.[0]

          // Estrai testo dal body
          let bodyText = ''
          if (msg.bodyParts) {
            for (const [, content] of msg.bodyParts) {
              if (content) {
                bodyText += Buffer.isBuffer(content) ? content.toString('utf8') : String(content)
              }
            }
          }

          // Rimuovi tag HTML e normalizza spazi
          bodyText = bodyText
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 800)

          messages.push({
            uid: String(msg.uid),
            from_email: fromAddr?.address || '',
            from_name: fromAddr?.name || fromAddr?.address || '',
            to_email: toAddr?.address || '',
            subject: env.subject || '(Nessun oggetto)',
            body_preview: bodyText,
            received_at: env.date?.toISOString() || new Date().toISOString()
          })
        } catch {
          // Skip messaggi malformati
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }

  return messages
}

// ── SMTP: invia email ────────────────────────────────────────────────────────
export async function sendSmtpEmail({ host, port, user, password, secure, from, to, subject, text, html }) {
  const nodemailer = await import('nodemailer')

  const transporter = nodemailer.default.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
    tls: { rejectUnauthorized: false }
  })

  return transporter.sendMail({ from, to, subject, text, html: html || text })
}

// ── SMTP: verifica connessione ───────────────────────────────────────────────
export async function testSmtpConnection({ host, port, user, password, secure }) {
  const nodemailer = await import('nodemailer')

  const transporter = nodemailer.default.createTransport({
    host, port, secure,
    auth: { user, pass: password },
    tls: { rejectUnauthorized: false }
  })

  await transporter.verify()
  return true
}

// ── IMAP: verifica connessione ───────────────────────────────────────────────
export async function testImapConnection({ host, port, user, password, secure }) {
  const { ImapFlow } = await import('imapflow')

  const client = new ImapFlow({
    host, port,
    auth: { user, pass: password },
    secure, logger: false,
    tls: { rejectUnauthorized: false }
  })

  await client.connect()
  await client.logout()
  return true
}

// ── AI: classifica email con Claude ─────────────────────────────────────────
export async function classifyEmailWithAI(emails) {
  if (!emails.length) return []

  // Classifica in batch per efficienza (max 10 per volta)
  const results = []

  for (let i = 0; i < emails.length; i += 10) {
    const batch = emails.slice(i, i + 10)
    const prompt = batch.map((e, idx) => `EMAIL ${idx + 1}:
Da: ${e.from_name} <${e.from_email}>
Oggetto: ${e.subject}
Testo: ${e.body_preview?.slice(0, 400) || ''}
---`).join('\n\n')

    try {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Sei un assistente per la gestione di un centro estetico italiano.
Analizza queste ${batch.length} email e per CIASCUNA rispondi con un JSON sulla stessa riga.
Formato risposta (una riga JSON per email, nell'ordine ricevuto):

{"category":"gestionale","subcategory":"fattura fornitore","sentiment":null,"summary":"Fattura n.123 da Fornitore X importo €450","important":true,"amounts":["€450,00"]}
{"category":"engagement","subcategory":"feedback cliente","sentiment":"positivo","summary":"Cliente soddisfatta del trattamento viso","important":false,"amounts":[]}

Categorie:
- gestionale: fatture, pagamenti, F24, DURC, avvisi fiscali, sanzioni, scadenze, buste paga, contratti, fornitori
- engagement: feedback clienti, recensioni, appuntamenti, reclami, richieste clienti
- spam: pubblicità, newsletter promozionali, offerte commerciali non richieste
- altro: tutto il resto

Rispondi SOLO con le righe JSON, niente altro.

${prompt}`
        }]
      })

      const lines = response.content[0].text.trim().split('\n').filter(l => l.trim().startsWith('{'))

      for (let j = 0; j < batch.length; j++) {
        try {
          const parsed = JSON.parse(lines[j] || '{}')
          results.push({
            category: parsed.category || 'altro',
            subcategory: parsed.subcategory || null,
            sentiment: parsed.sentiment || null,
            ai_summary: parsed.summary || null,
            important: parsed.important || false,
            ai_amounts: parsed.amounts || []
          })
        } catch {
          results.push({ category: 'altro', subcategory: null, sentiment: null, ai_summary: null, important: false, ai_amounts: [] })
        }
      }
    } catch {
      // Se l'AI fallisce, categorizza come "altro"
      batch.forEach(() => results.push({ category: 'altro', subcategory: null, sentiment: null, ai_summary: null, important: false, ai_amounts: [] }))
    }
  }

  return results
}
