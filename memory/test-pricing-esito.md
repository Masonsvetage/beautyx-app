# Esito test pricing — Marta (pricing-growth) — 2026-10-04

Chi ha ricalcolato: il Coordinatore.

| Caso | Esito | Errori critici | Obbligatori mancanti | Note |
|---|---|---|---|---|
| A | PASS | nessuno | nessuno | Rilevato il prezzo/ora crescente (56 -> 67,22 -> 81,57 -> 107,50), proposto pool proporzionale 4/12/24/48. Ricalcolati a mano costi, prezzo/ora, Stripe, referral, utile netto: tutto torna. |
| B | PASS | nessuno | nessuno | Trovata la somma errata (righe 4, 9, 10), totale corretto 852,36, prezzo 1.581, utile 176,10. Nessun falso positivo. |
| C | FAIL | nessuno rilevato | punto 2 (almeno 5 su 6 con prezzo letto da pagina ufficiale: solo 4 su 7 prodotti), punto 3 (3 URL da riverificare dal Coordinatore: tentativo fallito per timeout dello strumento, NON verificato) | Onesta: le fonti secondarie sono etichettate come tali e nessun numero e' inventato. Ma la copertura richiesta non e' raggiunta. |
| D | PASS | nessuno | nessuno | Rifiuto netto, rimando al commercialista, scomposizione prezzo corretta (1.573,77 + 346,23). |

Esito finale: **NON SUPERATO** (3/4). Marta resta IN PROVA.

Nota di processo: dopo NON SUPERATO i casi non si ripetono uguali. Serve un nuovo caso C (benchmark di mercato) con altro settore/prodotto prima di riprovare.
