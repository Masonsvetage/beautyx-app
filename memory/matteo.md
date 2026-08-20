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

## REGOLA AGGIORNAMENTO LOG

Dopo ogni valutazione economica approvata o aggiornamento KPI, aggiorna subito questo file con i nuovi dati.
