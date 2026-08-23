# Memoria di Riccardo — Sicurezza & disaster recovery

File del sistema di memoria del team (`memory/`). Contiene le istruzioni e le regole
apprese **specifiche** di questo agente, che Riccardo rilegge all'inizio di ogni
compito (insieme a `memory/generale.md`). Le regole superate non si cancellano: si marcano
come sostituite con la data (storico).

> Consolidato il 2026-07-27 dal precedente `RICCARDO_OPS_LOG.md` (archiviato in
> `memory/_archivio-log-storici/`). Questa è l'unica fonte operativa: non usare più il vecchio log.

---

## INFRASTRUTTURA DA MONITORARE

| Componente | URL/riferimento | Stato attuale |
|---|---|---|
| Vercel (hosting) | beautyx-app-iota.vercel.app / beautyx.it | Attivo |
| Supabase | progetto scfumedmisbuxhdywwpb | Attivo (migrato 17/07/2026) |
| Beehiiv (newsletter) | account Mason | Attivo, non ancora lanciato pubblicamente |
| Dominio | beautyx.it (IONOS) | Connesso, SSL in provisioning al 24/07/2026 |

---

## HEALTH CHECK — 3 VOLTE AL GIORNO (06:00 / 12:00 / 18:00)

Schedulato. Per ogni check verificare:
1. `https://beautyx.it` risponde (status 200)
2. `https://beautyx.it/newsletter` carica correttamente
3. `https://beautyx.it/miniguida` carica correttamente (pagina pubblica per ads)
4. API `/api/public/news` risponde senza errori
5. Supabase: nessuna anomalia di connessione

---

## REGOLE DI SICUREZZA

- `.env.local` non va mai committato su git (già in .gitignore)
- `CRON_SECRET` è obbligatorio — endpoint cron senza segreto sono esposti pubblicamente
- `reactivate_existing: true` su Beehiiv — garantisce che iscritti già esistenti vengano recuperati
- API keys e service keys vanno configurate su Vercel dashboard, mai in chat o form

---

## VULNERABILITÀ PENDENTI (aggiornato 20/08/2026)

1. ~~**Rate limiting in-memory** — inefficace su Vercel serverless...~~ — **Codice RISOLTO 19-20/08/2026**: migrato a Upstash Redis (`lib/rateLimit.js`) su `newsletter/subscribe` e `guida/access`, con fallback sicuro a in-memory. **Residuo aperto**: da confermare con Mason se le env var `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` sono state effettivamente create e aggiunte su Vercel — vedi dettaglio in fondo al file.
2. **Error monitoring assente** — nessun Sentry o equivalente. Errori in produzione durante campagna ads sarebbero invisibili.
3. ~~**Accesso `/guida` non legato allo stato reale della subscription Beehiiv** (audit 17/08/2026) — `ensureGuidaAccessToken` scattava su qualunque `res.ok` (HTTP 2xx), senza mai leggere `data.data.status`.~~ — **RISOLTO 17/08/2026 da Davide, RICONFERMATO 18/08/2026 da Riccardo su codice reale**: in `app/api/newsletter/subscribe/route.js` il token guida ora viene emesso solo se `data.data.status` è in `GUIDA_ALLOWED_STATUSES = {'active','pending','validating'}`; esclusi esplicitamente `invalid`, `inactive`, `paused`, `needs_attention`. Aggiunta anche verifica MX-record lato server (`dns.promises.resolveMx`, timeout 3.5s) prima di procedere con Beehiiv — email senza dominio/MX valido → 400 `{error:'Email non valida o dominio inesistente'}`; in caso di errore di rete/DNS nostro l'iscrizione passa comunque (loggato come anomalia) per non penalizzare utenti reali.
4. ~~**`/api/guida/access` senza rate limiting** — nessun honeypot né limite IP; consentiva lookup ripetuti illimitati di email (enumerazione).~~ — **RISOLTO 17/08/2026 da Davide, RICONFERMATO 18/08/2026 da Riccardo su codice reale**: aggiunto lo stesso pattern di rate limiting in-memory per IP di `/subscribe` (5 richieste/ora per IP, leggermente più permissivo perché è un lookup legittimo che un utente può dover ripetere). Nota: resta soggetto al limite noto del punto 1 (in-memory, non persistente tra istanze serverless Vercel) — stessa soluzione Upstash lo risolverebbe per entrambi gli endpoint.

### Audit finale pre-lancio — 18/08/2026 (double opt-in ora attivo lato Beehiiv, dashboard confermata da Mason)

~~**Residuo non ancora chiuso — priorità alta:** anche con double opt-in attivo... l'emissione del `guidaToken` resta legata a `GUIDA_ALLOWED_STATUSES` che include `"pending"`...~~ — **RISOLTO 20/08/2026, verificato su codice reale:** `GUIDA_ALLOWED_STATUSES` in `app/api/newsletter/subscribe/route.js` è ora `new Set(['active'])` (solo `active`, "pending"/"validating" escluse esplicitamente) — decisione di Mason del 19/08/2026. In fase di iscrizione il token guida viene emesso SOLO se Beehiiv riporta già `active` nella risposta della POST (caso raro: re-iscritto storico già confermato in passato). Per tutti gli altri casi il vero cancello è ora `app/api/guida/access/route.js`: quando non esiste ancora un token, fa un **lookup live** su Beehiiv (`GET /subscriptions/by_email/:email`) e crea il token solo se `data.data.status === 'active'`; se non è `active` risponde 403 con messaggio "conferma la mail". Il buco originale (email fasulla ma con MX valido → accesso istantaneo senza mai cliccare il link di conferma) è chiuso: senza click di conferma reale su Beehiiv lo stato non diventa mai `active`, quindi niente token, né in fase di subscribe né in fase di lookup successivo. Residuo minore invariato e accettato consapevolmente (gating leggero, direttiva Mason): un token già emesso resta valido a vita (cookie 90gg) anche se l'iscrizione viene poi cancellata lato Beehiiv — `app/guida/page.js` non ricontrolla lo stato ad ogni accesso, solo l'esistenza del token. Non bloccante per il lancio.

~~**Nuovo — priorità alta, indipendente dal flusso newsletter/guida:** `app/api/chat/route.js` ... completamente privo di autenticazione e di rate limiting...~~ — **RISOLTO 20/08/2026, verificato su codice E in produzione:** `app/api/chat/route.js` non esiste più nel codice; verifica live `curl -X POST https://www.beautyx.it/api/chat` → **404**. Nessun intervento ulteriore necessario su questo endpoint specifico. **ATTENZIONE però — vedi nuovo finding sotto: esiste un endpoint diverso (`app/api/beautyx/chat/route.js`) con lo stesso problema di fondo, mai controllato prima d'ora.**

~~**Nuovo — priorità media:** `proxy.js` (middleware) esclude tutte le rotte `/api/*`... alcuni endpoint di setup/migrazione una-tantum NON lo fanno...~~ — **RISOLTO 20/08/2026, verificato su codice E in produzione:** nessuno dei 4 file esiste più (`admin/run-migration`, `admin/fix-obiettivi`, `admin/setup-auth`, `migrations/add-manual-flag`). Verifica live (curl POST) su tutti e 4 → **404** in produzione (dopo il nuovo push di stamattina, ~20 min prima di questo controllo — deploy confermato andato a buon fine).

**Verificato invece a posto (confermato ancora valido 20/08/2026):** `app/api/webhooks/stripe/route.js` valida la firma Stripe prima di processare eventi. `contact-requests`, `booking`, `onboarding/create-centro` fanno un controllo `supabase.auth.getUser()` reale prima di scrivere. I cron (`check-subscriptions`, `cleanup-inactive`, `koibox-sync`, `reset-counters`) sono protetti da `CRON_SECRET` — verificato live: tutti e 4 rispondono **401** senza il secret. Gli endpoint `app/api/admin/*` "veri" (dashboard, users, settings, ecc.) fanno tutti `supabase.auth.getUser()` reale — solo i 4 endpoint di setup dimenticati (ora rimossi) ne erano privi.

---

### NUOVO — 20/08/2026 — Audit completo di TUTTI gli endpoint `app/api/` (non solo newsletter/guida)

Su richiesta esplicita di Mason ho fatto un giro su tutti i ~140 file `route.js` sotto `app/api/`, cercando pattern di autenticazione (`auth.getUser`, `CRON_SECRET`, verifica firma webhook, ecc.). Risultato: **due categorie di problemi**, uno critico e nuovo, uno sistemico e preesistente mai segnalato prima perché gli audit precedenti si erano concentrati solo sul funnel newsletter/guida.

**CRITICO — priorità massima, va chiuso prima ancora di pensare al lancio ads:**
`app/api/beautyx/chat/route.js` (il chatbot AI della dashboard Beautyx, **diverso** dal vecchio `/api/chat` già rimosso) è **completamente privo di controllo di autenticazione** — verificato leggendo tutto il file (1054 righe): nessuna chiamata a `supabase.auth.getUser()` o equivalente in tutto il file. Usa la **SERVICE_KEY** di Supabase (bypassa RLS) e:
1. Accetta `centro_id` e `user_id` direttamente dal body JSON inviato dal client, senza verificare che l'utente chiamante sia autenticato né che possieda quel `centro_id` — **IDOR**: chiunque conosca (o indovini) un `centro_id` altrui può, con una singola POST non autenticata, far eseguire ai tool AI (`get_financials`, `get_dipendenti`, `get_accantonamenti`, `get_budget`, `get_koibox`, ecc.) query che restituiscono dati finanziari, bancari e HR completi di **qualsiasi centro cliente**, oltre a poter scrivere (upsert pagamenti/spese/registro giornata) tramite i tool di scrittura esposti allo stesso modo.
2. Il controllo `check_ai_limit` (righe 843-861) scatta SOLO se `user_id` è presente nel body — se il chiamante omette `user_id` e `centro_id`, la richiesta passa comunque e viene comunque inoltrata a Claude (costo Anthropic reale), **senza alcun limite né rate limiting** visibile nel file.
3. Verificato live: `curl -X POST https://www.beautyx.it/api/beautyx/chat` (body vuoto) → **400** "message richiesto" (non 404) — l'endpoint è raggiungibile e attivo in produzione in questo momento.
Rischio concreto con traffico ads in arrivo: sia abuso economico diretto (bombing → bolletta Anthropic), sia — più grave — **esfiltrazione dati di altri centri clienti** senza credenziali. Da chiudere con: verifica sessione reale (`supabase.auth.getUser()`) + verifica che l'utente autenticato possieda effettivamente il `centro_id` richiesto (join su `user_profiles`/tabella di appartenenza) + rate limiting per IP/utente, prima del prossimo deploy. **Non è nel percorso dell'ads newsletter/guida, ma è un rischio grave indipendente e va segnalato a Mason subito.**

**SISTEMICO — priorità alta, preesistente, non blocca l'ads su /newsletter ma riguarda tutta la dashboard:**
Circa 40 endpoint sotto `app/api/` che gestiscono dati business (elenco non esaustivo, campione verificato: `accantonamenti/*`, `bank/*`, `budget/*`, `categories`, `closures`, `daily-costs`, `daily-revenues`, `employees/*`, `obiettivi/*`, `opening-hours`, `optimization-*`, `progressi-obiettivi`, `revenue/*`, `soglie-alert`, `registro/stats`, `vendors/*`) usano la SERVICE_KEY Supabase e si fidano di un `centro_id` passato nel body/query **senza alcun controllo di sessione o di ownership**. Esempio concreto verificato: `app/api/accantonamenti/route.js` (GET/POST) e `app/api/vendors/apply/route.js` (POST, riscrive `categoria` sui movimenti bancari) accettano `centro_id` puro, nessun `auth.getUser()`. Questi endpoint non sono protetti dal middleware (`proxy.js` esclude tutto `/api/*` per design, riga 16-18) e non fanno il controllo da soli: sono protetti SOLO nel senso che la pagina dashboard che li chiama è dietro login — ma l'endpoint stesso, chiamato direttamente, non lo è. È un IDOR potenziale su tutta la dashboard business (lettura E scrittura dati di altri centri clienti), della stessa famiglia del punto sopra su `beautyx/chat`, solo meno grave nell'immediato perché non fa uscire dati "in linguaggio naturale" via AI. **Non blocca il lancio della campagna ads sul funnel newsletter/guida** (che non tocca questi endpoint), ma è un rischio serio per i clienti paganti già attivi e va pianificato come intervento a parte con Mason — non è un problema "nuovo di oggi", esisteva già, semplicemente nessun audit precedente aveva coperto l'intera superficie `/api/`.

**Verificato invece a posto nel giro completo:** i 4 endpoint cron (`CRON_SECRET`, 401 live confermato), `webhooks/stripe` (firma verificata), gli endpoint `admin/*` "veri" (dashboard, users, settings — `auth.getUser()` presente), `contact-requests`/`booking`/`onboarding/create-centro` (auth presente), tutti gli endpoint sotto `public/*` (leggono solo dati pubblici read-only tranne `public/lead` che è un form insert-only equivalente a un form di contatto, rischio basso), `newsletter/subscribe` e `guida/access` (vedi sopra, ok).

---

### Residuo aperto non verificabile da codice — DA CONFERMARE CON MASON PRIMA DEL LANCIO
Il rate limiting via Upstash Redis (`lib/rateLimit.js`) è scritto correttamente e fa fallback automatico e sicuro a in-memory se le env var mancano (verificato nel codice). **MA**: la nota di Davide in `memory/davide.md` (sezione "Rate limiting Upstash Redis — migrazione da Map() in-memory, 2026-08-19") elenca esplicitamente 3 passi ancora da fare **da Mason** — creare il DB su upstash.com e aggiungere `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` come env var sul progetto Vercel `beautyx-app_news` — e li marca come non ancora fatti a quella data. Non ho accesso alla dashboard Vercel per verificare se questi due valori sono stati poi effettivamente aggiunti. **Se non lo sono**, il rate limiting sta girando silenziosamente sul vecchio fallback in-memory (nessun errore visibile, solo un `console.warn` nei log Vercel) — cioè lo stesso limite pratico già noto su Vercel serverless (contatori non condivisi tra istanze, limite aggirabile con traffico reale). Da confermare con Mason/Davide PRIMA di dare per acquisita la protezione rate-limit in produzione.

---

### Endpoint pubblici non autenticati — check di Riccardo obbligatorio PRIMA del "pronto"
- **In vigore** (2026-08-17): qualunque nuovo endpoint o flusso che accetta input pubblico non autenticato (form email, upload file, webhook in ingresso, lookup per email/token, ecc.) deve passare da un check di sicurezza di Riccardo **prima** di essere presentato a Mason come pronto/lanciabile — non dopo che lui lo trova rotto o abusato in produzione. Il check copre almeno: validazione input reale (non solo formato/regex), rate limiting, cosa succede se l'input è falso/malevolo, e se l'azione lato server (es. concessione di accesso, invio email, scrittura DB) dipende correttamente dallo stato reale a monte (es. conferma reale di un provider esterno) invece che dal solo "la chiamata HTTP non ha dato errore". Motivo: nasce da una correzione critica di Mason (17/08/2026) — iscrizione newsletter con email vera E con email fasulla hanno entrambe dato accesso istantaneo alla guida `/guida` senza alcuna verifica reale, mai intercettato prima del lancio perché nessuno specialista di sicurezza aveva fatto un audit dedicato a quel flusso specifico prima che Mason lo testasse di persona.

---

## REGOLA AGGIORNAMENTO LOG

Dopo ogni incident, anomalia risolta o nuova regola di sicurezza approvata, aggiorna subito questo file.

---

### 2026-08-21 — Riverifica INDIPENDENTE fix IDOR helper `verifyCentroOwnership` (~42 endpoint di Davide)

**Verdetto: PROBLEMI TROVATI** (fix di Davide solido nella sostanza, ma non completo al 100%: 1 gap reale non protetto + 1 pattern di rischio medio ripetuto in almeno 2 file).

**PARTE 1 — Statica:**
- `lib/auth/verifyCentroOwnership.js` letto per intero: logica corretta, default-deny in tutti i casi limite verificati — `centro_id` null/undefined → 400; profilo mancante → 403; ruolo/ruolo_livello malformato o non riconosciuto → cade nel 403 finale; confronto `String(profile.centro_id) === String(centroId)` evita mismatch di tipo; riga senza `centro_id` in `verifyRowCentroOwnership` → nega per sicurezza (403). Nessun bypass trovato.
- Campione di 10 file verificato riga per riga: `bank/movements/route.js` (GET/POST/PATCH), `bank/upload/route.js`, `registro/giornata/route.js` (GET/POST/PATCH), `registro/pagamenti/route.js`, `registro/crediti/[id]/route.js`, `beautyx/chat/route.js`, `hpa/reports/route.js` (GET singolo+lista, POST), `scores/centro/[id]/route.js`, `obiettivi/route.js` (GET/POST/PATCH/DELETE), `obiettivi/riepilogo` e `obiettivi/suggeriti`, `vendors/apply/route.js`. In tutti: la verifica avviene PRIMA di qualunque query/mutazione sui dati, e il `centro_id`/`user_id` usato nelle query successive è sempre quello verificato (in `beautyx/chat/route.js` il `user_id` è esplicitamente preso da `ownershipCheck.user.id`, mai dal body — corretto).
- **Finding A — rischio MEDIO, integrità dati (non confidenzialità), presente in almeno 2 file:** `app/api/obiettivi/route.js` PATCH (righe 154-186) e `app/api/centro/servizi/[id]/route.js` PUT (righe 61-102) fanno `.update()` spargendo l'intero body/payload client (`{ id, ...updates }` oppure un `Object.fromEntries` filtrato che però include ancora `centro_id` tra le colonne ammesse). L'ownership viene verificata sul `centro_id` REALE della riga PRIMA dell'update, ma il valore scritto può comunque contenere un `centro_id` diverso dichiarato dal client: un utente che possiede legittimamente una riga (un proprio obiettivo o servizio) può riassegnarla a un `centro_id` arbitrario, "iniettando" dati falsi nell'elenco di un altro centro o orfanizzando la propria risorsa. Non è più IDOR di lettura, è un'escalation di scrittura più stretta (serve già possedere la riga di partenza) ma reale. Da chiudere escludendo esplicitamente `centro_id` dai campi aggiornabili in questi update (whitelist senza quella colonna, o `delete updates.centro_id` prima dell'update).
- **Finding B — gap NON coperto dal fix, CONFERMATO ANCHE IN PRODUZIONE:** `app/api/obiettivi/step/route.js` (GET/POST/PATCH) non ha ALCUN controllo di autenticazione — nessuna chiamata a `auth.getUser()` in tutto il file, usa `supabase` da `lib/supabase.js` che è un `createBrowserClient` (pensato per il browser, senza sessione allegata quando usato lato server in una route handler). Il file non è stato intercettato dal grep sistematico di Davide su `centro_id` perché lavora solo su `obiettivo_id` (non ha mai `centro_id` nel proprio codice, pur scrivendo su una tabella collegata logicamente a `obiettivi`, che ha `centro_id`). **Verifica live:** `curl https://www.beautyx.it/api/obiettivi/step?obiettivo_id=...` e la POST corrispondente rispondono **500** "Could not find the table 'public.obiettivi_step' in the schema cache" — NON 401. L'endpoint è raggiungibile senza autenticazione; oggi non è sfruttabile solo perché la tabella `obiettivi_step` non esiste ancora nello schema Supabase reale (probabile funzionalità mai completata/collegata). Se quella tabella viene creata in futuro senza rivedere questo file, l'endpoint diventa immediatamente un IDOR completo (lettura E scrittura, zero auth). Da correggere ORA (aggiungere lo stesso pattern `verifyRowCentroOwnership`/`verifyCentroOwnership` risolvendo `centro_id` tramite lookup su `obiettivi` dato l'`obiettivo_id`), non quando la tabella verrà creata.

**PARTE 2 — Live in produzione (curl, senza autenticazione):**
- Endpoint corretti campionati → tutti **401** come atteso: `scores/centro/[id]`, `hpa/reports`, `obiettivi`, `bank/movements`, `registro/giornata`, `accantonamenti`, `vendors`, `beautyx/chat` (sia body vuoto → 400 "message richiesto" prima ancora dell'auth check per mancanza campo obbligatorio, sia con `context.centro_id` fittizio → 401 corretto, l'ownership check intercetta prima di qualunque query/chiamata Anthropic).
- Endpoint NON toccati dal fix, verificati per non-regressione → coerenti con il comportamento pre-fix: `centro/servizi` → 401, `hpa/dashboard/alerts` → 401, `registro/giornate` → 401, `registro/medie` → 401, `public/news` → 200 (pubblico by design, invariato). Nessuna rottura rilevata.

**Da fare prima di considerare il fix "chiuso":**
1. `obiettivi/step/route.js` — aggiungere verifica ownership (priorità alta, gap reale confermato live, oggi non sfruttabile solo per un problema di schema DB scollegato).
2. `obiettivi/route.js` PATCH e `centro/servizi/[id]/route.js` PUT — escludere `centro_id` dai campi scrivibili via update (priorità media).
3. Considerare un secondo giro di grep mirato su tutti i file `app/api/**/route.js` che referenziano un `*_id` collegato a una tabella con `centro_id` ma SENZA passare `centro_id` esplicitamente nel proprio codice (stesso pattern di elusione del grep di Davide che ha fatto sfuggire il punto 1) — non ancora fatto per mancanza di tempo in questo giro, consigliato come prossimo passo.

Non ho toccato il codice (compito di revisione, non di fix) — segnalazione a Davide/Mason per i due interventi sopra.

---

### 2026-08-21 (2° giro, stesso giorno) — Riverifica INDIPENDENTE dei due fix di Davide su `obiettivi/step`, `obiettivi` PATCH, `centro/servizi/[id]` PUT

**Verdetto: ALTRI PROBLEMI TROVATI — audit NON chiuso.**

**Statica (codice letto per intero, working tree):** la logica dei tre fix è corretta, nessun bypass trovato.
- `obiettivi/step/route.js`: GET/POST verificano ownership su `obiettivi` (padre) PRIMA di leggere/inserire su `obiettivi_step`. PATCH fa il lookup a due livelli (service-key su `obiettivi_step` per risolvere `obiettivo_id`, poi ownership sul centro dell'obiettivo padre) sempre PRIMA di qualunque `.update()`; casi limite (id/obiettivo_id mancante, step inesistente, obiettivo_id orfano/null, profilo utente assente) cadono tutti in un 400/403/404 senza mai raggiungere la scrittura. `obiettivo_id`/`id`/`created_at` esclusi da `safeUpdates`.
- `obiettivi/route.js` PATCH: `centro_id`/`id`/`created_at` esclusi da `safeUpdates`, verificato che sia `safeUpdates` (non `updates`) a raggiungere `.update()`.
- `centro/servizi/[id]/route.js` PUT: `centro_id` rimosso da `COLONNE_SERVIZI`, un payload malevolo con `centro_id` iniettato viene filtrato da `Object.fromEntries` prima di arrivare a `.update()`.

**CRITICO — motivo reale della non-chiusura:** `git status`/`git log` mostrano che tutti e tre i file sono modifiche **non committate** (working tree "modified", nessun commit dopo `f1173ed`, non pushate su `origin/main`). **I fix non sono mai stati deployati su Vercel/produzione.** La verifica live lo conferma: `GET/POST/PATCH https://www.beautyx.it/api/obiettivi/step` senza auth rispondono ancora **500** "Could not find the table 'public.obiettivi_step'/'obiettivi' in the schema cache" — esattamente lo stesso comportamento pre-fix già segnalato nel giro precedente, non 401. `PATCH /api/obiettivi` senza auth risponde anch'esso 500 (stesso motivo: codice vecchio ancora live). Nessuna regressione sugli endpoint non toccati: `GET /api/obiettivi` → 401, `GET/PUT /api/centro/servizi/[id]` → 401 (questi passano da `verifyCentroOwnership`/`getAuth()` già deployati in `f1173ed`, non toccati dai nuovi fix non ancora live).

**Nuovo — anomalia indipendente scoperta verificando in produzione:** interrogato direttamente il Supabase di produzione (`scfumedmisbuxhdywwpb`) via `information_schema.tables`/`pg_class` su tutti gli schemi: **le tabelle `obiettivi` e `obiettivi_step` non esistono da nessuna parte** (schema `public` ha solo 15 tabelle, nessuna `obiettivi*`; esiste invece `objectives_3s`, verosimilmente il vero nome attuale/rinominato). Non è uno IDOR sfruttabile (niente può scrivere su una tabella inesistente) ma significa che l'intera funzionalità "obiettivi" fallisce sempre con 500 in scrittura, autenticata o no — e ha reso impossibile distinguere a occhio, dal solo status code live, "fix deployato" da "fix non deployato" (entrambi danno 500). Da chiarire con Davide/Mason: tabella mai creata o rinominata senza aggiornare le route?

**Minore — stesso pattern di whitelist-bug trovato in un file gemello mai controllato prima:** `app/api/centro/servizi/route.js` (endpoint collezione, POST) ha lo stesso `COLONNE_SERVIZI` con `'centro_id'` ancora incluso (riga 70) — MA qui non è sfruttabile oggi: l'insert è `.insert({ ...servizioData, centro_id: centroId, codice_barcode })`, col `centro_id: centroId` verificato scritto DOPO lo spread, quindi vince sempre sull'eventuale valore malevolo. Rischio latente/fragile (basta invertire l'ordine in un refactor futuro per riaprire il buco) — consigliata pulizia preventiva della whitelist anche qui.

**Prossimi passi prima di richiudere l'audit:**
1. Davide deve fare commit + push dei 3 fix (oggi solo locali/non committati) e confermare il deploy Vercel.
2. Dopo il deploy, ripetere gli stessi curl live su `obiettivi/step` (attesi 400/401/403, non più 500) — impossibile finché la tabella `obiettivi_step`/`obiettivi` non esiste comunque (vedi anomalia sopra), quindi va risolta anche quella per validare il fix end-to-end.
3. Chiarire con Mason se `obiettivi`/`obiettivi_step` sono tabelle da creare o se il codice va ripuntato su `objectives_3s`.
4. Facoltativo/hygiene: rimuovere `centro_id` anche da `COLONNE_SERVIZI` in `centro/servizi/route.js`.

Nessun altro caso analogo trovato nel giro completo su `centro_id` in tutti gli ~88 file `app/api/**/route.js`.

---

### 2026-08-23 — Riverifica INDIPENDENTE ricostruzione completa pacchetto Obiettivi (5 tabelle + 7 endpoint, commit `912b121`)

**Verdetto: PROBLEMI TROVATI — audit NON chiuso.** Fix di Davide solido su tutto il perimetro atteso (ownership pre-query, service-key coerente con RLS deny-all, no bypass), ma emerso un gap NUOVO non coperto dal giro di oggi.

**PARTE 1 — Statica (7 file letti per intero):** `obiettivi/route.js`, `obiettivi/step/route.js`, `obiettivi/riepilogo/route.js`, `obiettivi/suggeriti/route.js`, `obiettivi/storico/route.js`, `obiettivi/valutazione/route.js`, `progressi-obiettivi/route.js` — in tutti la verifica (`verifyCentroOwnership`/`verifyRowCentroOwnership`) avviene PRIMA di ogni query dati, e il `centro_id`/`obiettivo_id` usato dopo è quello verificato. `storico` e `valutazione` (l'IDOR non previsto segnalato da Davide) ora fanno `verifyRowCentroOwnership` su `obiettivi` prima di leggere/scrivere — confermato corretto. `obiettivi` PATCH/DELETE e `step` PATCH continuano a escludere `centro_id`/`obiettivo_id` dai campi scrivibili (fix del giro precedente, ancora intatto).

**Migration `20260821_ricrea_tabelle_obiettivi.sql` verificata via query dirette sul DB prod (`scfumedmisbuxhdywwpb`):** tutte e 5 le tabelle esistono, RLS abilitata su tutte, **zero policy** (confermato da `get_advisors` — solo INFO `rls_enabled_no_policy`, stesso pattern accettato di `accantonamenti`/`bank_movements`/ecc.). CHECK constraint su `obiettivi.tipo` (9 valori, incluso `formazione`) e `obiettivi.stato` (7 valori) coerenti coi valori usati nel codice.

**CRITICO — NUOVO gap trovato oggi, confermato con PoC diretta sul DB prod (dati fittizi, poi ripuliti):** `POST /api/progressi-obiettivi` (righe 102-157) verifica l'ownership solo sul `centro_id` dichiarato dal client, ma **non verifica mai che l'`obiettivo_id` passato nello stesso body appartenga davvero a quel `centro_id`**. Un titolare che possiede legittimamente un centro A (ownership verificata, quindi non serve nemmeno bucare l'auth) può inviare `centro_id=A` (proprio) insieme a un `obiettivo_id` reale di un centro B altrui: l'upsert va a buon fine e scrive una riga `progressi_obiettivi` con `centro_id=A`/`obiettivo_id=B`. La successiva `GET /api/progressi-obiettivi?centro_id=A` (query reale: `.select('*, obiettivo:obiettivi(*)')`, riga 60-66) fa un JOIN su `obiettivi` filtrato **solo** su `p.centro_id`, non sul centro reale dell'obiettivo collegato: il join espone l'intero record `obiettivi` del centro B (nome, note, valore_riferimento, analisi_situazione, motivazione, ecc.) dentro la risposta del proprio centro A. **PoC eseguita** (2 centri fittizi + 2 obiettivi fittizi creati via service-key, insert del progresso incrociato, replica esatta della query della route): confermato che il join restituisce `"obiettivo_nome_esposto":"Obiettivo SEGRETO Centro B"` interrogando solo `centro_id=A`. Dati di test ripuliti subito dopo (0 righe residue verificate). È un'esfiltrazione cross-tenant reale (non solo teorica), sfruttabile da qualunque titolare autenticato del proprio centro contro qualunque altro centro di cui indovini/ottenga un `obiettivo_id`. Da correggere: in `POST /api/progressi-obiettivi`, dopo aver verificato l'ownership su `centro_id`, verificare ANCHE che `obiettivo_id` appartenga realmente a quel `centro_id` (lookup su `obiettivi` + confronto, stesso pattern già usato altrove) prima dell'upsert — e/o filtrare il JOIN della GET aggiungendo un controllo `obiettivo.centro_id = centro_id` lato query.

**PARTE 2 — Live in produzione (curl, senza autenticazione):**
- `GET /api/obiettivi`, `GET /api/obiettivi/riepilogo`, `POST /api/obiettivi/suggeriti`, `GET /api/progressi-obiettivi`, `PATCH/DELETE /api/obiettivi` → tutti **401**, mai 200/500.
- `GET /api/obiettivi/step`, `GET /api/obiettivi/storico`, `GET /api/obiettivi/valutazione` con un `obiettivo_id` FASULLO (UUID inesistente) → **404** "Risorsa non trovata" (comportamento noto e accettato: `verifyRowCentroOwnership` cerca prima la riga, poi verifica l'auth). Con un `obiettivo_id` REALE (creato ad-hoc per il test, poi ripulito) le stesse chiamate senza sessione → **401** corretto: l'ordine lookup-poi-auth non è sfruttabile, non rivela mai dati, il 404 sul fasullo è solo "riga non trovata" e non un bypass.
- Nessuna tabella `obiettivi*` risulta più "non esistente" (il vecchio 500 "schema cache" del giro del 21/08 è sparito): la ricreazione delle tabelle ha chiuso anche quel problema pregresso.

**PARTE 3 — Sanità perimetro:** nessun file `route.js` aggiuntivo sotto cartelle `obiettivi*`/`progressi*` oltre ai 7 noti. Nessun altro punto del codice fa query dirette su `obiettivi_step`/`obiettivi_valutazioni`/`obiettivi_storico`/`progressi_obiettivi`. Altri 6 file leggono (solo lettura, mai scrittura) dalla tabella `obiettivi` per conteggi/join (`lib/beautyx/dataHub.js`, 3 file `hpa/dashboard/*`, `scores/centro/[id]/route.js`, `app/admin/centri/[id]/page.js`) — già dietro i propri controlli di ownership verificati in giri di audit precedenti, non toccati e non impattati dal cambio di oggi.

**Prossimo passo prima di richiudere l'audit:** Davide deve aggiungere la verifica di coerenza `obiettivo_id` ↔ `centro_id` in `POST /api/progressi-obiettivi` (priorità alta — confidenzialità cross-tenant, PoC già dimostrata); poi nuova riverifica mirata solo su quel file.

---

### 2026-08-23 (2° giro, stesso giorno) — Riverifica INDIPENDENTE del fix `progressi-obiettivi` (obiettivo_id ↔ centro_id) + giro mirato su pattern "join non filtrato"

**Verdetto: FIX CONFERMATO su `progressi-obiettivi` — ma AUDIT SICUREZZA GESTIONALE COMPLESSIVO **NON** CHIUSO** (trovato un pattern analogo, oggi dormiente, in altri 2 endpoint — vedi sotto).

**1) Fix confermato via lettura riga-per-riga di `app/api/progressi-obiettivi/route.js`:**
- POST (righe 136-167): `verifyCentroOwnership(request, centro_id)` PRIMA di tutto; poi `verifyRowCentroOwnership(..., { table:'obiettivi', id: obiettivo_id })` per risolvere il centro_id REALE dell'obiettivo; poi confronto esplicito `String(obiettivoOwnership.row.centro_id) !== String(centro_id)` → 403 se non coincidono. Nessun modo di saltare il controllo: `obiettivo_id`/`centro_id`/`data`/`valore_registrato` sono tutti obbligatori (400 se mancanti), quindi non esiste un ramo "obiettivo_id assente" che bypassi il check. Il file espone SOLO GET e POST — nessun altro verbo HTTP nascosto, nessun path alternativo nello stesso file.
- GET (righe 22-111): se `centro_id` è passato, verificato via `verifyCentroOwnership`; se solo `obiettivo_id`, il centro_id viene derivato dalla riga `obiettivi` reale e poi verificato (quindi un attaccante non può leggere dati di un centro che non possiede passando solo un `obiettivo_id` altrui: fallirebbe l'ownership check su quel centro). Query dati: join `obiettivo:obiettivi!inner(*)` + `.eq('obiettivo.centro_id', verifiedCentroId)` — ho verificato a mano che quando sia `centro_id` che `obiettivo_id` sono passati insieme (caso non esplicitamente testato da Davide), il filtro `obiettivo.centro_id = verifiedCentroId` resta comunque AND-ato con gli altri `.eq()`, quindi un `obiettivo_id` di un centro diverso da quello dichiarato viene comunque escluso dal join `!inner` — nessun bypass combinando i due parametri.
- `lib/auth/verifyCentroOwnership.js` riletto per intero: stessa logica già validata nei giri precedenti, default-deny confermato in ogni caso limite (id mancante→400, riga non trovata→404, riga senza centro_id→403 nega).

**2) PoC indipendente mia (dati nuovi, mai usati da Davide), eseguita ed eliminata sul DB prod `scfumedmisbuxhdywwpb`:**
- Creati 2 centri (`RIC-INDEP-Centro-A/B`) e 2 obiettivi (uno a testa, quello di B con nota `SEGRETO-RICCARDO-INDEP-TEST`).
- Inserita una riga `progressi_obiettivi` "incoerente" (centro_id=A, obiettivo_id=B) per simulare cosa sarebbe potuto succedere senza il fix — riprodotto **a mano** sia la query VECCHIA (join semplice filtrato solo su `p.centro_id`) sia quella NUOVA (`!inner` + `.eq('obiettivo.centro_id', ...)`): la vecchia espone `"Obiettivo SEGRETO RIC-B"` / la nota segreta; la nuova restituisce SOLO la riga legittima di A (0 righe cross-tenant) — non-regressione confermata (la riga legittima di A resta visibile).
- Simulato anche il lato scrittura: lookup diretto `obiettivi.centro_id` per l'obiettivo di B con `centro_id` dichiarato = A → mismatch `true` (avrebbe dato 403); stesso lookup con l'obiettivo REALE di A e `centro_id`=A → mismatch `false` (avrebbe passato, comportamento corretto per il flusso legittimo).
- **Pulizia:** tutte le righe/centri di test cancellati; verificato con query di conteggio finale: `beauty_centers`, `obiettivi`, `progressi_obiettivi` tutti a **0** righe — nessun residuo, né mio né di Davide (controllo esplicito su tutte e 5 le tabelle "obiettivi*" richiesto dal compito: tutte a 0).

**3) Grep mirato su pattern "join tra due tabelle filtrato solo sull'esterna" in tutto `app/api/`:** trovato lo **stesso identico difetto architetturale** (una tabella con proprio `centro_id` + una FK verso un'altra tabella per-centro, MAI incrociata a scrittura, poi joinata in lettura senza filtrare sul centro_id della tabella collegata) in **2 punti aggiuntivi**:
- `app/api/centro/pacchetti/route.js` (POST, righe 69-76) e `app/api/centro/pacchetti/[id]/route.js` (PUT, righe 43-52): `pacchetti_items.servizio_id` viene scritto direttamente dal body client (`i.servizio_id`) **senza mai verificare** che il servizio appartenga allo stesso `centro_id` del pacchetto. La GET (`centro/pacchetti/route.js` riga 33-38) fa poi `items:pacchetti_items(quantita, servizio:servizi(id,nome,durate...))` senza alcun filtro su `servizi.centro_id`. Stesso identico schema del bug pre-fix di `progressi-obiettivi`: un titolare potrebbe referenziare un `servizio_id` di un centro altrui in un proprio pacchetto e vedersi restituiti nome/durate del servizio del concorrente.
- `app/api/scores/centro/[id]/route.js` (righe 44-52): `score_transactions` è letta filtrata su `.eq('centro_id', centroId)` (verificato), ma il join `obiettivo:obiettivi(titolo)` non filtra `obiettivi.centro_id` — se una riga `score_transactions` avesse mai un `obiettivo_id` di un centro diverso (non trovato codice che lo impedisca a scrittura, ma non ho trovato nemmeno il punto che scrive `score_transactions` per confermare/escludere), esporrebbe il `titolo` (solo quello) di un obiettivo altrui.
- **Non exploitable OGGI:** verificato direttamente sul DB di produzione (`information_schema.tables`) che `pacchetti`, `pacchetti_items`, `servizi`, `iva_aliquote`, `score_transactions`, `client_scores`, `hpa_appointments`, `hpa_centro_assignments`, `subscription_plans`, `legal_documents`, `legal_clauses` **non esistono affatto** nello schema `public` (solo 20 tabelle reali, elenco verificato per intero) — questi endpoint rispondono oggi 500/errore, esattamente la stessa situazione "dormiente" già trovata il 21/08 su `obiettivi/step` prima che le tabelle fossero ricreate. Non è uno IDOR sfruttabile adesso, ma è un difetto reale nel codice che riemergerebbe intatto (senza che nessuno se ne accorga, perché "funziona" appena le tabelle esistono) il giorno in cui `pacchetti`/`servizi`/`score_transactions`/ecc. venissero creati — stessa lezione imparata da `obiettivi/step`.
- **Nota collaterale (non pattern-join, ma trovata nello stesso giro):** `PATCH /api/hpa/appointments/route.js` (righe 87-145) aggiorna `hpa_appointments` per `appointment_id` senza ALCUN controllo di ownership/assegnazione (nessun filtro su `hpa_id`/`centro_id` nella query di update) — stesso discorso: dormiente perché `hpa_appointments` non esiste ancora, ma da correggere insieme agli altri due sopra prima che la tabella venga creata.

**Verdetto finale:**
- Il finding critico del 23/08 (esfiltrazione cross-tenant `progressi-obiettivi`) è **FIX CONFERMATO** — chiuso, nessun bypass, nessun residuo dati.
- L'**AUDIT SICUREZZA GESTIONALE COMPLESSIVO NON è chiuso**: 3 endpoint (`centro/pacchetti/route.js`, `centro/pacchetti/[id]/route.js`, `scores/centro/[id]/route.js`, + nota collaterale `hpa/appointments` PATCH) hanno lo stesso difetto strutturale di `progressi-obiettivi` pre-fix, oggi non sfruttabile solo perché le tabelle collegate non esistono ancora nel DB di produzione. Da correggere PRIMA che quelle tabelle vengano create (stesso principio già applicato a `obiettivi/step`): validare `servizio_id`↔`centro_id` a scrittura in `pacchetti`/`pacchetti_items`, filtrare il join `obiettivi.centro_id` in `scores/centro/[id]`, e aggiungere ownership check reale al PATCH di `hpa/appointments`.
- Segnalazione a Davide/Mason per pianificare il fix insieme alla creazione di quelle tabelle (non urgente per il lancio ads, che non tocca questi endpoint, ma da non dimenticare come è già successo una volta con `obiettivi/step`).
