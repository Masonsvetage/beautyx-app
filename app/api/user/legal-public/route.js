import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET: Ritorna i documenti legali correnti pubblicati (API pubblica per signup)
// Non richiede autenticazione
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    const { data, error } = await supabase.rpc('get_current_legal_documents')

    if (error) {
      console.error('Errore caricamento documenti legali pubblici:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: data || [] })
  } catch (error) {
    console.error('Errore API legal-public:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Registra accettazioni legali post-registrazione
// Richiede user_id (appena creato da signUp) + document acceptances
export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, acceptances } = body

    if (!user_id || !acceptances || !Array.isArray(acceptances) || acceptances.length === 0) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Verifica che l'utente esista
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user_id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Utente non trovato' }, { status: 404 })
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Registra accettazione per ogni documento
    for (const acc of acceptances) {
      const { document_id, clause_ids } = acc

      // Inserisci accettazione documento
      const { error: accError } = await supabase
        .from('legal_acceptances')
        .upsert({
          user_id,
          document_id,
          accettato_il: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent
        }, { onConflict: 'user_id,document_id' })

      if (accError) {
        console.error('Errore accettazione documento:', accError)
        continue
      }

      // Inserisci accettazioni clausole
      if (clause_ids && clause_ids.length > 0) {
        const clauseRows = clause_ids.map(cid => ({
          user_id,
          clause_id: cid,
          accettato_il: new Date().toISOString()
        }))

        const { error: clauseError } = await supabase
          .from('legal_clause_acceptances')
          .upsert(clauseRows, { onConflict: 'user_id,clause_id' })

        if (clauseError) {
          console.error('Errore accettazione clausole:', clauseError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore registrazione accettazioni:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
