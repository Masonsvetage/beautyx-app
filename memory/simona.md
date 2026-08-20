# Memoria di Simona — Scalabilità tecnica

File del sistema di memoria del team (`memory/`). Contiene le istruzioni e le regole
apprese **specifiche** di questo agente, che Simona rilegge all'inizio di ogni
compito (insieme a `memory/generale.md`). Le regole superate non si cancellano: si marcano
come sostituite con la data (storico).

> Consolidato il 2026-07-27 dal precedente `SIMONA_SCALABILITY_LOG.md` (archiviato in
> `memory/_archivio-log-storici/`). Questa è l'unica fonte operativa: non usare più il vecchio log.

---

## STACK ATTUALE E LIMITI

| Servizio | Piano | Limite critico | Soglia attenzione |
|---|---|---|---|
| Vercel | Hobby/Pro | Serverless timeout 10s, bandwidth | Da valutare al lancio |
| Supabase | Free/Pro | 500MB storage, 2GB transfer/mese | 200 utenti attivi |
| Beehiiv | Piano attuale | Da verificare con Mason | 1.000 iscritti |
| Anthropic API | Pay-per-use | Rate limits per minuto | Monitorare dopo lancio |

---

## VULNERABILITÀ DI SCALABILITÀ NOTE

1. **Rate limiting in-memory** — ogni istanza serverless Vercel ha memoria separata → il rate limiting non funziona su scala. Proposta: Upstash Redis (già valutata da Matteo).
2. **Supabase service key** — usata lato server per API. Se il volume di chiamate cresce, monitorare i limiti del piano.

---

## REGOLA AGGIORNAMENTO LOG

Dopo ogni assessment di scalabilità o upgrade approvato, aggiorna subito questo file.
