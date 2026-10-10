# Parere economico di Matteo: telefonata gratuita + Masterclass in abbonamento (2026-10-06)

Proposta di Mason: a chi compra l'agenda (o il bundle agenda+guida+newsletter) si offre una telefonata gratuita di aiuto all'uso quotidiano (più videoguide), per portarlo alla Masterclass in abbonamento: 2 incontri al mese da 90 minuti, circa 40 €/mese.

Tutti i numeri sono ricalcolati a mano e controllati due volte. Gli importi sono arrotondati ai centesimi. Questo è management accounting (numeri per decidere), non consulenza fiscale: l'IVA va confermata dal commercialista.

## Ipotesi di partenza (dichiarate, non dati)

- H1. Prezzo mensile P = 30 / 40 / 50 € IVA inclusa (40 € è indicativo, detto da Mason).
- H2. IVA 22%: imponibile = P ÷ 1,22 (IVA scorporata, come nel libro).
- H3. Stripe: 1,9% del prezzo finale + 0,25 € a incasso.
- H4. Referral 7%: lo calcolo sull'imponibile (ipotesi mia, da confermare) e solo come scenario "con referral". Nel caso peggiore vale per tutti gli iscritti.
- H5. Costo orario interno del conduttore: 22 €/h (Base/Premium) e 30 €/h (Advanced), come indicato da Mason. Non ho trovato queste cifre scritte in `memory/generale.md`: le ho prese dal tuo messaggio. Sono un costo interno (tempo nostro), non una spesa in contanti.
- H6. Ore di lezione: 2 x 1,5 = 3 h al mese. Preparazione: 0, 1 o 2 ore per ogni ora di lezione, cioè ore totali 3 / 6 / 9 al mese.
- H7. Costo fisso della piattaforma video, registrazioni e assistenza: 0 (non incluso, da aggiungere se esiste).
- H8. Il costo del conduttore è fisso al mese: non cambia se gli iscritti sono 3 o 30 (finché il gruppo sta in una sessione).

## 1) Costo reale per partecipante al mese

Incasso netto per iscritto (dopo IVA e Stripe):

| Prezzo IVA incl. | Imponibile (÷1,22) | IVA | Stripe (1,9% + 0,25) | Netto senza referral | Referral 7% su imponibile | Netto con referral |
|---|---|---|---|---|---|---|
| 30 € | 24,59 | 5,41 | 0,82 | **23,77** | 1,72 | **22,05** |
| 40 € | 32,79 | 7,21 | 1,01 | **31,78** | 2,30 | **29,48** |
| 50 € | 40,98 | 9,02 | 1,20 | **39,78** | 2,87 | **36,92** |

Controllo a 40 €: 40 ÷ 1,22 = 32,787; Stripe 0,019 x 40 + 0,25 = 1,01; 32,787 - 1,01 = 31,777. Con referral: 32,787 x 0,93 = 30,492; meno 1,01 = 29,482.

Costo mensile del conduttore (costo fisso del gruppo):

| Preparazione | Ore al mese | A 22 €/h | A 30 €/h |
|---|---|---|---|
| 0 h per ora di lezione | 3 | 66 € | 90 € |
| 1 h per ora di lezione | 6 | 132 € | 180 € |
| 2 h per ora di lezione | 9 | 198 € | 270 € |

Costo per partecipante = costo fisso ÷ iscritti. Esempi (22 €/h, preparazione 1 h = 132 €): con 5 iscritti 26,40 €; con 10 iscritti 13,20 €; con 20 iscritti 6,60 €; con 30 iscritti 4,40 €. A 30 €/h con 180 €: 10 iscritti = 18,00 €; 20 iscritti = 9,00 €.

Lettura: sotto i 10 iscritti il tempo del conduttore pesa più di un terzo del netto a 40 €. Oltre i 20 pesa poco.

## 2) Iscritti di pareggio (costo fisso ÷ netto per iscritto, arrotondato per eccesso)

Senza referral:

| Scenario costo | 30 € | 40 € | 50 € |
|---|---|---|---|
| 22 €/h, prep 0 (66 €) | 3 | 3 | 2 |
| 22 €/h, prep 1 (132 €) | 6 | 5 | 4 |
| 22 €/h, prep 2 (198 €) | 9 | 7 | 5 |
| 30 €/h, prep 0 (90 €) | 4 | 3 | 3 |
| 30 €/h, prep 1 (180 €) | 8 | 6 | 5 |
| 30 €/h, prep 2 (270 €) | 12 | 9 | 7 |

Con referral 7% sugli iscritti (caso peggiore):

| Scenario costo | 30 € | 40 € | 50 € |
|---|---|---|---|
| 22 €/h, prep 0 | 3 | 3 | 2 |
| 22 €/h, prep 1 | 6 | 5 | 4 |
| 22 €/h, prep 2 | 9 | 7 | 6 |
| 30 €/h, prep 0 | 5 | 4 | 3 |
| 30 €/h, prep 1 | 9 | 7 | 5 |
| 30 €/h, prep 2 | 13 | 10 | 8 |

Esempi di controllo: 132 ÷ 31,777 = 4,15, quindi 5. 270 ÷ 39,784 = 6,79, quindi 7. 270 ÷ 29,482 = 9,16, quindi 10. 180 ÷ 22,049 = 8,16, quindi 9.

**Il numero di pareggio più importante: 40 €/mese, 22 €/h, 1 ora di preparazione per ora di lezione (132 €/mese): 5 iscritti.** È lo scenario centrale. Il range realistico è da 3 a 10 iscritti. Peggior caso: 13 (30 €/h, 2 ore, 30 € di prezzo, con referral). Il pareggio è sul solo tempo del conduttore, senza costi fissi di piattaforma (H7) e senza il costo delle telefonate gratuite (vedi sotto).

## 3) Costo della telefonata gratuita per acquirente

Costo = minuti ÷ 60 x costo orario. Ipotesi H9: una sola telefonata a testa, e la fa il 100% degli acquirenti (caso peggiore). Il tempo di preparazione della call e le videoguide (da produrre una volta sola) non sono inclusi.

| Durata | A 22 €/h | A 30 €/h |
|---|---|---|
| 10 min | 3,67 € | 5,00 € |
| 15 min | 5,50 € | 7,50 € |
| 20 min | 7,33 € | 10,00 € |

Prezzo dell'agenda: non lo conosco (lo decide Marta dopo il test, come da memoria), quindi uso una tabella a 30/40/50/60 € IVA inclusa. Margine = prezzo ÷ 1,22 meno Stripe (1,9% + 0,25), cioè il netto per un acquisto singolo con pagamento Stripe. Questo margine è PRIMA di costo di stampa, spedizione, provvigioni dei rappresentanti: quelli li ignoro perché non ho dati, quindi il margine vero è più basso e la quota consumata dalla call è più alta di quella in tabella.

| Prezzo agenda IVA incl. | Margine dopo IVA e Stripe | Call 15 min a 22 €/h (5,50 €) | Call 15 min a 30 €/h (7,50 €) | Call 10 min a 22 €/h (3,67 €) | Call 20 min a 30 €/h (10 €) |
|---|---|---|---|---|---|
| 30 € | 23,77 € | 23,1% | 31,6% | 15,4% | 42,1% |
| 40 € | 31,78 € | 17,3% | 23,6% | 11,5% | 31,5% |
| 50 € | 39,78 € | 13,8% | 18,9% | 9,2% | 25,1% |
| 60 € | 47,79 € | 11,5% | 15,7% | 7,7% | 20,9% |

Controllo a 60 €: 60 ÷ 1,22 = 49,18; Stripe 1,14 + 0,25 = 1,39; margine 47,79. 5,50 ÷ 47,79 = 11,5%.

Quante telefonate ci si può permettere? Ipotesi H10: la call può consumare al massimo il 25% del margine dell'agenda (soglia mia, da decidere con Mason). Telefonate per acquirente = 25% del margine ÷ costo di una call.

| Prezzo agenda | 10 min a 22 €/h | 15 min a 22 €/h | 20 min a 22 €/h | 10 min a 30 €/h | 15 min a 30 €/h | 20 min a 30 €/h |
|---|---|---|---|---|---|---|
| 30 € | 1,6 | 1,1 | 0,8 | 1,2 | 0,8 | 0,6 |
| 40 € | 2,2 | 1,4 | 1,1 | 1,6 | 1,1 | 0,8 |
| 50 € | 2,7 | 1,8 | 1,4 | 2,0 | 1,3 | 1,0 |
| 60 € | 3,3 | 2,2 | 1,6 | 2,4 | 1,6 | 1,2 |

Lettura: a 30 € di agenda ci si può permettere una sola call, corta (10-15 min). A 50-60 € si arriva a 2 call da 15 minuti. Se il margine vero (dopo stampa e provvigioni) è la metà di quello in tabella, i numeri si dimezzano. Questa soglia va rifatta quando Marta fissa il prezzo e arrivano i preventivi di stampa.

## 4) Sensibilità: acquirenti dell'agenda necessari per avere N iscritti

Tassi di adesione = ipotesi, NON dati (non esiste ancora nessuna misura). Acquirenti = N ÷ tasso, arrotondati per eccesso.

| Iscritti voluti (N) | 3% | 5% | 10% | 20% |
|---|---|---|---|---|
| 5 (pareggio centrale) | 167 | 100 | 50 | 25 |
| 10 | 334 | 200 | 100 | 50 |
| 20 | 667 | 400 | 200 | 100 |
| 30 | 1.000 | 600 | 300 | 150 |

Costo delle call per ogni iscritto ottenuto = costo call ÷ tasso (ipotesi H9: tutti gli acquirenti fanno la call). Esempio con call da 15 min a 22 €/h (5,50 €): 3% = 183,33 €; 5% = 110,00 €; 10% = 55,00 €; 20% = 27,50 €. A 30 €/h (7,50 €): 250,00 / 150,00 / 75,00 / 37,50 €.

Valore di un iscritto a 40 €, senza referral, netto 31,78 € al mese, ipotesi di abbandono mensile H11 (non misurato): con 10% al mese resta in media 10 mesi, quindi 317,8 € lordi; con 20% al mese resta 5 mesi, quindi 158,9 €. Questi valori sono al lordo del costo del conduttore (già coperto dal pareggio).

Conclusione sul rapporto: con adesione 5% o più e abbandono 10% al mese, la call si ripaga (110 € di costo contro 318 € di valore). Con adesione 3% e abbandono 20% non si ripaga (183 € contro 159 €). Il punto debole è il tasso di adesione, che oggi è solo un'ipotesi.

## 5) Rischi e cosa misurare nei primi 3 mesi

Rischi:
1. Abbandono mensile: un abbonamento da 40 € si disdice in un clic. Per tenere N iscritti servono nuovi ingressi pari a N x tasso di abbandono ogni mese (esempio: 10 iscritti con abbandono 10% = 1 nuovo iscritto al mese, solo per restare fermi). Con 20% sono 2 al mese.
2. Dipendenza da una persona: la Masterclass è fatta dal conduttore. Se manca, si ferma tutto (malattia, ferie), e il tempo di quella persona non è disponibile per altro (newsletter, agenda, vendita). Il costo orario "interno" nasconde il costo di opportunità.
3. Saturazione del calendario: 2 incontri al mese da 90 minuti più preparazione (3-9 ore) più le telefonate gratuite. Con 200 acquirenti al mese e 15 minuti a call sono 50 ore di telefonate al mese: oltre il limite di una persona. Le call vanno limitate (prenotazione, tetto settimanale) oppure sostituite in parte dalle videoguide.
4. Rischio di pricing: i numeri sopra sono in discussione solo come ordine di grandezza. Il prezzo vero lo decide Mason (pricing gestito da lui, regola del 2026-10-02) e il secondo controllo indipendente va fatto prima di comunicarlo.
5. Coerenza con la voce: la telefonata deve accompagnare, non vendere (regola "accompagnare mai imporre"). Una call percepita come vendita danneggia la fiducia.

Da misurare nei primi 3 mesi (una riga per mese):
- Acquirenti dell'agenda e quanti prenotano la call (tasso di richiesta).
- Minuti reali per call e ore reali di preparazione per lezione (sostituiscono H5, H6 e H9).
- Conversione call -> iscrizione alla Masterclass (sostituisce le ipotesi 3/5/10/20%).
- Iscritti attivi a fine mese e abbandono mensile (sostituisce H11).
- Presenza agli incontri e domande ricorrenti (segnale di valore percepito).
- Netto incassato reale per iscritto (Stripe, IVA, eventuale referral) e confronto con il pareggio.
- Ore totali del conduttore al mese (call + lezioni + preparazione) contro la capacità disponibile.

## Parere in sintesi (raccomandazione: SI, con limiti e misure)

La Masterclass si regge con pochi iscritti: 5 a 40 €/mese nello scenario centrale. Il vero costo da controllare è la telefonata gratuita, soprattutto se l'agenda costa 30-40 € (consuma il 15-30% del margine) e se il tasso di adesione reale resta sotto il 5%. Conviene partire con una call corta (10-15 minuti), una sola per acquirente, con tetto settimanale, e decidere dopo 3 mesi con i dati misurati. Il prezzo è il tuo, Mason: i numeri sono solo ordini di grandezza.
