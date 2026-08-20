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
