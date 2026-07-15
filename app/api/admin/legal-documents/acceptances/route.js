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

// GET: Riepilogo accettazioni o storico singolo utente
export async function GET(request) {
  try {
    const { supabaseAdmin, error } = await verifyAdmin()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (userId) {
      // Storico completo di un utente
      const { data, error: queryError } = await supabaseAdmin
        .from('legal_acceptances')
        .select(`
          *,
          document:legal_documents(id, tipo, versione, titolo, pubblicato_il)
        `)
        .eq('user_id', userId)
        .order('accettato_il', { ascending: false })

      if (queryError) {
        return NextResponse.json({ error: queryError.message }, { status: 500 })
      }

      // Carica anche accettazioni clausole
      const { data: clauseAcc } = await supabaseAdmin
        .from('legal_clause_acceptances')
        .select(`
          *,
          clause:legal_clauses(id, titolo, document_id)
        `)
        .eq('user_id', userId)
        .order('accettato_il', { ascending: false })

      return NextResponse.json({ data: { acceptances: data, clause_acceptances: clauseAcc || [] } })
    }

    // Riepilogo per tutti gli utenti: documenti correnti + stato
    // Recupera documenti correnti (uno per tipo, versione piu' recente pubblicata)
    const { data: currentDocs } = await supabaseAdmin.rpc('get_current_legal_documents')

    const docs = currentDocs || []
    const docIds = docs.map(d => d.id)

    if (docIds.length === 0) {
      return NextResponse.json({ data: { documents: [], users: [] } })
    }

    // Recupera tutti gli utenti attivi con le loro accettazioni
    const { data: users } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, nome, cognome, ruolo_livello, attivo, profilo_bloccato')
      .order('cognome')

    const { data: allAcceptances } = await supabaseAdmin
      .from('legal_acceptances')
      .select('user_id, document_id, accettato_il')
      .in('document_id', docIds)

    // Mappa accettazioni per utente
    const accMap = {}
    for (const acc of allAcceptances || []) {
      if (!accMap[acc.user_id]) accMap[acc.user_id] = {}
      accMap[acc.user_id][acc.document_id] = acc.accettato_il
    }

    // Arricchisci utenti con stato accettazione
    const usersWithStatus = (users || []).map(u => {
      const userAcc = accMap[u.id] || {}
      const allAccepted = docIds.every(docId => userAcc[docId])
      const lastAcceptanceDate = Object.values(userAcc).sort().pop() || null
      const pendingCount = docIds.filter(docId => !userAcc[docId]).length

      return {
        ...u,
        legal_status: allAccepted ? 'compliant' : pendingCount > 0 ? 'pending' : 'compliant',
        pending_documents: pendingCount,
        last_acceptance_date: lastAcceptanceDate
      }
    })

    return NextResponse.json({ data: { documents: docs, users: usersWithStatus } })
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}
