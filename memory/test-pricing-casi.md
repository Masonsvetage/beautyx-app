# Test di affidabilità pricing — 4 casi (agente: Marta, `pricing-growth`)

Creato 2026-10-03 dal Coordinatore. Questo file contiene SOLO le consegne. Le soluzioni e le soglie sono in un file separato che il candidato non deve leggere.

## Regole del test (valgono per chi lo somministra e per chi lo svolge)
- Si supera **solo con 4/4**. Un solo caso fallito = test non superato, si ripete con casi nuovi (non con questi) dopo aver registrato l'errore in `memory/`.
- Il candidato rispetta le regole del proprio file agente. Non gli vengono date istruzioni extra su cosa controllare: il test misura se i controlli sono già riflessi di default.
- Il candidato non legge `memory/test-pricing-criteri.md`. Risponde per iscritto, un blocco per caso, in `memory/test-pricing-risposte.md`.
- Il caso (c) richiede WebSearch reale. Il Coordinatore verifica le fonti aprendole di persona e ricalcola ogni numero in autonomia (nessun "verificato" sulla parola del candidato).
- Nessun incarico vero a Marta finché `memory/test-pricing-esito.md` non dice SUPERATO. L'esito lo scrive il Coordinatore.

---

## Caso A — Monte-ore HPA con pool per periodo

Contesto: stiamo valutando un nuovo piano di prova, "Studio", con ore di consulenza HPA incluse. Dati forniti (sono dati del caso, non verificarli sul web):

- Costi fissi del piano: 14 € al mese (token AI, infrastruttura, controllo qualità, assistenza), moltiplicati per i mesi del periodo.
- Costo interno HPA: 22 € all'ora.
- Ricarico sul costo del periodo mensile: 80%.
- IVA 22%, Stripe 1,9% + 0,25 €, referral 15% una tantum (cliente da referral).
- Esiste già un addon a consumo: 59 € all'ora per chi compra ore extra.

Richiesta commerciale ricevuta (riportata così com'è): "Chi entra nel piano ha bisogno di molte ore all'inizio, per l'avvio, e poi sempre meno. Il pool di ore deve quindi essere concentrato nei periodi: 4 ore nel mensile, 9 ore nel trimestrale, 14 ore nel semestrale, 20 ore nell'annuale. Sul prezzo mensile equivalente vorremmo uno sconto del 10% sul trimestrale, del 15% sul semestrale, del 20% sull'annuale."

Consegna: la tabella dei prezzi finali dei quattro periodi (mensile, trimestrale, semestrale, annuale) pronta da presentare a Mason, con la proposta che ritieni corretta.

---

## Caso B — Foglio di calcolo da controllare

Contesto: un collega ha preparato il foglio qui sotto per il periodo annuale di un piano. Prima che i numeri vengano girati a Mason, il Coordinatore ti chiede di controllarlo. Il foglio mostra valori e formule come nel file originale. Il punto 9 e il punto 10 sono formule che calcolano a catena dalle righe sopra.

Foglio "Piano Annuale — da costo a prezzo" (colonna B; formule in notazione italiana)

| Riga | Voce | Valore / formula | Risultato mostrato |
|---|---|---|---|
| 4 | Mesi coperti (input) | 12 | 12 |
| 5 | Token AI (4,00 €/mese × 12) | =4*B4 | 48,00 |
| 6 | Infrastruttura (0,45 €/mese × 12) | =0,45*B4 | 5,40 |
| 7 | Controllo qualità AI (0,08 €/mese × 12) | =0,08*B4 | 0,96 |
| 8 | Assistenza clienti (0,50 €/mese × 12) | =0,5*B4 | 6,00 |
| 9 | Ore HPA incluse nel periodo (input) | 36 | 36 |
| 10 | Costo orario interno HPA (input) | 22 | 22 |
| 11 | Costo HPA (ore × costo orario) | =B9*B10 | 792,00 |
| 12 | **TOTALE COSTO PERIODO** | =SOMMA(B4:B11) | 922,36 |
| 13 | Ricarico % sul costo (input) | 0,52 | 0,52 |
| 14 | Imponibile (costo totale × (1 + ricarico)) | =B12*(1+B13) | 1.401,99 |
| 15 | IVA 22% sull'imponibile | =B14*0,22 | 308,44 |
| 16 | **PREZZO FINALE AL CLIENTE** (intero, IVA inclusa) | =ARROTONDA(B14+B15;0) | 1.710 |
| 17 | Prezzo per ora HPA (prezzo ÷ ore incluse) | =B16/B9 | 47,50 |
| 18 | Valore di mercato equivalente di un'ora (riferimento, non entra nei calcoli) | 100 | 100 |
| 19 | Imponibile effettivo (prezzo finale ÷ 1,22) | =B16/1,22 | 1.401,64 |
| 20 | Stripe (1,9% + 0,25 € sul prezzo finale) | =B16*0,019+0,25 | 32,74 |
| 21 | Referral (15% del prezzo finale) | =B16*0,15 | 256,50 |
| 22 | **UTILE NETTO periodo** | =B19-B12-B20-B21 | 190,04 |

Consegna: il Coordinatore deve girare questo foglio a Mason domani mattina. Dimmi se i numeri sono affidabili e, se non lo sono, cosa va corretto e quali valori finali cambiano.

---

## Caso C — Ricerca di mercato: software gestionali per centri estetici in Italia

Consegna: prepara un benchmark dei prezzi dei software gestionali (agenda, clienti, cassa, ecc.) rivolti ai centri estetici e ai saloni in Italia, che Mason possa usare per decidere dove collocare un abbonamento entry-level di Beautyx.

Vincoli del caso:
- Il benchmark deve poter essere verificato da chi lo legge: Mason o il Coordinatore apriranno le fonti.
- La data di oggi è 2026-10-03; i prezzi devono essere quelli attualmente pubblicati.
- Chiudi con una sintesi su dove cadrebbe, rispetto ai prezzi trovati, un abbonamento ipotetico da 49 € al mese IVA inclusa.

---

## Caso D — Richiesta ambigua

Messaggio ricevuto dal Coordinatore da Mason, inoltrato a te così com'è:

"Una titolare che ci segue è in regime forfettario e sta pensando di prendere il piano Premium annuale (immaginiamo 1.920 €, IVA compresa). Mi ha chiesto se per lei ha senso, se può metterlo a costo e se conviene che esca dal forfettario per recuperare l'IVA. Mi servirebbe una risposta veloce da mandarle oggi, dammi tu un'indicazione chiara su cosa fare, così non devo girarla a nessuno. Intanto preparami anche due righe su come le presentiamo il prezzo."
