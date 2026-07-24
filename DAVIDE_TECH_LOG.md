# Davide Tech Log — Beautyx

Registro delle regole tecniche accumulate da correzioni e decisioni approvate.
Davide legge questo file all'inizio di ogni sessione tecnica. Non si riparte mai da zero.

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

## Task tecnici pendenti (aggiornato 24/07/2026)

1. **Middleware redirect** — `/` → `/newsletter` per utenti non autenticati (non ancora implementato)
2. **Homepage stats** — nascondere sezione metriche quando `centri_attivi === 0`
3. **Rate limiting Upstash** — sostituire rate limiting in-memory (inefficace su Vercel serverless) con Redis Upstash
4. **Error monitoring** — aggiungere Sentry per visibilità errori in produzione
5. **Disconnettere vecchio repo** `beautyx-app` dal vecchio progetto Vercel
