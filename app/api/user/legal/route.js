import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function verifyUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  return { user, supabaseAdmin }
}

// GET: Documenti correnti + stato accettazione utente
export async function GET() {
  try {
    const { user, supabaseAdmin, error } = await verifyUser()
    if (error) return error

    const { data, error: rpcError } = await supabaseAdmin
      .rpc('get_user_legal_status', { p_user_id: user.id })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    // Filtra documenti pendenti (non accettati)
    const documents = data || []
    const pending = documents.filter(d => d.stato !== 'accettato')

    return NextResponse.json({
      data: {
        documents,
        pending,
        has_pending: pending.length > 0
      }
    })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

// POST: Registra accettazione documento + clausole
export async function POST(request) {
  try {
    const { user, supabaseAdmin, error } = await verifyUser()
    if (error) return error

    const { document_id, clause_ids } = await request.json()

    if (!document_id) {
      return NextResponse.json({ error: 'document_id obbligatorio' }, { status: 400 })
    }

    // Verifica che il documento esista e sia pubblicato
    const { data: doc } = await supabaseAdmin
      .from('legal_documents')
      .select('id, pubblicato_il')
      .eq('id', document_id)
      .not('pubblicato_il', 'is', null)
      .single()

    if (!doc) {
      return NextResponse.json({ error: 'Documento non trovato o non pubblicato' }, { status: 404 })
    }

    // Verifica che tutte le clausole vessatorie siano accettate
    const { data: requiredClauses } = await supabaseAdmin
      .from('legal_clauses')
      .select('id')
      .eq('document_id', document_id)
      .eq('richiede_accettazione_singola', true)

    const requiredIds = (requiredClauses || []).map(c => c.id)
    const acceptedClauseIds = clause_ids || []

    const missingClauses = requiredIds.filter(id => !acceptedClauseIds.includes(id))
    if (missingClauses.length > 0) {
      return NextResponse.json({
        error: 'Tutte le clausole vessatorie devono essere accettate singolarmente',
        missing: missingClauses
      }, { status: 400 })
    }

    // Recupera headers per audit
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || ''

    // Registra accettazione documento
    const { error: accError } = await supabaseAdmin
      .from('legal_acceptances')
      .upsert({
        user_id: user.id,
        document_id,
        accettato_il: new Date().toISOString(),
        ip_address: ip,
        user_agent: userAgent
      }, { onConflict: 'user_id,document_id' })

    if (accError) {
      return NextResponse.json({ error: accError.message }, { status: 500 })
    }

    // Registra accettazioni clausole singole
    if (acceptedClauseIds.length > 0) {
      const clauseAcceptances = acceptedClauseIds.map(clauseId => ({
        user_id: user.id,
        clause_id: clauseId,
        accettato_il: new Date().toISOString()
      }))

      await supabaseAdmin
        .from('legal_clause_acceptances')
        .upsert(clauseAcceptances, { onConflict: 'user_id,clause_id' })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
