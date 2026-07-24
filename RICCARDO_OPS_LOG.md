# Riccardo Ops Log — Beautyx

Registro delle regole operative, monitoring e sicurezza accumulate.
Riccardo legge questo file all'inizio di ogni sessione. Non si riparte mai da zero.

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

## VULNERABILITÀ PENDENTI (aggiornato 24/07/2026)

1. **Rate limiting in-memory** — inefficace su Vercel serverless (ogni istanza ha la propria memoria). Soluzione: Upstash Redis. Non ancora implementato.
2. **Error monitoring assente** — nessun Sentry o equivalente. Errori in produzione durante campagna ads sarebbero invisibili.

---

## REGOLA AGGIORNAMENTO LOG

Dopo ogni incident, anomalia risolta o nuova regola di sicurezza approvata, aggiorna subito questo file.
