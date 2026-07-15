import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Crea un nuovo utente (solo admin)
export async function POST(request) {
  try {
    const cookieStore = await cookies()

    // Verifica che l'utente corrente sia admin
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }

    // Verifica ruolo admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ruolo')
      .eq('id', user.id)
      .single()

    if (profile?.ruolo !== 'admin') {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 })
    }

    // Dati nuovo utente
    const body = await request.json()
    const {
      email, password, nome, cognome, ruolo_livello, piano, centro_id, organization_id, parent_user_id,
      tipo_soggetto, ragione_sociale, tipo_societa, codice_fiscale, partita_iva,
      cellulare, telefono_fisso, pec,
      residenza_indirizzo, residenza_civico, residenza_cap, residenza_citta, residenza_provincia,
      domicilio_diverso, domicilio_indirizzo, domicilio_civico, domicilio_cap, domicilio_citta, domicilio_provincia,
      documento_tipo, documento_numero, documento_data_scadenza
    } = body

    // Validazione campi obbligatori
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password richiesti' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'La password deve essere di almeno 8 caratteri' }, { status: 400 })
    }
    if (tipo_soggetto === 'persona_fisica') {
      if (!nome || !cognome) {
        return NextResponse.json({ error: 'Nome e cognome obbligatori per persona fisica' }, { status: 400 })
      }
      if (!codice_fiscale && !partita_iva) {
        return NextResponse.json({ error: 'Inserisci almeno il codice fiscale o la P.IVA' }, { status: 400 })
      }
    } else if (tipo_soggetto === 'societa') {
      if (!ragione_sociale) {
        return NextResponse.json({ error: 'Ragione sociale obbligatoria per societa' }, { status: 400 })
      }
      if (!tipo_societa) {
        return NextResponse.json({ error: 'Tipo societa obbligatorio' }, { status: 400 })
      }
      if (!partita_iva && !codice_fiscale) {
        return NextResponse.json({ error: 'Inserisci almeno la P.IVA o il codice fiscale' }, { status: 400 })
      }
    }
    if (!cellulare) {
      return NextResponse.json({ error: 'Il cellulare e obbligatorio' }, { status: 400 })
    }
    if (!residenza_indirizzo || !residenza_civico || !residenza_cap || !residenza_citta || !residenza_provincia) {
      return NextResponse.json({ error: 'Tutti i campi dell\'indirizzo sono obbligatori' }, { status: 400 })
    }
    if (!documento_tipo || !documento_numero || !documento_data_scadenza) {
      return NextResponse.json({ error: 'I dati del documento di identita sono obbligatori' }, { status: 400 })
    }

    // Mapping nuovo ruolo -> ruolo legacy per compatibilità
    // Il campo ruolo accetta: 'admin', 'hpa', 'centro'
    const RUOLO_LEGACY_MAP = {
      admin: 'admin',
      hpa: 'hpa',
      titolare: 'centro',
      direttore: 'centro',
      amministrativo: 'centro'
    }
    const ruoloLegacy = RUOLO_LEGACY_MAP[ruolo_livello] || 'centro'

    // Usa service role per creare utente
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Crea utente in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Conferma email automaticamente
    })

    if (authError) {
      console.error('Errore creazione auth:', authError)
      return NextResponse.json({ error: `Errore auth: ${authError.message}` }, { status: 400 })
    }

    // Attendi un momento per permettere al trigger di creare il profilo
    await new Promise(resolve => setTimeout(resolve, 500))

    // Dati profilo da salvare
    const profileData = {
      id: authData.user.id,
      email: email,
      nome: nome || null,
      cognome: cognome || null,
      ruolo: ruoloLegacy,
      ruolo_livello: ruolo_livello || 'titolare',
      piano: piano || 'demo',
      centro_id: centro_id || null,
      parent_user_id: parent_user_id || null,
      attivo: true,
      tipo_soggetto: tipo_soggetto || 'persona_fisica',
      ragione_sociale: ragione_sociale || null,
      tipo_societa: tipo_societa || null,
      codice_fiscale: codice_fiscale || null,
      partita_iva: partita_iva || null,
      cellulare: cellulare || null,
      telefono_fisso: telefono_fisso || null,
      pec: pec || null,
      residenza_indirizzo: residenza_indirizzo || null,
      residenza_civico: residenza_civico || null,
      residenza_cap: residenza_cap || null,
      residenza_citta: residenza_citta || null,
      residenza_provincia: residenza_provincia || null,
      domicilio_diverso: domicilio_diverso || false,
      domicilio_indirizzo: domicilio_indirizzo || null,
      domicilio_civico: domicilio_civico || null,
      domicilio_cap: domicilio_cap || null,
      domicilio_citta: domicilio_citta || null,
      domicilio_provincia: domicilio_provincia || null,
      documento_tipo: documento_tipo || null,
      documento_numero: documento_numero || null,
      documento_data_scadenza: documento_data_scadenza || null
    }

    if (organization_id) {
      profileData.organization_id = organization_id
    }

    // Usa upsert: se il trigger ha creato il profilo lo aggiorna,
    // altrimenti lo crea da zero (evita il caso in cui il trigger non scatta)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(profileData, { onConflict: 'id' })

    if (profileError) {
      console.error('Errore salvataggio profilo:', profileError)
      // Fallback: prova un semplice update nel caso upsert fallisca per colonne mancanti
      const { id: _id, email: _email, ...updateOnly } = profileData
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update(updateOnly)
        .eq('id', authData.user.id)
      if (updateError) {
        console.error('Errore anche con update:', updateError)
      }
    }

    // Crea user_subscriptions solo per utenti che non siano admin o HPA
    // (admin e HPA sono contrattualizzati/professionisti: non hanno profilo abbonamento)
    const finalRuoloLivello = ruolo_livello || 'titolare'
    if (finalRuoloLivello !== 'admin' && finalRuoloLivello !== 'hpa') {
      const pianoCodice = piano || 'demo'
      const { data: planData } = await supabaseAdmin
        .from('subscription_plans')
        .select('id, codice, is_trial, durata_trial_giorni')
        .eq('codice', pianoCodice)
        .maybeSingle()

      if (planData) {
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        let dataFine = null
        if (planData.is_trial && planData.durata_trial_giorni) {
          const end = new Date(now)
          end.setDate(end.getDate() + planData.durata_trial_giorni)
          dataFine = end.toISOString()
        }
        await supabaseAdmin
          .from('user_subscriptions')
          .upsert({
            user_id: authData.user.id,
            plan_id: planData.id,
            stato: planData.is_trial ? 'trial' : 'attivo',
            periodo: 'mensile',
            data_inizio: now.toISOString(),
            data_fine: dataFine,
            mese_conteggio: currentMonth,
            assegnato_da_admin: true,
            admin_assegnante_id: user.id
          }, { onConflict: 'user_id' })
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
    })

  } catch (error) {
    console.error('Errore creazione utente:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
