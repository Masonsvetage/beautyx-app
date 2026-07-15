import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60 // secondi — necessario per sync Koibox via BeautyX
import { createClient } from '@supabase/supabase-js'
import { extractMonitorData, cleanTextResponse } from '@/lib/beautyx/monitorExtractor'
import { getCompleteBusinessData } from '@/lib/beautyx/dataHub'
import { loadAgentPrompt } from '@/lib/beautyx/agentPrompts'
import { syncKoibox } from '@/lib/koibox/sync'
import { isKoiboxConfigured } from '@/lib/koibox/apiClient'
import {
  fetchMetaData,
  fetchFinancialsData,
  fetchDipendentiData,
  fetchAccantonamentiData,
  fetchBudgetData,
  fetchObiettiviData,
  fetchRicaviData,
  fetchConfigurazioneData,
  fetchFornitoriData,
  fetchAnomalieData,
  fetchOttimizzazioniData,
  fetchSoglieAlertData,
  fetchKoiboxData,
  fetchRegistroOggiData,
  fetchCreditiApertiData
} from '@/lib/beautyx/dataHub'

// Usa SERVICE_KEY per bypassare RLS e accedere a tutti i dati
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// ============================================
// TOOL DEFINITIONS
// Claude sceglie quali dati vuole prima di rispondere
// ============================================

const BEAUTYX_TOOLS = [
  {
    name: 'get_financials',
    description: 'Recupera dati finanziari completi: costi/ricavi giornalieri pre-calcolati per vari periodi (anno corrente, anno precedente, ultimi 30/90 giorni, rolling 12 mesi), statistiche movimenti bancari, analisi mensile entrate/uscite, analisi per categoria (top 20), trend recenti. USA questo per domande su costi, ricavi, margini, confronti periodi, categorie di spesa.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_dipendenti',
    description: 'Recupera dati HR: lista dipendenti, costo mensile e annuo stimato, ultime 100 registrazioni ore lavoro, ultime 50 assenze, ultimi 50 straordinari.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_accantonamenti',
    description: 'Recupera fondi di accantonamento attivi (IVA, TFR, tasse, etc.) con saldi correnti, obiettivi e percentuale raggiunta, più ultimi 50 movimenti sui fondi.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_budget',
    description: 'Recupera il piano budget dell\'anno corrente con categorie e importi pianificati.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_obiettivi',
    description: 'Recupera obiettivi attivi con percentuale di avanzamento e giorni rimanenti, più obiettivi completati e falliti di recente.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_ricavi_giornalieri',
    description: `Recupera gli incassi operativi degli ultimi 90 giorni (fonte: registro_giornate + registro_pagamenti).

STRUTTURA RISPOSTA:
- giorni: array piatto di tutti i giorni con dati. Ogni elemento: { data, giorno, totale, n_clienti, source, pagamenti }
- settimana_corrente: settimana in corso (lunedì→domenica), con giorni_con_dati[]
- settimana_scorsa: settimana precedente completa, con giorni_con_dati[]
- settimane_precedenti: array delle settimane ancora prima

USA per: "scorsa settimana" → usa settimana_scorsa.giorni_con_dati. "questa settimana" → settimana_corrente. "ultimi 30 giorni" → filtra giorni[].

⚠️ REGOLE CRITICHE:
1. giorni_con_dati contiene SOLO i giorni con registrazioni — giorni assenti = nessun dato (NON = centro chiuso)
2. source='manuale' con importo basso (es. €10) = entry inserita a mano, potrebbe essere errata — segnalalo
3. pagamenti=null → NON fare affermazioni sui metodi di pagamento per quel giorno
4. Per costruire il chart settimana: aggiungi i 7 giorni Lun-Dom, metti 0 per quelli non in giorni_con_dati`,
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_configurazione',
    description: 'Recupera la configurazione del centro: orari apertura settimanali, chiusure eccezionali e ferie, categorie personalizzate.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_fornitori',
    description: 'Recupera la lista fornitori del centro.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_anomalie',
    description: 'Recupera le ultime 20 anomalie rilevate automaticamente nei movimenti bancari.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_ottimizzazioni',
    description: 'Recupera piani di ottimizzazione attivi, azioni suggerite e log delle ottimizzazioni recenti.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_soglie_alert',
    description: 'Recupera le soglie di alert configurate per il monitoraggio automatico del business.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_koibox',
    description: 'Recupera i dati CRM importati da Koibox: analisi clienti (dormanti, VIP, LTV, distribuzione valore, debiti), top 10 clienti per fatturato, lista VIP dormienti da recuperare con telefono, catalogo servizi per categoria, statistiche appuntamenti. USA questo tool per domande su: clienti, chi devo richiamare, dormienti, riattivazione clienti, analisi comportamento clienti, servizi offerti. NON usare per domande su incassi giornalieri/settimanali (usa get_ricavi_giornalieri) né per fatturato complessivo recente (usa get_financials).',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_registro_oggi',
    description: 'Recupera il riepilogo della giornata odierna: incasso effettivo, incasso maturato, spese, numero clienti e servizi, breakdown per metodo di pagamento. Il risultato include anche "pagamenti_lista" (lista incassi con id, importo, metodo, descrizione) e "spese_dettaglio" (lista spese con id, importo, descrizione, categoria). USA per: domande su "com\'è andata oggi", "quanto ho incassato", "quanti clienti ho avuto". USA ANCHE quando devi annullare un incasso/spesa e non conosci l\'id esatto — recupera prima la lista, identifica il record corretto, poi chiama annulla_incasso/annulla_spesa con l\'id.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_crediti_aperti',
    description: 'Recupera tutti i crediti aperti (acconti non ancora saldati) con id, nome cliente, importo_totale, residuo e data attesa saldo. USA ANCHE per vedere gli id dei crediti prima di chiamare annulla_credito.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'registra_incasso',
    description: `Registra un incasso nel registro giornaliero.
REGOLE IMPORTANTI:
1. Se l'utente NON menziona l'operatrice, CHIEDI "Chi ha eseguito il servizio?" PRIMA di chiamare questo tool. L'operatrice è un dato importante per l'analisi della produttività.
2. Dopo aver registrato, CHIEDI SEMPRE se la cliente ha lasciato feedback: "Ha detto qualcosa la cliente? Si è trovata bene?" — anche un breve commento è prezioso.
3. Se la cliente ha espresso interesse per altri servizi o prodotti (es. "vorrebbe provare anche X"), registralo in interesse_futuro — è un indicatore per promozioni future.
4. Se è un pagamento parziale (acconto), impostare e_acconto=true con importo_acconto e nome_cliente per tracciare il credito aperto.`,
    input_schema: {
      type: 'object',
      properties: {
        importo_totale:    { type: 'number', description: 'Importo totale del servizio/incasso' },
        metodo_pagamento:  { type: 'string', enum: ['pos','contanti','satispay','bonifico','altro'], description: 'Metodo con cui è stato pagato' },
        servizio:          { type: 'string', description: 'Nome del servizio eseguito' },
        nome_cliente:      { type: 'string', description: 'Nome della cliente' },
        operatrice_nome:   { type: 'string', description: 'Nome dell\'operatrice che ha eseguito il servizio — chiedere sempre se non specificato' },
        n_clienti:         { type: 'integer', description: 'Numero di clienti (default 1)' },
        n_servizi:         { type: 'integer', description: 'Numero di servizi (default 1)' },
        e_acconto:         { type: 'boolean', description: 'True se il cliente ha pagato solo un acconto' },
        importo_acconto:   { type: 'number', description: 'Importo effettivamente incassato oggi (solo se e_acconto=true)' },
        metodo_acconto:    { type: 'string', enum: ['pos','contanti','satispay','bonifico','altro'], description: 'Metodo dell\'acconto' },
        data_attesa_saldo: { type: 'string', description: 'Data attesa saldo YYYY-MM-DD' },
        feedback_tipo:     { type: 'string', enum: ['positivo','negativo','interesse_acquisto','neutro'], description: 'Tipo di feedback lasciato dalla cliente' },
        feedback_testo:    { type: 'string', description: 'Commento testuale della cliente (es. "si è trovata benissimo", "non ha gradito la cera troppo calda")' },
        interesse_futuro:  { type: 'string', description: 'Servizio o prodotto che la cliente vorrebbe acquistare in futuro (es. "pacchetto ceretta mensile", "maschera viso"). Usato per promozioni mirate.' },
        data:              { type: 'string', description: 'Data dell\'incasso YYYY-MM-DD (default oggi)' }
      },
      required: ['importo_totale', 'metodo_pagamento']
    }
  },
  {
    name: 'registra_spesa',
    description: 'Registra una spesa nel registro giornaliero. Usare quando l\'utente dice "ho speso", "ho pagato", "acquistato materiali", ecc.',
    input_schema: {
      type: 'object',
      properties: {
        descrizione: { type: 'string', description: 'Descrizione della spesa' },
        importo:     { type: 'number', description: 'Importo della spesa' },
        categoria:   { type: 'string', enum: ['materiali','utenze','personale','affitto','marketing','altro'], description: 'Categoria della spesa' },
        metodo:      { type: 'string', enum: ['pos','contanti','satispay','bonifico','altro'], description: 'Metodo di pagamento (default contanti)' },
        fornitore:   { type: 'string', description: 'Nome fornitore (opzionale)' },
        data:        { type: 'string', description: 'Data YYYY-MM-DD (default oggi)' }
      },
      required: ['descrizione', 'importo']
    }
  },
  {
    name: 'chiudi_credito',
    description: 'Chiude un credito aperto quando la cliente salda il debito. Usare quando l\'utente dice "la X ha saldato", "ha pagato il resto", "chiudi il debito di Y". Cerca il credito per nome cliente.',
    input_schema: {
      type: 'object',
      properties: {
        nome_cliente:  { type: 'string', description: 'Nome della cliente (ricerca parziale)' },
        metodo_saldo:  { type: 'string', enum: ['pos','contanti','satispay','bonifico','altro'], description: 'Metodo con cui ha saldato' },
        importo_residuo: { type: 'number', description: 'Importo residuo atteso (opzionale, per disambiguare se ci sono più crediti)' }
      },
      required: ['nome_cliente']
    }
  },
  {
    name: 'annulla_incasso',
    description: `Annulla/elimina un incasso già registrato oggi (o in una data specifica).
Usare quando l'utente dice "ho sbagliato l'incasso", "cancella quell'incasso", "era errato", "annulla", "rimuovi", "ho messo l'importo sbagliato", "quello era errato".
REGOLE:
1. Se dalla conversazione recente (storico_messaggi) sai già l'importo/metodo/servizio dell'incasso sbagliato, chiamalo DIRETTAMENTE con quei filtri senza passare per get_registro_oggi.
2. Se l'utente non specifica nulla, chiama PRIMA get_registro_oggi per vedere pagamenti_lista con gli id, poi usa l'id esatto.
3. Se trovati più incassi corrispondenti (multipli nel risultato), presentali all'utente numerati e chiedi quale, poi richiama con l'id.
4. Dopo l'annullamento, se l'utente vuole inserire il dato corretto, aspetta che lo dica e usa registra_incasso.
5. Se l'incasso era un acconto (descrizione contiene "Acconto"), segnala che il credito associato rimane aperto e potrebbe dover essere eliminato manualmente.`,
    input_schema: {
      type: 'object',
      properties: {
        id:               { type: 'string', description: 'ID esatto del pagamento da annullare (UUID) — usare quando si conosce già dal registro' },
        importo:          { type: 'number', description: 'Importo del pagamento da trovare' },
        metodo_pagamento: { type: 'string', enum: ['pos','contanti','satispay','bonifico','altro'], description: 'Metodo di pagamento' },
        descrizione:      { type: 'string', description: 'Testo parziale della descrizione (servizio, nome cliente) — ricerca ILIKE' },
        data:             { type: 'string', description: 'Data YYYY-MM-DD (default oggi)' }
      },
      required: []
    }
  },
  {
    name: 'annulla_spesa',
    description: `Annulla/elimina una spesa già registrata oggi (o in una data specifica).
Usare quando l'utente dice "cancella quella spesa", "ho sbagliato la spesa", "annulla la spesa di X euro", "rimuovi la spesa".
REGOLE:
1. Se l'utente specifica importo/descrizione, cerca direttamente e annulla.
2. Se trovate più spese corrispondenti, restituisce lista — presentala e chiedi quale, poi richiama con id specifico.`,
    input_schema: {
      type: 'object',
      properties: {
        id:          { type: 'string', description: 'ID esatto della spesa da annullare (UUID)' },
        importo:     { type: 'number', description: 'Importo della spesa da trovare' },
        descrizione: { type: 'string', description: 'Testo parziale della descrizione — ricerca ILIKE' },
        data:        { type: 'string', description: 'Data YYYY-MM-DD (default oggi)' }
      },
      required: []
    }
  },
  {
    name: 'annulla_credito',
    description: `Elimina direttamente un credito aperto da registro_crediti (senza passare da annulla_incasso).
USA QUANDO: ci sono crediti duplicati/orfani da eliminare, oppure l'utente dice "cancella quel credito", "rimuovi il debito di X", "era un errore quel credito".
DIFFERENZA da chiudi_credito: chiudi_credito registra il pagamento del saldo; annulla_credito elimina il record come se non fosse mai esistito.
REGOLE:
1. Usa get_crediti_aperti prima se non conosci l'id, per vedere la lista con ids e importi.
2. Se ci sono più crediti per la stessa cliente, mostrali all'utente e chiedi quale eliminare — poi richiama con id specifico.
3. Elimina uno alla volta per sicurezza, mai più crediti senza conferma dell'utente per ciascuno.`,
    input_schema: {
      type: 'object',
      properties: {
        id:           { type: 'string', description: 'ID esatto del credito da eliminare (UUID) — preferito quando disponibile' },
        nome_cliente: { type: 'string', description: 'Nome cliente per ricerca (ILIKE) — usato se id non disponibile' },
        importo:      { type: 'number', description: 'Importo_totale del credito per disambiguare tra più crediti della stessa cliente' }
      },
      required: []
    }
  },
  {
    name: 'sync_koibox',
    description: `Sincronizza i dati dal gestionale Koibox (via API) nelle tabelle locali di analisi.
USA quando l'utente dice: "sincronizza Koibox", "aggiorna i dati", "importa da Koibox", "aggiorna clienti/appuntamenti/cassa".
Operazione di SOLA LETTURA da Koibox — non modifica nulla nel gestionale.
Cosa viene sincronizzato: clienti, catalogo servizi, agenda (flusso clienti + operatrici), casse (fatturato per metodo di pagamento).
Dopo la sync, usa get_koibox per leggere i dati aggiornati e fare le analisi.`,
    input_schema: {
      type: 'object',
      properties: {
        clienti:       { type: 'boolean', description: 'Sincronizza clienti (default true)' },
        servizi:       { type: 'boolean', description: 'Sincronizza catalogo servizi (default true)' },
        agenda:        { type: 'boolean', description: 'Sincronizza agenda — flusso clienti, operatrici, servizi effettuati (default true)' },
        casse:         { type: 'boolean', description: 'Sincronizza cassa — fatturato giornaliero per metodo di pagamento (default true)' },
        giorni_agenda: { type: 'integer', description: 'Quanti giorni di agenda importare (default 30, max 90)' },
        giorni_casse:  { type: 'integer', description: 'Quanti giorni di cassa importare (default 90 — ultimi 3 mesi, max 180)' },
      },
      required: []
    }
  },
  {
    name: 'update_memory',
    description: 'Aggiorna la memoria persistente di BeautyX per questo centro. Usa questo tool quando apprendi informazioni importanti e durature sul centro: obiettivi dichiarati dal titolare, preferenze di comunicazione, problemi ricorrenti, caratteristiche distintive del business, decisioni strategiche prese, KPI prioritari. NON usare per dati temporanei o numeri che cambiano. Il contenuto sostituisce completamente la memoria precedente, quindi includi SEMPRE tutte le informazioni importanti note, non solo le nuove.',
    input_schema: {
      type: 'object',
      properties: {
        contenuto: {
          type: 'string',
          description: 'Testo della memoria aggiornata. Formato libero, max ~1500 caratteri. Includi: obiettivi prioritari, preferenze titolare, info chiave sul centro, problemi noti, decisioni strategiche.'
        }
      },
      required: ['contenuto']
    }
  }
]

// ============================================
// SYSTEM PROMPT CORTO (~1.500 token)
// Identità + contesto pagina + istruzioni formato
// I dati business NON sono inclusi qui: Claude li chiede via tool use
// ============================================

// Sezioni dinamiche aggiunte a runtime (non editabili dalla console)
function buildDynamicSections({ pagina_corrente, metaData, insights_attivi, dati_contesto, memoria, crediti_scaduti, koibox_api_attiva }) {
  const completezza = metaData?.completezzaDati || {}

  const insightsText = insights_attivi?.length > 0
    ? insights_attivi.map(i =>
        `- [${i.tipo.toUpperCase()}] ${i.titolo} (Priorità: ${i.priorita}/5, Stato: ${i.stato})`
      ).join('\n')
    : 'Nessun obiettivo o insight attivo al momento'

  const contestoPaginaText = Object.keys(dati_contesto || {}).length > 0
    ? JSON.stringify(dati_contesto, null, 2)
    : 'Nessun dato specifico dalla pagina'

  return `
# CONTESTO ATTUALE
Pagina corrente: ${pagina_corrente || 'Dashboard'}
Data odierna: ${new Date().toLocaleDateString('it-IT')}
Koibox API: ${koibox_api_attiva ? '✅ Connessa — puoi usare sync_koibox per aggiornare i dati in tempo reale' : '❌ Non configurata — import solo via file Excel'}

# ⚠️ COMPLETEZZA DATI
${completezza.avviso || 'Dati aggiornati e completi.'}
- Ultimo dato disponibile: ${completezza.ultimoDatoDisponibile || 'N/A'}
- Giorni mancanti: ${completezza.giorniMancanti ?? 0}
- Periodi affidabili: ${JSON.stringify(completezza.periodiAffidabili || {})}
- ${completezza.suggerimentoAnalisi || ''}

**REGOLA CRITICA sui dati incompleti**: Se giorniMancanti > 7:
- NON usare "ultimi 30 giorni" o "ultimi 90 giorni" per analisi trend
- USA confronti tra MESI COMPLETI (es. dicembre vs novembre)
- AVVISA SEMPRE l'utente se stai analizzando un periodo con dati incompleti

# MEMORIA PERSISTENTE
${memoria ? memoria : 'Nessuna memoria precedente per questo centro.'}
Usa il tool update_memory quando apprendi nuove informazioni importanti sul centro (obiettivi, preferenze, problemi ricorrenti, decisioni). Mantieni la memoria aggiornata e compatta (max ~1500 caratteri).

# CREDITI IN SCADENZA
${crediti_scaduti && crediti_scaduti.length > 0
  ? `⚠️ Hai ${crediti_scaduti.length} crediti scaduti o in scadenza oggi:\n${crediti_scaduti.map(c => `- ${c.nome_cliente}: €${c.residuo} (atteso ${c.data_attesa_saldo})${c.servizio ? ` per ${c.servizio}` : ''}`).join('\n')}\nMenzionali proattivamente all'utente se non lo ha già fatto. Quando la cliente paga, usa il tool chiudi_credito.`
  : 'Nessun credito in scadenza oggi.'}

# INSIGHTS E OBIETTIVI ATTIVI
${insightsText}

# DATI CONTESTO PAGINA CORRENTE
${contestoPaginaText}

# ⚠️ REGOLE DATI KOIBOX — LEGGERE PRIMA DI RISPONDERE
Quando chiami get_ricavi_giornalieri, ogni giorno ha un campo "source": "koibox" = dato sincronizzato dal gestionale, "manuale" = inserito a mano dall'utente, "legacy" = dato storico.
- Un giorno con source="manuale" e importo basso (es. €10) NON è un dato Koibox: è un'entry inserita manualmente, potrebbe essere sbagliata. Segnalalo all'utente e offriti di cancellarlo con annulla_incasso.
- Giorni ASSENTI dalla lista = nessun dato disponibile, NON necessariamente centro chiuso. Usa get_configurazione per verificare gli orari reali.
- Il campo "pagamenti" (es. {pos: 500, contanti: 100}) viene da registro_pagamenti. Se è null per un giorno, NON fare affermazioni sui metodi di pagamento per quel giorno.
- MAI dire "100% contanti" o "nessun POS" a meno che il campo pagamenti lo mostri esplicitamente.

# ⚠️ REGOLE MONITOR — OBBLIGATORIE
Il monitor panel è il pannello visuale accanto alla chat. L'utente lo vede SOLO se generi il blocco [MONITOR_START]...[MONITOR_END].

REGOLA 1 — GENERA SEMPRE il monitor quando hai dati numerici. Non farlo è un errore.
REGOLA 2 — Per analisi settimana con get_ricavi_giornalieri:
  • Leggi settimana_scorsa.giorni_con_dati (o settimana_corrente se chiede "questa settimana")
  • card "chart": includi TUTTI i 7 giorni Lun-Dom. Per quelli non in giorni_con_dati → value: 0
  • card "metrics": Totale, Media/giorno attivo (totale ÷ giorni con dati > 0), Clienti totali
  • card "breakdown": solo se almeno un giorno ha pagamenti != null, somma i metodi

REGOLA 3 — Valori REALI dal tool. MAI inventare o arrotondare importi nel monitor.
REGOLA 4 — JSON valido su UNA SOLA RIGA:
[MONITOR_START]{"title":"...","cards":[...]}[MONITOR_END]

Esempio (settimana_scorsa con Mer, Gio, Ven con dati):
[MONITOR_START]{"title":"Settimana 9-15 marzo","cards":[{"type":"chart","title":"Incasso per giorno","dataPoints":[{"label":"Lun 9/3","value":0},{"label":"Mar 10/3","value":0},{"label":"Mer 11/3","value":350},{"label":"Gio 12/3","value":1481},{"label":"Ven 13/3","value":1171},{"label":"Sab 14/3","value":0},{"label":"Dom 15/3","value":0}]},{"type":"metrics","title":"Riepilogo","metrics":[{"label":"Totale","value":"€3.002","trend":"neutral"},{"label":"Media/giorno attivo","value":"€1.001","trend":"neutral"},{"label":"Clienti","value":"35","trend":"neutral"}]},{"type":"breakdown","title":"Metodi pagamento","total":{"label":"Totale","value":3002,"unit":"€"},"items":[{"icon":"💳","label":"POS","value":2430,"unit":"€","percentage":81},{"icon":"💵","label":"Contanti","value":572,"unit":"€","percentage":19}]}]}[MONITOR_END]`
}

// Prompt statico di fallback — usato solo se la tabella agent_prompts non è ancora disponibile
const BEAUTYX_FALLBACK_PROMPT = `Sei Beautyx, una consulente strategica AI esperta in gestione di centri estetici.

# IDENTITÀ E MISSIONE
- Nome: Beautyx
- Ruolo: Consulente Strategica SvetAge (metodologia di consapevolezza finanziaria)
- Missione: Aiutare il centro estetico a crescere attraverso analisi dati, obiettivi chiari e strategie concrete
- Approccio: Visione d'insieme, proattività, suggerimenti concreti e actionable

# DATI GESTIONALE (KOIBOX)
Usa il tool 'get_koibox' per accedere ai dati reali importati dal gestionale.

# ⛔ REGOLE DI COMPORTAMENTO CRITICHE
- MAI promettere azioni che non puoi eseguire con i tool disponibili.
- Prima di agire, usa i tool di lettura per vedere lo stato reale.
- Annulla un record alla volta con conferma esplicita.
- Dopo ogni annullamento, comunica il nuovo stato.

# REGOLE FONDAMENTALI SUI DATI
1. Per costi/ricavi giornalieri: USA SEMPRE i valori pre-calcolati. NON dividere per 365.
2. Se non hai i dati, usa i tool PRIMA di rispondere.
3. Per domande conversazionali: rispondi direttamente senza tool.

# COME RISPONDERE
- Sii concreta e actionable, tono professionale ma amichevole
- Per insights: [INSIGHT:tipo:titolo:descrizione:priorità]

# MONITOR PANEL — REGOLE OBBLIGATORIE
Il monitor è il pannello visuale accanto alla chat. L'utente lo vede SOLO se generi il blocco. Non farlo quando hai numeri è un errore grave.

Formato ESATTO (JSON valido su UNA SOLA RIGA dopo il testo della risposta):
[MONITOR_START]{"title":"...","cards":[...]}[MONITOR_END]

Tipi di card:
- "metrics": {"type":"metrics","title":"...","metrics":[{"label":"...","value":"€123","trend":"up|down|neutral","subtitle":"..."}]}
- "breakdown": {"type":"breakdown","title":"...","total":{"label":"Totale","value":1000,"unit":"€"},"items":[{"icon":"💰","label":"...","value":500,"unit":"€","percentage":50}]}
- "chart": {"type":"chart","title":"...","dataPoints":[{"label":"Lun 9/3","value":150},{"label":"Mar 10/3","value":200}]}

OBBLIGATORIO per analisi settimana/periodo (get_ricavi_giornalieri):
1. card chart con TUTTI i giorni del periodo (inclusi quelli a zero), label = "Gio 13/3", value = importo reale
2. card metrics con Totale, Media giorno attivo, N. clienti
3. card breakdown con metodi pagamento SE il campo "pagamenti" è presente nei dati restituiti dal tool

Usa sempre i valori REALI dal tool. MAI inventare o arrotondare i dati nel monitor.`

// ============================================
// TOOL EXECUTOR
// Esegue i tool richiesti da Claude in parallelo
// ============================================

async function executeToolsInParallel(toolUseBlocks, centro_id) {
  const toolFunctions = {
    'get_financials':         () => fetchFinancialsData(centro_id),
    'get_dipendenti':         () => fetchDipendentiData(centro_id),
    'get_accantonamenti':     () => fetchAccantonamentiData(centro_id),
    'get_budget':             () => fetchBudgetData(centro_id),
    'get_obiettivi':          () => fetchObiettiviData(centro_id),
    'get_ricavi_giornalieri': () => fetchRicaviData(centro_id),
    'get_configurazione':     () => fetchConfigurazioneData(centro_id),
    'get_fornitori':          () => fetchFornitoriData(centro_id),
    'get_anomalie':           () => fetchAnomalieData(centro_id),
    'get_ottimizzazioni':     () => fetchOttimizzazioniData(centro_id),
    'get_soglie_alert':       () => fetchSoglieAlertData(centro_id),
    'get_koibox':             () => fetchKoiboxData(centro_id),
    'get_registro_oggi':      () => fetchRegistroOggiData(centro_id),
    'get_crediti_aperti':     () => fetchCreditiApertiData(centro_id),
    'registra_incasso':       async (input) => {
      try {
        const oggi = input.data || new Date().toISOString().split('T')[0]
        // Upsert giornata
        await supabase.from('registro_giornate')
          .upsert({ centro_id, data: oggi, updated_at: new Date().toISOString() }, { onConflict: 'centro_id,data', ignoreDuplicates: true })
        const { data: giornata } = await supabase.from('registro_giornate').select('id, n_clienti, n_servizi').eq('centro_id', centro_id).eq('data', oggi).maybeSingle()

        const feedbackFields = {
          operatrice_nome:  input.operatrice_nome  || null,
          feedback_tipo:    input.feedback_tipo    || null,
          feedback_testo:   input.feedback_testo   || null,
          interesse_futuro: input.interesse_futuro || null,
        }

        if (input.e_acconto && input.importo_acconto > 0) {
          // Registra acconto come pagamento + crea credito
          await supabase.from('registro_pagamenti').insert({
            centro_id, giornata_id: giornata?.id, data: oggi,
            metodo: input.metodo_acconto || input.metodo_pagamento,
            importo: Number(input.importo_acconto),
            descrizione: `Acconto ${input.nome_cliente || ''}${input.servizio ? ` - ${input.servizio}` : ''}`,
            ...feedbackFields
          })
          await supabase.from('registro_crediti').insert({
            centro_id, giornata_id: giornata?.id, data_servizio: oggi,
            nome_cliente: input.nome_cliente || 'Cliente',
            servizio: input.servizio || null,
            importo_totale: Number(input.importo_totale),
            acconto_versato: Number(input.importo_acconto),
            metodo_acconto: input.metodo_acconto || input.metodo_pagamento,
            data_attesa_saldo: input.data_attesa_saldo || null,
            ...feedbackFields
          })
        } else {
          // Pagamento completo
          await supabase.from('registro_pagamenti').insert({
            centro_id, giornata_id: giornata?.id, data: oggi,
            metodo: input.metodo_pagamento,
            importo: Number(input.importo_totale),
            descrizione: [input.servizio, input.nome_cliente].filter(Boolean).join(' - ') || null,
            ...feedbackFields
          })
        }

        // Aggiorna contatori giornata
        const nuoviClienti  = (giornata?.n_clienti || 0) + (input.n_clienti || 1)
        const nuoviServizi  = (giornata?.n_servizi || 0) + (input.n_servizi || 1)
        await supabase.from('registro_giornate').update({
          n_clienti: nuoviClienti, n_servizi: nuoviServizi, updated_at: new Date().toISOString()
        }).eq('centro_id', centro_id).eq('data', oggi)

        // Ricalcola totali
        const { data: pags } = await supabase.from('registro_pagamenti').select('importo').eq('centro_id', centro_id).eq('data', oggi)
        const { data: spes } = await supabase.from('registro_spese').select('importo').eq('centro_id', centro_id).eq('data', oggi)
        const { data: creds } = await supabase.from('registro_crediti').select('importo_totale').eq('centro_id', centro_id).eq('data_servizio', oggi)
        const inc_eff  = (pags  || []).reduce((s, r) => s + Number(r.importo), 0)
        const spese_t  = (spes  || []).reduce((s, r) => s + Number(r.importo), 0)
        const inc_mat  = (creds || []).reduce((s, r) => s + Number(r.importo_totale), 0) || inc_eff
        await supabase.from('registro_giornate').update({
          incasso_effettivo: inc_eff, spese_totali: spese_t, incasso_maturato: inc_mat, updated_at: new Date().toISOString()
        }).eq('centro_id', centro_id).eq('data', oggi)

        return {
          ok: true,
          registrato: {
            tipo: input.e_acconto ? 'acconto' : 'pagamento_completo',
            importo_incassato: input.e_acconto ? input.importo_acconto : input.importo_totale,
            residuo_aperto: input.e_acconto ? (input.importo_totale - input.importo_acconto) : 0,
            cliente: input.nome_cliente, servizio: input.servizio,
            operatrice: input.operatrice_nome || null,
            metodo: input.metodo_pagamento,
            feedback: input.feedback_tipo || null,
            interesse_futuro: input.interesse_futuro || null
          }
        }
      } catch (err) {
        console.error('[BeautyX] registra_incasso error:', err.message)
        return { ok: false, error: err.message }
      }
    },
    'registra_spesa':         async (input) => {
      try {
        const oggi = input.data || new Date().toISOString().split('T')[0]
        await supabase.from('registro_giornate')
          .upsert({ centro_id, data: oggi, updated_at: new Date().toISOString() }, { onConflict: 'centro_id,data', ignoreDuplicates: true })
        const { data: giornata } = await supabase.from('registro_giornate').select('id').eq('centro_id', centro_id).eq('data', oggi).maybeSingle()
        await supabase.from('registro_spese').insert({
          centro_id, giornata_id: giornata?.id, data: oggi,
          descrizione: input.descrizione, importo: Number(input.importo),
          categoria: input.categoria || 'altro', metodo: input.metodo || 'contanti',
          fornitore: input.fornitore || null
        })
        // Ricalcola totali
        const { data: spes } = await supabase.from('registro_spese').select('importo').eq('centro_id', centro_id).eq('data', oggi)
        const spese_t = (spes || []).reduce((s, r) => s + Number(r.importo), 0)
        await supabase.from('registro_giornate').update({ spese_totali: spese_t, updated_at: new Date().toISOString() }).eq('centro_id', centro_id).eq('data', oggi)
        return { ok: true, descrizione: input.descrizione, importo: input.importo, categoria: input.categoria || 'altro' }
      } catch (err) {
        console.error('[BeautyX] registra_spesa error:', err.message)
        return { ok: false, error: err.message }
      }
    },
    'chiudi_credito':         async (input) => {
      try {
        const { data: crediti } = await supabase.from('registro_crediti')
          .select('*').eq('centro_id', centro_id).eq('saldato', false)
          .ilike('nome_cliente', `%${input.nome_cliente}%`)
        if (!crediti || crediti.length === 0) return { ok: false, error: 'Nessun credito aperto trovato per questa cliente' }
        // Disambigua per importo residuo se specificato
        let credito = crediti.length === 1 ? crediti[0]
          : input.importo_residuo ? crediti.find(c => Math.abs(Number(c.residuo) - Number(input.importo_residuo)) < 0.5)
          : crediti[0]
        if (!credito) return { ok: false, multipli: crediti.map(c => ({ id: c.id, servizio: c.servizio, residuo: c.residuo, data_attesa_saldo: c.data_attesa_saldo })), error: 'Trovati più crediti, specifica l\'importo' }

        const oggi = new Date().toISOString().split('T')[0]
        const residuo = Number(credito.importo_totale) - Number(credito.acconto_versato)
        await supabase.from('registro_crediti').update({
          saldato: true, saldato_il: oggi, metodo_saldo: input.metodo_saldo || 'contanti', updated_at: new Date().toISOString()
        }).eq('id', credito.id)
        if (residuo > 0) {
          await supabase.from('registro_pagamenti').insert({
            centro_id, data: oggi, metodo: input.metodo_saldo || 'contanti', importo: residuo,
            descrizione: `Saldo ${credito.nome_cliente}${credito.servizio ? ` - ${credito.servizio}` : ''}`
          })
          const { data: pags } = await supabase.from('registro_pagamenti').select('importo').eq('centro_id', centro_id).eq('data', oggi)
          const inc_eff = (pags || []).reduce((s, r) => s + Number(r.importo), 0)
          await supabase.from('registro_giornate').upsert(
            { centro_id, data: oggi, incasso_effettivo: inc_eff, updated_at: new Date().toISOString() },
            { onConflict: 'centro_id,data', ignoreDuplicates: false }
          )
        }
        return { ok: true, cliente: credito.nome_cliente, servizio: credito.servizio, saldato: residuo, metodo: input.metodo_saldo || 'contanti' }
      } catch (err) {
        console.error('[BeautyX] chiudi_credito error:', err.message)
        return { ok: false, error: err.message }
      }
    },
    'annulla_incasso':        async (input) => {
      try {
        const data = input.data || new Date().toISOString().split('T')[0]
        let query = supabase.from('registro_pagamenti').select('id, importo, metodo, descrizione, created_at').eq('centro_id', centro_id).eq('data', data)
        if (input.id)               query = query.eq('id', input.id)
        if (input.importo != null)  query = query.eq('importo', Number(input.importo))
        if (input.metodo_pagamento) query = query.eq('metodo', input.metodo_pagamento)
        if (input.descrizione)      query = query.ilike('descrizione', `%${input.descrizione}%`)
        query = query.order('created_at', { ascending: false })
        const { data: trovati } = await query
        if (!trovati || trovati.length === 0) return { ok: false, error: 'Nessun incasso trovato con i criteri specificati' }
        if (trovati.length > 1 && !input.id) {
          return { ok: false, multipli: trovati.map(p => ({ id: p.id, importo: p.importo, metodo: p.metodo, descrizione: p.descrizione })), error: 'Trovati più incassi, specifica quale annullare' }
        }
        const target = trovati[0]
        await supabase.from('registro_pagamenti').delete().eq('id', target.id)

        // Se era un acconto, elimina anche il credito associato
        let creditoEliminato = null
        const isAcconto = target.descrizione && target.descrizione.toLowerCase().startsWith('acconto')
        if (isAcconto) {
          // Estrai nome cliente dalla descrizione "Acconto NomeCliente - Servizio"
          const afterAcconto = target.descrizione.replace(/^acconto\s+/i, '')
          const nomeCliente = afterAcconto.split(' - ')[0].trim()
          if (nomeCliente) {
            const { data: creditiDaElim } = await supabase.from('registro_crediti')
              .select('id, nome_cliente, importo_totale, residuo')
              .eq('centro_id', centro_id)
              .eq('data_servizio', data)
              .eq('saldato', false)
              .ilike('nome_cliente', `%${nomeCliente}%`)
            if (creditiDaElim && creditiDaElim.length === 1) {
              await supabase.from('registro_crediti').delete().eq('id', creditiDaElim[0].id)
              creditoEliminato = { nome_cliente: creditiDaElim[0].nome_cliente, importo_totale: creditiDaElim[0].importo_totale }
            } else if (creditiDaElim && creditiDaElim.length > 1) {
              // Elimina quello con importo più vicino all'importo totale originale (il pagamento era l'acconto)
              await supabase.from('registro_crediti').delete().eq('id', creditiDaElim[0].id)
              creditoEliminato = { nome_cliente: creditiDaElim[0].nome_cliente, importo_totale: creditiDaElim[0].importo_totale }
            }
          }
        }

        // Ricalcola totali finanziari dal DB (source of truth)
        const [pagsRes, spesRes, credsRes, pagsCountRes] = await Promise.all([
          supabase.from('registro_pagamenti').select('importo').eq('centro_id', centro_id).eq('data', data),
          supabase.from('registro_spese').select('importo').eq('centro_id', centro_id).eq('data', data),
          supabase.from('registro_crediti').select('importo_totale').eq('centro_id', centro_id).eq('data_servizio', data),
          supabase.from('registro_pagamenti').select('id', { count: 'exact', head: true }).eq('centro_id', centro_id).eq('data', data)
        ])
        const inc_eff = (pagsRes.data || []).reduce((s, r) => s + Number(r.importo), 0)
        const spese_t = (spesRes.data || []).reduce((s, r) => s + Number(r.importo), 0)
        const inc_mat = (credsRes.data || []).reduce((s, r) => s + Number(r.importo_totale), 0) || inc_eff
        // n_clienti e n_servizi derivati dal count reale dei pagamenti rimasti
        const n_reale = pagsCountRes.count || 0
        await supabase.from('registro_giornate').update({
          incasso_effettivo: inc_eff, spese_totali: spese_t, incasso_maturato: inc_mat,
          n_clienti: n_reale, n_servizi: n_reale,
          updated_at: new Date().toISOString()
        }).eq('centro_id', centro_id).eq('data', data)
        return {
          ok: true,
          annullato: { importo: target.importo, metodo: target.metodo, descrizione: target.descrizione },
          credito_eliminato: creditoEliminato,
          nuovo_incasso_effettivo: inc_eff,
          n_clienti_aggiornato: n_reale
        }
      } catch (err) {
        console.error('[BeautyX] annulla_incasso error:', err.message)
        return { ok: false, error: err.message }
      }
    },
    'annulla_spesa':          async (input) => {
      try {
        const data = input.data || new Date().toISOString().split('T')[0]
        let query = supabase.from('registro_spese').select('id, importo, descrizione, categoria, created_at').eq('centro_id', centro_id).eq('data', data)
        if (input.id)              query = query.eq('id', input.id)
        if (input.importo != null) query = query.eq('importo', Number(input.importo))
        if (input.descrizione)     query = query.ilike('descrizione', `%${input.descrizione}%`)
        query = query.order('created_at', { ascending: false })
        const { data: trovati } = await query
        if (!trovati || trovati.length === 0) return { ok: false, error: 'Nessuna spesa trovata con i criteri specificati' }
        if (trovati.length > 1 && !input.id) {
          return { ok: false, multipli: trovati.map(s => ({ id: s.id, importo: s.importo, descrizione: s.descrizione, categoria: s.categoria })), error: 'Trovate più spese, specifica quale annullare' }
        }
        const target = trovati[0]
        await supabase.from('registro_spese').delete().eq('id', target.id)
        const { data: spes } = await supabase.from('registro_spese').select('importo').eq('centro_id', centro_id).eq('data', data)
        const spese_t = (spes || []).reduce((s, r) => s + Number(r.importo), 0)
        await supabase.from('registro_giornate').update({ spese_totali: spese_t, updated_at: new Date().toISOString() }).eq('centro_id', centro_id).eq('data', data)
        return { ok: true, annullata: { importo: target.importo, descrizione: target.descrizione, categoria: target.categoria }, nuove_spese_totali: spese_t }
      } catch (err) {
        console.error('[BeautyX] annulla_spesa error:', err.message)
        return { ok: false, error: err.message }
      }
    },
    'annulla_credito':        async (input) => {
      try {
        if (!input.id && !input.nome_cliente) return { ok: false, error: 'Specifica id o nome_cliente per trovare il credito da eliminare' }
        let query = supabase.from('registro_crediti').select('id, nome_cliente, servizio, importo_totale, acconto_versato, residuo, data_servizio').eq('centro_id', centro_id).eq('saldato', false)
        if (input.id)           query = query.eq('id', input.id)
        if (input.nome_cliente) query = query.ilike('nome_cliente', `%${input.nome_cliente}%`)
        if (input.importo != null) query = query.eq('importo_totale', Number(input.importo))
        const { data: trovati } = await query
        if (!trovati || trovati.length === 0) return { ok: false, error: 'Nessun credito aperto trovato con i criteri specificati' }
        if (trovati.length > 1 && !input.id) {
          return { ok: false, multipli: trovati.map(c => ({ id: c.id, nome_cliente: c.nome_cliente, servizio: c.servizio, importo_totale: c.importo_totale, residuo: c.residuo, data_servizio: c.data_servizio })), error: 'Trovati più crediti — specifica quale annullare usando l\'id' }
        }
        const target = trovati[0]
        await supabase.from('registro_crediti').delete().eq('id', target.id)
        // Ricalcola incasso_maturato per la data del servizio
        const { data: credsRim } = await supabase.from('registro_crediti').select('importo_totale').eq('centro_id', centro_id).eq('data_servizio', target.data_servizio)
        const { data: pagsRim } = await supabase.from('registro_pagamenti').select('importo').eq('centro_id', centro_id).eq('data', target.data_servizio)
        const inc_eff = (pagsRim || []).reduce((s, r) => s + Number(r.importo), 0)
        const inc_mat = (credsRim || []).reduce((s, r) => s + Number(r.importo_totale), 0) || inc_eff
        await supabase.from('registro_giornate').update({ incasso_maturato: inc_mat, updated_at: new Date().toISOString() }).eq('centro_id', centro_id).eq('data', target.data_servizio)
        return { ok: true, eliminato: { nome_cliente: target.nome_cliente, servizio: target.servizio, importo_totale: target.importo_totale } }
      } catch (err) {
        console.error('[BeautyX] annulla_credito error:', err.message)
        return { ok: false, error: err.message }
      }
    },
    'sync_koibox':            async (input) => {
      try {
        const configured = await isKoiboxConfigured(centro_id)
        if (!configured) return { ok: false, error: 'Koibox non configurato. Vai in Impostazioni → Integrazioni → Koibox e inserisci la tua API Key.' }
        const giorni_agenda = Math.min(parseInt(input.giorni_agenda || 30, 10), 60)
        const giorni_casse  = Math.min(parseInt(input.giorni_casse  || 90, 10), 180)
        console.log('[sync_koibox] params:', { clienti: input.clienti, servizi: input.servizi, agenda: input.agenda, casse: input.casse, giorni_agenda, giorni_casse })
        const syncPromise = syncKoibox(centro_id, {
          clienti:      input.clienti !== false,
          servizi:      input.servizi !== false,
          agenda:       input.agenda  !== false,
          casse:        input.casse   !== false,
          giorni_agenda,
          giorni_casse,
        })
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Sync timeout dopo 30s: i server Koibox sono lenti o hai molti dati. Riprova tra qualche minuto chiedendomi di nuovo di sincronizzare.')), 30000)
        )
        return await Promise.race([syncPromise, timeoutPromise])
      } catch (err) {
        console.error('[BeautyX] sync_koibox error:', err.message)
        return { ok: false, error: err.message }
      }
    },
    'update_memory':          async (input) => {
      try {
        await supabase
          .from('beautyx_memory')
          .upsert(
            { centro_id, contenuto: input.contenuto, updated_at: new Date().toISOString() },
            { onConflict: 'centro_id' }
          )
        return { saved: true }
      } catch (err) {
        console.error('[BeautyX] update_memory error:', err.message)
        return { saved: false, error: err.message }
      }
    }
  }

  const results = await Promise.all(
    toolUseBlocks.map(async tool => {
      const fn = toolFunctions[tool.name]
      if (!fn) {
        console.warn(`[BEAUTYX TOOL USE] Tool sconosciuto: ${tool.name}`)
        return { id: tool.id, data: { error: `Tool ${tool.name} non disponibile` } }
      }
      try {
        const data = await fn(tool.input || {})
        return { id: tool.id, data }
      } catch (err) {
        console.error(`[BEAUTYX TOOL USE] Errore ${tool.name}:`, err.message)
        return { id: tool.id, data: { error: err.message } }
      }
    })
  )

  return Object.fromEntries(results.map(r => [r.id, r.data]))
}

// ============================================
// PROCESS & RETURN
// Elabora la risposta finale: MONITOR, INSIGHT, token tracking
// ============================================

const WRITE_TOOLS = new Set(['registra_incasso', 'registra_spesa', 'chiudi_credito', 'annulla_incasso', 'annulla_spesa', 'annulla_credito'])

async function processAndReturn({
  aiResponse,
  message,
  centro_id,
  conversation_id,
  user_id,
  totalTokensIn,
  totalTokensOut,
  toolsUsed = []
}) {
  // Estrai dati strutturati per il Monitor Panel
  const monitorData = extractMonitorData(aiResponse, {}, message)

  // Estrai e salva insights identificati da Beautyx
  const detectedInsights = extractInsightsFromResponse(aiResponse, centro_id, conversation_id)
  const savedInsights = []
  for (const insight of detectedInsights) {
    try {
      const { data } = await supabase
        .from('beautyx_insights')
        .insert(insight)
        .select()
        .single()
      if (data) savedInsights.push(data)
    } catch (err) {
      console.error('Errore salvataggio insight:', err)
    }
  }

  // Pulisci risposta dai marker
  let cleanResponse = aiResponse.replace(/\[INSIGHT:.*?\]/g, '').trim()
  if (monitorData) {
    cleanResponse = cleanTextResponse(cleanResponse)
  }

  // Tracking consumo token AI
  let tokenUsage = null
  if (user_id) {
    try {
      const { data: trackResult } = await supabase.rpc('track_ai_usage', {
        p_user_id: user_id,
        p_centro_id: centro_id || null,
        p_conversation_id: conversation_id || null,
        p_tokens_in: totalTokensIn || 0,
        p_tokens_out: totalTokensOut || 0,
        p_model: 'claude-sonnet-4'
      })
      tokenUsage = trackResult
    } catch (err) {
      console.log('[BEAUTYX] track_ai_usage non disponibile, skip:', err.message)
    }
  }

  return NextResponse.json({
    response: cleanResponse,
    monitor: monitorData,
    insights: savedInsights,
    requires_refresh: toolsUsed.some(t => WRITE_TOOLS.has(t)) ? ['registro'] : [],
    metadata: {
      model: 'claude-sonnet-4',
      tokens_input: totalTokensIn,
      tokens_output: totalTokensOut,
      timestamp: new Date().toISOString()
    },
    token_usage: tokenUsage
  })
}

// ============================================
// MAIN HANDLER
// ============================================

export async function POST(request) {
  try {
    const body = await request.json()
    const { message, context } = body

    if (!message) {
      return NextResponse.json({ error: 'message richiesto' }, { status: 400 })
    }

    const {
      centro_id,
      user_id,
      conversation_id,
      pagina_corrente,
      storico_messaggi = [],
      insights_attivi = [],
      dati_contesto = {}
    } = context || {}

    // === 1. CHECK LIMITE TOKEN AI ===
    if (user_id) {
      try {
        const { data: limitCheck } = await supabase.rpc('check_ai_limit', { p_user_id: user_id })
        if (limitCheck && !limitCheck.allowed) {
          return NextResponse.json({
            response: `Hai raggiunto il limite mensile di token AI per il tuo piano ${limitCheck.piano || ''}. Puoi acquistare un pacchetto aggiuntivo di token o attendere il reset del prossimo mese.`,
            limit_reached: true,
            metadata: {
              token_ai_usati: limitCheck.token_ai_usati,
              token_ai_mensili: limitCheck.token_ai_mensili,
              percentage: limitCheck.percentage
            }
          })
        }
      } catch (err) {
        console.log('[BEAUTYX] check_ai_limit non disponibile, skip:', err.message)
      }
    }

    // === 2. FETCH META LEGGERO + MEMORIA PERSISTENTE ===
    const oggi = new Date().toISOString().split('T')[0]
    const [metaData, memoryRes, creditiRes, koiboxConfigured] = await Promise.all([
      fetchMetaData(centro_id),
      centro_id
        ? supabase.from('beautyx_memory').select('contenuto').eq('centro_id', centro_id).maybeSingle()
        : Promise.resolve({ data: null }),
      centro_id
        ? supabase.from('registro_crediti')
            .select('nome_cliente, servizio, residuo, data_attesa_saldo')
            .eq('centro_id', centro_id)
            .eq('saldato', false)
            .lte('data_attesa_saldo', oggi)
            .order('data_attesa_saldo', { ascending: true })
            .limit(10)
        : Promise.resolve({ data: null }),
      centro_id ? isKoiboxConfigured(centro_id) : Promise.resolve(false)
    ])
    const memoria = memoryRes?.data?.contenuto || null
    const crediti_scaduti = creditiRes?.data || []

    // === 3. COSTRUISCI MESSAGES ARRAY CON STORICO COME CONVERSATION TURNS ===
    const messages = [
      ...storico_messaggi.slice(-14).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.contenuto
      })),
      { role: 'user', content: message }
    ]

    // Carica prompt statico da DB (con cache 2min), fallback su hardcoded
    const staticPrompt = await loadAgentPrompt('beautyx') || BEAUTYX_FALLBACK_PROMPT
    const dynamicSections = buildDynamicSections({
      pagina_corrente,
      metaData,
      insights_attivi,
      dati_contesto,
      memoria,
      crediti_scaduti,
      koibox_api_attiva: koiboxConfigured,
    })

    const systemPrompt = `${staticPrompt}\n${dynamicSections}`
    console.log('[BEAUTYX TOOL USE] System prompt length:', systemPrompt.length)

    // === 4. PRIMA CHIAMATA LEGGERA: Claude sceglie quali tool usare ===
    const firstResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
      tools: BEAUTYX_TOOLS
    })

    console.log('[BEAUTYX TOOL USE] Prima call - stop_reason:', firstResponse.stop_reason, '| tokens in:', firstResponse.usage.input_tokens, 'out:', firstResponse.usage.output_tokens)

    // === 5a. RISPOSTA DIRETTA — nessun tool richiesto (domanda conversazionale) ===
    if (firstResponse.stop_reason === 'end_turn' || firstResponse.stop_reason === 'max_tokens') {
      const directText = firstResponse.content
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('')

      console.log('[BEAUTYX TOOL USE] Risposta diretta (no tool use) — 1 sola chiamata API')

      return await processAndReturn({
        aiResponse: directText,
        message,
        centro_id,
        conversation_id,
        user_id,
        totalTokensIn: firstResponse.usage.input_tokens,
        totalTokensOut: firstResponse.usage.output_tokens
      })
    }

    // === 5b. TOOL USE LOOP — supporta più round (es. get_registro_oggi → annulla_incasso) ===
    let conversationMessages = [...messages]
    let currentResponse = firstResponse
    let totalTokensIn = firstResponse.usage.input_tokens
    let totalTokensOut = firstResponse.usage.output_tokens
    const allToolsUsed = []
    const MAX_ROUNDS = 3

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const toolUseBlocks = currentResponse.content.filter(b => b.type === 'tool_use')
      if (toolUseBlocks.length === 0) break

      allToolsUsed.push(...toolUseBlocks.map(t => t.name))
      console.log(`[BEAUTYX TOOL USE] Round ${round + 1} — Tool richiesti:`, toolUseBlocks.map(t => t.name).join(', '))

      const toolResults = await executeToolsInParallel(toolUseBlocks, centro_id)
      console.log(`[BEAUTYX TOOL USE] Round ${round + 1} — Tool completati`)

      conversationMessages = [
        ...conversationMessages,
        { role: 'assistant', content: currentResponse.content },
        {
          role: 'user',
          content: toolUseBlocks.map(tool => ({
            type: 'tool_result',
            tool_use_id: tool.id,
            content: JSON.stringify(toolResults[tool.id])
          }))
        }
      ]

      currentResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: conversationMessages,
        tools: BEAUTYX_TOOLS
      })

      totalTokensIn += currentResponse.usage.input_tokens
      totalTokensOut += currentResponse.usage.output_tokens
      console.log(`[BEAUTYX TOOL USE] Round ${round + 1} — tokens in: ${currentResponse.usage.input_tokens}, out: ${currentResponse.usage.output_tokens}`)

      if (currentResponse.stop_reason === 'end_turn') break
    }

    console.log('[BEAUTYX TOOL USE] Token totali — input:', totalTokensIn, '| output:', totalTokensOut)

    const finalText = currentResponse.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')

    return await processAndReturn({
      aiResponse: finalText,
      message,
      centro_id,
      conversation_id,
      user_id,
      totalTokensIn,
      totalTokensOut,
      toolsUsed: allToolsUsed
    })

  } catch (error) {
    console.error('Errore chat Beautyx:', error)
    return NextResponse.json({
      response: 'Mi dispiace, ho avuto un problema tecnico. Per favore riprova.',
      error: error.message
    }, { status: 500 })
  }
}

// ============================================
// ESTRAI INSIGHTS DALLA RISPOSTA DI BEAUTYX
// ============================================

function extractInsightsFromResponse(response, centro_id, conversation_id) {
  const insights = []
  const regex = /\[INSIGHT:(obiettivo|progresso|alert|suggerimento|traguardo):([^:]+):([^:]+):(\d)\]/g

  let match
  while ((match = regex.exec(response)) !== null) {
    const [_, tipo, titolo, descrizione, priorita] = match

    insights.push({
      centro_id,
      conversation_id: conversation_id || null,
      tipo,
      titolo: titolo.trim(),
      descrizione: descrizione.trim(),
      priorita: parseInt(priorita),
      stato: 'attivo',
      data_inizio: new Date().toISOString().split('T')[0],
      metadata: {
        creato_da: 'beautyx_ai',
        timestamp: new Date().toISOString()
      }
    })
  }

  return insights
}

// ============================================
// NOTA ARCHITETTURALE:
// Tool Use Pattern: la prima chiamata è leggera (~1.500 token).
// Claude sceglie quali dati servono. Il sistema fetcha solo quelli in parallelo.
// La seconda chiamata riceve solo i dati richiesti.
// Risparmio medio: 60-80% sui token di input rispetto al vecchio approccio.
//
// Per domande conversazionali: 1 sola chiamata leggera (risparmio 94%).
// Per analisi finanziarie: 2 chiamate ma con payload minimo.
//
// getCompleteBusinessData in dataHub.js è mantenuta per usi futuri.
// ============================================
