# Memoria di Davide — Sviluppo app Next.js / deploy

File del sistema di memoria del team (`memory/`). Contiene le istruzioni e le regole
apprese **specifiche** di questo agente, che Davide rilegge all'inizio di ogni
compito (insieme a `memory/generale.md`). Le regole superate non si cancellano: si marcano
come sostituite con la data (storico).

> Consolidato il 2026-07-27 dal precedente `DAVIDE_TECH_LOG.md` (archiviato in
> `memory/_archivio-log-storici/`). Questa è l'unica fonte operativa: non usare più il vecchio log.

---

## STACK E INFRASTRUTTURA — stato attuale

- **Framework:** Next.js 16, App Router, TailwindCSS v4
- **Database:** Supabase — progetto attivo: `scfumedmisbuxhdywwpb` (migrato il 17/07/2026 — il vecchio progetto è in paused)
- **Hosting:** Vercel — progetto `beautyx-app_news`, URL slug `beautyx-app-iota.vercel.app`
- **Dominio:** `beautyx.it` (acquistato su IONOS, connesso a Vercel con A record 216.198.79.1 + CNAME www → cname.vercel-dns.com)
- **Email:** `info@beautyx.it` (contatto generale), `privacy@beautyx.it` (GDPR)
- **Push deploy:** tramite `push.bat` nella root del progetto — NON usare comandi git manuali
- **Auth:** `@supabase/ssr` con `createBrowserClient` (cookie-based, sincronizzato con middleware server-side)

---

## REGOLA CRITICA — PowerShell non supporta `&&`

**Contesto:** comandi git scritti con `&&` come separatore (stile bash) non funzionano in PowerShell
**Regola:** in PowerShell ogni comando va su riga separata. Mai usare `&&`. Nei file `.bat` si può usare `&` singolo o separare su righe.
**Applicazione futura:** qualsiasi script o istruzione per Mason che include comandi shell → verificare che sia compatibile con Windows PowerShell o usare `.bat`.

---

## REGOLA CRITICA — Mai pushare `.env.local`

**Regola:** `.env.local` è in `.gitignore` e non va mai toccato. Le variabili d'ambiente sono già configurate su Vercel dashboard. Non chiedere mai a Mason di inserire chiavi API in form o chat.
**Applicazione futura:** qualsiasi operazione che riguarda env vars → agire su Vercel dashboard, non sul file locale.

---

## Font — self-hosting via next/font/google (NON @fontsource)

**Contesto:** tentativo di installare `@fontsource/inter` e `@fontsource/playfair-display` via npm fallito con ENOTEMPTY error sul filesystem Windows montato.
**Soluzione approvata:** usare `next/font/google` con opzione `variable` — scarica i font a build time su Vercel, zero chiamate a Google a runtime (GDPR compliant).
**Implementato in:** `app/layout.js` — variabili `--font-inter` e `--font-playfair` disponibili globalmente.
**Regola futura:** per qualsiasi nuovo font → usare `next/font/google`, NON pacchetti npm @fontsource. Mai aggiungere `@import url('https://fonts.googleapis.com/...')` nelle pagine.

---

## Proxy e `__dirname` — fix Next.js 16

**Contesto:** errore `__dirname is not defined` in Next.js 16 con App Router quando si usa il proxy
**Fix:** il file `proxy.js` usa un workaround per `__dirname` con `import.meta.url` e `fileURLToPath`
**Non toccare** la logica proxy senza verificare che il fix sia preservato.

---

## Route pubbliche — middleware auth

**Regola:** le route pubbliche (accessibili senza login) devono essere esplicitamente dichiarate in `publicRoutes` nel middleware. Se una pagina non è in lista, redireziona a `/login`.
**Pagine pubbliche attuali:** `/newsletter`, `/miniguida`, `/privacy`, e ora anche `/` (redirect a `/newsletter` per non autenticati — task Davide pendente).
**Errore passato:** `/miniguida` non era in `publicRoutes` → utenti delle ads venivano reindirizzati al login invece di vedere la landing page.

---

## Supabase — API e variabili d'ambiente

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` → già su Vercel
- `SUPABASE_SERVICE_KEY` → già su Vercel (usata per API server-side come `/api/public/news`)
- **Attenzione:** `.env.local` ha ancora placeholder `DA_SOSTITUIRE_service_role_nuovo_progetto` — non serve toccarli perché Vercel usa le sue variabili. Ma il file locale non funzionerà per test locali senza la chiave reale.
- Tabella `news_posts`: 4 articoli presenti, tutti con `pubblicato: true`

---

## Beehiiv — integrazione newsletter

- `reactivate_existing: true` — impostato correttamente per recuperare iscritti già esistenti
- `CRON_SECRET` — obbligatorio, già configurato su Vercel
- Welcome email con link miniguida: verificare che il flusso Beehiiv sia attivo

---

## Cookie e GDPR

- Cookie notice: componente `CookieNotice.js` in `components/common/` — barra informativa, si chiude con localStorage
- Nessun cookie di profilazione — solo tecnici → banner informativo (non richiede consenso)
- Google Fonts rimosso da tutte le pagine → zero richieste esterne a Google

---

## /guida — link footer condizionale "Rileggi la guida" (2026-08-18)

- **Contesto:** Mason ha approvato un link permanente a `/guida` nel footer del
  sito, ma SOLO visibile per chi ha già il cookie `guida_access_token` (chi è
  probabilmente già iscritto) — mai per un visitatore qualunque. Il vero
  controllo d'accesso resta interamente in `app/guida/page.js` (token contro
  Supabase `guida_access`); qui si decide solo se MOSTRARE il link, non se dare
  accesso.
- **Componente creato:** `components/common/GuidaFooterLink.js` — client
  component (`'use client'`) che legge `document.cookie` per `guida_access_token`
  e renderizza `<Link href="/guida">Rileggi la guida →</Link>` solo se presente
  (altrimenti `null`). Accetta prop `separator` per il "· " davanti al link, così
  il separatore non appare mai da solo quando il link è nascosto.
- **Approccio scelto per pagina — perché due tecniche diverse:**
  - `app/newsletter/page.js` e `app/page.js` sono entrambe `'use client'` in
    cima al file → `cookies()` di `next/headers` non è utilizzabile lì
    direttamente. Usato il componente client `GuidaFooterLink` (document.cookie),
    coerente con il pattern già esistente in `app/newsletter/page.js`
    (`readAccessCookie()`, riga 26-32, stesso cookie `ACCESS_COOKIE`).
  - `app/privacy/page.js` NON è `'use client'` (Server Component) → usato
    `cookies()` da `next/headers` direttamente in testa alla pagina
    (`PrivacyPage` reso `async`), stesso pattern di `app/guida/page.js`. Nessun
    componente extra necessario.
  - **Regola futura:** per qualunque nuova pagina che debba leggere
    `guida_access_token` solo per decidere la VISUALIZZAZIONE (mai per dare
    accesso vero) — se la pagina è Server Component usare `cookies()` inline;
    se è `'use client'`, riusare `components/common/GuidaFooterLink.js` invece
    di duplicare la logica `document.cookie`.
- **File modificati:** `components/common/GuidaFooterLink.js` (nuovo),
  `app/newsletter/page.js` (footer, riga ~568), `app/page.js` (footer, riga
  ~1103), `app/privacy/page.js` (footer, riga ~169 + `cookies()` in testa).
  `app/guida/page.js` non toccato (accesso già gestito lì, come da richiesta).

## /guida — reset progressi test + opacità card definitiva (2026-08-18)

- **Contesto:** Mason continuava a segnalare quiz/capitolo 1-2 "sbloccati senza
  compilare nulla". La logica di sblocco in `GuidaContent.js` (riga 33, `if (n
  === 1) return quizCompletato`) era già corretta e live — il sospetto (confermato
  come causa più probabile) è che i test avvenissero nello stesso browser/tab con
  `localStorage` già popolato da test precedenti, non un bug di codice.
- **Fix 1 — pulsante reset per i test:** aggiunto in fondo al footer di
  `app/guida/_components/GuidaContent.js` un link discreto "Reset progressi guida
  (solo per test)" (piccolo, grigio, sotto il copyright). `onClick` rimuove da
  `localStorage` tutte le chiavi `beautyx-guida-esercizio-*` (via `workbookKey(n)`,
  importato da `useWorkbookAnswer.js`) e `beautyx-guida-quiz-risposte` (import
  `QUIZ_STORAGE_KEY` da `useQuizCompleted.js`), poi `window.location.reload()`.
  Non tocca il cookie `guida_access_token` (accesso alla pagina, non progresso).
  **Regola futura:** questo è l'unico modo corretto per "ripulire" un test su
  `/guida` senza incognito — usarlo prima di ogni verifica di quiz/capitoli.
- **Fix 2 — opacità card portata a 35% esatto:** su richiesta esplicita di Mason
  (non negoziabile questa volta), in `Chapter.js` le tre card sono passate da
  `/60` e `/55` a `/35`: narrazione (riga 89) e caso pratico (riga 138)
  `bg-[#f5f1ea]/35`, workbook (riga 180) `bg-[#14140b]/35`. Per compensare il
  rischio di leggibilità a quel livello di trasparenza, aggiunta solo una classe
  Tailwind v4 `text-shadow-[...]` sul contenitore di ciascuna card (eredita sui
  figli, non serve toccare ogni paragrafo): alone chiaro
  `rgba(245,241,234,0.85)` sulle due card chiare, alone scuro `rgba(0,0,0,0.7)`
  sulla card scura del workbook. Nessun'altra modifica di stile.
  **Verificato:** Tailwind installato è v4.1.17 (`node_modules/tailwindcss/package.json`),
  che supporta nativamente l'utility `text-shadow-*` incluse le arbitrary values;
  stesso pattern di valori con virgole dentro parentesi (`rgba(...)`) già usato
  altrove nel progetto (es. `bg-[radial-gradient(...)]` in `GuidaContent.js`).

## /guida — accesso legato alla conferma reale double opt-in (2026-08-19)

- **Contesto:** decisione esplicita di Mason: l'accesso a `/guida` va concesso
  SOLO dopo che l'email è stata davvero confermata via click sul link di
  double opt-in Beehiiv — non più a chiunque risulti "pending"/"validating".
  Chiudeva il residuo segnalato da Riccardo nell'audit del 18/08/2026
  (`memory/riccardo.md`): il token veniva emesso a priori anche per email mai
  confermate, e `/api/guida/access` (gate di recupero email su `GuidaGate.js`)
  faceva solo un lookup nella tabella Supabase senza mai controllare lo stato
  Beehiiv, quindi il token pre-creato restava comunque recuperabile.
- **Fix 1 — `app/api/newsletter/subscribe/route.js`:** `GUIDA_ALLOWED_STATUSES`
  ridotto al solo `'active'` (era `{'active','pending','validating'}`).
  `ensureGuidaAccessToken` ora viene chiamata solo se lo stato Beehiiv riportato
  dalla risposta di creazione subscription è già `active` in quel momento (caso
  raro: email già confermata in passato). Per il caso normale (email appena
  iscritta, non confermata) non viene creato alcun token — niente più scappatoia
  a valle.
- **Fix 2 — `app/api/guida/access/route.js`** (il vero cancello, chiamato da
  `GuidaGate.js`): prima controlla se esiste già un token in `guida_access` per
  l'email (se sì, lo restituisce subito, nessuna richiesta esterna ripetuta per
  chi ha già accesso). Se non esiste, chiama LIVE l'endpoint Beehiiv
  `GET /v2/publications/:publicationId/subscriptions/by_email/:email` (email
  URL-encoded, stesso `BEEHIIV_API_KEY`/`BEEHIIV_PUBLICATION_ID` usati in
  `subscribe/route.js`) e legge `data.data.status`. Token creato ORA solo se
  `status === 'active'`; altrimenti risposta 403 con messaggio esplicito
  ("Non risulta ancora una conferma per questa email..."). Rate limiting
  esistente (5 richieste/ora per IP) invariato — anzi più importante ora che
  l'endpoint fa una chiamata esterna a Beehiiv.
- **Fix 3 — `app/newsletter/page.js`:** il messaggio di successo del form, ramo
  senza `guidaToken` (il caso ora più comune), riscritto per essere onesto:
  invita a confermare via email prima di poter sbloccare la guida su
  `/guida`. Il ramo con `guidaToken` presente (email già confermata in
  precedenza) resta invariato — mostra ancora il pulsante diretto.
- **Verifica:** solo statica (grep + lettura + `node --check` sui due route
  API); build completa non eseguibile nel sandbox. `GuidaGate.js` non
  modificato — gestisce già correttamente qualunque `data.error` restituito.
- **Nota per Riccardo:** questo fix chiude il residuo "priorità alta" del suo
  audit 18/08/2026 in `memory/riccardo.md` — da riconfermare con audit
  indipendente sul codice reale, come da convenzione del team, prima di
  marcarlo risolto in quel file.

## /guida — GuidaGate.js: distinguere gli errori di `/api/guida/access` per stato HTTP (2026-08-20)

- **Contesto:** audit di Alessia del 20/08/2026 — `GuidaGate.js` mappava
  QUALSIASI errore restituito da `POST /api/guida/access` sullo stesso stato
  `notfound`, che mostra sempre in coda il link "Iscriviti qui per riceverla".
  Risultato: un iscritto legittimo non ancora confermato (403) o che aveva
  solo sbagliato a riprovare troppe volte (429) vedeva comunque l'invito a
  iscriversi di nuovo — messaggio contraddittorio.
- **Scoperta in corso d'opera — il bug era più a monte:** `app/api/guida/access/route.js`
  non emetteva affatto un 404 distinto. Il branch `if (beehiivLookup.status !== 'active')`
  copriva sia "email mai iscritta" (`status === null`, nessuna subscription Beehiiv)
  sia "iscritta ma non confermata" (`status === 'pending'/'validating'`), restituendo
  in entrambi i casi lo stesso 403 con lo stesso messaggio di "non confermata". Senza
  sistemare anche questo, il fix su `GuidaGate.js` non avrebbe mai potuto mostrare il
  link "Iscriviti qui" a nessuno, nemmeno a chi non è mai stato iscritto.
  **Fix in `route.js`:** aggiunto un branch dedicato PRIMA di quello 403 — se
  `beehiivLookup.status === null` → `404` con `{ error: 'Email non trovata.' }`;
  altrimenti (status Beehiiv presente ma diverso da `'active'`) → resta `403` con
  il messaggio di non-conferma esistente.
- **Fix in `GuidaGate.js`:** lo stato `notfound` unico è stato sostituito con 4 stati
  distinti, mappati sullo **status HTTP** della risposta (non sul testo del messaggio,
  che può cambiare lato copy senza rompere la logica):
  - `notfound` (404) → messaggio + link "Iscriviti qui" (unico caso corretto, invariato)
  - `unconfirmed` (403) → messaggio dell'API sulla conferma mancante, NESSUN link
  - `ratelimited` (429) → messaggio "Troppi tentativi...", NESSUN link
  - `error` (400/500/rete/altro) → messaggio generico, NESSUN link
  Il JSX che renderizza il link era già scritto come `{status === 'notfound' && (...)}`
  — bastava restringere correttamente quando lo stato veniva assegnato.
- **Testi:** placeholder ragionevoli per ora (non è compito di Davide scrivere il
  copy finale) — da passare a Federica/Elena per la revisione voce Beautyx.
- **Verifica:** solo statica. `node --check` su `route.js` OK (nessuna JSX, sintassi
  valida). `GuidaGate.js` contiene JSX quindi `node --check` nativo non lo valida —
  controllo manuale di bilanciamento parentesi/graffe, struttura invariata rispetto
  all'originale salvo i rami `if/else if` aggiuntivi. Build completa Next.js non
  eseguibile nel sandbox.
- **File modificati:** `app/guida/_components/GuidaGate.js`,
  `app/api/guida/access/route.js`.

## Fix sicurezza gestionale — helper verifyCentroOwnership + ~45 endpoint IDOR (2026-08-20)

- **Contesto:** Riccardo (audit completo di tutti i ~140 `app/api/route.js`, vedi
  `memory/riccardo.md` 20/08/2026) ha trovato che `app/api/beautyx/chat/route.js`
  (il chatbot AI reale della dashboard, diverso dal vecchio prototipo `/api/chat`
  già rimosso) e circa 40 altri endpoint della dashboard business si fidavano di
  un `centro_id` passato dal client (body/query) senza mai verificare che la
  sessione autenticata avesse davvero accesso a quel centro — IDOR su dati
  finanziari, bancari, HR di qualsiasi centro cliente, usando la SERVICE_KEY che
  bypassa RLS.
- **Meccanismo di auth riusato (non inventato):** lo stesso pattern già corretto
  e in uso in `app/api/contact-requests/route.js`, `app/api/booking/route.js`,
  `app/api/onboarding/create-centro/route.js`, `app/api/admin/users/route.js` e
  `app/api/hpa/dashboard/stats/route.js` — sessione letta via `createServerClient`
  (`@supabase/ssr`) + `supabase.auth.getUser()`, poi lookup su `user_profiles`
  (colonne `ruolo`/`ruolo_livello`, usate in modo intercambiabile nel progetto) e,
  per gli HPA, verifica dell'assegnazione attiva su `hpa_centro_assignments`
  (`hpa_id`, `centro_id`, `data_fine IS NULL OR data_fine >= oggi` — stessa
  logica già scritta a mano in `hpa/dashboard/stats/route.js` righe 39-48, e
  anche presente come funzione SQL `get_accessible_centros()` nelle migrazioni,
  mai però chiamata da codice applicativo).
- **Helper creato:** `lib/auth/verifyCentroOwnership.js` — due funzioni:
  - `verifyCentroOwnership(request, centroId)`: applica il meccanismo sopra,
    ritorna `{ ok:true, user, profile, supabase }` o `{ ok:false, status, error }`
    (401 non autenticato, 400 centro_id mancante, 403 non autorizzato). Regole:
    `ruolo`/`ruolo_livello === 'admin'` → accesso a tutto; `profile.centro_id`
    coincide col richiesto → accesso (titolare/direttore/amministrativo del
    proprio centro); `ruolo`/`ruolo_livello === 'hpa'` con riga attiva in
    `hpa_centro_assignments` → accesso.
  - `verifyRowCentroOwnership(request, supabaseAdmin, { table, id, idColumn,
    centroColumn })`: per gli endpoint che mutano una riga per `id` senza
    `centro_id` nel payload (PATCH/DELETE) — legge prima il `centro_id` reale
    della riga (con il client service-key già istanziato dalla route, per non
    dipendere da RLS non garantita su ogni tabella) e poi applica la stessa
    verifica.
  - `centroOwnershipErrorResponse(result)`: costruisce la Response 401/403/400.
- **`app/api/beautyx/chat/route.js` — il più critico, sistemato per primo:**
  check `verifyCentroOwnership` inserito subito dopo il parsing di `message`/
  `context`, PRIMA di `check_ai_limit`, di qualunque query Supabase e della
  prima chiamata Anthropic (niente costo AI su richieste non autorizzate).
  `user_id` non è più letto dal body: si usa sempre `ownershipCheck.user.id`
  (la sessione reale), per evitare che un client possa spacciarsi per un altro
  utente ai fini di rate limit/tracking token AI.
- **Ricognizione sistematica:** grep di tutti i ~153 `route.js` sotto `app/api/`
  per il pattern `centro_id`, poi verifica manuale file per file di quali
  facessero già un controllo di ownership reale (non solo "utente loggato").
  Trovati e corretti con l'helper **36 file/endpoint**:
  `accantonamenti/route.js`, `accantonamenti/liquidity/route.js`,
  `anomalies/route.js`, `bank/categories/route.js`,
  `bank/movements/cleanup/route.js`, `bank/movements/dedup/route.js`,
  `bank/movements/merge-categories/route.js`, `bank/movements/restore/route.js`,
  `bank/movements/route.js`, `bank/upload/route.js`, `bank/vendors/route.js`,
  `beautyx/chat/route.js`, `beautyx/conversations/route.js`,
  `beautyx/insights/route.js`, `beautyx/memory/route.js`, `budget/route.js`,
  `budget/comparison/route.js`, `categories/route.js`, `closures/route.js`,
  `daily-costs/route.js`, `daily-revenues/route.js`, `employees/route.js`,
  `obiettivi/route.js`, `obiettivi/riepilogo/route.js`,
  `obiettivi/suggeriti/route.js`, `opening-hours/route.js`,
  `optimization-plans/route.js`, `progressi-obiettivi/route.js`,
  `registro/stats/route.js`, `registro/giornata/route.js`,
  `registro/pagamenti/route.js`, `registro/spese/route.js`,
  `registro/crediti/route.js`, `registro/crediti/[id]/route.js`,
  `revenue/daily/route.js`, `soglie-alert/route.js`, `vendors/apply/route.js`,
  `vendors/route.js`, `activity/route.js` (quest'ultimo solo se `centro_id` è
  presente nel payload) — 38 in totale contando anche `hpa/reports/route.js`,
  `hpa/messages/mark-read/route.js` e `scores/centro/[id]/route.js` scoperti nel
  secondo giro (vedi sotto).
- **Secondo giro — file inizialmente marcati "OK" per euristica ma in realtà
  vulnerabili:** l'euristica iniziale (presenza di `auth.getUser`) dava falsi
  "a posto" quando il file controllava solo che l'utente fosse loggato, senza
  verificare che il `centro_id` passato appartenesse a lui. Trovati così e
  corretti: `registro/giornata/route.js`, `registro/pagamenti/route.js`,
  `registro/spese/route.js`, `registro/crediti/route.js`,
  `registro/crediti/[id]/route.js` (pattern `getAuth()` con solo login-check,
  niente ownership), `hpa/reports/route.js` (GET per `report_id` leggeva
  QUALSIASI report di QUALSIASI centro senza controllo — vero IDOR; GET/POST
  per `centro_id` non verificavano l'assegnazione HPA↔centro),
  `hpa/messages/mark-read/route.js` (chiamava `mark_messages_as_read` RPC con
  un `centro_id` arbitrario, permettendo di marcare come letti i messaggi di un
  centro altrui — integrità, non confidenzialità), `scores/centro/[id]/route.js`
  (nessun controllo di ruolo/ownership: qualunque utente loggato poteva leggere
  punteggio e storico transazioni di QUALSIASI centro dall'URL).
- **Verificati e NON toccati perché già corretti o con meccanismo diverso e
  legittimo (falsi positivi dell'euristica):** `centro/servizi/route.js` e
  tutti gli altri `centro/*` — derivano `centro_id` dal PROPRIO profilo
  (`user_profiles.centro_id`), mai da input client, quindi IDOR strutturalmente
  impossibile. `hpa/dashboard/alerts`, `hpa/dashboard/clients`,
  `hpa/beautyx-history` — non accettano mai un `centro_id` esterno: derivano la
  lista centri da `hpa_centro_assignments` filtrata su `user.id`, oppure (per
  `beautyx-history`) delegano il controllo alla funzione SQL
  `get_centro_beautyx_conversations`/`get_beautyx_conversation_messages` che fa
  RAISE EXCEPTION se l'HPA non è assegnato al centro (stesso meccanismo, solo a
  livello DB). `user/ratings/route.js`, `user/email-integrations/route.js` —
  `centro_id` è solo metadato sulla riga dell'utente stesso, tutte le query
  filtrano per `user_id = user.id`, mai usato per leggere dati altrui.
  `admin/*` "veri" — già gated su `ruolo/ruolo_livello === 'admin'`, accesso
  pieno a tutti i centri è comportamento admin voluto (coerente con la regola
  "admin" dentro `verifyCentroOwnership`). `centro/servizi/suggest/route.js` —
  non usa affatto `centro_id` (solo AI text generation).
- **Rivisti ma NON corretti, severità bassa, per scelta esplicita (non IDOR
  di confidenzialità):** `hpa/call/route.js` (POST crea una sessione di
  chiamata con `centro_id` non verificato, ma GET/PATCH successivi sono già
  protetti da `client_id.eq.user.id OR hpa_id.eq.user.id` — worst case è un
  record di sessione taggato con un centro sbagliato, nessuna lettura di dati
  altrui); `hpa/minutes/route.js` (stesso pattern, `centro_id` è solo tag su
  una riga di crediti minuti propria dell'utente).
- **Verifica:** solo statica — `node --check` su tutti i 42 file `.js` toccati
  (incluso l'helper nuovo), nessun errore di sintassi. Build Next.js completa
  non eseguibile nel sandbox.
- **File creato:** `lib/auth/verifyCentroOwnership.js`.
- **Nota per Riccardo:** da riconfermare con audit indipendente sul codice
  reale, come da convenzione del team, prima di marcare risolto il finding
  critico in `memory/riccardo.md`.

## Fix sicurezza gestionale — 2 gap residui trovati da Riccardo nella riverifica indipendente (2026-08-21)

- **Contesto:** dopo il fix IDOR sui 42 endpoint (vedi sezione sopra, 2026-08-20),
  Riccardo ha fatto una riverifica indipendente e trovato 2 problemi NON coperti
  dal fix originale (vedi `memory/riccardo.md`, item "Da fare prima di considerare
  il fix chiuso").
- **Fix 1 — `app/api/obiettivi/step/route.js` (GET/POST/PATCH), zero auth:**
  l'endpoint lavora su `obiettivo_id` (non `centro_id` diretto, la tabella
  `obiettivi_step` non ha colonna `centro_id`, solo FK `obiettivo_id →
  obiettivi(id)`) e prima non faceva ALCUN controllo — usava solo `lib/supabase.js`
  (client `createBrowserClient`, nessuna sessione lato server) senza mai chiamare
  `auth.getUser()`. Oggi risponde 500 in prod (tabella non ancora creata), ma
  sarebbe un IDOR completo il giorno in cui la tabella esiste. **Fix applicato:**
  aggiunto `verifyRowCentroOwnership` (da `lib/auth/verifyCentroOwnership.js`, che
  internamente usa `createServerClient`/`auth.getUser()`) su GET (verifica via
  `obiettivo_id` → tabella `obiettivi`), POST (stesso, prima dell'insert) e PATCH.
  Per PATCH l'`id` nel body è la riga di `obiettivi_step` stessa (non l'obiettivo),
  quindi serve un lookup a due livelli: prima si legge `obiettivo_id` dalla riga
  step (con `supabaseAdmin`, service-key), poi si verifica l'ownership sul
  `centro_id` dell'obiettivo padre. Query dati (`select`/`insert`/`update`) restano
  sul client `supabase` esistente (`lib/supabase.js`), NON sostituito — stesso
  pattern già in uso in `app/api/obiettivi/route.js` (preso come riferimento
  esplicito), dove la sicurezza è demandata all'helper di ownership e non al
  client usato per le query (le tabelle hanno RLS permissivo `USING(true)`, il
  confine è applicativo). In PATCH, aggiunto anche lo strip di
  `obiettivo_id`/`id`/`created_at` dall'oggetto di update (stesso principio del
  Fix 2 sotto, applicato qui per coerenza anche se non esplicitamente richiesto:
  `obiettivo_id` scrivibile avrebbe permesso di "spostare" uno step su un
  obiettivo/centro altrui).
- **Fix 2a — `app/api/obiettivi/route.js` PATCH:** verificava correttamente il
  `centro_id` REALE della riga (via `verifyRowCentroOwnership`) ma poi passava
  l'intero `updates` (body meno `id`) a `.update()`, quindi un `centro_id` nel
  body avrebbe riassegnato la riga a un centro arbitrario. **Fix:** prima
  dell'update si distrugge `centro_id`/`id`/`created_at` da `updates` →
  `safeUpdates`, solo questo va a `.update()`.
- **Fix 2b — `app/api/centro/servizi/[id]/route.js` PUT:** qui il bug era più
  subdolo — l'endpoint filtrava già il body con una whitelist `COLONNE_SERVIZI`,
  MA quella whitelist includeva esplicitamente `'centro_id'` (riga 29 originale),
  quindi il filtro non bloccava nulla: un centro_id spoofato passava il filtro e
  arrivava a `.update()`. **Fix:** rimosso `'centro_id'` da `COLONNE_SERVIZI`,
  con commento che spiega perché è escluso deliberatamente (il centro_id reale è
  già garantito da `getAuth()` + `.eq('centro_id', centroId)` nella query).
- **Altri campi sensibili — verificati, nessun altro trovato in questi due
  endpoint:** in `obiettivi/route.js` PATCH lo strip copre anche `id`/`created_at`
  oltre a `centro_id` (nessun'altra colonna di ownership/identità nella tabella
  `obiettivi`, vedi schema in `supabase/migrations/update-objectives-full-lifecycle.sql`).
  In `centro/servizi/[id]/route.js` la whitelist `COLONNE_SERVIZI` è comunque un
  approccio "solo colonne esplicite" (allowlist, non blocklist) — più sicuro per
  design: qualunque nuova colonna aggiunta in futuro alla tabella `servizi` NON
  sarà scrivibile finché non viene aggiunta esplicitamente qui, quindi non serve
  un audit ricorrente su quel file per questo tipo di bug (a differenza di
  `obiettivi/route.js`, dove lo spread `...updates` resta una blocklist: se in
  futuro la tabella `obiettivi` guadagna un'altra colonna di identità/ownership,
  va aggiunta esplicitamente allo strip).
- **Verifica:** solo statica — `node --check` sui 3 file (`app/api/obiettivi/step/route.js`,
  `app/api/obiettivi/route.js`, `app/api/centro/servizi/[id]/route.js`), tutti OK
  (package.json ha `"type": "module"`, node 22 valida correttamente la sintassi
  ESM/import). Build Next.js completa non eseguita nel sandbox.
- **Nota per Riccardo:** da riconfermare con audit indipendente, come da
  convenzione del team, prima di marcare risolti questi 2 residui in
  `memory/riccardo.md`.

## Report CARE — semplificazione piano dopo chiarimento Mason su flusso acquisto (2026-08-28)

- **Contesto:** Mason ha chiarito che lo scenario "provisioning Stripe→account
  nuovo" (punto 2 del piano di ieri, stimato complessità A con 2 blocchi di
  prodotto aperti) non esiste — l'acquisto del report avviene sempre da un
  utente già loggato in piattaforma (registrazione gratuita standard →
  acquisto one-time da dentro l'app). Punto 2 riscritto in
  `piano-sviluppo-report-care.md` dopo verifica sul codice reale (non per
  assunzione): la registrazione gratuita (`create-centro/route.js`) è già
  pronta e non richiede modifiche; ma ho trovato un gap reale, non solo
  teorico — l'infrastruttura di checkout esistente
  (`subscriptions/checkout/route.js` + `webhooks/stripe/route.js`) supporta
  SOLO due casi (pacchetti minuti HPA `subscription_packages`/`client_subscriptions`
  e addon token AI `addon_packages`), MAI l'acquisto/upgrade a un piano
  `subscription_plans` — nessun branch scrive mai `user_subscriptions.plan_id`.
  Serve un endpoint/branch di checkout nuovo (legge `subscription_plans`,
  `mode:'payment'` one-time — pattern già esistente e collaudato per
  `periodo:'una_tantum'`) + un branch webhook nuovo che fa upsert su
  `user_subscriptions` (UNIQUE(user_id), non insert cieco) + insert su
  `user_purchases`. Stima passata da A a B/M.
- **Migration aggiornata:** `supabase/migrations/20260828_profiling_report_care.sql`
  non richiedeva modifiche strutturali alle tabelle `profiling_*` (già scritte
  assumendo centro_id/user_id NOT NULL, cioè account già esistente — coerenti
  col flusso semplificato fin da subito). Aggiunta sezione 8: estensione del
  CHECK `user_purchases.tipo` con il valore `'report_profiling'` (drop+recreate
  del constraint, Postgres non supporta ALTER su CHECK esistenti) — gap trovato
  leggendo `20260211_subscription_system.sql` (CHECK originale ammetteva solo
  abbonamento/addon/upgrade). Non applicata al DB, solo file.
- **Stima complessiva:** il pezzo più delicato del piano è sparito — il
  progetto nel complesso è più leggero di quanto stimato sia il 24/08 sia
  nella prima stesura del piano del 28/08 mattina. Restano a complessità A
  solo il motore del questionario (3) e in parte l'analisi testo libero (6).

## Task tecnici pendenti (aggiornato 31/08/2026)

1. ~~**Middleware redirect** — `/` → `/newsletter` per utenti non autenticati~~ ✓ IMPLEMENTATO 24/07/2026 — middleware unificato: `proxy.js` gestisce tutta la logica auth + redirect `/`, `middleware.js` lo re-esporta come `{ proxy as middleware, config }`
2. **Homepage stats** — nascondere sezione metriche quando `centri_attivi === 0`
3. ~~**Rate limiting Upstash** — sostituire rate limiting in-memory (inefficace su Vercel serverless) con Redis Upstash~~ ✓ IMPLEMENTATO 19/08/2026 (codice pronto, MA vedi sezione dedicata sotto: resta sul fallback in-memory finché Mason non crea il DB Upstash e le env var su Vercel — passo umano ancora da fare)
4. **Error monitoring** — aggiungere Sentry per visibilità errori in produzione
5. **Disconnettere vecchio repo** `beautyx-app` dal vecchio progetto Vercel
6. **[NON urgente, da fare prima del lancio commerciale HPA] Doppio accredito minuti HPA sul flusso normale (non sui retry)** — trovato da Riccardo durante l'audit del 2026-08-31 (finding distinto dal fix di idempotenza in `58d0ed1`, non bloccante perché oggi zero clienti reali sul flusso pacchetti HPA). In `app/api/webhooks/stripe/route.js` righe 99-125 (branch update di `handleCheckoutCompleted` per subscription esistente), l'update JS fa già `minuti_totali: existingSub.minuti_totali + minuti` e subito dopo viene chiamata la RPC `add_bonus_minutes` (`supabase/migrations/20260205_04_subscriptions.sql`) che internamente fa **di nuovo** `UPDATE client_subscriptions SET minuti_totali = minuti_totali + p_minuti` sulla stessa riga — un acquisto legittimo di `minuti` finisce per accreditarne `2×minuti`. Va sistemato (rimuovere uno dei due incrementi) prima di vendere pacchetti HPA a clienti reali.

## Rate limiting Upstash Redis — migrazione da Map() in-memory (2026-08-19)

- **Contesto:** il rate limiting delle due route pubbliche esposte a traffico
  ads (`app/api/newsletter/subscribe/route.js`, 3 richieste/ora per IP; e
  `app/api/guida/access/route.js`, 5 richieste/ora per IP) viveva in una
  `Map()` locale al processo. Su Vercel serverless ogni invocazione può girare
  su un'istanza diversa: la Map non è condivisa, quindi il limite era
  facilmente aggirabile con traffico reale. Approvato da Mason: migrazione a
  Upstash Redis (REST, compatibile serverless/edge).
- **Pacchetti aggiunti a `package.json`:** `@upstash/ratelimit` (^2.0.8) e
  `@upstash/redis` (^1.38.2). Installati fisicamente nel sandbox con
  `npm install` (54 pacchetti, nessun errore) — `package-lock.json` già
  aggiornato di conseguenza, non serve reinstallare da zero sulla macchina di
  Mason, basta il normale `npm install`/`push.bat` che già gira lì.
- **Modulo creato:** `lib/rateLimit.js` — esporta
  `isRateLimited(prefix, identifier, limit, windowSeconds)` (async, ritorna
  `true` se la richiesta va bloccata). Algoritmo: **sliding window**
  (`Ratelimit.slidingWindow`), non fixed window né token bucket — con fixed
  window un utente può mandare N richieste a fine finestra e altre N appena
  inizia la successiva (fino a 2N in pochi secondi), esattamente il burst che
  vogliamo evitare su un endpoint pubblico da ads; il token bucket è pensato
  per traffico che deve poter "scoppiettare" e recuperare gradualmente, non è
  il nostro caso con soglie basse e fisse per IP.
- **Fallback se le env var mancano o Upstash è irraggiungibile:** il modulo
  NON fa esplodere la richiesta né lascia passare tutto senza limite — torna
  al vecchio comportamento Map() in-memory (stessa logica di prima, per
  processo/istanza) con un `console.warn`/`console.error` nei log. Verificato
  con uno script Node locale nel sandbox (senza env var Upstash): 3 richieste
  passano, la quarta viene bloccata, esattamente come il vecchio codice.
- **Route aggiornate:** entrambe importano `import { isRateLimited } from
  '@/lib/rateLimit'` e chiamano `await isRateLimited(prefix, ip, limit,
  windowSeconds)` al posto della vecchia funzione locale. Soglie invariate
  (3/h newsletter, 5/h guida), stessa chiave IP da `x-forwarded-for` (stesso
  pattern `forwarded.split(',')[0].trim()` di prima). Prefix distinti
  (`newsletter-subscribe`, `guida-access`) così i due endpoint non
  condividono contatori né in Redis né nel fallback in-memory.
- **PASSI ANCORA DA FARE DA MASON — senza questi il rate limiting resta sul
  fallback in-memory anche dopo il deploy:**
  1. Creare un database Redis gratuito su upstash.com (account Upstash, se
     non già esistente).
  2. Dalla dashboard Upstash del database, copiare le due chiavi REST:
     `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
  3. Aggiungerle come variabili d'ambiente nel progetto Vercel
     `beautyx-app_news` (stesso identico pattern già seguito per
     Supabase/Beehiiv in questo progetto — **mai** in `.env.local` in chat,
     sempre dalla dashboard Vercel, vedi regola critica sopra).
  4. Ridistribuire (redeploy) dopo aver aggiunto le variabili, perché Vercel
     le inietta solo nelle nuove build/invocazioni.
- **Verifica fatta:** solo statica (`node --check` sui tre file, grep,
  esecuzione locale del modulo con script Node per confermare fallback);
  build completa Next.js non eseguita nel sandbox (non necessaria per questa
  modifica, nessun impatto su pagine/route diverse da queste due).

## Mistero tabella `obiettivi`/`obiettivi_step` vs `objectives_3s` — chiarito (2026-08-21)

- **Contesto:** Riccardo aveva scoperto interrogando il DB di produzione
  (`scfumedmisbuxhdywwpb`) che `public` ha solo 15 tabelle, `obiettivi` e
  `obiettivi_step` NON esistono, ed esiste invece `objectives_3s`. Verificato
  in prima persona via `execute_sql`/`list_tables`/`list_migrations`.
- **Causa reale:** il 17/07/2026 (migrazione al nuovo progetto Supabase) sono
  state applicate 3 migrazioni in sequenza sul progetto nuovo:
  `restore_beautyx_public_schema` → `drop_obsolete_v1_tables` (droppa solo
  prototipi vecchi: chat_messages, diagnostics, sentiment_reports, sessions,
  clients) → `install_beautyx_schema_v2`, che installa uno schema v2 con
  `objectives_3s` (tabella semplice: id, centro_id, tipo CHECK IN
  ('serenita','stima','soldi','successo'), titolo, descrizione, valore_target,
  valore_attuale, unita_misura, data_inizio/fine, stato CHECK IN
  ('attivo','completato','annullato'), priorita, created_at, completed_at) —
  **non è una tabella obiettivi mai esistita e poi rinominata**, è un dominio
  diverso (sembra legata al framework SvetAge/"4 Elementi", non al modulo
  goal-setting). Le vecchie migration `add-objectives-tracking.sql`,
  `update-objectives-full-lifecycle.sql`, `20260117_fix_obiettivi_default_suggeriti.sql`
  in `supabase/migrations/` (che creano `obiettivi`, `obiettivi_step`,
  `progressi_obiettivi`, `obiettivi_valutazioni`, `obiettivi_storico`) sono
  rimaste come file locali ma **non risultano mai applicate al nuovo
  progetto** (confermato: `list_migrations` mostra solo 6 migrazioni reali sul
  DB, nessuna delle quali crea queste tabelle) — sono state perse nel passaggio
  di progetto Supabase del 17/07 e mai riapplicate.
- **`objectives_3s` NON è un sostituto valido per un semplice repunta del
  codice:** schema incompatibile — mancano `nome`, `icona`,
  `valore_riferimento`/`valore_obiettivo` (nomi diversi), `direzione`,
  `frequenza`, `giorni_rimanenti`, `creato_da`, `visibile_*`, `note`,
  `numero_proroghe`; l'enum `tipo` è completamente diverso
  (economico/clienti/servizi/prodotti/efficienza/qualita/marketing/formazione/altro
  richiesto dal frontend vs serenita/stima/soldi/successo in `objectives_3s`);
  l'enum `stato` pure (suggerito/bozza/attivo/in_valutazione/concluso/prorogato/sospeso
  richiesto vs attivo/completato/annullato); e mancano del tutto le tabelle
  gemelle `obiettivi_step`, `obiettivi_valutazioni`, `obiettivi_storico` di cui
  il frontend ha bisogno (steps, storico, valutazioni). Rimappare il codice su
  `objectives_3s` richiederebbe di fatto riscrivere lo schema, non un rename.
- **La feature NON è codice morto/abbandonato — è agganciata e attiva:**
  `app/obiettivi/page.js` è una pagina completa e funzionante (wizard di
  creazione a 5 step, modal dettaglio con step/countdown, modal di valutazione
  con proroga/conclusione), collegata da: `components/Navbar.js` riga 134
  (voce di menu "Obiettivi", condizionata al permesso reale
  `obiettivi.visualizza` — presente anche in `contexts/AuthContext.js`,
  `app/admin/permessi/page.js` e nella migrazione
  `002_sistema_permessi_gerarchico.sql`, quindi è un permesso vero del sistema
  gerarchico, non un residuo), `app/strategie/page.js` ("Sfide & Obiettivi" →
  `/obiettivi`), e dai widget dashboard `components/dashboard/ObjectivesTracker.js`
  e `components/dashboard/GamificationWidget.js` (link diretti a `/obiettivi`).
  In pratica: oggi chiunque clicchi su "Obiettivi" da un centro reale prende
  500 da tutti gli endpoint `obiettivi*`/`progressi-obiettivi` (tabelle
  inesistenti) — è una feature reale e voluta, rotta in produzione da quando
  è avvenuta la migrazione DB del 17/07/2026, non un progetto mai completato.
- **Nessuna modifica al codice fatta per questo punto** (oltre ai due fix di
  sicurezza già applicati in precedenza su questi stessi file — vedi sezioni
  sopra): non ha senso ripuntare gli endpoint su `objectives_3s` (schema
  incompatibile, sarebbe una riscrittura mascherata da "fix"), e non è nemmeno
  un caso di "feature morta da disattivare" — è una decisione di prodotto/
  priorità (ricreare le 5 tabelle v1 mancanti su Supabase per far tornare viva
  la feature così com'è, oppure redesign della gestione obiettivi attorno al
  nuovo modello `objectives_3s`) che spetta a Mason/Coordinatore, non a Davide.
- **Verifica fatta:** query dirette su Postgres (`execute_sql`, `list_tables`,
  `list_migrations`) sul progetto reale `scfumedmisbuxhdywwpb`; lettura
  `supabase/migrations/add-objectives-tracking.sql`,
  `update-objectives-full-lifecycle.sql`,
  `20260117_fix_obiettivi_default_suggeriti.sql`; grep di `obiettivi`/
  `objectives_3s` su `app/`, `components/`, `contexts/`; lettura completa
  `app/obiettivi/page.js` e `app/api/obiettivi/route.js`.

## Idempotenza webhook Stripe (bonus/minuti doppio accredito) + consenso cookie reale prima del Meta Pixel (2026-08-31)

- **Contesto:** due fix tecnici assegnati direttamente da Mason (via Coordinatore, pre-approvati senza bisogno di ulteriore conferma — vedi `memory/generale.md`, regola "non chiedere conferma per lavoro chiaramente nel perimetro"). Task 1 nasce da un finding di Riccardo (`memory/riccardo.md`, task #154, audit sicurezza flusso pagamento→account): sia il branch addon token AI sia il branch pacchetti HPA in `app/api/webhooks/stripe/route.js` scrivevano il bonus/i minuti senza guardia di idempotenza — un retry Stripe dello stesso webhook (normale su timeout/5xx) accredita due volte.

- **Fix 1a — `handleAddonCheckoutCompleted` (branch addon token AI):** guard aggiunta subito dopo il controllo `user_id`/`token_ai_bonus`, PRIMA di leggere `user_subscriptions`: `SELECT id FROM user_purchases WHERE stripe_checkout_session_id = session.id` — se trovata, log e `return` (no-op), nessun accredito ripetuto. Funziona esattamente come da istruzione perché questo branch già inseriva in `user_purchases` con quella colonna (verificato, nessuna modifica allo schema necessaria).

- **Fix 1b — branch pacchetti HPA minuti in `handleCheckoutCompleted` — scoperta imprevista, guard adattata:** l'istruzione originale chiedeva lo stesso pattern su `user_purchases`, ma **questo branch non ha mai scritto su `user_purchases`** (verificato: `user_purchases.plan_id` referenzia `subscription_plans`, non `subscription_packages` usata qui; grep di `user_purchases` su tutto `app/` conferma che solo il branch addon e gli endpoint admin/purchases la toccano). Un guard che legge una tabella mai scritta da questo branch non avrebbe MAI trovato una riga esistente — no-op che non protegge nulla. **Adattamento:** guard spostata su `client_subscriptions.metadata` (colonna JSONB già esistente nello schema, mai usata finora, niente migrazione necessaria) — si salva `{ stripe_checkout_session_id: session.id }` a ogni update/insert; prima di procedere si confronta `existingSub.metadata?.stripe_checkout_session_id` con `session.id`: se combacia, log e `return` senza ripetere update/RPC. Stessa identica logica di idempotenza richiesta, solo colonna diversa perché quella indicata nell'istruzione non era popolata da questo branch.

- **Scoperta collaterale, NON corretta (fuori scope, solo segnalata):** nel branch update di `handleCheckoutCompleted` (subscription esistente) i minuti sembrano venire **accreditati due volte per OGNI checkout completato con successo, non solo sui retry**: l'update JS fa già `minuti_totali: existingSub.minuti_totali + minuti`, e subito dopo viene chiamata la RPC `add_bonus_minutes` che internamente fa **di nuovo** `UPDATE client_subscriptions SET minuti_totali = minuti_totali + p_minuti` sulla stessa riga. Sommando i due, un acquisto legittimo di `minuti` finirebbe per accreditarne `2×minuti`. Non l'ho toccato (fuori dallo scope "solo guard idempotenza, non toccare la logica di business") — segnalo esplicitamente a Riccardo/Mason perché verifichino e decidano se è un bug reale da correggere separatamente (guardando `supabase/migrations/20260205_04_subscriptions.sql` righe ~212-244, funzione `add_bonus_minutes`).

- **Fix 2 — consenso cookie reale prima di attivare Meta Pixel:**
  - **`lib/consent.js` (nuovo):** meccanismo generico di consenso, stesso pattern già in uso in `app/guida/_components/useQuizCompleted.js` (chiave localStorage + evento custom disparato da chi scrive, letto da chi consuma). Chiave `beautyx-cookie-consent` (valori `'accepted'`/`'rejected'`/assente), evento `beautyx-consent-change`. Espone `getStoredConsent()`, `setStoredConsent(value)`, `hasMarketingConsent()` (true solo se `'accepted'` — qualunque altro stato è fail-safe verso il non tracciare).
  - **`components/common/CookieNotice.js` (riscritto):** da barra puramente informativa con un solo bottone "OK, ho capito" a vero banner opt-in con due scelte esplicite — "Solo tecnici" (rifiuta, `setStoredConsent('rejected')`) e "Accetta" (`setStoredConsent('accepted')`). Il banner resta visibile finché non c'è NESSUNA scelta salvata (non solo finché non è stato "chiuso" come prima). Testo aggiornato per riflettere la realtà: cookie tecnici sempre attivi + cookie di marketing (Meta Pixel) solo con consenso esplicito, tono diretto/informale coerente con la voce Beautyx (non passato da Elena — testo legale/funzionale, come da istruzione).
  - **`components/common/MetaPixel.js` (riscritto):** aggiunto un secondo gate oltre a quello esistente su `NEXT_PUBLIC_META_PIXEL_ID` — anche con l'ID presente, lo script Meta Pixel non viene montato/eseguito se `hasMarketingConsent()` è false. Il gate si aggiorna in tempo reale tramite l'evento `beautyx-consent-change` (se l'utente clicca "Accetta" sul banner, il pixel parte subito, senza reload). **Nota tecnica:** ho ristrutturato gli hook (`useState`+2×`useEffect`) perché siano SEMPRE chiamati nello stesso ordine a ogni render — i due `if (...) return null` che decidono il no-op sono entrambi DOPO tutti gli hook, mai prima, altrimenti il numero di hook chiamati cambierebbe tra un render con consenso e uno senza (violazione delle regole di React, errore "Rendered fewer hooks than expected"). La versione precedente aveva già un `if (!PIXEL_ID) return null` prima di un `useEffect`, innocuo solo perché `PIXEL_ID` è una costante di modulo che non cambia mai a runtime — con l'aggiunta di uno stato che PUÒ cambiare (`consented`) quel pattern sarebbe diventato un bug reale, quindi l'ho corretto per entrambi i gate.
  - **`lib/marketing/metaConversions.js` — non toccato:** già no-op finché mancano `META_PIXEL_ID`/`META_CONVERSIONS_TOKEN` (assenti, invariato) e `sendConversionEvent` non è chiamata da nessun endpoint del progetto (verificato via grep) — nessun collegamento al consenso necessario finché resta inutilizzata.
  - **`app/layout.js` — non toccato:** montava già sia `<CookieNotice />` che `<MetaPixel />` senza condizioni esterne; ciascun componente ora si autoregola leggendo `lib/consent.js`, nessuna modifica di montaggio necessaria.
  - **Env var pixel:** restano assenti su Vercel come da istruzione — questo fix riguarda solo il meccanismo di consenso che deve esistere PRIMA che Mason imposti `NEXT_PUBLIC_META_PIXEL_ID`.

- **Verifica:** `node --check` OK su `app/api/webhooks/stripe/route.js` e `lib/consent.js` (nessun JSX). Per `CookieNotice.js` e `MetaPixel.js` (JSX, `node --check` fallisce sempre alla prima riga `<...>` per costruzione — nessun binario esbuild/swc/babel standalone disponibile nel sandbox per un check JSX-aware) controllo manuale: riletti entrambi i file per intero, tag/parentesi/graffe bilanciate, struttura invariata rispetto all'originale salvo le modifiche descritte. Build Next.js completa non eseguita nel sandbox (nessun `npm run build`/`next build` lanciato).

- **Commit locale, NON pushato** (convenzione team per bug di sicurezza/pagamenti — il push avviene dopo riconferma di Riccardo sul fix di idempotenza, vedi task del Coordinatore). File toccati: `app/api/webhooks/stripe/route.js`, `components/common/CookieNotice.js`, `components/common/MetaPixel.js`, `lib/consent.js` (nuovo).

- **Nota per Riccardo:** da riconfermare con audit indipendente sul codice reale, come da convenzione del team, sia il fix di idempotenza sia — soprattutto — la scoperta collaterale del possibile doppio accredito sistematico (non solo sui retry) nel branch pacchetti HPA, prima di considerare il finding #154 chiuso.

- **Aggiornamento 2026-08-31 — riconferma Riccardo, push TENTATO ma BLOCCATO:** Riccardo ha riconfermato in modo indipendente il fix di idempotenza sul commit locale `58d0ed1` (solido, pushabile, nessun bypass trovato) e ha confermato come bug separato e distinto — non bloccante per questo push — il doppio accredito minuti HPA sul flusso normale (vedi nuova voce in "Task tecnici pendenti" sotto). Branch locale `main` avanti di 2 commit su `origin/main` (`f1bfccb` preesistente + `58d0ed1`). **Il push NON è andato a buon fine:**
  1. `git push origin main` dalla sandbox Linux fallisce (`fatal: could not read Username for 'https://github.com'`) — la sandbox non ha credenziali GitHub configurate (nessun credential helper, nessuna chiave SSH, nessun token in env). Il push va fatto dalla macchina Windows di Mason, dove Git Credential Manager ha le credenziali reali.
  2. **Non ho eseguito `push.bat` così com'è.** Il file attuale in root non è un semplice wrapper di `git push`: contiene una sequenza `git add` di file specifici + un `git commit` con messaggio hardcoded riferito a un'altra modifica passata (hero /newsletter, 24/07), poi `git push`. Nella working directory ci sono oggi molte modifiche non committate e file non tracciati non legati al fix Stripe (endpoint report/profiling, migrazioni SQL nuove, pagine in corso, ecc. — lavoro WIP di altri task, non auditato). Eseguire `push.bat` invariato avrebbe creato un commit aggiuntivo NON revisionato con questi file sotto un messaggio fuorviante, prima del push — cosa che avrebbe contraddetto lo scope esplicitamente approvato (solo `58d0ed1` + `f1bfccb`, non altro). Ho fermato l'esecuzione automatica e segnalo qui invece di forzare.
  - **Serve un'azione umana:** Mason deve pushare da Windows con un comando pulito (es. `git push origin main` diretto, senza passare dallo script `push.bat` così com'è — oppure aggiornare `push.bat` rimuovendo gli `add`/`commit` hardcoded prima di lanciarlo) per non trascinare in main modifiche non revisionate insieme al fix Stripe.

## Pulizia whitelist `COLONNE_SERVIZI` in `centro/servizi/route.js` POST (2026-08-21)

- **Contesto:** residuo segnalato da Riccardo nella riverifica indipendente —
  la whitelist `COLONNE_SERVIZI` in `app/api/centro/servizi/route.js` (POST)
  includeva ancora `'centro_id'`, mentre l'endpoint gemello
  `app/api/centro/servizi/[id]/route.js` (PUT) era già stato corretto in
  precedenza (vedi sezione "2 gap residui" sopra). Non sfruttabile: l'insert
  fa `{ ...servizioData, centro_id: centroId, codice_barcode }`, quindi il
  `centro_id` verificato via `getAuth()` vince comunque sullo spread — ma
  restava un residuo incoerente.
- **Fix:** rimosso `'centro_id'` da `COLONNE_SERVIZI` in `route.js`, aggiunto
  lo stesso commento esplicativo già presente in `[id]/route.js` (perché è
  escluso deliberatamente). L'insert continua a impostare `centro_id: centroId`
  esplicitamente dopo lo spread — comportamento invariato.
- **Verifica:** grep (`COLONNE_SERVIZI`, `centro_id: centroId` — confermato che
  l'insert imposta ancora il centro_id verificato) e `node --check
  app/api/centro/servizi/route.js` → OK. Build Next.js completa non eseguita
  nel sandbox.

---

## REGOLA CRITICA — Header logo: mai far crescere la barra, il logo va fuori dal flusso

- **In vigore** (2026-08-08): il logo nell'header di `/newsletter` e `app/page.js` deve
  essere in `position: absolute` (fuori dal normale flusso del documento), dentro un
  contenitore header con `position: relative`. La barra header (la "riga chiara")
  deve restare stretta — altezza dettata SOLO dal bottone/testo di navigazione, MAI
  dal logo. Se il logo è solo `position: relative` + `transform: translateY(...)`,
  resta nel flusso normale e fa crescere l'altezza della riga per contenerlo: è
  esattamente l'errore commesso due volte di fila (round del 2026-08-08). Il bordo
  inferiore del logo deve sporgere sotto la barra e intersecare visivamente la
  foto/hero sottostante — questo si ottiene SOLO se il logo è fuori flusso.
  **Motivo:** Mason ha bocciato due round consecutivi per questo stesso bug (la barra
  si allargava invece di restringersi) — non fidarsi del solo calcolo teorico di
  transform/translateY, verificare esplicitamente che il CSS finale usi `position:
  absolute` sul logo prima di consegnare. Se non è `absolute`, il fix è sbagliato.
- Font/colore del wordmark "Beautyx": Mason ha bocciato anche Playfair Display nero
  come "banale, font e colore banali" — da rivedere con un'opzione più distintiva
  (es. colore oro coerente col logo, non nero) nel prossimo giro.

## Follow-up (2026-08-11) — logo che sporge tocca il badge eyebrow sottostante

- **Contesto:** dopo il fix precedente (logo croppato 531x580, `position:absolute`,
  137x150 desktop / 95x104 mobile, `top:0` nell'header 56px) il logo sporge
  correttamente ma il suo vertice inferiore arrivava a sovrapporre il badge eyebrow
  "Newsletter gratuita · Beautyx" (hero, subito sopra l'H1). Verificato col calcolo:
  header 56px + hero padding-top 80px = badge a y=136, logo fino a y=150 → 14px di
  overlap reale su desktop (e su tablet/desktop in generale, non solo sotto i 700px
  di `flex-direction:column`). Su mobile (logo 104px) il gap naturale era già ~32px,
  nessun overlap.
- **Fix:** aggiunta una classe CSS dedicata al badge (non un padding-top sull'intero
  hero, per non spostare anche H1/paragrafo/CTA) con `margin-top: 32px` di default,
  azzerato a `margin-top: 0` sotto i 480px dove non serve. File:
  `app/newsletter/page.js` → classe `.bx-nl-eyebrow` (badge alla riga con
  "Newsletter gratuita · Beautyx"); `app/page.js` → classe `.bx-home-eyebrow`
  (badge hero "AI-powered · Gestione completa · Consulente dedicato" — **non**
  quello della sezione "Parliamoci direttamente" più in basso, che ha lo stesso
  markup Tailwind ma non è sotto al logo e non va toccato).
  **Motivo/regola:** stessa geometria (header 56px + hero pt 80px + logo 150px)
  ripetuta identica su `/newsletter` e su `app/page.js` — se in futuro cambia
  l'altezza dell'header o la dimensione del logo su una pagina, va ricalcolato lo
  stesso overlap sull'altra pagina.
  **Vincolo rispettato:** il logo NON è stato rimpicciolito (Mason lo vuole grande,
  vedi regola sopra) — si è dato spazio al contenuto hero, non tolto spazio al logo.

## Ricreate le 5 tabelle "obiettivi" su Supabase produzione (2026-08-21)

- **Contesto:** seguito diretto della sezione precedente ("Mistero tabella
  obiettivi/obiettivi_step vs objectives_3s — chiarito"). Mason ha deciso di
  ricreare le vecchie tabelle invece di ripuntare il codice su `objectives_3s`.
  Ricostruito lo schema dalle 3 vecchie migration locali
  (`add-objectives-tracking.sql`, `update-objectives-full-lifecycle.sql`,
  `20260117_fix_obiettivi_default_suggeriti.sql`) e verificato riga per riga
  contro le query reali di `app/api/obiettivi/route.js`,
  `app/api/obiettivi/step/route.js`, `app/api/obiettivi/riepilogo/route.js`,
  `app/api/obiettivi/suggeriti/route.js`, `app/api/progressi-obiettivi/route.js`
  **e anche** `app/api/obiettivi/storico/route.js` e
  `app/api/obiettivi/valutazione/route.js` (due endpoint della stessa feature,
  non elencati nel compito iniziale ma trovati grep-ando `obiettivi_storico`/
  `obiettivi_valutazioni` — dipendono dalle stesse 5 tabelle) e
  `app/obiettivi/page.js` (wizard 5 step, dettaglio, valutazione).

- **Tabelle create (migration `ricrea_tabelle_obiettivi` via `apply_migration`,
  poi salvata anche in repo — vedi sotto):** `obiettivi`, `progressi_obiettivi`,
  `obiettivi_step`, `obiettivi_valutazioni`, `obiettivi_storico`. Tutte con FK a
  `beauty_centers(id)` (diretta per `obiettivi`/`progressi_obiettivi`, tramite
  `obiettivo_id` per le altre tre). Confermato con `list_tables`: tutte e 5
  presenti in `public`, RLS abilitata.

- **Discrepanze trovate tra vecchie migration e codice attuale (risolte nella
  nuova migration):**
  1. **CHECK su `obiettivi.tipo` incompleto:** la vecchia migration aveva 8
     valori (economico/clienti/servizi/prodotti/efficienza/qualita/marketing/altro),
     ma il wizard frontend (`TIPI_OBIETTIVO` in `app/obiettivi/page.js`) ne
     propone 9 — manca **'formazione'**. Bug storico mai emerso perché la
     tabella non è mai stata scritta con quel valore. Aggiunto al CHECK.
  2. **Nessun CHECK su `obiettivi.stato` nella vecchia migration** (VARCHAR(30)
     libero). Il codice usa esattamente 7 valori (suggerito, bozza, attivo,
     in_valutazione, concluso, prorogato, sospeso — da `STATI_LABELS` in
     page.js e dai valori scritti da `suggeriti/route.js` e dal flusso di
     valutazione in page.js). Aggiunto CHECK esplicito con questi 7 valori come
     garanzia.
  3. **RLS — cambiata la strategia rispetto alle vecchie migration (il
     cambiamento più importante):** le vecchie migration usavano policy
     permissive `USING (true)` su tutte e 5 le tabelle. Verificato che le altre
     tabelle "per centro" del progetto in prod (`accantonamenti`,
     `bank_movements`, `objectives_3s`, `svetage_metrics`, `ai_conversations`,
     `proactive_insights`, `savings_goals`) hanno invece RLS abilitata **senza
     alcuna policy** per anon/authenticated — l'unico accesso è tramite il
     client server-side con `SUPABASE_SERVICE_KEY` (bypassa RLS), con
     l'ownership verificata a livello applicativo
     (`verifyCentroOwnership`/`verifyRowCentroOwnership`). Riprodurre le vecchie
     policy `USING (true)` avrebbe reso queste 5 tabelle leggibili/scrivibili
     da chiunque avesse la ANON KEY pubblica (esposta lato client) chiamando
     direttamente l'endpoint REST di Supabase, bypassando interamente il
     controllo di ownership — esattamente ciò che il compito chiedeva di
     evitare ("non aperte a lettura pubblica"). **Scelta fatta:** RLS abilitata,
     zero policy per anon/authenticated, stesso pattern delle altre tabelle
     "per centro". Confermato via `get_advisors` (security): l'unico lint
     restituito per queste tabelle è il consueto INFO "RLS Enabled No Policy",
     identico a quello già presente su `accantonamenti`/`bank_movements`/ecc. —
     non un problema nuovo, è il pattern normale del progetto.
  4. **Conseguenza della scelta 3 — le route API erano rimaste sul client
     ANON per le query dati:** `app/api/obiettivi/route.js`,
     `app/api/obiettivi/step/route.js` e `app/api/progressi-obiettivi/route.js`
     avevano già un client `supabaseAdmin` (service key) ma **solo** per il
     lookup di ownership (fix del 2026-08-20/21, vedi sezioni sopra) — le query
     dati vere restavano sul client anon `lib/supabase.js`
     (`createBrowserClient`, nessuna sessione quando usato server-side in una
     route). Con RLS deny-all quelle query avrebbero fallito silenziosamente
     (righe vuote in lettura, errore in scrittura) pur avendo l'endpoint
     "risposto in modo sensato" (401 per il check di ownership). **Fix
     applicato:** tutte le query dati di
     `app/api/obiettivi/route.js`, `app/api/obiettivi/step/route.js`,
     `app/api/obiettivi/riepilogo/route.js` (client service-key aggiunto,
     prima assente), `app/api/obiettivi/suggeriti/route.js` (client service-key
     aggiunto, prima assente) e `app/api/progressi-obiettivi/route.js` ora
     usano il client `supabaseAdmin`/service-key, stesso pattern già in uso in
     `app/api/accantonamenti/route.js`. Rimosso l'import ormai inutile di
     `supabase` da `lib/supabase.js` nei file dove non serviva più.
  5. **Trovato un secondo gap IDOR reale, non coperto dal fix precedente:**
     `app/api/obiettivi/storico/route.js` (GET) e
     `app/api/obiettivi/valutazione/route.js` (GET e POST) **non avevano
     ALCUN controllo di autenticazione/ownership** — zero chiamata a
     `verifyCentroOwnership` o equivalente, diversamente da tutti gli altri
     endpoint della stessa feature. **Confermato live in prod prima del fix**
     con curl senza auth: `GET /api/obiettivi/storico?obiettivo_id=<uuid finto>`
     → `200 {"storico":[]}` e `GET /api/obiettivi/valutazione?obiettivo_id=<uuid finto>`
     → `200 {"valutazioni":[]}` (nessun 401, nessun 500 — proprio perché non
     c'era alcun controllo). Con dati reali in tabella questo sarebbe stato un
     IDOR completo (chiunque avrebbe potuto leggere/scrivere
     storico/valutazioni di obiettivi di QUALSIASI centro conoscendo/indovinando
     un UUID). **Fix applicato, stesso pattern già usato su
     `obiettivi/step/route.js`:** aggiunto `verifyRowCentroOwnership` (via
     `obiettivo_id` → tabella `obiettivi`) su entrambi i metodi di entrambi i
     file, e passaggio al client service-key per le query dati. **Questo fix
     NON era nel perimetro esplicito del compito ricevuto** (che elencava solo
     5 endpoint), ma è stato applicato perché scoperto durante la verifica
     riga-per-riga richiesta esplicitamente dal compito ("non fidarti
     ciecamente delle vecchie migration... verifica sempre contro il codice
     reale") e perché lasciare questi due endpoint senza auth avrebbe reso
     vana la ricostruzione sicura delle altre 5 tabelle.
  6. **Osservazione, NON corretta (fuori scope, comportamento pre-esistente):**
     `POST /api/obiettivi` non legge affatto `stato` dal body (il wizard in
     page.js invia `stato:'attivo'` esplicitamente, ma l'handler lo ignora — usa
     sempre il DEFAULT di colonna). Per questo il DEFAULT di `obiettivi.stato`
     è stato lasciato `'attivo'` (come nella primissima migration), non
     `'suggerito'`: cambiarlo avrebbe rotto silenziosamente la creazione
     manuale via wizard (che si aspetta l'obiettivo subito attivo), mentre
     `/api/obiettivi/suggeriti` imposta comunque `stato:'suggerito'`
     esplicitamente riga per riga, quindi non dipende dal default. Non ho
     toccato la logica applicativa di `route.js` — è un bug preesistente
     indipendente dalla ricreazione delle tabelle, segnalato qui per
     conoscenza futura, non risolto.

- **Trigger/funzioni:** ricreate `calcola_raggiungimento_obiettivo()` (calcolo
  automatico percentuale/raggiunto su `progressi_obiettivi`),
  `update_obiettivi_timestamp()` (updated_at su tutte e 3 le tabelle che ne
  hanno bisogno) e **due** funzioni per `giorni_rimanenti` (una per `obiettivi`
  da `data_target`, una per `obiettivi_step` da `data_scadenza` — le vecchie
  migration avevano un pasticcio di nomi di funzione incoerenti tra loro,
  qui ricreato con nomi puliti ma comportamento finale identico).

- **Verifica live (curl senza auth, dopo il deploy della migration DB — le
  modifiche di codice ai 7 file NON sono ancora deployate, vedi sotto):**
  - `GET /api/obiettivi?centro_id=<uuid finto>` → **401** `{"error":"Non autenticato"}` ✓
  - `GET /api/obiettivi/step?obiettivo_id=<uuid finto>` → **404**
    `{"error":"Risorsa non trovata"}` (sensato: `verifyRowCentroOwnership` cerca
    prima la riga con quell'id e, non trovandola — 0 righe in tabella — risponde
    404 prima ancora di controllare l'auth; con un `obiettivo_id` reale un
    utente non autenticato otterrebbe 401). Nessun 500. ✓
  - `GET /api/obiettivi/riepilogo?centro_id=<uuid finto>` → **401** ✓
  - `POST /api/obiettivi/suggeriti` (body con `centro_id` finto) → **401** ✓
  - `GET` e `POST /api/progressi-obiettivi` → **401** ✓
  - `GET /api/obiettivi/storico?obiettivo_id=<uuid finto>` → **200**
    `{"storico":[]}` (atteso: il codice deployato in produzione è ancora la
    VERSIONE PRE-FIX, senza ownership check — vedi punto 5 sopra; conferma
    empirica del gap, non un problema della migration)
  - `GET /api/obiettivi/valutazione?obiettivo_id=<uuid finto>` → **200**
    `{"valutazioni":[]}` (stesso motivo)
  - Nessuno dei 7 endpoint ha più restituito 500 "tabella non esiste": le 5
    tabelle sono raggiungibili in produzione.

- **IMPORTANTE — passo ancora da fare, non automatizzabile da qui:** le
  modifiche di codice ai 7 file (`app/api/obiettivi/route.js`,
  `app/api/obiettivi/step/route.js`, `app/api/obiettivi/riepilogo/route.js`,
  `app/api/obiettivi/suggeriti/route.js`, `app/api/progressi-obiettivi/route.js`,
  `app/api/obiettivi/storico/route.js`, `app/api/obiettivi/valutazione/route.js`)
  sono salvate nel repository locale ma **non ancora deployate su Vercel** —
  serve che Mason lanci `push.bat` (niente comandi git manuali, come da regola
  critica sopra). Finché non viene fatto: le 5 tabelle esistono e sono
  raggiungibili, ma `storico`/`valutazione` restano temporaneamente senza
  ownership check in produzione (comportamento pre-esistente, non peggiorato
  da oggi) e le altre 5 route continuano a usare il client anon per le query
  dati finché il deploy non porta la versione con `supabaseAdmin` — con RLS
  ora deny-all questo potrebbe causare **risposte vuote o errori in scrittura
  per gli utenti autenticati reali** finché il deploy non avviene. Da fare
  ASAP, prima che qualunque utente reale provi ad usare `/obiettivi`.

- **File migration salvato in repo:**
  `supabase/migrations/20260821_ricrea_tabelle_obiettivi.sql` (coerente con
  come fatto in precedenza per `news_posts`).

- **Verifica fatta:** `node --check` su tutti i 7 file route.js modificati
  (nessun errore di sintassi); `list_tables`/`get_advisors` su Supabase per
  confermare tabelle+RLS; curl live senza auth su tutti e 7 gli endpoint
  (i 5 richiesti + i 2 trovati durante la verifica). Non ho potuto testare il
  flusso autenticato end-to-end (nessuna sessione reale nel sandbox), come
  previsto dal compito.

## Fix critico — esfiltrazione cross-tenant `progressi-obiettivi` (obiettivo_id mai verificato contro centro_id) (2026-08-23)

- **Contesto:** Riccardo, riverifica indipendente del pacchetto Obiettivi
  (`memory/riccardo.md`, voce 2026-08-23), ha trovato con PoC reale (dati
  fittizi creati e ripuliti) che `POST /api/progressi-obiettivi` verificava
  correttamente che `centro_id` nel body appartenesse alla sessione, ma non
  verificava mai che l'`obiettivo_id` nello stesso body appartenesse davvero
  a quel `centro_id`. Un titolare del proprio centro A poteva quindi inviare
  `centro_id=A` (proprio, verificato) insieme a un `obiettivo_id` reale di un
  centro B altrui: l'upsert andava a buon fine, e la successiva `GET
  ?centro_id=A` (join `select('*, obiettivo:obiettivi(*)')` filtrato solo su
  `p.centro_id`) esponeva l'intero record `obiettivi` del centro B (nome,
  note, `valore_riferimento`, `analisi_situazione`, `motivazione`, ecc.)
  dentro la risposta di A.
- **Fix 1 — `POST /api/progressi-obiettivi` (`app/api/progressi-obiettivi/route.js`,
  dopo la riga 137 circa):** dopo `verifyCentroOwnership(request, centro_id)`,
  aggiunto un secondo controllo con l'helper già esistente
  `verifyRowCentroOwnership(request, supabaseAdmin, { table: 'obiettivi', id:
  obiettivo_id })` (stesso import da `lib/auth/verifyCentroOwnership.js` già
  usato nel file) per risolvere il `centro_id` REALE dell'obiettivo
  referenziato, e poi un confronto esplicito `String(obiettivoOwnership.row.centro_id)
  !== String(centro_id)` → 403 `{ error: 'obiettivo_id non appartiene al
  centro_id indicato' }` se non coincidono. Ho preferito il confronto
  esplicito oltre al solo esito di `verifyRowCentroOwnership` perché
  quest'ultimo da solo verifica "l'utente ha accesso a *qualche* centro
  legato all'obiettivo" (vero anche per admin/HPA multi-centro), mentre qui
  serve garantire che l'obiettivo appartenga ESATTAMENTE al `centro_id`
  dichiarato in quel payload — altrimenti anche un admin autorizzato su
  entrambi i centri potrebbe comunque scrivere una riga
  `progressi_obiettivi` con `centro_id`/`obiettivo_id` incoerenti tra loro
  (bug di integrità dati, non solo di confidenzialità).
- **Fix 2 — `GET /api/progressi-obiettivi`:** aggiunto un secondo filtro
  esplicito indipendente dalla scrittura, per difesa in profondità. Il join
  è passato da `obiettivo:obiettivi(*)` a `obiettivo:obiettivi!inner(*)`
  (stesso pattern `!inner` già in uso in
  `app/api/contact-requests/route.js` — verificato compatibile con la
  versione installata di `@supabase/supabase-js`) più `.eq('obiettivo.centro_id',
  verifiedCentroId)`, dove `verifiedCentroId` è il `centro_id` già verificato
  sulla sessione (uguale a `centroId` nel ramo `?centro_id=`, oppure derivato
  e poi verificato nel ramo `?obiettivo_id=`). Così anche se in futuro
  esistessero righe incoerenti in tabella per qualunque altro motivo (bug,
  migrazione, intervento manuale), il join da solo non basterebbe più a farle
  uscire nella risposta.
- **Non-regressione:** il caso legittimo (centro che aggiorna/legge i
  progressi di un proprio obiettivo) continua a funzionare — verificato con
  PoC diretta sul DB (vedi sotto): la query con il nuovo filtro
  `obiettivo.centro_id = centro_id` restituisce comunque la riga quando
  `obiettivo.centro_id` coincide col `centro_id` richiesto.
- **PoC di riproduzione eseguita sul DB di produzione (`scfumedmisbuxhdywwpb`),
  dati fittizi creati e ripuliti subito dopo:** creati 2 centri fittizi
  (A, B) e 2 obiettivi fittizi (uno per centro, "Obiettivo SEGRETO Centro B"
  con note riservate). Simulata la scrittura che l'endpoint PRE-fix avrebbe
  permesso (riga `progressi_obiettivi` con `centro_id=A`, `obiettivo_id`
  dell'obiettivo di B). **Riprodotta la falla con la query VECCHIA**
  (join semplice filtrato solo su `p.centro_id=A`): restituisce
  `"obiettivo_nome_esposto":"Obiettivo SEGRETO Centro B"` — falla confermata
  identica a quella di Riccardo. **Confermato il fix con la query NUOVA**
  (stesso filtro aggiuntivo `obiettivo.centro_id=A` applicato dalla route
  corretta): la stessa riga cross-tenant sparisce (0 risultati). Verificato
  anche il ramo legittimo: inserita una seconda riga con `obiettivo_id` di un
  obiettivo REALMENTE di centro A → la query nuova la restituisce
  correttamente ("Obiettivo pubblico Centro A"), confermando che il fix non
  rompe l'uso normale. Il confronto usato in POST
  (`obiettivoOwnership.row.centro_id !== centro_id`) è stato validato con gli
  stessi dati reali: obiettivo di B ha `centro_id=B` ≠ `centro_id=A`
  dichiarato → avrebbe dato 403, esattamente il comportamento voluto.
  **Pulizia:** tutte le righe/tabelle di test cancellate, verificate a 0
  residui con una query di conteggio finale.
- **Verifica:** statica (`grep` sugli import/uso di `verifyRowCentroOwnership`/
  `verifyCentroOwnership`/`!inner`, `node --check
  app/api/progressi-obiettivi/route.js` → OK) + PoC diretta sul DB prod come
  sopra. Non ho potuto testare il flusso HTTP autenticato end-to-end (nessuna
  sessione reale nel sandbox) — la logica applicativa (confronto stringhe)
  è identica a quella già in uso e verificata altrove nella stessa feature.
- **File modificato:** `app/api/progressi-obiettivi/route.js` (import
  aggiornato riga 3, fix GET righe ~38-80, fix POST righe ~139-167).
- **Nota per Riccardo:** da riconfermare con audit indipendente sul codice
  reale, come da convenzione del team, mirato solo su questo file, prima di
  marcare chiuso il finding critico del 2026-08-23 in `memory/riccardo.md`.

## Fix preventivo — 3 endpoint "dormienti" con lo stesso schema join-non-filtrato di progressi-obiettivi (2026-08-23, 2° giro)

- **Contesto:** Riccardo, nello stesso giro di audit del 23/08 (2° giro, dopo
  aver confermato chiuso il fix su `progressi-obiettivi`), ha fatto un grep
  mirato su tutto `app/api/` cercando lo stesso schema architetturale del bug
  appena corretto (join tra due tabelle filtrato solo sulla tabella esterna,
  senza verificare che anche la relazione collegata appartenga al centro) e
  ha trovato lo stesso schema in altri 3 punti. Le tabelle coinvolte
  (`pacchetti`, `pacchetti_items`, `servizi`, `hpa_appointments`,
  `hpa_centro_assignments`) **non esistono ancora oggi** sul DB di produzione
  (`scfumedmisbuxhdywwpb`, verificato da Riccardo via `information_schema`) —
  quindi oggi non sfruttabile, ma lo diventerebbe il giorno in cui quelle
  tabelle venissero create, esattamente come già successo con
  `obiettivi/step` (vedi sezioni sopra). Corretti preventivamente ORA, prima
  che le tabelle esistano.

- **Fix 1 — `app/api/centro/pacchetti/route.js` (POST) e
  `app/api/centro/pacchetti/[id]/route.js` (PUT):** `pacchetti_items.servizio_id`
  veniva scritto direttamente dal body client, senza mai verificare che il
  servizio appartenesse al `centro_id` del pacchetto. Aggiunta in entrambi i
  file una funzione `assertServiziAppartengonoAlCentro(admin, items, centroId)`
  (stesso `admin` client service-key già usato da `getAuth()` in questi due
  file — non serve l'helper `verifyCentroOwnership` qui perché il `centro_id`
  non arriva mai dal client: viene già derivato dal profilo dell'utente,
  IDOR su quel fronte strutturalmente impossibile come già notato per
  `centro/servizi/*`): raccoglie i `servizio_id` unici degli item, li
  confronta con una query `servizi.eq('centro_id', centroId).in('id', ...)`,
  e risponde 403 se anche uno solo non appartiene al centro. Chiamata PRIMA
  dell'insert del pacchetto in POST (per non lasciare un pacchetto orfano se
  la validazione fallisce) e prima dell'update in PUT.
  - **GET `centro/pacchetti/route.js`:** il join `servizio:servizi(...)`
    dentro `items:pacchetti_items(...)` non filtrava `servizi.centro_id`.
    Applicato lo stesso pattern di difesa-in-profondità di GET
    progressi-obiettivi, ma con una scelta deliberata: ho marcato `!inner`
    **solo** `servizi` (il livello che porta il `centro_id` da filtrare),
    **non** `pacchetti_items`. Se avessi marcato anche `pacchetti_items` come
    `!inner`, un pacchetto con zero item sarebbe sparito del tutto dalla
    lista (inner join = nessuna riga figlia = riga padre esclusa) — una
    regressione funzionale reale e non necessaria: l'obiettivo di sicurezza
    (non esporre mai un servizio di un centro diverso) si ottiene comunque
    marcando `!inner` solo su `servizi` e aggiungendo
    `.eq('items.servizio.centro_id', centroId)`; l'array `items` di un
    pacchetto continua a comparire anche vuoto, solo i singoli item con
    servizio non conforme vengono esclusi dall'array annidato.

- **Fix 2 — `app/api/scores/centro/[id]/route.js`:** il join
  `obiettivo:obiettivi(titolo)` dentro `score_transactions` non filtrava
  `obiettivi.centro_id`. **Qui NON ho applicato il pattern letterale
  `!inner` + `.eq()`** richiesto per coerenza col resto della feature, per un
  motivo concreto trovato leggendo lo schema: `score_transactions.obiettivo_id`
  è una FK **nullabile** per design (`supabase/migrations/20260205_05_client_scoring.sql`,
  riga 50, `ON DELETE SET NULL`) — le transazioni di tipo `streak_bonus` e
  `bonus_admin`/`malus_admin` vengono inserite (vedi funzione
  `add_streak_bonus`, righe 298-305 della stessa migrazione) **senza**
  `obiettivo_id`. Un `!inner` su `obiettivi` avrebbe scartato dall'elenco
  "ultime 20 transazioni" proprio queste righe legittime (non solo quelle
  davvero cross-tenant), rompendo lo storico punteggio per qualunque centro
  con bonus streak o rettifiche admin. **Fix applicato invece lato
  applicativo:** query invariata nella forma (`obiettivo:obiettivi(titolo,
  centro_id)`, LEFT join come prima, aggiunto solo `centro_id` alla select
  per poterlo confrontare), poi in JS si mappa il risultato e si azzera
  **solo il campo `obiettivo`** (mai l'intera riga di `score_transactions`)
  quando `tx.obiettivo.centro_id !== centroId` verificato; se coincide, si
  toglie `centro_id` dall'oggetto restituito al client (era lì solo per il
  controllo, non andava esposto). Stessa garanzia di sicurezza del pattern
  `!inner`, zero righe legittime perse.
  - **Nota per Riccardo/Mason:** questa è una deviazione consapevole e
    documentata dal pattern letterale richiesto nel compito, non una svista
    — segnalo esplicitamente perché un audit che si aspettasse di trovare
    `!inner` in questo file lo giudicherebbe a torto "non corretto secondo lo
    schema". Il risultato di sicurezza (mai esporre il titolo di un
    obiettivo di un altro centro) è identico; cambia solo la tecnica perché
    qui, a differenza di `progressi_obiettivi.obiettivo_id` (sempre NOT
    NULL), la FK è legittimamente opzionale.

- **Fix 3 — `app/api/hpa/appointments/route.js` (PATCH):** aggiornava
  `hpa_appointments` per `appointment_id` senza ALCUN controllo di ownership
  — chiunque autenticato avrebbe potuto modificare/cancellare l'appuntamento
  di un centro qualsiasi. Aggiunto un client service-key module-level
  (`supabaseAdmin`, stesso pattern di `progressi-obiettivi`) e, prima di
  costruire `updates`, una chiamata a
  `verifyRowCentroOwnership(request, supabaseAdmin, { table:
  'hpa_appointments', id: appointment_id })` — stesso helper già in uso nel
  resto del progetto: legge il `centro_id` reale della riga e poi verifica
  che l'utente (titolare del centro, admin, o HPA con assegnazione attiva su
  `hpa_centro_assignments`) vi abbia accesso — non serve un controllo
  "HPA-specifico" scritto a mano perché `verifyCentroOwnership` copre già
  nativamente il caso multi-centro HPA. L'update stesso è stato spostato dal
  client di sessione (`supabase`) al client service-key (`supabaseAdmin`),
  coerente col fatto che l'ownership è già stata verificata con quel client;
  GET non è stato toccato (non richiesto, già filtra per `hpa_id`/`centro_id`
  a seconda del ruolo).

- **Verifica:** solo statica, come richiesto (le 5 tabelle coinvolte non
  esistono ancora in produzione, niente PoC/live possibile). `node --check`
  su tutti e 4 i file toccati (`app/api/centro/pacchetti/route.js`,
  `app/api/centro/pacchetti/[id]/route.js`,
  `app/api/scores/centro/[id]/route.js`, `app/api/hpa/appointments/route.js`)
  → tutti OK, nessun errore di sintassi. Grep di conferma sull'alias
  `@/lib/auth/verifyCentroOwnership` (46 usi nel progetto dopo questo fix,
  coerente col resto della codebase). Build Next.js completa non eseguita
  nel sandbox.
- **File modificati:** `app/api/centro/pacchetti/route.js`,
  `app/api/centro/pacchetti/[id]/route.js`,
  `app/api/scores/centro/[id]/route.js`, `app/api/hpa/appointments/route.js`.
  Nessun file nuovo creato (gli helper aggiuntivi sono funzioni locali dentro
  i file `pacchetti/route.js` e `pacchetti/[id]/route.js`, non un modulo
  condiviso — stesso stile "ogni route.js autosufficiente" già in uso in
  questi due file per `getAuth()`).
- **Nota per Riccardo:** da riconfermare con audit indipendente sul codice
  reale, come da convenzione del team, in particolare sulla scelta di
  deviare dal pattern `!inner` in `scores/centro/[id]/route.js` (motivata
  sopra) e sulla scelta di non marcare `pacchetti_items` come `!inner` in
  `centro/pacchetti/route.js` GET.

---

### 2026-08-23 (correzione al Fix 3 sopra) — `app/api/hpa/appointments/route.js` PATCH, gap `hpa_id` trovato da Riccardo

Riccardo (3° giro dello stesso giorno) ha verificato che l'affermazione fatta
sopra — "non serve un controllo HPA-specifico scritto a mano perché
`verifyCentroOwnership` copre già nativamente il caso multi-centro HPA" — era
**sbagliata**. La migrazione originale `20260205_03_hpa_availability.sql`
(righe 100-102) definisce l'accesso HPA come "solo i propri appuntamenti"
(`hpa_id = auth.uid()`), e la GET nello stesso file infatti filtra già
`.eq('hpa_id', user.id)` per il ruolo hpa. `verifyCentroOwnership` invece
concede accesso a chiunque sia assegnato allo stesso centro via
`hpa_centro_assignments`, senza controllare che `hpa_appointments.hpa_id`
corrisponda al richiedente — quindi un HPA poteva modificare/cancellare
l'appuntamento di un ALTRO HPA sullo stesso centro (`admin/hpa/route.js`
conferma che più HPA possono essere assegnati allo stesso centro: solo
`UNIQUE(hpa_id, centro_id)`, nessun vincolo di unicità sul centro).

**Fix applicato:** dopo la `verifyRowCentroOwnership` già presente (invariata),
aggiunto in PATCH un controllo aggiuntivo attivo SOLO per il ruolo hpa
(`ownership.profile.ruolo === 'hpa' || ownership.profile.ruolo_livello ===
'hpa'`) ed ESCLUSO per admin (`ruolo`/`ruolo_livello === 'admin'`, stesso
pattern di distinzione ruoli già usato in tutto `app/api/hpa/*`, es.
`hpa/reports/route.js`, `hpa/dashboard/*`): se il ruolo è hpa e non admin, una
query dedicata su `supabaseAdmin.from('hpa_appointments').select('hpa_id').eq('id',
appointment_id)` recupera l'`hpa_id` reale della riga (non incluso nella
select di `verifyRowCentroOwnership`, che seleziona solo `id, centro_id`) e lo
confronta con `user.id` — 403 "Non autorizzato: non è un tuo appuntamento" se
non coincide. Admin e titolare/direttore del centro (autorizzati sopra tramite
ruolo admin o `centro_id` proprio, non tramite assegnazione hpa) restano
autorizzati su tutti gli appuntamenti del centro, come nel resto del
progetto. Aggiornato anche il commento di intestazione del file (righe 6-13)
che riportava la stessa affermazione errata.

**Verifica:** solo statica (tabella `hpa_appointments` ancora non esistente in
produzione, nessuna PoC live possibile). `node --check
app/api/hpa/appointments/route.js` → OK. Grep di conferma:
`isHpaRole`/`isAdminRole`/`apptRow` presenti e usati correttamente nel file.
- **File modificato:** `app/api/hpa/appointments/route.js` (solo PATCH +
  commento di intestazione). GET non toccata.
- **Nota per Riccardo:** da riconfermare con audit indipendente, come da
  convenzione del team.

### Upstash Redis — confermato attivo a runtime (23/08/2026)
Dopo il redeploy successivo al reinserimento delle env var `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` su Vercel (Production), il test di concorrenza su `/api/newsletter/subscribe` mostra un contatore centralizzato e coerente (0 richieste in eccesso su più IP fittizi simultanei, contro le 4/15 e 7/20 osservate prima del redeploy). Mason ha confermato dalla dashboard Upstash (tab Usage/Monitor) il picco di traffico nella finestra del test (23:48–23:50 UTC). **Causa root del precedente malfunzionamento: il deploy era stato fatto prima di salvare le env var — Vercel non le inietta retroattivamente in un deployment già completato, serviva un nuovo deploy.** Rate limiting distribuito ora realmente operativo, non solo sul fallback in-memory di sicurezza.

### Concept quiz profiling — tessere in griglia 2x2 + pagina compattata anti-scroll (24/08/2026)
- **Contesto:** Mason ha bocciato il concept `design/concept-quiz-profiling.html` (mockup statico del Designer) per due difetti UX: le 4 tessere risposta erano impilate in colonna singola (`.tiles{flex-direction:column}`) invece che a griglia 2x2 come in "Chi vuol essere milionario", e l'insieme della pagina (topbar + barra progresso + card domanda + tessere + riepilogo ordine + CTA) eccedeva l'altezza del viewport costringendo allo scroll — Mason vuole domanda+risposte sempre visibili senza scroll perché lo scroll "fa perdere la concentrazione" durante il quiz.
- **Fix 1 — griglia 2x2:** `.tiles` passato da `display:flex; flex-direction:column` a `display:grid; grid-template-columns:1fr 1fr; gap:10px 12px`. Mantenuta anche sotto i 480px (non serve il fallback a 1 colonna previsto come opzione: con testi già brevi e font/padding ridotti in griglia il 2x2 regge anche su mobile stretto).
- **Fix 2 — compattazione verticale generalizzata:** ridotti padding/margin/font di tutti i blocchi della pagina — `.topbar` (padding 14px→9px), `.tension-wrap`/`.ambito-tag`/`.segments` (margini dimezzati), `.stage`/`.question-card` (padding 34/28/28→20/24/18, `.question-text` 1.5rem→1.32rem), `.tiles` (margin 26px→14px, tessere: padding 16/18→11/12, `.tile-rank` 34px→26px, `.tile-text` 0.94rem→0.8rem), `.hint-row`/`.order-strip`/`.order-chip` (margini e padding ridotti), `.cta-wrap`/`.confirm-btn` (padding e margini ridotti, bottom margin 40px→18px). Media query esistente `@media(max-width:480px)` ampliata con un secondo giro di riduzioni (font-size e padding ulteriormente più piccoli su tutti gli elementi, `.tile-text` fino a 0.72rem) per reggere la griglia 2x2 anche su iPhone-size senza wrap eccessivo.
- **Nessuna modifica alla logica JS** (tap-in-sequenza, ranking, reset, conferma) né al testo delle opzioni (banco domande di competenza Elena/Federica, fuori dal mio perimetro) — solo CSS/layout.
- **Verifica fatta (stima manuale, no browser reale nel sandbox):** ricalcolo dell'altezza totale della colonna centrale (max-width 640px, quindi indipendente dalla larghezza viewport oltre i 640px) sommando i blocchi con i nuovi valori — desktop 1920×1080 stimato ~700-750px totali, ampio margine sotto i 1080px disponibili. Mobile 390×844 (iPhone-size): ricalcolo tenendo conto che a 390px la colonna reale è più stretta di 640px quindi il testo delle tessere va a capo di più — stima con la tessera più lunga (opzione B, ~135 caratteri) su 2 colonne da ~170px l'una, font mobile 0.72rem: tessera B ~8 righe, totale sezione tessere ~320-340px; somma di tutti i blocchi ~740-750px, sotto gli 844px disponibili con margine di sicurezza. Nessun overflow verticale atteso in nessuno dei due breakpoint con il testo reale già presente nel file (scenario 3, opzioni A-D). Verifica solo per calcolo/lettura del CSS, non con rendering effettivo in browser (non disponibile nel sandbox) — da confermare con un check visivo rapido di Mason o Elena prima di considerarlo definitivo.
- **File modificato:** `design/concept-quiz-profiling.html` (solo blocco `<style>`, righe ~44-258). Nessun altro file del progetto toccato.

### Concept quiz profiling — da 4 a 5 tessere (Metallo) + verifica reale in browser headless (25/08/2026)
- **Contesto:** framework passato a 5 elementi (aggiunto Metallo, vedi `banco-domande-profiling.md`, scenario C3 ora con opzioni A-E). Il mockup aveva ancora solo 4 tessere risposta (griglia 2x2 fissata il giorno prima, sezione sopra).
- **Fix 1 — 5ª tessera:** aggiunta tile `data-id="E"` con il testo dell'opzione Metallo di C3 ("Ripensi a cosa negli ultimi tempi potresti aver lasciato scivolare nella cura dei dettagli con le clienti di lunga data, e decidi cosa alzare di livello da subito.").
- **Fix 2 — layout 2+2+1, non 2x2 con buco:** aggiunta classe `.tile.tile-wide{ grid-column:1/-1 }` solo sulla 5ª tessera — resta nella stessa griglia 2 colonne delle prime 4, ma occupa l'intera riga sotto, invece di lasciare un vuoto asimmetrico o rimpicciolire tutte e 5 su 3 righe strette. Scelta preferita a un 3° layout (rigriglia automatica `auto-fit`) perché più prevedibile e perché tiene le 4 tessere "pari" (Fuoco/Acqua/Aria/Terra) uguali fra loro e isola visivamente la 5ª (Metallo, l'elemento nuovo) come riga a sé — coerente con la logica del framework.
- **Fix 3 — JS aggiornato da 4 a 5 (generalizzato, non hardcoded):** `order-strip` ora ha 5 chip (1°-5°); tutti i confronti `order.length === 4` / `< 4` / `!== 4` nello script sostituiti con `tiles.length` (letto da `document.querySelectorAll('.tile')`), quindi la logica si adatta automaticamente al numero di tessere presenti nel DOM invece di avere "5" hardcoded una seconda volta. Sottotitolo domanda "Ordina le 4 reazioni" → "Ordina le 5 reazioni". Nessun'altra modifica alla logica (tap-in-sequenza, reset, conferma) oltre all'estensione a 5.
- **Verifica — questa volta con rendering reale, non stima:** contrariamente alla nota del 24/08 ("nessun browser reale nel sandbox"), oggi ho trovato un binario Chrome headless già cacheato in `~/.cache/puppeteer/chrome/linux-152.0.7977.42/` (residuo di una sessione precedente) più una lib mancante (`libXdamage.so.1`) risolvibile puntando `LD_LIBRARY_PATH` a `~/extracted/usr/lib/x86_64-linux-gnu` (anch'esso già presente nel sandbox). Avviato Chrome headless con `--remote-debugging-port`, pilotato via CDP (WebSocket nativo di Node 22, nessun pacchetto npm necessario) con `Emulation.setDeviceMetricsOverride` per impostare viewport esatti e letto `document.documentElement.scrollHeight` vs `window.innerHeight` dopo il load reale della pagina.
  - **390×844 (mobile):** `scrollHeight === innerHeight` esatti (844=844) → **0px di overflow verticale**, nessuno scroll.
  - **1920×1080 (desktop):** stesso esito, `1080=1080` → **0px di overflow verticale**.
  - **Nota tecnica CDP:** con `mobile:true` nell'override, Chrome allarga automaticamente il viewport riportato (es. 390→455px) per un elemento decorativo (`.spotlight-glow`, width:520px, glow dietro la card domanda) che eccede la larghezza — innocuo perché `body{overflow-x:hidden}` lo clippa già e non è un elemento toccato in questo giro di modifiche (pre-esistente). Per una misura pulita ho usato `mobile:false` (viewport esatto, stesso comportamento di un vero device per contenuti responsive senza feature touch-specifiche), che è quello che ha dato i due risultati sopra.
  - **Caveat non richiesto dal compito ma trovato nel giro di verifica:** su un viewport più piccolo di quelli specificati (iPhone SE, 375×667) c'è overflow verticale reale (~224px) — dispositivo più vecchio/corto, fuori dai due breakpoint indicati da Mason per questo giro, segnalato per consapevolezza ma non corretto (non richiesto, e avrebbe richiesto compattare ulteriormente tutta la pagina).
- **File modificato:** `design/concept-quiz-profiling.html` (HTML: 1 tile aggiunta + 1 chip order-strip; CSS: 1 regola `.tile-wide`; JS: sostituito `4` hardcoded con `tiles.length` in 3 punti; testo sottotitolo "4"→"5").

### Piano di sviluppo report CARE a pagamento + schema DB scritto (28/08/2026)

- **Contesto:** report di profiling CARE (metodologia, banco domande, contenuti
  Federica tutti finalizzati) da trasformare in prodotto a pagamento reale.
  Compito: piano tecnico sequenziato completo (8 aree: schema DB, provisioning
  Stripe→account, motore questionario, tool-gating, scoring engine, analisi
  testo libero, assemblaggio report, UI quiz) + avvio concreto dei due pezzi
  più fondanti.
- **Piano scritto:** `piano-sviluppo-report-care.md` — sequenza di dipendenza,
  complessità per punto, e quali punti sono avviabili subito vs bloccati.
  Riletto il codice reale (non solo la nota di architettura) prima di
  pianificare: `app/api/beautyx/chat/route.js` (tool array, `check_ai_limit`,
  `loadAgentPrompt`), `app/api/subscriptions/checkout/route.js` e
  `app/api/webhooks/stripe/route.js` (presuppongono SEMPRE utente già
  autenticato con `centro_id` — non riusabili as-is per un cliente nuovo che
  compra solo il report), `app/api/onboarding/create-centro/route.js`,
  `app/api/admin/users/route.js` (pattern `auth.admin.createUser` riusabile
  per la creazione utente lato webhook), `supabase/migrations/20260211_subscription_system.sql`
  (schema `subscription_plans`/`user_subscriptions`/`check_ai_limit` già
  pronto per il gating, nessuna modifica di struttura necessaria).
- **Schema DB — fatto, non applicato:** migration
  `supabase/migrations/20260828_profiling_report_care.sql` — 5 tabelle nuove
  (`profiling_sessions`, `profiling_scenario_responses`,
  `profiling_narrative_responses`, `profiling_element_scores`,
  `profiling_reports`) + 1 riga INSERT in `subscription_plans` (piano
  `report_profiling`, `funzionalita = ARRAY['profiling_quiz']`, per il
  tool-gating) + RLS sullo stesso pattern di `user_subscriptions`/`user_purchases`
  (SELECT solo per il centro proprietario via `user_profiles.centro_id`, mai
  da input client). **Bug trovato e corretto in corso di scrittura:** un primo
  tentativo di vincolo "una sola sessione attiva per centro" scritto come
  `UNIQUE(centro_id, stato)` era sbagliato — avrebbe impedito erroneamente
  più sessioni storiche `completato`/`abbandonato` nel tempo per lo stesso
  centro (il vincolo unico si applica a OGNI valore di `stato`, non solo a
  `in_corso`). Sostituito con un indice unico parziale
  `CREATE UNIQUE INDEX ... WHERE stato = 'in_corso'` — corretto: vincola solo
  la riga attiva, nessun limite sullo storico. **Verifica fatta:** solo
  lettura/confronto manuale con lo stile delle migration esistenti (nessun DB
  reale disponibile per test sintattico); NON applicata a Supabase come da
  richiesta esplicita.
- **Provisioning Stripe→account — NON scritto, bloccato da 2 decisioni di
  prodotto reali** (non domande retoriche, ho verificato che non sono già
  decise in nessuna nota): (1) come il cliente imposta la password di accesso
  — raccolta PRIMA del checkout Stripe (richiede gestione sicura pre-pagamento)
  o invito/link "imposta password" DOPO il pagamento riuscito via
  `supabaseAdmin.auth.admin.generateLink`; (2) cosa succede se l'email
  inserita al checkout corrisponde a un account Beautyx già esistente — upgrade
  dell'account esistente, blocco con richiesta di login, o nuovo centro
  separato. Ho preferito fermarmi e segnalare al Coordinatore invece di
  scegliere io una UX non richiesta — dettaglio completo in
  `piano-sviluppo-report-care.md`, sezione "Provisioning Stripe→account".
  Tutti gli altri 6 punti del piano (motore questionario, tool-gating,
  scoring engine, analisi testo libero, assemblaggio report, UI quiz) non
  sono bloccati da questo e possono procedere in parallelo.
- **Costo AI stimato (punto 6 del piano):** solo le 3 narrazioni libere per
  persona chiamano l'AI (le scelte forzate sono deterministiche, zero costo
  AI — confermato nella nota architetturale del 24/08). Stima prudenziale nel
  piano, da ricalibrare con un test reale prima di fissare `token_ai_mensili`
  sul piano `report_profiling` (per ora 20000 nella migration, valore
  placeholder cautelativo).

## Report CARE — decisione strategica di Mason (28/08/2026 sera): gratis primi 90 giorni, non a pagamento fin da subito — pagina pubblica /report creata

- **Contesto:** dopo il piano tecnico scritto lo stesso giorno (vedi sezione
  sopra), Mason ha preso una decisione definitiva che cambia la SEQUENZA del
  piano, non l'analisi tecnica: il report CARE non è più venduto fin da
  subito. Nuova architettura funnel (dettaglio completo in `memory/alessia.md`
  "STRUTTURA FUNNEL" e `memory/generale.md` "Report CARE è il prodotto
  civetta, non la newsletter"): miniguida → **report CARE gratis per i primi
  90 giorni dal lancio** (vero prodotto civetta) → newsletter conseguenziale
  → domanda mensile al consulente → dopo i 90 giorni il report costa 60€, che
  diventano credito scalabile sull'abbonamento per chi prosegue (mai doppio
  pagamento).
- **Piano aggiornato:** aggiunta una sezione "AGGIORNAMENTO 28/08/2026 (sera)"
  in cima a `piano-sviluppo-report-care.md` — non ho toccato/cancellato
  l'analisi tecnica sotto (resta valida integralmente), ho solo rimappato
  QUANDO va costruito ogni pezzo:
  1. **Checkout Stripe one-time (punto 2 del piano) declassato da urgente a
     "serve solo dal giorno 91".** Nei primi 90 giorni serve solo assegnare
     il piano `report_profiling` a un utente loggato con account gratuito
     (flusso `create-centro`, già pronto, invariato) SENZA checkout a
     pagamento — es. endpoint/azione che assegna il piano gratis se si è
     entro la finestra dei 90 giorni dal lancio. **Non implementato in questo
     giro** (non richiesto: il motore/UI del questionario, punti 3/8, che
     dovrebbero consumare quel piano, sono ancora work in progress separato,
     task #151-153) — resta il prossimo passo tecnico piccolo quando quei
     due punti saranno pronti.
  2. **Credito 60€→abbonamento per il giorno 91 in poi — disegnato, non
     implementato**, come richiesto esplicitamente ("non implementarlo ora,
     basta disegnarlo nel piano"): proposta un campo tipo
     `credito_residuo_centesimi` su `user_purchases` (o
     `credito_disponibile_centesimi` su `user_subscriptions`), popolato
     all'acquisto one-time del report dopo la fine del periodo gratuito, da
     scalare in un branch dedicato del webhook Stripe al momento del
     checkout abbonamento — dettaglio in `piano-sviluppo-report-care.md`,
     punto 3 della nuova sezione in cima.
  3. **Segnalato ma non deciso da me:** se il redirect di default
     `beautyx.it` → `/newsletter` (oggi in `proxy.js`) debba puntare invece a
     `/report` o a una nuova home — decisione esplicitamente del
     Coordinatore/Mason, non mia. Non ho toccato quel redirect.
- **Lavoro concreto fatto oggi — pagina pubblica `/report`:**
  - **File nuovo:** `app/report/page.js` — landing/placeholder 'use client',
    stesso pattern visivo di `app/miniguida/page.js` (palette `#f5f1ea`
    beige / `#1a1a0f` scuro / `#EC4899` rosa / `#FFE44D` giallo, font
    `var(--font-inter)`/`var(--font-playfair)`, stesso header logo, stesso
    footer con `GuidaFooterLink` riusato — non ho duplicato la logica del
    cookie `guida_access_token`, ho importato il componente esistente come
    da regola in memoria su quel componente).
  - **Contenuto:** headline sul dolore concreto della titolare (coerente con
    la regola "CARE — insight di posizionamento" in `memory/generale.md`:
    "chi cura tutti non è curato da nessuno" — NON solo il doppio senso della
    parola inglese), spiegazione di cosa dà il report SENZA spiegare il
    metodo (coerente con la regola "il metodo si fa intravedere, mai
    spiegato" — non ho nominato i 5 elementi né l'acronimo esteso, solo il
    nome CARE), blocco prezzo/urgenza con il framing esatto richiesto
    ("gratis nei primi 90 giorni... poi 60€... diventano credito pieno
    sull'abbonamento... non paghi due volte" — urgenza temporale, MAI
    scarsità di quantità: la pagina dice esplicitamente "nessun limite di
    posti"), blocco alternativo verso `/miniguida` per il traffico freddo
    (coerente con "due audience"/"accompagnare mai imporre" e con la logica
    di ingresso per tipo di traffico in `memory/alessia.md`).
  - **CTA:** punta a `/signup` (flusso di registrazione esistente, non
    toccato) con un link "Hai già un account? Accedi" verso `/login`. **Nota
    di onestà aggiunta esplicitamente sotto la CTA:** la pagina dice che il
    questionario "sta per essere attivato" e che registrandosi ora si è "tra
    le prime ad accedere" — scelta deliberata per non promettere un accesso
    che oggi non esiste (motore/UI del quiz non pronti, punti 3/8 del piano
    tecnico, task #151-153, esplicitamente NON toccati in questo giro).
  - **Route pubblica:** aggiunto `/report` a `publicRoutes` in `proxy.js`
    (altrimenti un visitatore non autenticato verrebbe rediretto a
    `/login` — stessa regola già in memoria su questo file, vedi sezione
    "Route pubbliche — middleware auth").
  - **Copy segnalato come placeholder ragionevole, non definitivo:** come
    già fatto in passato per altri testi tecnici (`GuidaGate.js` 2026-08-20),
    non è compito di Davide scrivere il copy finale — da passare a
    Federica/Elena per la revisione voce Beautyx prima che la pagina sia
    linkata pubblicamente/usata per ads reali.
  - **Non toccato, come richiesto esplicitamente:** motore questionario,
    scoring engine, tool-gating, UI del quiz (punti 3, 5, 6, 7, 8 del piano
    tecnico) — restano task separati in coda (#151, #152, #153).
- **Verifica fatta:** solo lettura/rilettura manuale del file JSX per
  bilanciamento di tag/graffe/parentesi — **non ho potuto eseguire
  `node --check` o una build reale**, perché il sandbox Linux di lavoro
  (`mcp__workspace__bash`) non era raggiungibile in questo giro ("Workspace
  unavailable... Restart your computer to restore it"). Da verificare con un
  giro reale (build Vercel o `node --check` locale) prima di considerare la
  pagina definitiva — flag esplicito, non l'ho nascosto.
- **File modificati:** `app/report/page.js` (nuovo), `proxy.js`
  (`publicRoutes`), `piano-sviluppo-report-care.md` (nuova sezione in cima).

## 29/08/2026 — Registrazione unificata, countdown 90gg, motore questionario (task #158, #160, #151)

Tre compiti in un'unica sessione, dati da Mason con via libera esplicito a
procedere su tutto. Sandbox Linux (`mcp__workspace__bash`) raggiungibile
stavolta (progetto montato in `/sessions/.../mnt/beautyx-app`, Node 22) — ho
potuto fare `node --check` reale su ogni file `.js` non-JSX toccato/creato.
Sui file con JSX (`ReportCountdownBanner.js`, `app/newsletter/page.js`),
`node --check` non li valida (stesso limite già noto, es. `GuidaGate.js`
2026-08-20) — verificato con lettura manuale + conteggio bilanciamento
parentesi/graffe/quadre (`python3`, conteggi aperture=chiusure su tutto il
file), niente rendering reale in browser disponibile nel sandbox.

### 1. Endpoint di registrazione unificata (task #158) — RISCOPE rispetto al piano di ieri

Mason (28/08 sera, ribadito 29/08) ha chiuso la questione: NON più iscrizioni
separate per newsletter/miniguida/report — un'unica azione di registrazione
attiva tutto. Verificato sul codice reale (non per assunzione) che quell'unica
azione è `app/api/onboarding/create-centro/route.js`, chiamata da
`app/impostazioni/page.js` (`handleCreaCentro`, tab "Il mio centro",
evidenziato per chi ha `primoAccesso && !centroId`) — il vero step di
completamento della registrazione dopo signup+login, non un endpoint
anonimo.

**Refactor preliminare (DRY):** ho estratto `ensureGuidaAccessToken` e la
chiamata Beehiiv da `app/api/newsletter/subscribe/route.js` in un modulo
condiviso nuovo `lib/newsletter/beehiiv.js` (`subscribeToBeehiiv`,
`ensureGuidaAccessToken`, `GUIDA_ALLOWED_STATUSES`) — stessa logica esatta di
prima (double opt-in, `reactivate_existing`, ecc.), zero comportamento
cambiato su `/api/newsletter/subscribe` (verificato leggendo il diff riga per
riga). Necessario per non duplicare la logica di sicurezza del gate
"guida solo se stato Beehiiv già active" in due file.

**Modifica a `create-centro/route.js`:** dopo la creazione del centro (invariata,
righe originali intatte), tre azioni **best-effort, ciascuna in try/catch
indipendente**, che non possono mai far fallire la risposta 201 già garantita:
- (a)+(b) iscrizione Beehiiv + token miniguida, stessa funzione condivisa,
  email presa da `user.email` della sessione autenticata (mai dal body — non
  spoofabile).
- (c) upsert (mai insert cieco, coerente con la regola generale del progetto)
  su `user_subscriptions` con `plan_id` del piano `report_profiling` (letto
  da `subscription_plans.codice`), `stato:'attivo'`, `assegnato_da_admin:false`.
  Se l'utente ha già un piano assegnato a mano da un admin
  (`assegnato_da_admin:true`), NON lo sovrascrive — logga e basta.
- Risposta arricchita con `registrazioneUnificata: { newsletter, guidaToken,
  reportProfiling }` (booleani), utile per un futuro feedback UI in
  `impostazioni/page.js` (non implementato oggi, fuori scope).

**Nessuna gating sulla finestra dei 90 giorni al momento dell'assegnazione**:
il piano viene assegnato SEMPRE (siamo pre-lancio, chiunque si registra oggi
rientra per costruzione nei 90 giorni gratuiti). L'eventuale controllo "sei
ancora entro i 90 giorni" andrà nella logica di accesso/consumo del piano
quando si deciderà la data di lancio (vedi countdown sotto), non qui.

**`app/report/page.js` — nessuna modifica necessaria**: il suo CTA già punta a
`/signup` (che porta a `create-centro` come step successivo), quindi punta già
alla stessa identica azione unificata — non esisteva un "percorso a parte" da
disattivare.

**Conflitto trovato e segnalato, non deciso da solo:** `memory/alessia.md`
(voce 29/08/2026, "STRUTTURA FUNNEL") descrive `/newsletter` come **unico
form, solo email**, che dovrebbe attivare report+miniguida+newsletter in un
solo campo. Tecnicamente questo non torna: il piano `report_profiling`
richiede un account reale (`user_subscriptions`/`profiling_sessions` hanno
`user_id`/`centro_id` NOT NULL by design, e lo stesso Mason il 28/08 ha
chiarito che l'acquisto/assegnazione avviene sempre da un utente già
loggato) — un'email da sola non può bastare. Ho implementato l'interpretazione
tecnicamente coerente (l'azione unificata vera è `create-centro`, a valle di
signup completo), e segnalo qui esplicitamente la voce di Alessia come punto
da chiarire con Mason/Coordinatore prima di comunicare al pubblico "un solo
campo email ti dà tutto" — se il messaggio marketing promette questo, va
allineata la UX reale (es. raccogliere anche una password nel form, o
chiarire che il report richiede un passaggio di registrazione in più).

### 2. Countdown 90gg su `/newsletter` (task #160)

**Componente nuovo:** `components/common/ReportCountdownBanner.js` — client
component, calcola i giorni rimanenti leggendo `NEXT_PUBLIC_REPORT_LAUNCH_DATE`
(env var, formato `YYYY-MM-DD`, **non ancora impostata su Vercel** — deliberato).
Se la env var manca o non è una data valida: il componente non renderizza
nulla (nessun countdown finto/rotto), solo un `console.warn` se il formato è
invalido. Se il countdown è scaduto (>90gg dal lancio): idem, si nasconde.
Copy placeholder ragionevole ("Offerta assolutamente irripetibile: il report
CARE è gratis ancora per N giorni — poi 60€, sempre credito pieno
sull'abbonamento") — come da convenzione già in uso (`GuidaGate.js`,
`app/report/page.js`), non è compito mio scrivere il copy finale: da passare
a Federica/Elena.

**Integrato in `app/newsletter/page.js`**: renderizzato subito sopra il badge
eyebrow esistente nell'hero (il punto più visibile della pagina, come
richiesto — "visibile e immediato"). Nessun'altra modifica alla pagina: la
riscrittura copy completa (badge/H1/CTA per il framing report+bundle) è
lavoro di Alessia/Federica (task #161, già segnato completato per la parte
di scrittura — non ancora implementato in codice da me, fuori dallo scope
esplicito di oggi che era solo il countdown).

**Segnalazione esplicita richiesta da Mason:** la data di lancio (env var
`NEXT_PUBLIC_REPORT_LAUNCH_DATE`) **non va fissata oggi**. Il momento giusto
è quando il motore del questionario (punto 3 sotto) sarà pronto E collaudato
end-to-end — oggi il motore è scritto ma non testabile in produzione (vedi
scoperta infrastrutturale sotto). Segnalo io stesso quando sarà il momento,
come richiesto.

### 3. Motore del questionario di profiling (task #151) — avviato sul serio, non solo pianificato

Seguito il piano già scritto in `piano-sviluppo-report-care.md` sezione 3.

**Contenuto sorgente trascritto integralmente** (verificato 1:1 contro
`banco-domande-profiling.md`, versione finale approvata da Elena il
25/08/2026): `lib/beautyx/profilingScenarioBank.js` — tutti e 36 gli scenari
(C1-C12, P1-P12, S1-S12), ciascuno con le 5 opzioni testo+elemento, più le 3
narrazioni libere (domanda di apertura + 3 domande di controllo fisse per
ambito). Verificato via script Node che ogni scenario ha esattamente i 5
elementi (fuoco/acqua/aria/terra/metallo, uno ciascuno, zero duplicati/mancanti)
e che la distribuzione per ambito è 12/12/12.

**Motore vero e proprio:** `lib/beautyx/profilingEngine.js` — le 5 funzioni
richieste, tutte operanti su `profiling_sessions` come unica fonte di stato
(mai sullo storico messaggi chat, come da principio del piano):
- `getProssimoScenario` — state machine: nucleo (6) sempre prima, poi decide
  se serve il banco di riserva leggendo i punteggi già salvati per l'ambito
  (soglia di ambiguità `SOGLIA_AMBIGUITA=3`, costante di modulo, esplicitamente
  segnalata come placeholder da tarare con dati reali — stessa cautela già
  richiesta nel piano per la soglia di significatività), poi narrazione
  libera, poi passa all'ambito successivo, poi segnala "completato".
- `salvaRispostaScenario` — **ricalcola sempre i punteggi server-side**
  (mai fidarsi del client), valida che l'ordinamento contenga esattamente i 5
  elementi validi senza ripetizioni, upsert idempotente su
  `(session_id, scenario_code)`.
- `salvaNarrazioneLibera` — upsert su `(session_id, ambito)`, aggiorna
  `narrazioni_completate`. `analisi_ai` resta `NULL` — task #152, non
  ancora costruito, commentato esplicitamente come TODO.
- `verificaProfiloDefinito` — sola lettura, nessuna mutazione di stato
  (la decisione reale vive dentro `getProssimoScenario`, deterministica lato
  server — questo tool è per dare un aggiornamento conversazionale, non per
  guidare la state machine, scelta deliberata per non fidarsi della
  discrezione del modello sull'avanzamento).
- `generaReportProfiling` — verifica `fase==='completato'`, crea il record
  `profiling_reports` con `stato:'bozza'`. **L'assemblaggio vero (selezione
  blocchi da `contenuti-report-5-elementi.md` in base a eccesso/carenza/leva)
  è task #152/#153, non ancora costruito** — commentato esplicitamente, non
  nascosto.

**Tool-gating in `app/api/beautyx/chat/route.js`:** aggiunto array
`PROFILING_TOOLS` (i 5 tool + `update_memory`) e
`executeProfilingToolsInParallel` (instrada verso `profilingEngine.js`,
separato per intero da `executeToolsInParallel`/`dataHub.js` gestionale).
Nel handler `POST`: il piano attivo si legge dalla stessa chiamata già
esistente a `check_ai_limit` (`limitCheck.piano`), **non da un flag passato
dal client** — se `piano === 'report_profiling'`, si usa `PROFILING_TOOLS` +
prompt `beautyx_profiling` invece di `BEAUTYX_TOOLS` + prompt `beautyx`;
altrimenti (piano nullo/non riconosciuto/gestionale) resta il comportamento
esistente **invariato al 100%** — default-deny sui tool profiling, come
richiesto. Il gating è sempre per ASSENZA dall'array passato ad Anthropic,
mai per istruzione a prompt. In modalità profiling si saltano anche i fetch
dati gestionali (`fetchMetaData`, crediti scaduti, Koibox) — non servono e
non devono essere raggiungibili da quella modalità.

**Prompt dedicato:** `PROFILING_FALLBACK_PROMPT` hardcoded nel route (stesso
pattern di `BEAUTYX_FALLBACK_PROMPT`) + nuovo file migration
`supabase/migrations/ESEGUI_agent_prompts_02_beautyx_profiling.sql` (stessa
convenzione `ESEGUI_*` già in uso per prompt editabili da console — non
applicato, vedi sotto).

### ⚠️ Scoperta infrastrutturale importante (non decisa da solo — segnalata)

Query dirette (`list_tables`/`execute_sql`/`list_migrations`) sul progetto
Supabase di produzione **scfumedmisbuxhdywwpb** (unico ACTIVE_HEALTHY dei 3
progetti): **solo 19 tabelle esistono in tutto**, e NESSUNA delle seguenti,
tutte assunte "già esistenti" da molte voci precedenti di questa stessa
memoria, è realmente presente in produzione oggi: `subscription_plans`,
`user_subscriptions`, `user_purchases`, `agent_prompts`, `registro_giornate`/
`registro_pagamenti`/`registro_spese`/`registro_crediti`, `beautyx_memory`,
`beautyx_insights`, tabelle `hpa_*`, `centro_servizi`/`pacchetti`. `user_profiles`
e `beauty_centers` esistono ma hanno **0 righe** — zero utenti/centri reali
oggi, coerente con "prodotto non ancora lanciato pubblicamente ad ads reali".

Causa: molte migration nel repo (`20260211_subscription_system.sql`, i vari
`ESEGUI_*.sql` incluso `ESEGUI_agent_prompts_01.sql`) sono file scritti ma MAI
eseguiti sul DB reale — stessa identica situazione già documentata per la mia
migration `20260828_profiling_report_care.sql` ("NON applicata, solo file"),
solo che qui riguarda l'infrastruttura di base (piani/abbonamenti/prompt),
non solo il profiling. `ESEGUI_agent_prompts_01.sql` dichiara esplicitamente
in testa "Eseguire nel Supabase Dashboard SQL Editor" — conferma che è un
processo a gate umano deliberato (Mason applica queste migration a mano,
quando decide), non un errore mio da correggere silenziosamente.

**Conseguenza pratica per il lavoro di oggi:** il codice che ho scritto (punti
1 e 3 sopra) è corretto e degrada in sicurezza quando queste tabelle
mancano (try/catch ovunque, default-deny, fallback su prompt hardcoded) — ma
**non è testabile end-to-end in produzione oggi**, e più in generale il
tool-gating profiling non potrà MAI attivarsi realmente finché
`subscription_plans`/`user_subscriptions`/`check_ai_limit` non esistono
davvero. **Non ho applicato nessuna migration** (né la mia, né quelle
preesistenti) — è una decisione più grande dei 3 compiti di oggi e riguarda
sistemi/feature descritte altrove come già funzionanti: segnalo al
Coordinatore/Mason invece di agire da solo. Se si decide di procedere,
l'ordine corretto è: `20260211_subscription_system.sql` →
`ESEGUI_agent_prompts_01.sql` → `20260828_profiling_report_care.sql` →
`ESEGUI_agent_prompts_02_beautyx_profiling.sql`.

**Verifica fatta oggi:** `node --check` reale (sandbox raggiungibile) su tutti
i file `.js` non-JSX nuovi/modificati (`lib/newsletter/beehiiv.js`,
`app/api/newsletter/subscribe/route.js`, `app/api/onboarding/create-centro/route.js`,
`lib/beautyx/profilingScenarioBank.js`, `lib/beautyx/profilingEngine.js`,
`app/api/beautyx/chat/route.js`) → tutti OK. Verifica manuale (lettura +
bilanciamento parentesi) sui 2 file JSX toccati (`components/common/
ReportCountdownBanner.js` nuovo, `app/newsletter/page.js` modificato).
Script Node di validazione sul banco scenari (36 scenari, 5 elementi unici
ciascuno, 12/12/12 per ambito) → OK. **Non testato end-to-end con
Anthropic/DB reale** — bloccato dalla scoperta infrastrutturale sopra, non
per mancanza di tempo.

**File creati:** `lib/newsletter/beehiiv.js`, `components/common/
ReportCountdownBanner.js`, `lib/beautyx/profilingScenarioBank.js`,
`lib/beautyx/profilingEngine.js`, `supabase/migrations/
ESEGUI_agent_prompts_02_beautyx_profiling.sql`.
**File modificati:** `app/api/newsletter/subscribe/route.js` (refactor su lib
condivisa, comportamento invariato), `app/api/onboarding/create-centro/route.js`
(azioni unificate), `app/newsletter/page.js` (countdown), `app/api/beautyx/
chat/route.js` (tool-gating profiling), `supabase/migrations/
20260828_profiling_report_care.sql` (nota su dipendenze mancanti).

**Resta aperto per la prossima ripresa:** task #152 (scoring engine completo
con ciclo eccesso/carenza/leva a 5 elementi — oggi solo un'euristica di
ambiguità locale per ambito, non il meccanismo finale; analisi AI testo
libero, non iniziata) e #153 (assemblaggio report da `contenuti-report-5-
elementi.md`, porting UI quiz da `design/concept-quiz-profiling.html` a
componente Next.js). Nessuno dei due è bloccato dalla scoperta
infrastrutturale per essere SCRITTO (sono funzioni pure / porting UI), solo
per essere testato end-to-end.

## 29/08/2026 (sera) — Applicate le 4 migration mancanti su produzione (via libera esplicito di Mason)

Seguito diretto della "Scoperta infrastrutturale" di poco fa. Mason: "certo che
dobbiamo rendere operativa la registrazione per cui procedi con le tabelle" —
via libera esplicito ad applicare le migration sul DB di produzione
`scfumedmisbuxhdywwpb` (confermato via `list_projects` l'unico ACTIVE_HEALTHY).

**Riconferma da zero prima di agire (non fidato solo della memoria):**
`list_tables`/`list_migrations` diretti sul progetto reale hanno confermato lo
stato già scritto sopra — 20 tabelle in `public` (non 19, la differenza è
`guida_access` non contata la volta scorsa), 7 migration tracciate da Supabase,
nessuna delle tabelle attese presente, `user_profiles`/`beauty_centers` a 0
righe. `ls supabase/migrations/` nel repo mostra però **oltre 120 file SQL**,
la maggior parte senza data (`ESEGUI_*`, `add-*`, `fix-*`, `RICREA-*`, ecc.) —
un impianto molto più vasto di quanto lasciasse intuire la sola lettura della
memoria.

**Scelta di scope, dichiarata esplicitamente:** ho applicato SOLO la catena di
4 file già identificata e vettata ("ordine corretto" scritto sopra), che copre
esattamente ciò che Mason ha chiesto (rendere operativa la registrazione) e
ciò che il compito indicava con priorità (`subscription_plans`/
`user_subscriptions`/`agent_prompts`/profiling). NON ho toccato i restanti
~115 file SQL nella cartella (registro_giornata, koibox, hpa_*, centro_listino,
email_integrations, marketing_leads, listino_ufficiale, ratings, ecc.): sono
un sistema molto più ampio (l'intero gestionale operativo, non la
registrazione), senza un ordine cronologico dichiarato tra loro, con nomi che
suggeriscono revisioni/fix successivi sovrapposti (es. più `ESEGUI_koibox_0N_*`,
più `ESEGUI_listino_ufficiale_0N`, `FIX-*` su `RICREA-*` su `SETUP-COMPLETO-*`
per gli accantonamenti) — applicarli alla cieca in produzione senza una
verifica riga-per-riga di ciascuno e delle dipendenze reali tra loro sarebbe
stato esattamente il tipo di forzatura che il compito chiedeva di evitare.
Segnalo qui che quel lavoro resta da fare come iniziativa **separata e
dedicata** (probabilmente serve prima un audit di quali file sono realmente
vigenti vs superseduti), non decido da solo di estendere lo scope di stasera.

**Le 4 migration applicate, in ordine, ciascuna verificata via query dirette
prima di passare alla successiva:**
1. `20260211_subscription_system.sql` → create `subscription_plans` (5 piani:
   free/demo/base/pro/advanced), `user_subscriptions`, `addon_packages`,
   `discount_campaigns`, `user_purchases`, `ai_usage_log` + funzioni
   `get_user_subscription`/`track_ai_usage`/`check_ai_limit`/
   `reset_monthly_counters`/`get_admin_subscription_overview` + RLS.
   Verificato: `SELECT codice FROM subscription_plans` → 5 righe.
2. `ESEGUI_agent_prompts_01.sql` → create `agent_prompts` + seed 4 prompt
   (`beautyx`, `receptionist`, `analista`, `marketing`), tutti `is_active=true`.
   Verificato: 4 righe presenti.
3. `20260828_profiling_report_care.sql` → create `profiling_sessions`,
   `profiling_scenario_responses`, `profiling_narrative_responses`,
   `profiling_element_scores`, `profiling_reports` (tutte con RLS, policy
   derivate da `user_profiles.centro_id`, mai da input client) + insert piano
   `report_profiling` in `subscription_plans` + drop/recreate del CHECK
   `user_purchases_tipo_check` per includere `'report_profiling'`. Verificato:
   piano presente, constraint aggiornato (`pg_get_constraintdef` conferma i 4
   valori ammessi).
4. `ESEGUI_agent_prompts_02_beautyx_profiling.sql` → insert riga
   `beautyx_profiling` in `agent_prompts`. Verificato: 5 righe totali in
   `agent_prompts`.

**Stato finale del DB (confermato con `list_tables` dopo l'ultima
migration):** 30 tabelle in `public` (le 20 precedenti + le 10 nuove:
`subscription_plans`, `user_subscriptions`, `addon_packages`,
`discount_campaigns`, `user_purchases`, `ai_usage_log`, `agent_prompts`,
`profiling_sessions`, `profiling_scenario_responses`,
`profiling_narrative_responses`, `profiling_element_scores`,
`profiling_reports` — 12 in realtà, il conteggio esatto è nel risultato
`list_tables` di questa sessione). Tutte con RLS abilitata.

**`get_advisors` (security + performance) dopo le migration:** nessun
finding di livello ERROR. I finding WARN/INFO sulle tabelle nuove
(`function_search_path_mutable` sulle funzioni SQL nuove,
`auth_rls_initplan` sulle policy nuove che usano `auth.uid()`/`auth.role()`
non wrappati in `(select ...)`, `unindexed_foreign_keys` su alcune FK nuove
come `profiling_sessions_purchase_id_fkey`) sono dello STESSO tipo e
severità dei finding già presenti su tabelle preesistenti (es. stesso
pattern su `beauty_centers`, `daily_entries`) — non regressioni introdotte
stasera, coerenti con lo stile già in uso nel progetto. Non li ho corretti
perché fuori scope del compito di stasera (applicare le migration) e perché
toccare le policy RLS di produzione senza un giro dedicato di test sarebbe
un rischio ulteriore non richiesto; li segnalo come possibile pulizia
futura, priorità bassa (INFO/WARN, non ERROR, mai su tabelle con dati reali
oggi).

**Verifica end-to-end della registrazione:** confermato via grep che
`app/api/onboarding/create-centro/route.js` (righe ~123-158) legge
esattamente `subscription_plans` (piano `report_profiling`) e scrive su
`user_subscriptions` in upsert — le stesse tabelle appena create. Il flusso
di registrazione unificata (signup → create-centro → iscrizione Beehiiv +
token guida + assegnazione piano report_profiling) è quindi ORA
concretamente testabile end-to-end in produzione, non più bloccato da
tabelle mancanti. Non ho eseguito io stesso un test end-to-end con un
utente reale (nessuna creazione di account in questa sessione, fuori scope
di "applicare le migration") — segnalo che il primo utente reale che
completa la registrazione sarà il vero collaudo.

**Cosa NON è ancora testabile anche dopo questa migration (limite noto, non
nuovo):** la modalità profiling della chat resta scritta ma senza motore di
scoring finale (task #152) e senza UI quiz (task #153) — le tabelle ora
esistono ma il percorso completo titolare→quiz→report richiede ancora quei
due pezzi. Il countdown 90gg (`NEXT_PUBLIC_REPORT_LAUNCH_DATE`) resta
deliberatamente non impostato su Vercel, come da nota precedente.

**File toccati:** nessun file di codice, solo esecuzione delle 4 migration
già presenti nel repo (`supabase/migrations/20260211_subscription_system.sql`,
`ESEGUI_agent_prompts_01.sql`, `20260828_profiling_report_care.sql`,
`ESEGUI_agent_prompts_02_beautyx_profiling.sql`) contro il database Supabase
di produzione via MCP `apply_migration`. Nessuna modifica ai file stessi.

## 30/08/2026 (notte, ripresa non presidiata) — Scoring engine, analisi testo libero, assemblaggio report, porting quiz, Meta Pixel, error monitoring

Ripresa automatica senza Mason. Completati i task #152/#162 (scoring +
analisi testo) e #153/#163 (assemblaggio + UI quiz), più #164 (Meta Pixel/CAPI
predisposti) e #42/#165 (error monitoring minimo). Tutto committato in locale,
**NON pushato** (push a Mason, vedi sotto).

### (a) Scoring engine + analisi testo libero (task #152/#162)
- **`individuaBlocco` derivato dai DUE CICLI come fonte unica di verità** in
  `lib/beautyx/profilingEngine.js`. Aggiunti `CICLO_CONTROLLO =
  [fuoco,acqua,aria,terra,metallo]` e `CICLO_GENERATIVO =
  [fuoco,aria,metallo,acqua,terra]`; `controllore(E)` = successivo nel ciclo di
  controllo, `nutritore(X)` = predecessore nel ciclo generativo, `leva =
  nutritore(controllore(eccesso))`. NIENTE tabelle scritte a mano due volte (il
  piano, punto 5, avvisava del rischio di disallineamento). Verificato via
  script Node che le 5 coppie coincidono ESATTAMENTE con la tabella fissa di
  `memory/federica.md`/`beautyx-report-profiling-note.md`: Fuoco→carenza Acqua→leva
  Metallo, Acqua→Aria→Fuoco, Aria→Terra→Acqua, Terra→Metallo→Aria,
  Metallo→Fuoco→Terra. Tutte OK.
- **`calcolaPunteggiFinali(session_id)`**: aggregazione server-side (mai dal
  client) dei punteggi da `profiling_scenario_responses` (globali + breakdown
  per ambito), individua il blocco, decide `tipo_blocco` (trasversale se il
  dominante guida tutti e 3 gli ambiti, altrimenti localizzato), upsert su
  `profiling_element_scores`. La variante `carenza_non_nutrita` esiste nei
  contenuti ma **NON è auto-selezionata in questa v1** (Parte 1 apertura è
  scritta solo per un dominante "forte"; usare il testo "carenza" contraddirebbe
  un dominante alto). Serve una decisione Federica/Mason sul peso testo-libero vs
  scelta-forzata prima di attivarla — lasciato aperto e documentato.
- **Soglia `SOGLIA_SIGNIFICATIVITA = 2`** (placeholder configurabile, non
  hardcoded nella logica, da tarare con dati reali) — stessa cautela già usata
  per `SOGLIA_AMBIGUITA`.
- **Analisi testo libero via chiamata AI ISOLATA**: nuovo client
  `anthropicProfiling` dentro `profilingEngine.js` (separato dal loop tool della
  chat gestionale, coerente col tool-gating profiling). `analizzaNarrazioneLibera`
  fa una singola `messages.create` (sonnet, max_tokens 300) che ritorna SOLO JSON
  `{elemento_coerente, note_giustificazione, sintesi_breve}`, con estrazione
  difensiva del JSON. Collegata a `salvaNarrazioneLibera` in **best-effort**
  (try/catch, non blocca il salvataggio; se manca `ANTHROPIC_API_KEY` → null).

### (b) Assemblaggio report + porting UI quiz (task #153/#163)
- **Trascrizione contenuti one-shot, non parsing a runtime** (piano, punto 7):
  `scripts/gen-report-content.mjs` estrae SOLO i blocchi "TESTO PER LA TITOLARE"
  da `contenuti-report-5-elementi.md` e genera `lib/beautyx/reportContent.js`
  (`export const REPORT_CONTENT`). Il .md resta la fonte editoriale per il gate
  riga-per-riga di Elena; il codice non diverge dal testo approvato. Rigenerabile
  con `node scripts/gen-report-content.mjs`. Verificato: 0 nomi-elemento nel
  testo per la titolare (solo "CARE" nella CTA), tutti i 15 blocchi ritratto +
  aperture + applicazioni + frasi + CTA presenti.
- **`lib/beautyx/reportAssembler.js`** (`assemblaReport(scores)`): selezione
  deterministica dei blocchi in base a dominante + tipo_blocco, produce
  `contenuto_json` (5 Parti + meta interna) e `contenuto_html` (fragment
  auto-stilato palette Beautyx). La clausola `[SE DIFFERENZA AMBITO]` di Parte 1
  si attiva quando il dominante NON guida tutti e 3 gli ambiti (coerente con la
  Variante 2 localizzata). La meta interna (elementi/punteggi) NON è mai resa in
  HTML.
- **`generaReportProfiling` reso reale**: non più placeholder "bozza". Ora
  calcola i punteggi, assembla, fa upsert su `profiling_reports`
  (`contenuto_json`+`contenuto_html`, `stato='generato'`, `generato_il`).
  Idempotente (se già 'generato' lo restituisce). La verifica dello scoring resta
  server-side.
- **Porting UI quiz**: `components/profiling/QuizScenario.js` (client component,
  App Router) — trascrizione 1:1 del concept `design/concept-quiz-profiling.html`
  (task #139), CSS scoped `.qz-*`, font via `var(--font-playfair/-inter)`,
  tap-in-sequenza 1-5 con ri-tap e reset, 5ª tessera wide. NON mostra mai il tag
  elemento: alla conferma costruisce `ordinamento` posizione→elemento e lo passa
  a `onConfirm`, che lo invia a `salva_risposta_scenario` (ricalcolo server-side).
  Integrazione dentro la chat esistente NON ancora fatta (era fuori scope,
  componente puro come da piano punto 8).

### (c) Meta Pixel / Conversions API (task #164) — predisposti ma SPENTI
- `components/common/MetaPixel.js` (montato gated in `app/layout.js`, stesso
  pattern di Plausible) + `lib/marketing/metaConversions.js`. Entrambi **no-op**
  se manca `NEXT_PUBLIC_META_PIXEL_ID` / `META_CONVERSIONS_TOKEN` — nessun ID
  hardcodato. ⚠️ Nota GDPR annotata nel codice: il pixel usa cookie di
  PROFILAZIONE; oggi il sito ha solo cookie tecnici + CookieNotice informativo —
  **prima di impostare l'ID in prod va trasformato il banner in vero consenso
  opt-in**. Lasciato il gancio, non attivato.

### (d) Error monitoring minimo (task #42/#165)
- Scelta motivata: **niente Sentry** (dipendenza non installabile/verificabile
  con build reale nel sandbox; in run non presidiata è un rischio). Fatto:
  `lib/monitoring/reportError.js` (gated su `NEXT_PUBLIC_ERROR_WEBHOOK_URL`, solo
  console.error finché non configurato, nessuna dipendenza) + `app/global-error.js`
  (error boundary root con fallback in voce Beautyx che inoltra al reporter).
  Migrare a Sentry in futuro = cambiare solo il corpo di `reportError`, non i
  chiamanti.

### Verifiche fatte
- `node --check` OK su tutti i file JS non-JSX nuovi/toccati (profilingEngine,
  reportAssembler, reportContent, metaConversions, reportError, gen-script).
- Test Node funzioni pure: 5/5 coppie eccesso→carenza→leva corrette; 15/15
  combinazioni contenuti (5 elementi × 3 varianti) presenti e senza leak di
  nomi-elemento; assemblaggio produce le 5 Parti + HTML con "CARE" e senza nomi
  elemento.
- File JSX (QuizScenario, MetaPixel, global-error, layout): build Next completa
  NON gira nel sandbox → validati con `node --check` dove possibile + controllo
  strutturale di bilanciamento delimitatori (tutti bilanciati) + revisione
  manuale. **La build reale la fa il deploy di Mason.**

### File creati
`scripts/gen-report-content.mjs`, `lib/beautyx/reportContent.js` (generato),
`lib/beautyx/reportAssembler.js`, `components/profiling/QuizScenario.js`,
`components/common/MetaPixel.js`, `lib/marketing/metaConversions.js`,
`lib/monitoring/reportError.js`, `app/global-error.js`.
### File modificati
`lib/beautyx/profilingEngine.js` (scoring engine + analisi testo + assemblaggio
reale), `app/layout.js` (montaggio MetaPixel gated).

### Stato commit / cosa resta aperto
- **Committato in locale, NON pushato** (`push.bat` non eseguito, come da
  istruzione: deploy live non supervisionato non ci compete stanotte). Il push
  lo fa Mason.
- **Per Riccardo (audit indipendente, task #154):** riverificare che lo scoring
  resti davvero server-side end-to-end — in particolare che `salva_risposta_scenario`
  ricalcoli sempre i punteggi (già così) e che `calcolaPunteggiFinali` non si
  fidi mai di valori client; controllare le RLS su `profiling_element_scores`/
  `profiling_reports` (SELECT solo del centro proprietario, scrittura service-key)
  e che il tool-gating profiling non esponga i tool gestionali.
- **Aperto:** attivazione `carenza_non_nutrita` (serve decisione peso
  testo-libero vs scelta-forzata, Federica/Mason); integrazione del componente
  `QuizScenario` dentro la chat; taratura soglie (`SOGLIA_SIGNIFICATIVITA`,
  `SOGLIA_AMBIGUITA`) con dati reali; `NEXT_PUBLIC_REPORT_LAUNCH_DATE` resta
  deliberatamente NON impostato.

## 03/09/2026 — Collegamento end-to-end del questionario CURA (quiz → scoring → report)

Su richiesta diretta di Mason ("procedi subito, esecuzione tecnica in un
perimetro già deciso"): tutti i pezzi del report CURA esistevano ma erano
scollegati (QuizScenario.js orfano, motore di scoring raggiungibile solo dai
tool della chat, report chiuso nel DB, nessun percorso post-signup). Ora sono
collegati.

**Percorso URL scelto: `/questionario` (quiz) + `/questionario/risultato`
(report).** Motivazione: NON `/report/*` come sembrava naturale (coerente col
naming del prodotto) — scartato perché `proxy.js` ha `/report` nella sua
`publicRoutes` con match `startsWith`, quindi qualunque sotto-path
`/report/...` sarebbe stato accessibile SENZA login, bypassando
`verifyCentroOwnership` a livello di pagina (le API restano comunque protette,
ma la UI si sarebbe aperta ad anonimi). `/questionario` non è in nessuna
publicRoutes: resta protetto dal login-redirect standard di `proxy.js`.

**Come si collega:**
1. **Nuovo endpoint deterministico `app/api/beautyx/profiling/route.js`**
   (azioni `next`/`answer`/`generate`/`report`) che chiama DIRETTAMENTE
   `getProssimoScenario`/`salvaRispostaScenario`/`generaReportProfiling` da
   `lib/beautyx/profilingEngine.js` — NIENTE chiamata Anthropic per la parte a
   scelta forzata (è già deterministica al 100%, passare da un LLM solo per
   "impacchettare" testo sarebbe più lento/costoso/rischioso). Stesso identico
   pattern di sicurezza di `/api/beautyx/chat`: `verifyCentroOwnership` prima
   di tutto, `user_id` sempre dalla sessione (mai dal body), e lo stesso gate
   `check_ai_limit`→`piano==='report_profiling'` replicato qui (obbligatorio:
   bypassando la chat, questo diventa l'unico punto che decide l'accesso).
   L'azione `report` fa eccezione al gate piano (un report già generato resta
   leggibile anche se il piano cambia dopo).
2. **`app/questionario/page.js`** monta `QuizScenario.js` (invariato, era già
   pronto) per gli scenari a scelta forzata, chiamando l'endpoint sopra. Per la
   **narrazione libera** (che richiede davvero una conversazione con
   follow-up se la risposta è vaga) passa la mano a una mini-chat imbottita
   nella stessa pagina che parla con `/api/beautyx/chat` esistente (già gated
   su `isProfilingMode`); dopo ogni scambio ri-chiede `action:'next'` per
   sapere se lo stato è avanzato. Quando il questionario segnala
   `tipo:'completato'`, chiama `action:'generate'` (idempotente) e fa redirect
   a `/questionario/risultato`. Nessuna logica di resume dedicata: lo stato
   vive in `profiling_sessions`, riaprire `/questionario` in qualunque momento
   riprende da solo dal punto giusto.
3. **`app/questionario/risultato/page.js`** legge `profiling_reports` per il
   centro dell'utente via la stessa action `report` (ownership verificata,
   nessun nuovo meccanismo di auth) e renderizza `contenuto_html` con
   `dangerouslySetInnerHTML` — sicuro perché la stringa è già sanitizzata a
   monte in `reportAssembler.js` (`escapeHtml`, verificato da Riccardo), stesso
   pattern già in uso in `app/newsletter/page.js` e `app/layout.js`.
4. **Post-signup:** `app/impostazioni/page.js` (`handleCreaCentro`, dove
   avviene la creazione centro dopo il login/onboarding) ora reindirizza a
   `/questionario` invece che a `/` quando `registrazioneUnificata.reportProfiling`
   è true (fallback su `/` se per qualunque motivo l'assegnazione piano non
   fosse riuscita — è best-effort in `create-centro/route.js`, mai bloccante).
5. **Ritorno dopo la prima volta:** nuovo `components/dashboard/ReportCuraCard.js`,
   card sulla dashboard visibile solo se il piano attivo è `report_profiling`
   (fetch dedicato a `/api/subscriptions/balance`, non `useBeautyx().tokenUsage`
   perché quello si carica solo quando la chat viene aperta — troppo tardi per
   il primo render dashboard). Copre chi torna più tardi o ha lasciato il
   questionario a metà: il click porta sempre a `/questionario`, che da solo
   capisce dove riprendere.

**Scelta di design segnalata, non presa in silenzio:** ho valutato di rendere
`/questionario` a schermo intero (niente Navbar/BeautyxChatFooter, coerente
con la topbar "stile evento" già in `QuizScenario.js`) aggiungendolo alla
lista `publicRoutes` di `components/providers/ClientLayout.js` — SCARTATO: quel
blocco è il primissimo controllo della funzione e uscirebbe con
`return <>{children}</>` PRIMA del check "profilo bloccato" e PRIMA del muro
di accettazione documenti legali (`LegalAcceptanceWall`), più sotto nello
stesso file. Avrebbe quindi fatto passare al questionario anche un utente
bloccato dall'admin o con documenti legali pendenti — una regressione di
sicurezza, non solo estetica. Ho lasciato il Navbar/chat standard (doppione
visivo lieve con la topbar propria del quiz, accettabile) e commentato nel
file cosa andrebbe riordinato per fare l'immersione a schermo intero in
sicurezza in futuro, se Mason la vuole.

**File creati:** `app/api/beautyx/profiling/route.js`, `app/questionario/page.js`,
`app/questionario/risultato/page.js`, `components/dashboard/ReportCuraCard.js`.
**File modificati:** `app/dashboard/page.js` (monta `ReportCuraCard`),
`app/impostazioni/page.js` (redirect post-creazione centro),
`components/providers/ClientLayout.js` (solo commento esplicativo, nessun
cambio funzionale).

**Verifica:** `node --check` OK sulle parti non-JSX; per i file JSX (impossibili
da parsare con `node --check` puro, stesso limite già noto) ho usato
`node_modules/.bin/biome lint`/`check` (il progetto ha Biome installato in
`node_modules`, non lo sapevo disponibile finché non l'ho cercato — utile da
ricordare per le prossime sessioni JSX-heavy in sandbox) che PARSA il JSX
correttamente: zero errori di sintassi su tutti i file nuovi/toccati, solo
avvisi di stile (quote/punteggiatura, ordine import, key su indice array in
una lista chat append-only, `dangerouslySetInnerHTML` — quest'ultimo già un
pattern accettato altrove nel progetto). Nessuna build Next reale nel sandbox:
la build effettiva resta al deploy di Mason.

**Non testato end-to-end con un utente reale** (nessuna creazione
account/centro in questa sessione) — il primo utente che completa
signup→create-centro→questionario→report sarà il vero collaudo. Suggerisco a
Riccardo di ripetere l'audit di sicurezza (task #154) includendo il nuovo
endpoint `/api/beautyx/profiling` (stesso pattern verifyCentroOwnership +
gate piano, ma è codice nuovo).

**Committato in locale, NON pushato** (convenzione delle sessioni precedenti —
il push lo fa Mason da Windows).

## 03/09/2026 (notte) — Primo collaudo dal vivo di Mason: 8 bug reali sul funnel report — trovate e sistemate le cause reali

Mason ha fatto il primo test end-to-end reale (report → signup → questionario)
e ha trovato una serie di bug che rompevano il funnel quasi ovunque. Via
libera esplicito a procedere senza fermarmi a chiedere conferma. Investigato
a fondo PRIMA di applicare fix, incluso leggere i log Auth reali di Supabase
(query_logs, progetto `scfumedmisbuxhdywwpb`) per la finestra esatta del test
di Mason (03/09 22:50-22:55 UTC, referer `http://localhost:3000` — **il test
di Mason è stato fatto in locale, non su beautyx.it**, cosa che spiega alcune
apparenti incongruenze tra "sembrava pushato" e cosa gira davvero in prod).

### SCOPERTA CENTRALE, causa condivisa di più bug: lavoro di sessioni precedenti mai committato

`git status` all'inizio di questa sessione mostrava ~18 file modificati e 12
file nuovi MAI committati, nonostante i log di `memory/davide.md` delle
sessioni del 28-31/08 dicessero esplicitamente "committato in locale". `git
log -p -- proxy.js` confermava che l'ultimo commit reale su quel file
risaliva al 6 agosto (aggiunta `/guida`) — la riga che aggiunge `/report` a
`publicRoutes` (che i log attribuivano al 28/08) non era MAI stata
committata. Ipotesi più probabile: una sessione ha fatto le modifiche ma non
ha eseguito `git commit` (o l'ha eseguito su file sbagliati), e le sessioni
successive hanno continuato a scrivere codice sopra senza controllare lo
stato reale di git, fidandosi del log testuale. **Lezione per il futuro:
`git status`/`git diff --stat` a inizio sessione, non solo lettura di
memory/davide.md, prima di dare per scontato cosa sia già live.**
Recuperato con un commit dedicato (`f02e766`, vedi sopra la history di
questo file per il messaggio completo) tutto il lavoro buono trovato:
registrazione unificata (create-centro assegna piano report_profiling
gratis), refactor `lib/newsletter/beehiiv.js`, countdown 90gg su
/newsletter, modifiche sicurezza su `/api/beautyx/chat`.

### Bug 1 — `/report` reindirizza al login

**Causa reale confermata SIA da codice SIA dal vivo:** `/report` era già
scritto in `publicRoutes` di `proxy.js` nella working tree, ma quella riga
non era mai stata committata (vedi sopra) → in produzione `/report`
mancava da `publicRoutes` per davvero. Confermato con `curl -I
https://www.beautyx.it/report` PRIMA del fix: `307` → `location:
/login?redirect=%2Freport`. Verificato anche che non c'è nessun problema di
match path www/apex: `beautyx.it` fa `308` pulito verso `www.beautyx.it`
(config dominio Vercel corretta) e il matcher `pathname === route ||
pathname.startsWith(route + '/')` è host-agnostic (Next.js non include
l'host nel pathname del middleware) — su `/newsletter`, già presente in
prod, il match funziona bene con www. **Fix:** nessuna modifica di logica
necessaria, solo commit (vedi `f02e766` + il commit di questa sessione)
+ push di Mason.

### Bug 2 — Il form di signup perde il focus ad ogni carattere (IL PIÙ URGENTE)

**Causa reale, confermata leggendo il codice:** in `app/signup/page.js` il
componente `InputField` era definito con `const InputField = (...) => (...)`
DENTRO al corpo di `SignupPage()`. Ogni render di `SignupPage` (cioè ogni
`onChange` che chiama `setFormData`) ricreava una funzione/tipo React nuovo →
React smontava il vecchio nodo DOM `<input>` e ne montava uno nuovo → focus
perso, bisognava ricliccare col mouse dopo ogni lettera. Classico bug da
"componente definito dentro il render".
**Fix:** `InputField` spostato a livello di modulo (fuori da `SignupPage`),
identità stabile tra i render; riceve `formData`/`updateField` come prop
esplicite invece di chiuderli per closure (25 call site aggiornati con
`formData={formData} updateField={updateField}`). `inputClass`/`labelClass`
spostati anch'essi a livello di modulo (non dipendono da state).

### Bug 3 — Email di conferma Supabase in inglese, anonima, senza branding

**Non ho accesso diretto alla dashboard Supabase da questo ambiente** (nessun
tool MCP espone i Email Templates o l'Authentication → Email settings — solo
`execute_sql`/`query_logs`/gestione progetto, non i template GoTrue). Verificato che
questi NON sono righe in una tabella Postgres interrogabile: sono config
GoTrue, editabile solo da dashboard o Management API con token dedicato.
**Passo esplicito per Mason (serve accesso dashboard):**
1. Supabase Dashboard → progetto `beautyx` (`scfumedmisbuxhdywwpb`) →
   Authentication → Email Templates.
2. Il template "Confirm signup" (e idealmente anche "Reset password",
   "Magic Link" per coerenza futura) vanno riscritti in italiano, con
   mittente riconoscibile Beautyx. Il "From" di default è
   `noreply@mail.app.supabase.io` (confermato nei log: `mail_from:
   "noreply@mail.app.supabase.io"`) — per cambiarlo serve configurare SMTP
   custom (Authentication → Settings → SMTP Settings) con un mittente tipo
   `noreply@beautyx.it` (serve un provider SMTP transazionale, es. Resend/
   Postmark/SES — non l'email Google esistente).
3. Testo del template: contenuto libero da Federica/Elena per la voce, ma
   il link deve restare `{{ .ConfirmationURL }}` (Supabase lo sostituisce
   col link vero) — NON riscriverlo a mano.
4. Legato al bug 4 sotto: perché il link funzioni, l'URL Configuration
   (Authentication → URL Configuration → Redirect URLs) deve includere
   `https://www.beautyx.it/auth/callback` (produzione) e, se si continua a
   testare in locale, `http://localhost:3000/auth/callback` — altrimenti
   Supabase ignora silenziosamente il redirect richiesto dal codice e torna
   al Site URL di default.

### Bug 4 — Link di conferma email dà errore, non si riesce ad accedere

**Causa reale trovata leggendo il codice E confermata dai log Auth reali:**
nel progetto non esisteva NESSUNA route `/auth/callback` (o equivalente), e
`signUp()` in `contexts/AuthContext.js` non passava mai
`options.emailRedirectTo`. Il client browser (`createBrowserClient` di
`@supabase/ssr`, usato per compatibilità coi cookie letti dal middleware)
usa di default il flow **PKCE**: dopo che GoTrue verifica il token
dell'email, reindirizza con un parametro `?code=` da scambiare
esplicitamente via `exchangeCodeForSession` — senza una route che lo faccia,
il `code` restava inutilizzato nell'URL, nessuna sessione veniva creata.
Confermato nei log (`query_logs`, source `auth_logs`, finestra 22:53-22:54
UTC del 03/09): `GET /verify` → `200`/`303`, evento `user_signedup` — cioè
**Supabase segnala che il link email funziona correttamente dal suo lato**;
il problema era tutto lato nostra app (nessuna pagina sapeva cosa farci, col
`code` in arrivo). 17 secondi dopo infatti Mason è riuscito ad entrare
lo stesso ma con login manuale email+password (`POST /token` → `200`,
evento `Login`), non cliccando il link.
**Fix:**
1. Creata `app/auth/callback/route.js` — riceve il `code`, chiama
   `supabase.auth.exchangeCodeForSession(code)` con un client server-side
   (cookie HttpOnly, letti anche dal middleware), poi redirige a
   `/impostazioni?primo-accesso=1` (o a `?error=confirm_failed` su `/login`
   se lo scambio fallisce).
2. `proxy.js`: aggiunta `/auth` a `publicRoutes` — senza questo il
   middleware avrebbe rimandato a `/login` PRIMA che la route potesse
   scambiare il code (stesso identico bug in un altro punto).
3. `contexts/AuthContext.js`, `signUp()`: aggiunto
   `options.emailRedirectTo: ${window.location.origin}/auth/callback` così
   il link nell'email punta sempre alla nostra route, sia in locale sia in
   produzione.
4. `app/login/page.js`: aggiunto il caso `error=confirm_failed` (messaggio
   esplicito invece di errore generico) e — bug collaterale trovato
   controllando questo flusso — aggiunto anche il caso `message=check_email`
   che PRIMA non veniva letto affatto: dopo la registrazione l'utente
   arrivava su un login vuoto senza nessuna indicazione di dover controllare
   la posta.
**Resta da fare (serve dashboard Supabase, non disponibile da qui):**
verificare/aggiungere `https://www.beautyx.it/auth/callback` (e
`http://localhost:3000/auth/callback` per i test) in Authentication → URL
Configuration → Redirect URLs — se non è nella allow-list Supabase ignora
`emailRedirectTo` e il fix di codice da solo non basta.

### Bug 5 — Dopo il login da /report, la pagina chiede di nuovo la registrazione

**Causa reale trovata:** NON è un bug di sessione non riconosciuta in senso
stretto. `app/dashboard/page.js` (riga 44-49) reindirizza SEMPRE un utente
loggato senza `centro_id` a `/impostazioni?primo-accesso=1` — ma
`/impostazioni` con quel parametro è a tutti gli effetti un ALTRO modulo di
registrazione (tab "Il mio centro": nome centro, indirizzo, P.IVA...),
distinto dal form di `/signup` appena completato (dati anagrafici personali).
Chi si registra su `/signup` NON ha ancora "un centro" nel modello dati: è
un secondo step per design, non un bug del redirect — ma agli occhi di chi
lo prova sembra letteralmente "un'altra registrazione", perché non c'è nessun
messaggio che spieghi "stai completando lo step 2, non stai ricominciando".
**Non ho riscritto il flusso** (è una decisione di prodotto/UX, non un bug
tecnico isolato) — segnalo esplicitamente a Mason/Federica: o si fonde
`/signup` + creazione centro in un unico flusso, o almeno si etichetta
chiaramente "Ultimo passo: il tuo centro" invece di presentarlo come pagina
impostazioni generica. **Ho però trovato e sistemato un secondo problema
concreto sulla STESSA pagina** — vedi bug 7, sono collegati.

### Bug 6 — Checkbox privacy/termini senza link cliccabili

**Trovato:** in `app/signup/page.js`, quando l'endpoint `/api/user/legal-public`
non restituisce documenti (`legalDocs.length === 0`, es. se la tabella è
vuota o l'endpoint fallisce), la checkbox finale diceva "Accetto i termini e
condizioni e la privacy policy" senza nessun link — accettazione "al buio".
**Fix:** aggiunto link vero a `/privacy` (pagina esistente, verificata con
`Glob`). **Verificato esplicitamente:** non esiste nel progetto nessuna
pagina "termini e condizioni d'uso" separata (`Glob` su `app/**/termini*`,
`app/**/condizioni*` ecc.: zero risultati) — non ho inventato un link a una
pagina vuota, il link punta solo a Privacy. **Segnalo a Mason:** se serve un
documento contrattuale/termini d'uso distinto dalla privacy policy, va
creato come pagina reale — quando `legalDocs.length > 0` (flusso con
documenti legali gestiti da admin) il contenuto pieno è già mostrato inline
in un box scrollabile, quindi quel percorso non ha lo stesso problema.

### Bug 7 — "Accedi" da /report con account esistente apre una pagina di errore generico

**Non riproducibile dal vivo in questo ambiente** (i tool browser
(`mcp__Claude_Browser__*`) sono andati in timeout su ogni tentativo di
navigazione verso beautyx.it — provato più volte). Analisi statica +
incrociata coi log reali di Supabase (nessun errore Postgres/RLS nella
finestra del test, il login stesso è riuscito con `200`) mi porta a un
**candidato concreto e ad alta probabilità, sistemato preventivamente:**
`app/impostazioni/page.js` e `app/impostazioni/abbonamento/page.js`
chiamavano `useSearchParams()` SENZA avvolgere il componente in
`<Suspense>` — anti-pattern noto dell'App Router di Next.js
("missing-suspense-with-csr-bailout"), già corretto correttamente altrove
nello stesso progetto (`app/login/page.js`, `app/centro/page.js` lo fanno
bene) ma non in questi due file. `/impostazioni` è ESATTAMENTE dove
`app/dashboard/page.js` manda ogni utente loggato senza centro (vedi bug 5)
— cioè il primissimo posto dove finisce chi ha appena fatto login da
/report. **Fix:** entrambi i file spezzati in `<Nome>Content()` (logica
originale invariata) + wrapper `export default function <Nome>Page() {
return <Suspense fallback={null}><...Content /></Suspense> }`, stesso
identico pattern già in uso in `login/page.js`.
**Da riverificare dal vivo** (non ho potuto testarlo in questo giro): se
dopo il deploy l'errore generico persiste ancora dopo login con account
esistente, il prossimo passo è configurare `NEXT_PUBLIC_ERROR_WEBHOOK_URL`
(già predisposto in `lib/monitoring/reportError.js`, task #42/#165, mai
attivato) per avere lo stack reale invece di dover indovinare.

### Bug 8 — Messaggio finale post-registrazione parla di "versione demo" con funzionalità non pertinenti

**Trovato:** in `app/signup/page.js`, sottotitolo header ("Inizia con la
versione demo gratuita") e box finale step 4 ("Piano Demo Gratuito": chat AI
limitata, gestione movimenti bancari, consulente HPA) — copy pensato per il
signup della piattaforma gestionale completa, riusato senza modifiche anche
per chi arriva da `/report` (dove la promessa è "Report CURA gratis nei
primi 90 giorni", niente affatto quello che il box racconta). Per chi arriva
da `/report` sembra un cambio di prodotto a sorpresa.
**Fix minimo e onesto** (non è una riscrittura di voce, resta a Federica se
serve tono più caldo — vedi nota nel codice): sottotitolo cambiato in "Crea
il tuo account gratuito", box aggiornato con 3 righe accurate e verificabili
(dashboard base, Report CURA incluso gratis nei primi 90 giorni, nessuna
carta richiesta) — nessuna funzione promessa che non sia garantita per
davvero a chi si registra oggi.

### File toccati in questa sessione (oltre al recupero backlog del commit precedente)
`app/signup/page.js` (riscritto: InputField a livello di modulo, link
privacy, copy demo), `app/login/page.js` (messaggi `message=check_email` e
`error=confirm_failed`), `app/impostazioni/page.js` +
`app/impostazioni/abbonamento/page.js` (Suspense), `contexts/AuthContext.js`
(`emailRedirectTo`), `proxy.js` (`/auth` in publicRoutes), `app/auth/callback/route.js`
(nuovo).

### Verifica fatta
`node --check` pulito su tutti i file server (`.route.js`), `node_modules/.bin/biome
lint`/`check` sui file JSX (zero errori di parsing, solo warning di stile
preesistenti non legati a questa sessione), conteggio bilanciamento
parentesi/graffe/quadre via `python3` su tutti i file toccati (tutti
in pareggio). **Nessuna build Next reale** nel sandbox (limite noto, già
segnalato nelle sessioni precedenti) — verificare con un deploy reale prima
di considerare tutto definitivo. Log Auth reali di Supabase consultati per
capire cosa È SUCCESSO DAVVERO nel test di Mason (non solo lettura statica
del codice), come richiesto esplicitamente.

### Cosa resta aperto (serve Mason)
1. Push (`push.bat`, io ho solo committato in locale).
2. Dashboard Supabase: email template "Confirm signup" in italiano +
   branding + eventuale SMTP custom (bug 3); verificare Redirect URLs
   include `/auth/callback` per produzione e locale (bug 4).
3. Decisione prodotto/UX su come presentare lo step "crea il tuo centro"
   dopo il signup, per non sembrare una seconda registrazione (bug 5) — di
   competenza Federica/Mason, non tecnica pura.
4. Verifica dal vivo del bug 7 dopo il deploy (il fix Suspense è il
   candidato più solido trovato, ma non ho potuto riprodurlo io stesso in
   questo ambiente — browser tool irraggiungibile).
5. Se serve una pagina "termini e condizioni" distinta dalla privacy
   (bug 6), va creata da zero — non esiste.
6. Riccardo: riverificare `/auth/callback` nell'audit di sicurezza (nuovo
   endpoint, anche se non tocca dati di centro — solo scambio sessione).

## Redesign copy /report — 3 card "Cosa trovi" + countdown 90gg prominente (2026-09-04)

**Contesto:** Federica ha aggiornato il copy di `app/report/page.js` (gate
Elena superato, non ancora committato da lei). Mason, nel test dal vivo,
ha bocciato i 3 blocchi scuri "Cosa trovi nel report" ("bruttissimi") e ha
chiesto un countdown dei 90 giorni ben visibile — Federica aveva già tolto
i paragrafi lunghi e lasciato un TODO nel punto esatto.

**Fix 1 — redesign 3 card "Cosa trovi nel report":** sostituito lo sfondo
nero (`#1a1a0f`) con card bianche (`#fff`, bordo `1.5px solid
rgba(26,26,15,0.08)`, `box-shadow` leggera) coerenti con lo stile già in
uso nella sezione "PREZZO" della stessa pagina. Numero progressivo: da
testo piccolo rosa su sfondo nero a badge circolare oro (`#FFE44D`, stesso
colore del badge eyebrow in hero) con cifra in Playfair scura — lega
visivamente le card al resto della pagina. Font ingranditi per leggibilità
reale: titolo card `15px→19px` (Playfair 700), testo `13px→15.5px` (colore
`#555` invece di `#aaa` su nero, molto più leggibile). Palette cream/oro/
pink e font Playfair/Inter invariati, solo applicati coerentemente anche
qui.

**Fix 2 — `components/common/ReportCountdownBanner.js`, nuova variante
`prominent`:** il componente esisteva già (creato per l'hero di
`/newsletter`, dove resta con lo stile "pill" originale, invariato — vedi
`app/newsletter/page.js` riga ~223, nessuna modifica lì). Aggiunta una
`variant="prominent"` (prop, default resta `"pill"` per non rompere l'uso
esistente): numero dei giorni in grande evidenza (Playfair 900,
`clamp(40px,10vw,56px)`, colore pink `#EC4899`) + etichetta sotto in
maiuscolo, dentro un riquadro con bordo/sfondo pink tenue. Integrata in
`app/report/page.js` nel punto esatto lasciato da Federica col TODO (dentro
la card "Gratis ora. Mai un doppio pagamento dopo.", sopra il paragrafo
breve che Federica ha lasciato — affiancati, non sostituiti, come da nota
nel TODO). **Corretto anche il refuso segnalato:** il copy interno del
componente diceva ancora "report CARE" (variante pill, unico punto rimasto
col nome vecchio) — cambiato in "report CURA".

**Countdown NON funzionante oggi — segnalazione esplicita, non un bug
silenzioso:** `NEXT_PUBLIC_REPORT_LAUNCH_DATE` resta non impostata su
Vercel (deliberato, vedi voce countdown 90gg su `/newsletter` sopra) — il
componente si comporta esattamente come progettato (nessun countdown finto:
se la env var manca, `computeCountdown()` ritorna `null` e il componente
non renderizza nulla, per ENTRAMBE le varianti). Risultato pratico: oggi su
`/report` nel punto dove ho integrato `ReportCountdownBanner
variant="prominent"` **non compare visivamente nulla** finché quella env
var non viene impostata. Come da istruzione ricevuta, non fingo che
funzioni: **la condizione per fissare la data non è cambiata** — serve che
il motore del questionario sia pronto E collaudato end-to-end (task #152
scoring engine e #153 assemblaggio report sono ancora `pending`/
`in_progress`, non completati). Segnalo di nuovo qui, come richiesto
esplicitamente da Mason nel task di oggi.

**Riverifica dal vivo del bug 7 (login→errore generico, fix Suspense su
`app/impostazioni/page.js`/`abbonamento/page.js`) — tentata seriamente,
ancora bloccata, causa diversa da prima:** in questo giro il browser tool
non era il problema — ho provato `npm run dev` + `curl` in locale, 4
avviamenti separati del server (con/senza `NODE_OPTIONS`
`--max-old-space-size`, su `/`, `/login`, `/impostazioni`,
`/impostazioni/abbonamento`). Il server compila e si mette in ascolto
correttamente ("✓ Ready" confermato nel log ogni volta), ma **l'intero
processo Next.js muore in modo silenzioso — nessuno stack trace, nessun
errore in stdout/stderr — circa 8-9 secondi dopo la prima richiesta HTTP
reale** (`curl` riceve "Recv failure: Connection reset by peer" o
`exit code 56`; `ps aux` conferma che `next-server` non esiste più subito
dopo). Comportamento identico e ripetibile su tutte e 4 le route provate,
comprese quelle che non toccano `/impostazioni` — quindi **non è il fix
Suspense stesso a causare il crash** (se lo fosse, solo quelle due route
fallirebbero, non anche `/` e `/login`). Ipotesi più probabile: il sandbox
di questo ambiente blocca o interrompe le chiamate di rete in uscita che
`proxy.js`/middleware fa verso Supabase per leggere la sessione a ogni
richiesta — coerente con l'8-9s di attesa prima del reset (timeout di
rete), non un crash istantaneo da eccezione di codice. **Non risolvibile
da qui**: resta da verificare con un deploy reale su Vercel o un test
diretto sul browser di Mason, non un problema che la verifica statica
avrebbe potuto anticipare. Il fix Suspense in sé resta verificato
staticamente come corretto (pattern identico a `login/page.js`, già
live e funzionante).

**Verifica:** bilanciamento parentesi (script Python) OK su entrambi i
file JSX toccati. `node_modules/.bin/biome check` sui due file: 5 warning,
tutti preesistenti/non legati a queste modifiche (quote style del
formatter, `noArrayIndexKey` sul `.map((v,i))` già presente prima del mio
intervento, `useSemanticElements` su `role="status"` già presente nel
componente originale) — zero errori di parsing o di logica introdotti.
Nessuna build Next.js completa eseguibile nel sandbox per questo task
(vedi crash del dev server sopra).

**File modificati:** `app/report/page.js` (redesign 3 card + integrazione
countdown), `components/common/ReportCountdownBanner.js` (nuova variante
`prominent` + fix copy CARE→CURA).

## 04/09/2026 — Retest live E2E su produzione (commit 9d6965d), dopo la regola "Definizione di Fatto"

Compito del Coordinatore: collaudo dal vivo reale su `www.beautyx.it`
(non locale) dell'intero funnel report→signup→email→login→questionario,
distinguendo esplicitamente "verificato dal vivo" da "non verificabile da
qui". **Limite dichiarato prima di iniziare, non scoperto in corsa:** per
policy dell'ambiente in cui giro oggi non posso creare un account reale
(email+password) né digitare una password in un campo di login/signup, su
nessun sito, incluso il nostro — è un vincolo categorico, non una scelta
mia. Questo blocca strutturalmente i punti "registrazione reale" e "login
utente esistente" del collaudo: non li ho aggirati né simulati, li segnalo
come non eseguibili da questa sessione specifica (un'altra sessione/Mason
stesso può farlo).

**Commit verificato in prima persona, non solo riportato:** `git log -1` +
`git log -1 origin/main` nel repo montato → entrambi puntano a
`9d6965d6f247c628e7e14ab7c8fabcc90150e290` ("fix: un'unica pagina legale...",
2026-09-04 13:26:50 +0200), branch allineato, working tree pulita salvo una
modifica non di codice (`memory/elena.md`, +9 righe). Coerente con la regola
"Definizione di Fatto": hash confermato con un comando git eseguito da me,
non ricopiato dal prompt.

**Test dal vivo eseguiti su `https://www.beautyx.it` (browser reale, non
localhost — niente crash dopo 8-9s come nel sandbox dev precedente):**

1. **`/report` pubblico senza redirect — VERIFICATO DAL VIVO.**
   `window.location.href` dopo la navigazione resta `https://www.beautyx.it/report`
   (nessun redirect a `/login`), contenuto REPORT CURA visibile.
2. **Fix focus-loss signup (Bug 2) — VERIFICATO DAL VIVO, RISOLTO.** Cliccato
   il campo "Nome" su `/signup` e digitata la stringa
   "Testverificafocus" (17 caratteri) in un colpo solo. Risultato letto via
   JS subito dopo: `input.value === "Testverificafocus"` (stringa intera,
   non troncata), `document.activeElement === quello stesso input`,
   `selectionStart: 17` (cursore a fine testo). Prima del fix ogni carattere
   smontava/rimontava il nodo e il focus sarebbe saltato al primo tasto:
   qui l'intera stringa è arrivata senza reclick. Nessun invio del form,
   nessun account creato — solo digitazione, per restare dentro il limite
   sopra.
3. **Redesign 3 card "Cosa trovi nel report" (punto 6) — VERIFICATO DAL
   VIVO.** Letto lo stile calcolato reale (non il codice sorgente) del
   badge "01"/"02"/"03" e del suo contenitore: card `background-color:
   rgb(255,255,255)` (bianco, non più nero), bordo `1px solid
   rgba(26,26,15,0.08)`, `border-radius:16px`, `box-shadow` leggera; badge
   numero `background: rgb(255,228,77)` (oro) con testo scuro. Combacia
   esattamente con la descrizione del redesign in memoria.
4. **Registrazione reale con email verificabile (punto 3) — NON ESEGUITA,
   per il limite di policy sopra, non per limite tecnico della sandbox.**
   Nessuna email di test è stata usata, nessun account creato. Resta il
   collaudo più critico ancora da fare da un umano (Mason) o da un'altra
   sessione con permessi diversi.
5. **Link di conferma email → completamento login reale (punto 4) — NON
   VERIFICABILE**, dipende interamente dal punto 3 mai eseguito. Ho potuto
   solo verificare che la route `app/api/.../auth/callback` esiste dal vivo
   e che, chiamata SENZA un `code` valido, reindirizza puliti a
   `/login?error=confirm_failed` (nessun crash/500) — copre solo il ramo di
   errore, non lo scambio PKCE reale con un `code` valido, che resta il
   punto più critico mai confermato in produzione.
6. **Login utente esistente / pagina di errore generico (Bug 7, punto 5) —
   NON VERIFICABILE fino in fondo, stesso limite password.** Verificato
   però indirettamente quanto possibile senza autenticarmi:
   `/impostazioni` e `/impostazioni/abbonamento` visitate da anonimo
   reindirizzano entrambe puliti a `/login?redirect=...` con risposta
   `200` (letto da `read_network_requests`), nessuna pagina di errore
   generico, nessun 500 — il fix Suspense almeno non rompe il rendering
   per il caso anonimo. **Non è la prova richiesta**: il bug si manifestava
   DOPO login riuscito, scenario che non ho potuto riprodurre. Resta il
   secondo punto più critico non confermato.
7. **Messaggi login `check_email`/`confirm_failed` (sotto-fix del Bug 4) —
   VERIFICATO DAL VIVO.** `/login?message=check_email` mostra
   "Registrazione quasi completata: controlla la tua email...";
   `/login?error=confirm_failed` mostra "Il link di conferma non è valido o
   è scaduto...". Entrambi i rami di testo confermati renderizzati
   correttamente in produzione (non solo letti nel codice).

**Non testato per niente in questo giro:** checkbox privacy/link (Bug 6,
già corretto in precedenza) — non ho proseguito nel wizard di signup oltre
lo step 1 per non avvicinarmi a un invio reale del form; questionario
CURA (richiede login, stesso limite).

**Nessuna modifica di codice fatta oggi** — solo collaudo. Nessun nuovo
commit da parte mia in questa sessione.

**Riepilogo onesto per il Coordinatore/Mason, bug per bug:**
- Bug 1 (`/report` redirect login): **risolto, verificato dal vivo.**
- Bug 2 (focus-loss signup): **risolto, verificato dal vivo.**
- Bug 3 (email Supabase in inglese/no branding): invariato, resta un passo
  dashboard Supabase per Mason (non testabile/agibile da qui, come già
  segnalato il 03/09).
- Bug 4 (link conferma email → login rotto): **parzialmente verificato** —
  il ramo di errore e i messaggi funzionano dal vivo; lo scambio PKCE reale
  (il cuore del bug) resta NON verificato per il limite di policy sopra.
  Serve un test con un'email reale, fatto da un umano o da una sessione con
  permessi diversi dai miei.
- Bug 5 (decisione prodotto "sembra un'altra registrazione"): non affrontato
  oggi, non era nello scope del retest tecnico.
- Bug 6 (checkbox privacy senza link): già risolto in precedenza (commit
  9d6965d), non ri-testato oggi (non necessario, non toccato nel frattempo).
- Bug 7 (login → errore generico): **non verificabile fino in fondo** —
  solo il comportamento anonimo (redirect pulito, 200) confermato dal vivo;
  lo scenario reale (utente che fa login con successo e arriva su
  `/impostazioni`) resta non riprodotto. Fix Suspense verificato solo
  staticamente come corretto, come già scritto il 03/09.
- Bug 8 (copy "versione demo" fuorviante): testo già corretto nel codice
  (commit 9d6965d), non ri-controllato visivamente oggi sullo step 4 del
  wizard (non raggiunto per lo stesso motivo del punto 4 sopra).
- Redesign 3 card + countdown: **card confermate live** (vedi punto 3
  sopra); countdown resta deliberatamente non attivo (`NEXT_PUBLIC_REPORT_LAUNCH_DATE`
  non impostata), invariato rispetto al 03/09.

**Cosa serve ancora, esplicitamente, prima del weekend:** qualcuno con la
possibilità di creare un account reale e leggere una vera casella email
deve completare almeno una volta punti 3+4 (registrazione + click sul link
di conferma vero) e il login con quell'account per vedere se arriva su
`/impostazioni` senza errore generico. Questo resta l'unico modo per
chiudere davvero Bug 4 e Bug 7 — nessuna verifica statica o parziale può
sostituirlo, coerente con la regola "Definizione di Fatto".

## 05/09/2026 — "Password dimenticata" → link porta su localhost (Mason bloccato dal vivo)

Mason, mentre provava a recuperare l'accesso, ha cliccato "Password
dimenticata?", ricevuto la stessa email anonima in inglese già nota (Bug 3,
03/09) e cliccando sul link è finito su una pagina "localhost" con errore
di connessione — identico pattern del Bug 4 (conferma email), ma sul flusso
di reset password.

**Ipotesi di partenza (ragionevole mail non verificata):** `resetPasswordForEmail()`
chiamata senza `redirectTo` esplicito. **Verificata e SMENTITA leggendo il
codice + `git blame`:**
- `contexts/AuthContext.js` righe 713-724, funzione `resetPassword(email)`:
  `redirectTo: \`${window.location.origin}/reset-password/update\`` è
  già presente, esplicito. `git blame` → commit `0a64cf9` (Mason,
  15/07/2026, commit iniziale "Full Beautyx app - versione completa"),
  **mai toccata da allora**.
- `proxy.js`: `/reset-password` è in `publicRoutes` e c'è già un'eccezione
  dedicata (`if (pathname.startsWith('/reset-password/update')) { return
  supabaseResponse }`) che salta anche il redirect "loggato→dashboard".
  Anche questa riga viene da `0a64cf9` (era in `middleware.js`, il
  predecessore di `proxy.js`), mai modificata.
- `app/reset-password/update/page.js` esiste, è completo e corretto: form
  nuova password + conferma, validazione lunghezza/match, chiama
  `updatePassword()` (→ `supabase.auth.updateUser({password})`), redirect a
  `/` dopo successo. Anche questa da `0a64cf9`, mai toccata.
- Verificato anche il possibile problema collaterale "serve uno scambio
  PKCE esplicito come per `/auth/callback`?": no — a differenza del Bug 4
  (dove il link di conferma non aveva ALCUN `redirectTo` e quindi non
  raggiungeva mai una pagina dell'app), qui il link raggiunge una pagina
  pubblica della nostra app con `createBrowserClient` (che di default ha
  `detectSessionInUrl: true` + flow PKCE), che scambia il `?code=` in
  automatico lato client al caricamento — non serve una route server
  dedicata come `/auth/callback`, perché qui il problema non è "nessuna
  pagina sa gestire il code", ma un livello prima.

**Conclusione: nessun bug di codice.** Il codice per il reset password è
corretto ed è così da sempre (mai stato il sospettato giusto). La causa è
quasi certamente identica al Bug 3/4: la allow-list "Redirect URLs" in
Supabase Dashboard (Authentication → URL Configuration, progetto
`scfumedmisbuxhdywwpb`) non include l'URL di produzione del reset
(`https://www.beautyx.it/reset-password/update`), quindi Supabase ignora
silenziosamente il `redirectTo` passato dal codice e ripiega sul "Site URL"
di default — che con ogni probabilità è ancora `http://localhost:3000`,
residuo della configurazione iniziale mai aggiornata. Stesso identico
sintomo ("pagina localhost, errore di connessione") già documentato per la
conferma email.

**Nessuna modifica di codice fatta, nessun commit** — non c'era nulla da
correggere lato applicazione.

**Serve Mason sulla dashboard Supabase (non verificabile né risolvibile da
qui):**
1. Authentication → URL Configuration → **Site URL**: verificare se è
   ancora `http://localhost:3000` e, se sì, cambiarlo nel dominio reale
   (`https://www.beautyx.it`).
2. Authentication → URL Configuration → **Redirect URLs** (allow-list):
   deve includere `https://www.beautyx.it/reset-password/update` (e se si
   testa anche in locale, `http://localhost:3000/reset-password/update`).
   Senza questa voce il fix di codice — che qui esiste già — non basta:
   Supabase scarta il redirect richiesto e torna al Site URL di default,
   esattamente come già successo e spiegato per `/auth/callback` nel Bug 4
   del 03/09.
3. Mentre è lì, vale la pena controllare anche il template email "Reset
   password" (stesso problema di branding/lingua del Bug 3 sul "Confirm
   signup": mittente anonimo `noreply@mail.app.supabase.io`, testo in
   inglese) — già segnalato come "da fare anche per Reset password" nella
   nota del 03/09 (Bug 3) ma a quanto pare non ancora sistemato.

## 05/09/2026 — Bug report urgente Mason: messaggio signup ambiguo + email reset illeggibile + redirect prematuro reset password

Tre segnalazioni distinte arrivate insieme da Mason (produzione, utenti
reali bloccati). Per ciascuna: causa reale trovata leggendo il codice, fix
applicato, come verificato.

### 1. Messaggio post-signup ambiguo ("che cazzo ne so se ho già un account")

**Causa reale (letta nel codice, non ipotizzata):** `app/login/page.js`,
messaggio mostrato per `messageParam === 'check_email'`, e
`contexts/AuthContext.js` funzione `signUp` (riga ~624). Prima del fix,
`signUp` faceva `return { success: true, user: authData.user }` SENZA MAI
controllare `authData.user.identities` — quindi il chiamante (`app/signup/page.js`
riga 245) faceva sempre `router.push('/login?message=check_email')`, stesso
messaggio sia per email nuova sia per email già registrata, con un testo
"paracadute" che chiedeva all'utente di indovinare la propria situazione
("Hai già un account con questa email? Nessun problema: prova ad
accedere..."). Un commento nel file (datato erroneamente "05/09/2026")
giustificava questo come scelta voluta anti-enumerazione — ma verificato
che il pattern `identities` (documentato da Supabase: array vuoto `[]` per
un'email già registrata e confermata, non vuoto per un account davvero
nuovo) non veniva usato da nessuna parte nel codice, quindi la scelta
"stesso messaggio sempre" non era necessaria: si può distinguere i due casi
lato client senza che il server riveli nulla di per sé (Supabase risponde
comunque sempre 200).

**Fix applicato:**
- `contexts/AuthContext.js`, `signUp`: dopo la chiamata a
  `supabase.auth.signUp`, calcolato `const alreadyRegistered = !!(authData.user
  && Array.isArray(authData.user.identities) && authData.user.identities.length
  === 0)`; la funzione ora ritorna anche `alreadyRegistered` nell'oggetto di
  successo. **Bug collaterale scoperto e corretto nello stesso punto:**
  l'upsert su `user_profiles` con i dati anagrafici del form veniva
  eseguito SEMPRE quando `authData.user` esisteva, anche per un'email già
  registrata — dato che per un utente esistente `authData.user` è l'utente
  ESISTENTE (stesso id), questo avrebbe silenziosamente sovrascritto
  l'anagrafica già salvata di quell'account con i dati del nuovo tentativo
  di signup. Ora l'upsert è condizionato a `authData.user && !alreadyRegistered`.
- `app/signup/page.js`, dopo `signUp(...)`: `router.push(result.alreadyRegistered
  ? '/login?message=already_registered' : '/login?message=check_email')`
  invece del solo `check_email` fisso.
- `app/login/page.js`: il messaggio per `check_email` ora dice solo
  "Controlla la tua email per confermare l'account." (nessun'ambiguità,
  perché ora è mostrato SOLO per un account davvero nuovo). Aggiunto un
  blocco nuovo per `already_registered`: "Esiste già un account con questa
  email. Prova ad accedere con la tua password qui sotto, oppure clicca su
  «Password dimenticata?» se ti serve una mano a recuperarla." Sostituito
  anche il commento che descriveva la vecchia scelta "messaggio sempre
  uguale" con uno che spiega il nuovo meccanismo.

**Limite onesto sul pattern `identities`:** è un comportamento noto e
documentato di Supabase Auth quando la conferma email è attiva (lo è in
questo progetto, vedi `emailRedirectTo` nello stesso `signUp`), ma
Supabase non garantisce contrattualmente questo dettaglio per sempre — se
in futuro cambia la configurazione (es. autoconfirm attivo, o un
cambiamento lato Supabase), andrebbe ri-verificato. Non è stato possibile
testarlo dal vivo con due email reali in questa sandbox (nessun accesso
browser/casella email/Supabase live) — verificato solo staticamente
leggendo il codice e la logica, coerente con la documentazione Supabase su
questo pattern.

### 2a. Email di reset password — bottone bianco su bianco (segnalato illeggibile)

**Causa reale verificata:** letto per intero
`email-templates/email-template-conferma-e-reset-supabase.md`, sezione "2.
Reset Password". Il CSS del bottone è corretto: `color:#ffffff` su
`background:linear-gradient(135deg, #ec4899 0%, #9333ea 100%)` (rosa→viola)
— testo bianco su sfondo colorato saturo, NON bianco su bianco. Il file
sorgente non ha il bug descritto.
Cercato nel progetto (migrations `supabase/`, config, env, script di
provisioning) un modo per sincronizzare/verificare via codice quale
template sia effettivamente attivo lato Supabase Auth: **non esiste** — i
template email di Supabase Auth si gestiscono solo dalla Dashboard, non
c'è alcuna API o config-as-code nel repo per questo. Coerente con la nota
già in memoria (sezione sopra, stesso giorno) sul problema gemello
"Site URL/Redirect URLs" — stesso pattern ricorrente: il codice/i testi
pronti in questo progetto sono corretti, ma la Dashboard Supabase non
riflette (o riflette solo in parte) quanto preparato.

**Nessuna modifica di codice possibile per questo punto** (fuori dal
perimetro codice). Messaggio pronto per Mason, verificabile in 30 secondi:

> Vai su Supabase Dashboard → Authentication → Email Templates → **Reset
> Password** → campo "Message body". Confronta il testo lì dentro con il
> punto 2 ("Reset Password") di
> `email-templates/email-template-conferma-e-reset-supabase.md`. Se il
> campo è vuoto, contiene ancora il template di default in inglese, o è
> diverso anche solo in parte dal contenuto del file .md → è quella la
> causa del bottone illeggibile: il file corretto preparato da Federica non
> è mai stato incollato lì (o solo in parte). Basta incollare per intero il
> blocco HTML del punto 2 nel campo "Message body" e salvare.

### 2b. Reset password — redirect prematuro prima di poter digitare la nuova password

**Causa reale trovata (non la sola ipotesi di partenza):** letti per intero
`app/reset-password/page.js`, `app/reset-password/update/page.js` e
`contexts/AuthContext.js`.
- `app/reset-password/update/page.js` righe 17-24: `useEffect` con
  `setTimeout(..., 3000)` che fa `router.push('/reset-password')` se `user`
  (da `useAuth()`) è falsy — questo guard esiste da sempre (commit
  `0a64cf9`) ed è di per sé corretto nell'intento.
- La causa reale è in `contexts/AuthContext.js`, listener
  `supabase.auth.onAuthStateChange` (righe ~570-601 prima del fix): gestiva
  SOLO gli eventi `SIGNED_IN` e `SIGNED_OUT`. Quando si arriva dal link di
  recovery Supabase, la libreria client spara l'evento **`PASSWORD_RECOVERY`**
  (non `SIGNED_IN`) — questo evento non aveva NESSUN branch dedicato, quindi
  veniva silenziosamente ignorato: `setUser()` non veniva mai chiamato per
  quella sessione temporanea. Risultato: `user` restava `null` nel contesto
  React, il guard di `update/page.js` scattava dopo 3 secondi e rimandava
  l'utente a `/reset-password` prima che potesse impostare la password.
  Non era un problema di `profile`/`centro_id` mancante come da ipotesi
  iniziale di Mason (il codice non arriva nemmeno a quel punto: il blocco
  scatta molto prima, per mancanza di `user` tout court) — ma l'effetto
  finale (rimbalzo prematuro) e la causa di fondo (evento di recovery non
  gestito correttamente) sono esattamente quelli sospettati.
  Verificato anche che non è un problema di routing/middleware: in
  `proxy.js`, `/reset-password/update` è già in `publicRoutes` con
  un'eccezione dedicata (riga ~53, `return supabaseResponse` immediato) —
  il middleware non è la causa.

**Fix applicato:** in `contexts/AuthContext.js`, aggiunto un branch
esplicito `else if (event === 'PASSWORD_RECOVERY' && session?.user)` nel
listener `onAuthStateChange`, che rispecchia il branch `SIGNED_IN` (
`setUser(session.user)`, `updateLastActivity()`, `loadUserData(session.user.id)`,
`startInactivityMonitor(session.user)`), MA senza il guard `initDoneRef`
usato per `SIGNED_IN` (quel guard serve solo a evitare un doppio
caricamento al mount per sessioni già esistenti — l'evento
`PASSWORD_RECOVERY` arriva sempre e solo dal link di recovery, mai al mount
normale, quindi non va filtrato). Così `user` viene impostato subito
quando arriva l'evento, ben prima che scatti il timeout di 3 secondi nella
pagina di update.

**Come verificato:** rilettura riga per riga del file modificato dopo la
modifica (non fidandosi della sola scrittura). Sintassi di tutti i file
toccati (`app/login/page.js`, `app/signup/page.js`, `contexts/AuthContext.js`,
più `app/reset-password/page.js` e `app/reset-password/update/page.js` letti
ma non modificati) verificata con un parser JS/JSX reale (Babel bundlato
dentro `node_modules/next`, con `plugin-syntax-jsx`, non `node --check` che
non capisce JSX e fallisce sempre su questi file) — tutti OK, nessun errore
di sintassi.
**Limite onesto, esplicito:** NON è stato possibile fare un collaudo dal
vivo end-to-end (nessun browser, nessuna casella email reale, nessun
ambiente Supabase live raggiungibile in questa sandbox) — coerente con la
regola generale "Collaudo dal vivo obbligatorio prima di dichiarare
'fatto' un flusso cliente": qui il flusso NON va dichiarato "risolto e
provato", va dichiarato "causa reale trovata e corretta nel codice,
verificata solo staticamente (lettura + parser di sintassi)". Serve un test
reale (Mason o altra sessione con accesso a browser/email/Supabase) prima
di considerare il fix definitivamente chiuso per il Bug 2b, e in ogni caso
per il Bug 2a (dashboard, vedi messaggio sopra).

**File modificati oggi:** `app/login/page.js`, `app/signup/page.js`,
`contexts/AuthContext.js`. Nessuna modifica a
`email-templates/email-template-conferma-e-reset-supabase.md` (già
corretto) né a `proxy.js` (non è la causa).
