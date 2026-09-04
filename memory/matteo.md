# Memoria di Matteo — Economia, KPI, analytics

File del sistema di memoria del team (`memory/`). Contiene le istruzioni e le regole
apprese **specifiche** di questo agente, che Matteo rilegge all'inizio di ogni
compito (insieme a `memory/generale.md`). Le regole superate non si cancellano: si marcano
come sostituite con la data (storico).

> Consolidato il 2026-07-27 dal precedente `MATTEO_KPI_LOG.md` (archiviato in
> `memory/_archivio-log-storici/`). Questa è l'unica fonte operativa: non usare più il vecchio log.

---

## STATO ATTUALE PROGETTO (aggiornato 24/07/2026)

- **Centri attivi sulla piattaforma:** 0 (dati di test — non mostrare metriche pubblicamente)
- **Newsletter:** non ancora lanciata pubblicamente
- **Iscritti Beehiiv:** solo test interni
- **Ads:** non ancora attive
- **Ricavi:** 0 — pre-lancio

⚠️ I valori +34% ricavi, 89% obiettivi raggiunti, 4.8/5 soddisfazione sulla homepage sono placeholder/aspirazionali. Non comunicarli come dati reali. La sezione va nascosta finché `centri_attivi > 0`.

---

## PIANO ECONOMICO ADS (approvato, non ancora attivo)

- Budget test: €10-15/giorno (Instagram + Facebook Reels)
- Obiettivo: iscrizioni newsletter via Lead Form Ads
- Monitorare: costo per iscritto, tasso di conversione landing → iscrizione

---

## VALUTAZIONI COSTI/BENEFICI PENDENTI

1. **Upstash Redis** — rate limiting serverless. Costo stimato: ~$10/mese sul piano free/starter. Beneficio: eliminare vulnerabilità rate limiting in-memory su Vercel.
2. **Sentry** — error monitoring. Piano free disponibile per progetti piccoli. Beneficio: visibilità errori durante campagna ads.

---

## INVENTARIO ANALYTICS/TRACCIAMENTO (verificato sul codice reale, 29/08/2026)

Verifica fattuale su `beautyx-app`: codice sorgente, `package.json`, `app/layout.js`, `.env.local` (solo nomi variabili, valori mai esposti).

**Cosa esiste già:**
- **Beehiiv (nativo):** tasso apertura, click, crescita iscritti disponibili nel pannello Beehiiv stesso. Consultati oggi manualmente (Lorenzo/Mason). Un sync automatico verso Supabase (webhook Beehiiv → endpoint Next.js → tabella `subscriber_profiles`) è **solo progettato**, non ancora costruito (vedi `CRM_PROFILO_ISCRITTI.md`, priorità media, programmato dopo il lancio ads) — quindi oggi i dati Beehiiv vanno guardati a mano nel loro pannello, non c'è ancora un cruscotto interno che li aggrega.
- **Plausible Analytics:** c'è già lo script condizionale in `app/layout.js` (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`), ma la variabile d'ambiente **non è impostata** in `.env.local` → lo script non viene mai iniettato. Di fatto: predisposto ma spento.
- **Dashboard `/analytics` interno:** esiste (`app/analytics/page.js`, `lib/analytics.js`) ma è un cruscotto di **KPI economico-finanziari** (entrate/uscite da movimenti bancari, margine operativo, costi ottimizzabili) — non traffico web. Non va confuso con web analytics.
- **Cookie notice:** dichiara esplicitamente "non utilizziamo cookie di profilazione o per pubblicità" — coerente con l'assenza di pixel oggi, ma da aggiornare se/quando si installa il Meta Pixel (nota per Riccardo/Davide, non azione mia).

**Cosa NON esiste (verificato, non ipotizzato):**
- Nessun Google Analytics/GA4 (zero riferimenti `gtag`/`googletagmanager` nel codice).
- Nessun Meta Pixel né Meta Conversions API (zero `fbq`, zero script Meta, zero endpoint server-side verso Graph API). **Punto critico:** per la campagna Meta imminente (budget 500€, obiettivo Lead/Conversioni) questo è un blocco pre-lancio — senza pixel/CAPI l'algoritmo non può ottimizzare verso le iscrizioni reali e la campagna degrada verso l'ottimizzazione debole per copertura (già discusso con Mason). Va coordinato con Davide, implementazione non mia.
- Nessun PostHog, Plausible attivo, Microsoft Clarity.
- Nessun `@vercel/analytics` o `@vercel/speed-insights` in `package.json`, nessuno script Vercel Analytics iniettato nel codice. **Non verificabile da codice:** Vercel Web Analytics si può attivare anche solo da dashboard Vercel (senza toccare il codice) — questo richiede un controllo diretto sul progetto Vercel (fuori dalla mia portata di sola lettura codice), non risulta però nulla lato codice.

**Distinzione da tenere ferma (richiesta esplicitamente da Mason):**
- (a) Monitoraggio performance ads imminenti → serve Pixel/CAPI, urgente pre-lancio, coordinamento Matteo→Coordinatore→Davide.
- (b) Studio più approfondito di pattern comportamentali richiesto da Mason → è analisi di engagement pubblico sui contenuti dei competitor (non tracciamento del nostro traffico): lavoro di Alessia in parallelo, non mio.

---

## REGOLA AGGIORNAMENTO LOG

Dopo ogni valutazione economica approvata o aggiornamento KPI, aggiorna subito questo file con i nuovi dati.
