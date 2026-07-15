import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

async function getAuth() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non autenticato' }, { status: 401 }) }

  const { data: profile } = await supabase
    .from('user_profiles').select('centro_id').eq('id', user.id).maybeSingle()

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return { user, admin, centroId: profile?.centro_id || null, userId: user.id }
}

// GET: calcola stato checklist onboarding dai dati reali
export async function GET() {
  try {
    const { error, admin, centroId, userId } = await getAuth()
    if (error) return error

    if (!centroId) {
      // Centro non ancora creato: solo primo step disponibile
      return NextResponse.json({
        steps: buildSteps({ centroOk: false }),
        completati: 0,
        totale: STEPS_DEF.length,
      })
    }

    // Esegui tutti i check in parallelo
    const [
      centroRow,
      orariRow,
      serviziCount,
      costiRow,
      prezzoCongelato,
      koiboxCount,
      obiettiviCount,
      aiUsageCount,
      hpaMessaggiCount,
      subscriptionRow,
    ] = await Promise.all([
      admin.from('beauty_centers').select('id, nome, citta').eq('id', centroId).maybeSingle(),
      admin.from('opening_hours').select('id').eq('centro_id', centroId).limit(1),
      admin.from('servizi').select('id', { count: 'exact', head: true }).eq('centro_id', centroId),
      admin.from('costi_esercizio').select('id').eq('centro_id', centroId).limit(1),
      admin.from('servizi').select('id', { count: 'exact', head: true })
        .eq('centro_id', centroId).not('prezzo_congelato_at', 'is', null),
      admin.from('koibox_casse').select('id', { count: 'exact', head: true }).eq('centro_id', centroId),
      admin.from('insights').select('id', { count: 'exact', head: true })
        .eq('centro_id', centroId).eq('tipo', 'obiettivo'),
      admin.from('ai_usage_log').select('id', { count: 'exact', head: true }).eq('centro_id', centroId),
      // Controlla se l'utente ha già contattato il suo HPA (mittente = 'client')
      admin.from('hpa_client_messages').select('id', { count: 'exact', head: true })
        .eq('centro_id', centroId).eq('sender_type', 'client'),
      // Recupera ore HPA disponibili dall'abbonamento (legato a user_id, non centro_id)
      admin.from('user_subscriptions')
        .select('ore_hpa_usate, subscription_plans(ore_hpa_mensili, nome)')
        .eq('user_id', userId)
        .in('stato', ['attivo', 'trial'])
        .maybeSingle(),
    ])

    // Calcola ore HPA residue per mostrare nella descrizione dello step
    const subData = subscriptionRow.data
    const oreDisponibili = subData?.subscription_plans?.ore_hpa_mensili ?? 0
    const oreUsate = subData?.ore_hpa_usate ?? 0
    const oreResidueMin = Math.max(0, Math.round((oreDisponibili - oreUsate) * 60))
    const nomePiano = subData?.subscription_plans?.nome || null

    const flags = {
      centroOk: !!(centroRow.data?.nome),
      orariOk: (orariRow.data?.length || 0) > 0,
      servizioOk: (serviziCount.count || 0) > 0,
      costiOk: (costiRow.data?.length || 0) > 0,
      prezzoOk: (prezzoCongelato.count || 0) > 0,
      koiboxOk: (koiboxCount.count || 0) > 0,
      obiettivoOk: (obiettiviCount.count || 0) > 0,
      aiOk: (aiUsageCount.count || 0) > 0,
      hpaOk: (hpaMessaggiCount.count || 0) > 0,
    }

    const steps = buildSteps(flags, { oreResidueMin, nomePiano, oreDisponibili })
    const completati = steps.filter(s => s.done).length

    return NextResponse.json({ steps, completati, totale: steps.length })
  } catch (err) {
    console.error('GET /api/user/onboarding-checklist:', err)
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
  }
}

const STEPS_DEF = [
  {
    id: 'centro',
    icon: '🏢',
    titolo: 'Configura il tuo centro',
    descrizione: 'Inserisci nome, indirizzo e informazioni base del centro estetico.',
    link: '/impostazioni',
    linkLabel: 'Vai alle impostazioni',
    prompt: 'Come configuro le informazioni del mio centro su BeautyX?',
  },
  {
    id: 'orari',
    icon: '🕐',
    titolo: 'Imposta gli orari di apertura',
    descrizione: 'Definisci i giorni e gli orari di apertura del centro. Servono per calcolare i costi giornalieri correttamente.',
    link: '/centro',
    linkLabel: 'Vai a Centro → Orari',
    prompt: 'Come imposto gli orari di apertura del mio centro?',
  },
  {
    id: 'servizio',
    icon: '💇',
    titolo: 'Crea il primo servizio o prodotto',
    descrizione: 'Aggiungi almeno un servizio al listino prezzi. Puoi usare il suggeritore AI per nome e protocollo.',
    link: '/centro',
    linkLabel: 'Vai a Centro → Listino',
    prompt: 'Come aggiungo un servizio al listino prezzi su BeautyX?',
  },
  {
    id: 'costi',
    icon: '💰',
    titolo: 'Configura i costi di esercizio',
    descrizione: 'Inserisci affitto, utenze, personale e altri costi fissi mensili. BeautyX li usa per calcolare il prezzo minimo sostenibile dei servizi.',
    link: '/centro',
    linkLabel: 'Vai a Centro → Config IVA/Costi',
    prompt: 'Come inserisco i costi di esercizio del mio centro?',
  },
  {
    id: 'prezzo',
    icon: '🔒',
    titolo: 'Congela il primo prezzo',
    descrizione: 'Scegli un servizio, analizza il prezzo consigliato da BeautyX e congelalo nel listino ufficiale.',
    link: '/centro',
    linkLabel: 'Vai a Centro → Servizi',
    prompt: 'Come congelo il prezzo di un servizio su BeautyX?',
  },
  {
    id: 'koibox',
    icon: '📥',
    titolo: 'Importa i dati dal gestionale',
    descrizione: 'Importa clienti, casse e appuntamenti da Koibox (o altro gestionale). BeautyX analizzerà i tuoi dati reali.',
    link: '/impostazioni/integrazioni',
    linkLabel: 'Vai a Integrazioni',
    prompt: 'Come importo i dati da Koibox su BeautyX?',
  },
  {
    id: 'obiettivo',
    icon: '🎯',
    titolo: 'Crea il primo obiettivo',
    descrizione: 'Imposta un obiettivo di fatturato o crescita. BeautyX ti aiuterà a monitorarlo e a raggiungerlo.',
    link: '/pianificazione',
    linkLabel: 'Vai a Pianificazione',
    prompt: 'Come creo un obiettivo su BeautyX?',
  },
  {
    id: 'hpa',
    icon: '👩‍💼',
    titolo: 'Contatta il tuo HPA',
    // descrizione è dinamica: viene iniettata in buildSteps con le ore residue
    descrizione: null,
    link: null,
    linkLabel: null,
    prompt: null,
    hpaAction: true,
  },
  {
    id: 'ai',
    icon: '✨',
    titolo: 'Fai la prima domanda a BeautyX',
    descrizione: 'Apri la chat BeautyX e chiedile un\'analisi del tuo centro o un consiglio strategico. È la tua consulente AI disponibile 24/7.',
    link: null,
    linkLabel: null,
    prompt: 'Dammi una panoramica del mio centro e dimmi da dove iniziare.',
    chatAction: true,
  },
]

function buildSteps(flags, meta = {}) {
  const { oreResidueMin = 0, nomePiano = null, oreDisponibili = 0 } = meta
  return STEPS_DEF.map(s => {
    let descrizione = s.descrizione
    // Descrizione dinamica per lo step HPA con ore disponibili dall'abbonamento
    if (s.id === 'hpa') {
      if (oreDisponibili === 0) {
        descrizione = 'Il tuo piano non include ore di consulenza HPA. Valuta un upgrade per accedere a sessioni one-to-one con il tuo Human Performance Advisor.'
      } else if (oreResidueMin <= 0) {
        descrizione = `Hai esaurito le ore HPA di questo mese${nomePiano ? ` (piano ${nomePiano})` : ''}. Puoi acquistare ore aggiuntive o attendere il rinnovo mensile.`
      } else {
        const oreLabel = oreResidueMin >= 60
          ? `${Math.floor(oreResidueMin / 60)}h${oreResidueMin % 60 > 0 ? ` ${oreResidueMin % 60}min` : ''}`
          : `${oreResidueMin} minuti`
        descrizione = `Hai ${oreLabel} di consulenza disponibili${nomePiano ? ` con il piano ${nomePiano}` : ''}. Il tuo HPA ti affianca nella strategia, nell'analisi dei dati e nel raggiungimento degli obiettivi. Scrivici adesso!`
      }
    }
    return {
      ...s,
      descrizione,
      done: flags[s.id + 'Ok'] === true,
    }
  })
}
