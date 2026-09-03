# Piano di sviluppo — Report di profiling CURA a pagamento

## ⚠️ AGGIORNAMENTO 03/09/2026 — il metodo/report si chiama CURA, non più CARE

Rinominazione decisa da Mason: collisione di marchio reale con "CARE®" (Care
S.r.l., Brescia, dal 2016, stesso settore consulenza/coaching). Nuovo
backronym, claim e motivazione completa in `nome-metodo-CARE.md` (filename
invariato). Sotto, i riferimenti testuali al nome sono aggiornati a CURA; gli
identificatori tecnici citati nel resto del piano (tabelle, variabili, nomi
di file/migration) restano invariati per decisione esplicita del brief — solo
il nome commerciale/copy cambia, non gli identificatori di codice.

## ⚠️ AGGIORNAMENTO 28/08/2026 (sera) — decisione strategica di Mason cambia la SEQUENZA, non l'analisi tecnica

Dopo la stesura di questo piano (28/08 mattina/pomeriggio), Mason ha preso una
decisione strategica definitiva sull'architettura del funnel (dettaglio
completo in `memory/alessia.md`, sezione "STRUTTURA FUNNEL", in vigore
2026-08-28, e in `memory/generale.md` "Report CARE è il prodotto civetta" —
titolo storico della regola, non aggiornato qui perché fuori dal perimetro di
questo intervento).
**Non riscrivo l'analisi tecnica sotto — resta valida** (schema DB, gap sul
checkout, architettura del motore questionario, scoring, ecc.). Cambia SOLO
quando ogni pezzo va costruito.

**La decisione:** il report CURA non è più un prodotto a pagamento fin da
subito. Nuova sequenza: miniguida (basso impegno) → **report CURA gratuito
per i primi 90 giorni dal lancio** (vero prodotto civetta, non la newsletter)
→ newsletter (iscrizione conseguenziale) → domanda mensile gratuita al
consulente → **solo dopo i 90 giorni il report costa 60€**, e quei 60€
diventano credito scalabile sull'abbonamento alla piattaforma per chi
prosegue (non paga due volte).

**Cosa cambia nel piano sotto, punto per punto:**

1. **Punto 2 ("Checkout one-time da loggati", Stripe) non è più urgente.**
   Nei primi 90 giorni il report è gratuito — non serve nessun pagamento
   Stripe per accedervi. Serve invece un meccanismo molto più semplice:
   assegnare il piano `report_profiling` a un utente loggato con account
   gratuito (`create-centro`, già pronto — vedi punto 2a sotto, invariato)
   SENZA passare da un checkout a pagamento, es. un endpoint/azione che
   assegna il piano gratuitamente se ci si trova entro la finestra dei 90
   giorni dal lancio (o un flag temporale equivalente). **Non ancora
   implementato** — non richiesto in questo giro, resta il prossimo passo
   tecnico piccolo quando il motore/UI del questionario (punti 3, 8) saranno
   pronti a consumarlo. Il checkout Stripe vero (analisi sotto, punto 2b)
   resta comunque valido e serve — ma solo a partire dal giorno 91.
2. **Nuova pagina/rotta pubblica creata oggi: `/report`** (`app/report/page.js`,
   aggiunta a `publicRoutes` in `proxy.js`). Non esisteva (verificato da
   Alessia). Comunica il framing "gratis per i primi 90 giorni, poi 60€
   scalabili sull'abbonamento" con urgenza temporale, mai scarsità di
   quantità. È pensata come punto di atterraggio per ads/outreach quando
   saranno pronti (traffico "caldo", per la logica di ingresso in
   `memory/alessia.md`). **Stato attuale: landing/placeholder** — collegata
   al flusso di registrazione gratuita esistente (`/signup` → poi
   `create-centro`), NON a un questionario funzionante, perché il motore e
   la UI del quiz (punti 3, 8 sotto) sono ancora work in progress separato
   (task #151-153, non toccati in questo giro). La pagina lo dice
   esplicitamente all'utente ("il questionario sta per essere attivato"),
   per non promettere un accesso che oggi non esiste.
3. **Da disegnare (non implementato): il credito 60€→abbonamento per il
   giorno 91 in poi.** Non è nel piano originale (che prevedeva solo un
   upsert one-time su `user_subscriptions`, nessuna logica di credito
   futuro). Traccia proposta: un campo su `user_purchases` (es.
   `credito_residuo_centesimi`, popolato all'acquisto one-time del report
   dopo la fine del periodo gratuito) o su `user_subscriptions` (es.
   `credito_disponibile_centesimi`), da scalare esplicitamente nel checkout
   dell'abbonamento SaaS (branch dedicato nel webhook Stripe, simile al
   pattern già in uso per gli addon — vedi punto 2b sotto per il contesto
   tecnico). Non blocca nulla oggi: rilevante solo dal giorno 91, quando il
   checkout one-time del report (punto 2b) esisterà davvero.
4. **Aperto, non deciso da me:** il redirect di default `beautyx.it` → `/newsletter`
   (oggi in `proxy.js`, riga `if (pathname === '/')`). Con il report come
   prodotto civetta principale potrebbe aver più senso puntare a `/report` o
   a una nuova home che lo presenta per prima. Segnalo la domanda al
   Coordinatore/Mason — non ho cambiato il redirect di `/`.

Il resto di questo documento (analisi 24-28/08, schema DB, gap sul checkout,
motore questionario, scoring, ecc.) resta la fonte tecnica di riferimento,
solo con priorità diversa da quella scritta lì sotto: oggi la cosa urgente
era la pagina pubblica (fatta), non più il checkout Stripe (punto 2 sotto).

---

Davide, 28/08/2026 (aggiornato lo stesso giorno dopo chiarimento di Mason sul
flusso di acquisto — vedi punto 2). Piano tecnico sequenziato per portare il
report di profiling da "contenuti finalizzati" a prodotto reale acquistabile.
Basato su `beautyx-report-profiling-note.md` (architettura di erogazione +
feasibility 24/08/2026, già scritta da me), sul codice reale letto oggi
(`app/api/beautyx/chat/route.js`, `app/api/subscriptions/checkout/route.js`,
`app/api/webhooks/stripe/route.js`, `app/api/onboarding/create-centro/route.js`,
`supabase/migrations/20260211_subscription_system.sql`,
`supabase/migrations/20260205_04_subscriptions.sql`, `lib/beautyx/agentPrompts.js`),
e sui materiali contenuto (`banco-domande-profiling.md`,
`contenuti-report-5-elementi.md`, `design/concept-quiz-profiling.html`).

**Chiarimento di Mason (28/08/2026, stesso giorno):** lo scenario "provisioning
Stripe→account nuovo" del punto 2 originale NON esiste — l'acquisto avviene
SEMPRE dall'interno della piattaforma Beautyx già loggata, quindi presuppone
per costruzione un login preventivo. Flusso reale: (1) registrazione gratuita
standard per chi non ha ancora un account, (2) acquisto one-time del report
da loggati, tramite l'infrastruttura di pagamento esistente. Il punto 2 sotto
è stato riscritto di conseguenza, dopo verifica sul codice reale (non per
assunzione) — vedi il gap concreto trovato.

Legenda complessità: **B**assa (poche ore) · **M**edia (1-2 giorni) · **A**lta (3+ giorni o richiede decisioni a monte).

---

## Ordine di dipendenza generale

```
1. Schema DB  ─────────────┐
                            ├──> 3. Motore questionario ──> 5. Scoring engine ──┐
2. Checkout one-time ───────┤                                                    ├──> 7. Assemblaggio report
   (da loggati)             └──> 4. Tool-gating profiling ──> 6. Analisi testo ──┘
                                                                                  8. UI quiz (parallelo, poco accoppiato)
```

Lo schema DB (1) è pronto. Il punto 2, con la semplificazione di Mason, non è
più un blocco "a monte" (nessuna decisione di prodotto aperta) ma resta un
pezzo di lavoro applicativo reale (endpoint checkout + branch webhook) da
scrivere prima di poter collaudare l'intero flusso end-to-end — vedi sotto.

---

## 1. Schema DB — complessità M — **si può iniziare SUBITO**

Nessuna decisione di prodotto aperta la blocca: la metodologia (3 ambiti,
scelta forzata ipsativa a 5 opzioni, narrazione libera + 3 domande di
controllo, scoring 4/3/2/1/0, meccanismo eccesso→carenza→leva) è già chiusa
in `beautyx-report-profiling-note.md`.

Tabelle nuove (bozza, dettaglio nella migration scritta oggi):

- **`profiling_sessions`** — una riga per sessione di profiling di un centro.
  Traccia `stato` (in_corso/completato/abbandonato), `fase` (nucleo/riserva/
  narrazione/completato — implementa la logica adattiva "nucleo fisso + banco
  di riserva mirato, tetto = doppio del nucleo"), `ambito_corrente`,
  `scenari_somministrati` (array di codici, per non ripescare uno scenario già
  fatto), collegamento a `purchase_id` (chi ha pagato) e `conversation_id`
  (per restare nello stesso filo della chat Beautyx esistente).
- **`profiling_scenario_responses`** — una riga per scenario a scelta forzata
  risposto: `scenario_code` (es. "C1"), `ambito`, `ordinamento` (JSONB
  posizione→elemento, l'intero ordinamento a 5, non solo estremi),
  `punteggi` (JSONB elemento→punti già calcolati 4/3/2/1/0 — calcolo
  deterministico lato client, salvato qui per audit/ricalcolo).
- **`profiling_narrative_responses`** — una riga per narrazione libera
  (le 3 previste: clienti, personale, spese): testo libero + le 3 risposte di
  controllo fisse + `analisi_ai` (JSONB, popolato dal motore di analisi
  testo — punto 6).
- **`profiling_element_scores`** — punteggio aggregato finale per sessione:
  totali per i 5 elementi, breakdown per ambito (JSONB), e i 3 campi del
  blocco individuato (`elemento_eccesso`, `elemento_carenza`, `leva_riequilibrio`)
  secondo la tabella fissa a 3 nodi già in nota.
- **`profiling_reports`** — il report assemblato: `contenuto_json` (dati
  strutturati, riusabile sia per resa web sia per PDF futuro — decisione
  formato non ancora presa, ma questa tabella non dipende da quella scelta),
  `contenuto_html` (versione pronta), stato di consegna.

**Fatto oggi:** migration scritta in
`supabase/migrations/20260828_profiling_report_care.sql` — SOLO file, NON
applicata al DB (come richiesto). RLS impostata sullo stesso pattern già in
uso per `user_subscriptions`/`user_purchases` (proprietà via `centro_id`
derivato da `user_profiles`, mai da input client).

**Non ancora deciso, non blocca lo schema ma andrà rivisto quando si decide:**
se il banco scenari (36+ item) resta hardcoded in codice/contenuto statico o
diventa una tabella `profiling_scenario_bank` editabile da admin — per ora
resta fuori dallo schema (nessuna tabella creata per questo), è contenuto
Federica versionato su file .md, coerente con come oggi `agent_prompts` separa
prompt editabili da codice.

---

## 2. Registrazione gratuita esistente → acquisto one-time da loggati — complessità B/M — **nessun blocco di prodotto residuo, verificato sul codice reale**

Con il chiarimento di Mason (28/08) lo scenario "provisioning Stripe→account
nuovo" non esiste: l'acquisto avviene sempre dentro la piattaforma, da un
utente già loggato. Questo elimina di netto i due BLOCCHI di prodotto della
versione precedente di questo piano (password pre/post pagamento; email già
esistente come account) — non c'è più nessun caso "utente sconosciuto al
momento del pagamento" da gestire. Ho verificato le due metà del flusso sul
codice reale, non per assunzione.

### 2a. Registrazione gratuita (chi non ha ancora un account) — già pronta, nessuna modifica

`app/api/onboarding/create-centro/route.js` (letto oggi, righe 1-80): richiede
sessione già autenticata (`supabaseAuth.auth.getUser()`, riga 32 — quindi la
creazione dell'utente Auth con email+password avviene con il normale
self-signup Supabase, PRIMA di questo endpoint, non qui), verifica che
l'utente non abbia già un `centro_id` (righe 38-46), poi con service key crea
la riga `beauty_centers` e aggiorna `user_profiles.centro_id` (righe 49-77).
Nessun pagamento coinvolto in questo passo, coerente con la richiesta.
**Non serve alcuna modifica**: è già esattamente il "percorso di registrazione
gratuita" richiesto dal punto 1 del flusso di Mason.

### 2b. Acquisto one-time del report da loggati — gap reale trovato, serve un piccolo adattamento

Qui la verifica ha trovato un gap concreto (non solo teorico): **l'infrastruttura
di pagamento esistente non supporta oggi l'acquisto/upgrade a un piano di
`subscription_plans` in nessuna forma** — supporta solo due casi diversi:

- `app/api/subscriptions/checkout/route.js` (letto oggi, righe 1-155): dopo
  aver verificato sessione + `centro_id` (righe 24-45, riusabile 1:1 per il
  report), il ramo `tipo === 'addon'` (righe 95-114) legge da `addon_packages`
  (top-up token AI, sempre `mode: 'payment'`); il ramo default (righe 115-134)
  legge da `subscription_packages` (pacchetti minuti HPA — tabella di
  `20260205_04_subscriptions.sql`, letta oggi), con
  `checkoutMode = pkg.periodo === 'mensile' ? 'subscription' : 'payment'` — **il
  pattern "pagamento one-time" (`mode: 'payment'`, `periodo: 'una_tantum'` è già
  un valore CHECK ammesso su `subscription_packages`) è quindi già codice
  esistente e collaudato**, solo mai applicato a un piano `subscription_plans`.
  Nessuno dei due rami costruisce mai una sessione a partire da
  `subscription_plans`, e nessuno dei due scrive mai `user_subscriptions.plan_id`.
- `app/api/webhooks/stripe/route.js` (letto oggi, righe 60-243): `handleCheckoutCompleted`
  smista solo su `tipo_acquisto === 'addon'` (righe 69-72, aggiorna
  `user_subscriptions.token_ai_bonus`, MAI `plan_id`) o, di default, sul ramo
  "pacchetto minuti HPA" (righe 74-135, scrive solo su `client_subscriptions`).
  Nessun branch assegna un piano a `user_subscriptions.plan_id` da un pagamento.
- `user_purchases.tipo` ha `CHECK (tipo IN ('abbonamento','addon','upgrade'))`
  (da `20260211_subscription_system.sql`, verificato) — `'report_profiling'`
  non è un valore ammesso oggi; per loggare l'acquisto va riusato `'upgrade'`
  (già valido, semanticamente corretto: è un upgrade di piano) oppure va
  esteso il CHECK — scelta minore, sistemata nella migration (vedi sotto).

**Adattamento tecnico reale da fare** (non solo verificare che funzioni già —
qui davvero manca un pezzo, ma piccolo):

1. Un nuovo modo per acquistare un piano one-time da `subscription_plans`.
   Due strade equivalenti in complessità, da scegliere in fase di scrittura
   codice (non blocca la stima): (a) endpoint dedicato nuovo
   `app/api/report-profiling/checkout/route.js` che riusa il pattern auth di
   `subscriptions/checkout/route.js` righe 1-45 ma legge `subscription_plans`
   invece di `subscription_packages`/`addon_packages`, oppure (b) un terzo
   `tipo` (`'plan_onetime'`) aggiunto direttamente a
   `subscriptions/checkout/route.js` esistente. In entrambi i casi: sessione
   Stripe `mode: 'payment'` (mai `'subscription'` per il report), metadata
   `{ tipo_acquisto: 'report_profiling', plan_id, user_id, centro_id }`.
2. Un nuovo branch in `handleCheckoutCompleted` (webhook) per
   `tipo_acquisto === 'report_profiling'`: **upsert**, non insert, su
   `user_subscriptions` (la tabella ha `UNIQUE(user_id)` — un utente potrebbe
   già avere una riga sul piano `free`/`demo`, va aggiornata con
   `plan_id = report_profiling`, non duplicata) + insert su `user_purchases`
   (idempotente sullo `stripe_checkout_session_id`, stesso principio già
   presente altrove nel webhook).
3. Prezzo one-time: `subscription_plans` non ha una colonna di prezzo
   una-tantum (solo `prezzo_mensile`/`prezzo_annuale`, entrambi a 0 per
   `report_profiling` nella migration — corretto, perché non è un piano
   venduto in ricorrenza). Il prezzo del report va passato come
   `price_data.unit_amount` letterale nel nuovo checkout (costante o env var);
   non serve una colonna DB dedicata a meno di volerlo gestire da un'admin UI
   futura — fuori scope qui.

**Stima:** B/M, non più A. Non c'è più creazione di utenti/centri da webhook,
non c'è gestione password pre/post pagamento, non c'è rischio "email già
esistente" (impossibile per costruzione: l'utente è già loggato quando
compra). Il lavoro reale è: un endpoint/branch di checkout + un branch webhook
+ un aggiustamento minore di constraint — poche ore, non giorni.

### Edge case minori (soluzione tecnica nota, non bloccanti)

- **Webhook duplicato/ritentato da Stripe:** idempotenza via check "esiste
  già `user_purchases` con questo `stripe_checkout_session_id`?" prima di
  scrivere — stesso principio già implicito nel codice esistente (upsert su
  `client_subscriptions`), va reso esplicito per questo branch.
- **Utente già sul piano `report_profiling` che ricompra per errore:**
  comportamento da decidere in fase di scrittura (no-op vs errore vs
  estensione validità) — dettaglio minore, non blocca la stima.

---

## 3. Motore del questionario in `/api/beautyx/chat` — complessità A

Non un nuovo endpoint separato — si integra nella chat esistente, come da
decisione architetturale già chiusa (23-24/08). Approccio:

- **Nuovo prompt agente dedicato** in `agent_prompts` (tabella già esistente,
  già letta via `loadAgentPrompt('beautyx')` con cache 2min) — nuova riga con
  `agent_name = 'beautyx_profiling'`, caricata SOLO quando la sessione utente
  è sul piano `report_profiling` (letto da `user_subscriptions`/piano, non da
  un flag nel messaggio client — stesso principio di sicurezza già applicato
  al tool-gating, punto 4).
- **Nuovi tool dedicati**, aggiunti a `BEAUTYX_TOOLS` solo quando il piano è
  `report_profiling` (mai tool "sempre presenti ma ignorati dal prompt" — il
  gating è sull'array, come da principio di sicurezza già fissato nella nota
  feasibility):
  - `get_prossimo_scenario` — legge `profiling_sessions` (fase, scenari già
    somministrati) e restituisce il prossimo scenario da proporre (nucleo →
    riserva se necessario, mai oltre il tetto doppio del nucleo).
  - `salva_risposta_scenario` — riceve l'ordinamento a 5 dato dall'utente
    (arriva dalla UI quiz dedicata, punto 8 — NON è testo libero in chat),
    calcola i punteggi deterministici, scrive su `profiling_scenario_responses`.
  - `salva_narrazione_libera` — riceve narrazione + le 3 risposte di
    controllo per un ambito, invoca il motore di analisi testo (punto 6),
    scrive su `profiling_narrative_responses`.
  - `verifica_profilo_definito` — implementa la logica adattiva: dopo il
    nucleo base calcola se il profilo (dominante + secondario) è già
    "coerente a sufficienza" o se serve pescare dal banco di riserva
    sull'elemento ambiguo. Qui vive la regola del tetto massimo.
  - `genera_report_profiling` — trigger finale, punto 7.
- **Stato di avanzamento**: vive interamente in `profiling_sessions` (fase,
  scenari_somministrati, ambito_corrente) — non nello storico messaggi della
  chat (che resta per il "colore" conversazionale, non per lo stato
  macchina). Ogni chiamata a `/api/beautyx/chat` con un centro in modalità
  profiling deve prima leggere `profiling_sessions` per sapere "a che punto
  siamo", esattamente come oggi legge `beautyx_memory` per la memoria
  persistente — stesso pattern, tabella diversa.

**Dipende da:** schema DB (1, pronto oggi) e, per essere testabile
end-to-end, dal checkout one-time (2, non più bloccato da decisioni di
prodotto ma da scrivere). Il codice del motore può però essere scritto e
testato con un centro/utente creato a mano (bypassando Stripe) — non è
bloccato per iniziare, solo per il collaudo reale.

---

## 4. Tool-gating "modalità profiling" — complessità M — **si può iniziare SUBITO** (a livello di meccanismo, non di dati)

Riusa l'infrastruttura piano/tier che oggi la chat già interroga
(`check_ai_limit`, letta oggi in `route.js` riga 860). Meccanismo concreto:

1. All'inizio di `POST /api/beautyx/chat`, dopo `verifyCentroOwnership` (già
   in codice), leggere il piano attivo dell'utente via
   `get_user_subscription`/query diretta su `user_subscriptions` JOIN
   `subscription_plans` (funzione SQL già esistente, oggi non ancora chiamata
   da questa route — va aggiunta).
2. Se `subscription_plans.codice === 'report_profiling'`: costruire
   `BEAUTYX_TOOLS` SOLO con i tool profiling (punto 3) + eventualmente
   `update_memory`; ESCLUDERE per intero i tool gestionali (`get_financials`,
   `registra_incasso`, `sync_koibox`, ecc.) — non passarli nell'array `tools`
   della chiamata Anthropic. Nessuna istruzione a prompt che dice "non usare
   questi tool": semplicemente non esistono per quella chiamata (principio di
   sicurezza già scritto nella nota feasibility, qui reso operativo).
3. Se il piano non è riconosciuto o è nullo: default-deny, stesso principio.
4. **Nuova riga in `subscription_plans`**: `codice = 'report_profiling'`,
   `funzionalita = ARRAY['profiling_quiz']`, `token_ai_mensili` dimensionato
   sul costo reale stimato (punto 6) + margine, `centri_max = 1`,
   `utenti_max = 1`, `prezzo_mensile = 0` (è un acquisto one-off via
   `user_purchases`, non un piano ricorrente — coerente con "report_profiling"
   come piano assegnato manualmente dal webhook, non in vendita nella pagina
   pubblica piani). Questa riga può essere scritta già nella migration di
   oggi (fatto, vedi file SQL) perché non dipende da nessuna decisione aperta.

**Dipende da:** schema `subscription_plans` (già esiste, nessuna modifica di
struttura necessaria, solo INSERT). Il meccanismo di gating in sé non è
bloccato da nulla — l'ho abbozzato nella migration con l'INSERT del piano;
l'implementazione nel route.js va di pari passo col motore (punto 3).

---

## 5. Scoring engine — complessità B/M — **si può iniziare SUBITO**

Deterministico, come deciso nella nota (nessuna chiamata AI per le scelte
forzate — motivazione esplicita di costo). Vive **client-side** nella UI del
quiz (punto 8) per il calcolo immediato punteggio 4/3/2/1/0 per posizione, e
viene **ri-verificato server-side** nel tool `salva_risposta_scenario` (mai
fidarsi solo del client per un dato che determina il contenuto del report
pagato — stesso principio "mai solo prompt, controllo reale" applicato qui al
calcolo invece che all'auth).

Logica (pura funzione, nessuno stato esterno, facilmente testabile in
isolamento — può essere scritta e testata OGGI senza aspettare nient'altro):

```
function calcolaPunteggi(ordinamento) {
  // ordinamento: { 1: 'fuoco', 2: 'metallo', 3: 'acqua', 4: 'terra', 5: 'aria' }
  const PUNTI = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 0 }
  return Object.fromEntries(
    Object.entries(ordinamento).map(([pos, elemento]) => [elemento, PUNTI[pos]])
  )
}

function individuaBlocco(totali) {
  // tabella fissa a 3 nodi da beautyx-report-profiling-note.md
  const CONTROLLORE = { fuoco:'acqua', acqua:'aria', aria:'terra', terra:'metallo', metallo:'fuoco' }
  const NUTRITORE_DEL_CONTROLLORE = { acqua:'metallo', aria:'fuoco', terra:'acqua', metallo:'terra', fuoco:'terra' }
  // NOTA: nutritore_del_controllore(E) = predecessore di CONTROLLORE[E] nel ciclo
  // generativo Fuoco→Aria→Metallo→Acqua→Terra→Fuoco — da implementare come
  // funzione derivata dal ciclo, non da tabella scritta a mano due volte
  // (rischio disallineamento se il ciclo generativo viene mai rivisto).
  const eccesso = elementoConPunteggioPiuAlto(totali) // eventualmente con soglia minima di significatività
  return { eccesso, carenza: CONTROLLORE[eccesso], leva: NUTRITORE_DEL_CONTROLLORE[eccesso] }
}
```

Punto di attenzione tecnico (non di prodotto): la funzione `individuaBlocco`
va scritta **derivando** `leva` dal ciclo generativo (una singola fonte di
verità, i due cicli come array ciclici), non da due tabelle scritte a mano
separate — altrimenti un futuro aggiustamento dei cicli (è già successo due
volte, vedi nota metodologica) rischia di disallineare le due tabelle senza
che nessuno se ne accorga. Da fare bene fin da subito, è economico.

Serve anche una soglia di "significatività" dell'eccesso (quando un
punteggio è abbastanza più alto degli altri da dichiarare un blocco, invece
di un profilo piatto) — dettaglio numerico da tarare con dati reali/test, non
blocca la scrittura della funzione ma va marcato come parametro configurabile
(costante in cima al modulo, non hardcoded nella logica).

**Dipende da:** nulla per essere scritto; dipende dallo schema (1, pronto) per
essere persistito nel DB reale.

---

## 6. Analisi testo libero — complessità M/A

Qui SERVE l'AI (a differenza delle scelte forzate) — è la parte esplicitamente
lasciata "da progettare con Davide" nella nota (24/08). Due compiti per ogni
narrazione:

1. Mappare l'episodio sull'elemento/ambito coerente (contributo aggiuntivo al
   punteggio, non sostitutivo delle scelte forzate — la nota non specifica il
   peso relativo testo-libero vs scelta-forzata nel punteggio finale: **punto
   da chiarire con Mason/Federica quando si passa all'implementazione reale,
   non blocca la struttura DB ma blocca la formula finale di scoring**).
2. Rilevare pattern linguistici di giustificazione/auto-protezione nelle 3
   risposte di controllo (segnale qualitativo per il ritratto, non
   necessariamente un punteggio numerico).

Implementazione proposta: una chiamata Anthropic dedicata (non nel loop tool
della chat principale, per tenere il costo isolato e misurabile) invocata dal
tool `salva_narrazione_libera`, con un prompt strutturato che restituisce
JSON (`elemento_coerente`, `note_giustificazione: bool`, `sintesi_breve`) da
salvare in `profiling_narrative_responses.analisi_ai`.

**Costo stimato per persona:** 3 narrazioni × 1 chiamata ciascuna, prompt
corto (episodio + 3 risposte, poche centinaia di token) + output JSON breve
→ ordine di grandezza qualche migliaio di token totali a persona (da
verificare con un test reale prima di fissare `token_ai_mensili` sul piano
`report_profiling` — per ora nella migration ho messo un valore prudenziale
che andrà ricalibrato).

**Dipende da:** schema DB (1, pronto) per il campo di destinazione; motore
questionario (3) per essere invocato nel punto giusto del flusso.

---

## 7. Assemblaggio del report finale — complessità M

Non generato da zero via AI (costo + rischio di uscire dai testi già
approvati riga-per-riga da Elena) — **assemblato deterministicamente** da
`contenuti-report-5-elementi.md` (varianti già scritte da Federica: 3 per
capitolo — 2 eccesso non compensato, 1 carenza non nutrita — + 1 applicazione
pratica unica per elemento) usando `profiling_element_scores` (blocco
individuato) per scegliere QUALE variante inserire.

Passi:
1. Portare `contenuti-report-5-elementi.md` in una struttura dati (JSON/JS)
   indicizzata per elemento + tipo di blocco — non un parsing fragile del
   Markdown a runtime, un passaggio di trascrizione una tantum (o un piccolo
   script di build) mantenendo il .md come fonte editoriale per Federica/Elena.
2. Funzione di assemblaggio: dato `elemento_eccesso`/`elemento_carenza`/`leva`
   (da punto 5) + variante narrazione (locale/trasversale, da soglie sui
   punteggi per ambito) → seleziona i blocchi di testo giusti, li compone nel
   template a 5 parti già definito nella nota ("Struttura proposta del
   report").
3. Scrive il risultato in `profiling_reports.contenuto_json` +
   `contenuto_html`.

**Dipende da:** scoring engine (5) e analisi testo libero (6) per avere tutti
i dati; NON dipende dalla decisione formato PDF-vs-web (la tabella
`profiling_reports` è già formato-agnostica).

---

## 8. UI del quiz — complessità M — **si può iniziare SUBITO** (porting, non design)

`design/concept-quiz-profiling.html` è già stato validato (griglia 5 opzioni
no-scroll, task #139 completato). Porting a componente Next.js:

- Nuovo componente client (`components/profiling/QuizScenario.js` o simile),
  stesso pattern già in uso per `/guida` (quiz v3 psicometrico — riuso di
  struttura, non di contenuto).
- Riceve lo scenario corrente (testo + 5 opzioni) da `get_prossimo_scenario`
  (punto 3), gestisce il tap-in-sequenza con numerazione 1-2-3-4-5 e ri-tap
  per correggere (già specificato nel mockup), chiama
  `calcolaPunteggi`/`individuaBlocco` lato client (punto 5) e invia
  l'ordinamento al tool `salva_risposta_scenario`.
- Palette/font riusati 1:1 dal mockup (oro `#c9a34a`, Playfair Display/Inter)
  — zero lavoro di design aggiuntivo, solo conversione HTML statico → JSX +
  stato React.
- Dove vive nella UI: dentro l'interfaccia chat esistente (probabilmente un
  overlay/pannello sopra la chat quando il tool `get_prossimo_scenario`
  segnala "prossimo step = scelta forzata", altrimenti la chat torna a testo
  libero per narrazioni e domande di controllo) — punto di integrazione UI da
  verificare con un giro di collaudo, non bloccante per iniziare il porting
  del componente in isolamento.

**Dipende da:** nulla per iniziare il porting del componente puro; dipende
dal motore (3) per il collegamento dati reale.

---

## Riepilogo — cosa posso iniziare SUBITO senza aspettare decisioni aperte

| # | Pezzo | Blocca/bloccato da | Avviabile oggi |
|---|---|---|---|
| 1 | Schema DB | — | **Sì — fatto oggi** |
| 2 | Checkout one-time da loggati | Nessuna decisione di prodotto aperta; solo lavoro da scrivere (endpoint/branch checkout + branch webhook) | **Sì — nessun blocco, scrivibile subito** |
| 3 | Motore questionario | Da 1 (pronto); testabile end-to-end solo dopo 2 | Sì, scrivibile ora |
| 4 | Tool-gating | Da subscription_plans (già esiste) | Sì — riga piano già in migration di oggi |
| 5 | Scoring engine | — | Sì, funzione pura |
| 6 | Analisi testo libero | Peso testo-libero vs scelta-forzata (minore, non bloccante per iniziare) | Sì per la struttura, calibrazione dopo |
| 7 | Assemblaggio report | Da 5 e 6 | Sì per la trascrizione contenuti, non per la logica finale |
| 8 | UI quiz | — | Sì, porting del componente |

Prezzo e formato PDF/web (esplicitamente fuori scope per l'infrastruttura di
base, come indicato) non bloccano nessuno di questi punti.

---

## Domande di prodotto aperte — nessuna residua

Le due domande di prodotto della versione precedente di questo piano (come il
cliente imposta la password; cosa fare se l'email risulta già un account
Beautyx) sono state chiuse dal chiarimento di Mason del 28/08: non esistono
più, per costruzione, perché l'acquisto avviene sempre da un utente già
loggato con account già esistente (password già impostata alla registrazione
gratuita standard, nessun caso di email "nuova" da gestire al momento del
pagamento). Non ci sono più decisioni di prodotto in sospeso su questo punto
— resta solo il lavoro tecnico descritto al punto 2b (endpoint/branch di
checkout + branch webhook + aggiustamento minore del CHECK su
`user_purchases.tipo`, già portato nella migration).

---

## Stima complessiva aggiornata (28/08/2026, dopo il chiarimento di Mason)

Il pezzo più delicato del piano del 24-28/08 (provisioning Stripe→account
nuovo, stimato **A**, con 2 decisioni di prodotto bloccanti) non esiste più:
sostituito da un adattamento **B/M** dell'infrastruttura di checkout già
esistente (nessuna decisione aperta, solo endpoint/branch da scrivere). Tolto
questo pezzo, il progetto nel complesso è più leggero di quanto stimato sia il
24/08 sia nella prima stesura di questo piano (28/08 mattina): i pezzi a
complessità **A** restano solo il motore del questionario (3, per via della
logica adattiva nucleo/riserva/tetto) e, in parte, l'analisi del testo libero
(6, per il punto ancora aperto — minore — del peso testo-libero vs
scelta-forzata nello scoring finale). Nessun altro pezzo del piano supera M.
Non cambia l'ordine di lavoro consigliato (1/2/4/5/8 in parallelo da subito,
poi 3, poi 6/7), cambia solo il carico stimato sul punto più bloccante di
prima, che ora non lo è più.
