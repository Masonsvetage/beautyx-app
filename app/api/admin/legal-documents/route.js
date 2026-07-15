import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function verifyAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ruolo, ruolo_livello')
    .eq('id', user.id)
    .single()

  if (profile?.ruolo_livello !== 'admin' && profile?.ruolo !== 'admin') {
    return { error: NextResponse.json({ error: 'Non autorizzato' }, { status: 403 }) }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return { user, supabaseAdmin }
}

// GET: Lista tutti i documenti raggruppati per tipo
export async function GET() {
  try {
    const { supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { data, error: queryError } = await supabaseAdmin
      .from('legal_documents')
      .select(`
        *,
        clausole:legal_clauses(*)
      `)
      .order('tipo')
      .order('versione', { ascending: false })

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    // Raggruppa per tipo
    const grouped = {}
    for (const doc of data || []) {
      if (!grouped[doc.tipo]) grouped[doc.tipo] = []
      grouped[doc.tipo].push(doc)
    }

    return NextResponse.json({ data: grouped })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST: Crea nuova versione di un documento (bozza)
export async function POST(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { tipo, titolo, contenuto, note_modifica, clausole } = await request.json()

    if (!tipo || !titolo || !contenuto) {
      return NextResponse.json({ error: 'Tipo, titolo e contenuto obbligatori' }, { status: 400 })
    }

    // Calcola prossima versione
    const { data: lastDoc } = await supabaseAdmin
      .from('legal_documents')
      .select('versione')
      .eq('tipo', tipo)
      .order('versione', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (lastDoc?.versione || 0) + 1

    // Crea documento
    const { data: newDoc, error: insertError } = await supabaseAdmin
      .from('legal_documents')
      .insert({
        tipo,
        versione: nextVersion,
        titolo,
        contenuto,
        note_modifica,
        creato_da: user.id
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Crea clausole se fornite
    if (clausole && clausole.length > 0) {
      const clausoleData = clausole.map((c, i) => ({
        document_id: newDoc.id,
        titolo: c.titolo,
        contenuto: c.contenuto,
        ordinamento: c.ordinamento ?? i,
        richiede_accettazione_singola: c.richiede_accettazione_singola || false
      }))

      await supabaseAdmin.from('legal_clauses').insert(clausoleData)
    }

    // Ricarica con clausole
    const { data: fullDoc } = await supabaseAdmin
      .from('legal_documents')
      .select('*, clausole:legal_clauses(*)')
      .eq('id', newDoc.id)
      .single()

    return NextResponse.json({ data: fullDoc }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// PUT: Aggiorna bozza o pubblica
export async function PUT(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { id, titolo, contenuto, note_modifica, pubblica } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ID documento obbligatorio' }, { status: 400 })
    }

    // Verifica che il documento esista e sia una bozza (se stiamo modificando contenuto)
    const { data: existing } = await supabaseAdmin
      .from('legal_documents')
      .select('id, pubblicato_il, tipo')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })
    }

    const updates = { updated_at: new Date().toISOString() }

    if (titolo) updates.titolo = titolo
    if (contenuto) updates.contenuto = contenuto
    if (note_modifica !== undefined) updates.note_modifica = note_modifica

    // Pubblicazione
    if (pubblica && !existing.pubblicato_il) {
      // Leggi giorni accettazione da impostazioni
      const { data: daysStr } = await supabaseAdmin.rpc('get_admin_setting', { p_chiave: 'legal_acceptance_days' })
      const days = parseInt(daysStr) || 15

      const now = new Date()
      const scadenza = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

      updates.pubblicato_il = now.toISOString()
      updates.scadenza_accettazione = scadenza.toISOString()

      // Crea annuncio automatico per notificare tutti gli utenti
      const tipoLabel = existing.tipo === 'condizioni_contrattuali' ? 'Condizioni Contrattuali' : 'Informativa Privacy'
      await supabaseAdmin.from('admin_announcements').insert({
        titolo: `Aggiornamento Policy: ${tipoLabel}`,
        contenuto: `Sono state aggiornate le ${tipoLabel}. Hai ${days} giorni per leggere e accettare le modifiche. Se non accetti entro la scadenza, il profilo verra sospeso.`,
        tipo: 'urgente',
        display_mode: 'modal',
        target_type: 'broadcast',
        data_inizio: now.toISOString(),
        data_fine: scadenza.toISOString(),
        stato: 'attivo',
        sender_id: user.id
      })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('legal_documents')
      .update(updates)
      .eq('id', id)
      .select('*, clausole:legal_clauses(*)')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
