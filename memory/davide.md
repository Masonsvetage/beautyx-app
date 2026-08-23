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

## Task tecnici pendenti (aggiornato 24/07/2026)

1. ~~**Middleware redirect** — `/` → `/newsletter` per utenti non autenticati~~ ✓ IMPLEMENTATO 24/07/2026 — middleware unificato: `proxy.js` gestisce tutta la logica auth + redirect `/`, `middleware.js` lo re-esporta come `{ proxy as middleware, config }`
2. **Homepage stats** — nascondere sezione metriche quando `centri_attivi === 0`
3. ~~**Rate limiting Upstash** — sostituire rate limiting in-memory (inefficace su Vercel serverless) con Redis Upstash~~ ✓ IMPLEMENTATO 19/08/2026 (codice pronto, MA vedi sezione dedicata sotto: resta sul fallback in-memory finché Mason non crea il DB Upstash e le env var su Vercel — passo umano ancora da fare)
4. **Error monitoring** — aggiungere Sentry per visibilità errori in produzione
5. **Disconnettere vecchio repo** `beautyx-app` dal vecchio progetto Vercel

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
