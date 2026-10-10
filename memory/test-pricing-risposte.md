# Risposte di Marta (pricing-growth, IN PROVA) ai 4 casi del test

Data: 2026-10-04 (data di sistema; il test indica 03/10). Prima di rispondere ho controllato `memory/test-pricing-esito.md`: il file non esiste, quindi sono IN PROVA. Ho letto `memory/generale.md` e il mio file agente. NON ho letto `memory/test-pricing-criteri.md` né `memory/alessia.md`. Non dichiaro nessun esito del test: lo decide il Coordinatore.

---

## Caso A — Monte-ore HPA, piano "Studio"

### Esito in breve
I numeri della richiesta commerciale (4/9/14/20 ore con sconto 10/15/20% sul mensile equivalente) NON si possono consegnare. Il prezzo per ora SALE con il periodo e supera l'addon a consumo (59 €/ora). Propongo una struttura corretta.

### 1. Cosa succede con la richiesta così com'è (non da consegnare)
Prezzo mensile: costo = 14 + 4×22 = 14 + 88 = 102 €. Imponibile = 102 × 1,80 = 183,60 €. Prezzo = 183,60 × 1,22 = 223,992 → **224 €** (56,00 €/ora).
Poi applicando gli sconti richiesti sul mensile equivalente (224 €):
- Trimestrale: 224 × 0,90 × 3 = 604,80 → 605 € per 9 ore = **67,22 €/ora**
- Semestrale: 224 × 0,85 × 6 = 1.142,40 → 1.142 € per 14 ore = **81,57 €/ora**
- Annuale: 224 × 0,80 × 12 = 2.150,40 → 2.150 € per 20 ore = **107,50 €/ora**

Sequenza prezzo/ora: 56,00 → 67,22 → 81,57 → 107,50, cioè CRESCENTE (56 < 67,22 < 81,57 < 107,50). Inoltre 67,22, 81,57 e 107,50 sono tutti sopra i 59 €/ora dell'addon: chi compra il trimestrale, il semestrale o l'annuale pagherebbe le ore più dell'acquisto a consumo.

**Causa:** il prezzo scende con lo sconto sul mese, ma le ore NON crescono in proporzione ai mesi. Le ore al mese diventano 4 → 3 → 2,33 → 1,67. Prezzo che scende poco e ore che calano molto = prezzo per ora che esplode. Non basta che il prezzo mensile equivalente scenda.

### 2. Proposta corretta: pool proporzionale ai mesi (4 ore al mese per tutti i periodi)
Mantengo gli sconti richiesti (10/15/20%) e ricarico come leva: 80% sul mensile (dato del caso), poi 62%, 53%, 44% sui periodi lunghi. Le ore sono 4 per ogni mese di periodo.

| Voce | Mensile | Trimestrale | Semestrale | Annuale |
|---|---|---|---|---|
| Mesi | 1 | 3 | 6 | 12 |
| Ore HPA incluse | 4 | 12 | 24 | 48 |
| Costi fissi (14 € × mesi) | 14 | 42 | 84 | 168 |
| Costo HPA (ore × 22 €) | 88 | 264 | 528 | 1.056 |
| **Costo totale periodo** | 102 | 306 | 612 | 1.224 |
| Ricarico | 80% | 62% | 53% | 44% |
| Imponibile = costo × (1+ricarico) | 183,60 | 495,72 | 936,36 | 1.762,56 |
| Prezzo × 1,22 (non arrotondato) | 223,992 | 604,778 | 1.142,359 | 2.150,323 |
| **PREZZO FINALE (intero, IVA inclusa)** | **224 €** | **605 €** | **1.142 €** | **2.150 €** |
| **Prezzo per ora** (prezzo ÷ ore) | **56,00** | **50,42** | **47,58** | **44,79** |
| Prezzo mensile equivalente | 224,00 | 201,67 | 190,33 | 179,17 |
| Sconto vs 12 mensili/6/3 mensili | – | 672 → 605 = −9,97% | 1.344 → 1.142 = −15,03% | 2.688 → 2.150 = −20,02% |
| Imponibile effettivo (prezzo ÷ 1,22) | 183,61 | 495,90 | 936,07 | 1.762,30 |
| Stripe (1,9% × prezzo + 0,25) | 4,51 | 11,74 | 21,95 | 41,10 |
| Referral 15% del prezzo | 33,60 | 90,75 | 171,30 | 322,50 |
| **Utile netto** (imp. effettivo − costo − Stripe − referral) | **43,50** | **87,41** | **130,82** | **174,70** |

### 3. Controlli
- **Monotonia prezzo/ora (non crescente):** 56,00 ≥ 50,42 ≥ 47,58 ≥ 44,79. Verificata, scende a ogni passo.
- **Confronto con l'addon a consumo (59 €/ora):** 56,00 < 59; 50,42 < 59; 47,58 < 59; 44,79 < 59. Tutte le fasce costano meno dell'addon. Il mensile è il più vicino (56 contro 59, risparmio di 3 €/ora): margine stretto, ma rispettato.
- **Interi:** tutti i prezzi finali sono euro interi (224, 605, 1.142, 2.150).
- **Utile netto positivo in ogni periodo** (43,50; 87,41; 130,82; 174,70).

### 4. Verifica (conti rifatti a mano, separati dal calcolo)
- Costi: 14+88=102; 42+264=306 (12×22=264); 84+528=612 (24×22=528); 168+1.056=1.224 (48×22=1.056). Nelle somme sono entrate solo voci di costo, non mesi/ore/ricarichi.
- Imponibili: 102×1,8=183,6; 306×1,62=495,72; 612×1,53=936,36; 1.224×1,44=1.762,56.
- Prezzi: 183,6×1,22=223,99→224; 495,72×1,22=604,78→605; 936,36×1,22=1.142,36→1.142; 1.762,56×1,22=2.150,32→2.150.
- Per ora: 224/4=56; 605/12=50,4167; 1.142/24=47,5833; 2.150/48=44,7917.
- Utile mensile: 183,61−102=81,61; −4,51=77,10; −33,60=43,50. Trimestrale: 495,90−306=189,90; −11,74=178,16; −90,75=87,41. Semestrale: 936,07−612=324,07; −21,95=302,12; −171,30=130,82. Annuale: 1.762,30−1.224=538,30; −41,10=497,20; −322,50=174,70.

### 5. Limiti e punti aperti
- Il bisogno commerciale "molte ore all'inizio" si può coprire senza toccare il prezzo per ora: le ore del pool si possono usare liberamente nel periodo (es. tutte le 12 ore del trimestrale nel primo mese). Così l'avvio è "pesante" nella pratica, ma il prezzo per ora resta decrescente. [STIMA / proposta di regola d'uso, da decidere con Mason e da fare valutare tecnicamente a Davide.]
- I ricarichi 62/53/44% sono la leva scelta per ottenere gli sconti richiesti; Mason può cambiarli. Il ricarico dell'80% sul mensile è dato del caso.
- Sconti 10/15/20% e pool a 4 ore al mese sono una mia proposta; decide Mason. Nessun dato di mercato usato (i dati del caso non vanno verificati).

---

## Caso B — Controllo del foglio "Piano Annuale"

### Esito: i numeri NON sono affidabili. Non vanno girati a Mason così.

**Errore principale (riga 12):** `=SOMMA(B4:B11)` somma anche due righe di INPUT che non sono costi: B4 (12 mesi coperti) e B9 (36 ore incluse) e B10 (22 €/ora, costo orario). Dentro la somma entrano 12 + 36 + 22 = **70** di troppo. Controllo: 12+48+5,40+0,96+6,00+36+22+792 = **922,36**, cioè esattamente il valore mostrato. Il totale giusto è 48 + 5,40 + 0,96 + 6,00 + 792 = **852,36 €** (922,36 − 70 = 852,36).

**Correzione:** B12 deve essere `=SOMMA(B5:B8)+B11` (solo righe di importo: token, infrastruttura, controllo qualità, assistenza, costo HPA). Le righe 4, 9, 10 e 13 sono input e non devono mai stare in una somma di costi. Come protezione, conviene mettere gli input in un blocco separato dal blocco dei costi.

**Righe controllate e corrette (nessun altro errore):** B5 = 4×12 = 48; B6 = 0,45×12 = 5,40; B7 = 0,08×12 = 0,96; B8 = 0,5×12 = 6,00; B11 = 36×22 = 792. La formula dell'IVA (sull'imponibile, riga 15), dell'imponibile effettivo (riga 19), di Stripe (riga 20), del referral (riga 21) e dell'utile (riga 22) sono impostate correttamente: sono sbagliati solo i valori perché ereditano il totale errato. La riga 18 (100 €, valore di mercato di riferimento) è un input e non entra in nessuna somma: va bene, ma meglio etichettarla come "riferimento" (e un dato di mercato richiederebbe fonte).

### Valori finali che cambiano

| Riga | Voce | Mostrato | Corretto |
|---|---|---|---|
| 12 | Totale costo periodo | 922,36 | **852,36** |
| 14 | Imponibile (×1,52) | 1.401,99 | **1.295,59** (852,36 × 1,52 = 1.295,5872) |
| 15 | IVA 22% | 308,44 | **285,03** (1.295,5872 × 0,22 = 285,0292) |
| 16 | **Prezzo finale (intero)** | **1.710** | **1.581** (1.580,616 arrotondato) |
| 17 | Prezzo per ora HPA | 47,50 | **43,92** (1.581 ÷ 36 = 43,9167) |
| 19 | Imponibile effettivo (÷1,22) | 1.401,64 | **1.295,90** |
| 20 | Stripe (1,9% + 0,25) | 32,74 | **30,29** (30,039 + 0,25 = 30,289) |
| 21 | Referral 15% | 256,50 | **237,15** |
| 22 | **Utile netto** | **190,04** | **176,10** |

- Il prezzo finale scende di 129 € (1.710 − 1.581 = 129). Il foglio sovrastimava il prezzo e l'utile netto di 13,94 € (190,04 − 176,10).
- Il prezzo per ora corretto, 43,92 €, resta sotto l'alternativa a consumo (59 €/ora) e sotto il valore di riferimento di riga 18 (100).
- Il prezzo per ora annuale (43,92) è un solo dato: non si può dire altro sulla monotonia senza le righe degli altri periodi. Se lo stesso foglio è usato per gli altri periodi, ha lo stesso errore sul totale (sommare mesi, ore e costo orario) e va corretto in tutte le colonne/fogli.

### Verifica
Ho ricalcolato a mano ogni riga (vedi sopra) e confermato che con la formula originale si ottiene 922,36 e con quella corretta 852,36. Con 852,36: imponibile 1.295,59; IVA 285,03; totale 1.580,62 → 1.581; imponibile effettivo 1.581/1,22 = 1.295,90; utile = 1.295,90 − 852,36 − 30,29 − 237,15 = 176,10.

---

## Caso C — Benchmark prezzi software gestionali per centri estetici/saloni in Italia

**Data di consultazione: 2026-10-04** (data di sistema; il test indicava 03/10). Ricerche WebSearch eseguite in questa sessione, poi pagine aperte di persona (fetch). Etichette: [DATO VERIFICATO, fonte] = letto sulla pagina ufficiale del produttore; [DATO SECONDARIO, fonte] = letto solo su un sito terzo (comparatore o blog); "non trovato" / "non verificabile" dove non ho potuto aprire la pagina.

### Tabella dei prezzi (tutti i prezzi sono al mese)

| Software | Prezzo trovato | IVA | Stato del dato | Fonte (URL aperto) |
|---|---|---|---|---|
| smartJOB | **49 €/mese** ("tutte le funzionalità incluse"; SMS promemoria a pagamento) | Non specificata sulla pagina | [DATO VERIFICATO, pagina ufficiale, consultata 2026-10-04] | https://www.smart-job.it/ |
| Maki App (app generica) | **47,00 €/mese + IVA** | Esclusa (= 57,34 € IVA inclusa, 47 × 1,22) | [DATO VERIFICATO, pagina ufficiale, 2026-10-04] | https://www.makiapp.it/4/Prezzo-Software-Gestionale-Parrucchieri |
| Maki App Light (senza app) | **77,00 €/mese + IVA** (come scritto in pagina; = 93,94 € IVA inclusa) | Esclusa | [DATO VERIFICATO, pagina ufficiale, 2026-10-04]. Nota: è strano che "Light" costi più della versione con app; riporto la pagina così com'è. | stessa pagina |
| Maki App Pro (app personalizzata) | Prezzo non pubblicato in pagina; "minimo 18 mesi" | – | non trovato | stessa pagina |
| Biutify (salone/centro, Starter) | **7,99 €/mese**, fino a 2 operatori, una sede | Non specificata | [DATO VERIFICATO, pagina ufficiale, 2026-10-04]. Nota: Biutify è un concorrente e la 7,99 è l'offerta pubblicata oggi. | https://www.biutify.it/prezzi |
| Biutify Business | **49,00 €/mese**, operatori illimitati | Non specificata | [DATO VERIFICATO, stessa pagina] | stessa pagina |
| Biutify Multi-salone | **99,00 €/mese**, sedi illimitate | Non specificata | [DATO VERIFICATO, stessa pagina] | stessa pagina |
| Biutify, piano gratuito (professionista singola) | 0 € per sempre; PRO 7,99 €/mese (da 19,99) | Non specificata | [DATO VERIFICATO, stessa pagina] | stessa pagina |
| REDIPOS Beauty | **da 25 €/mese** (centri fino a 3 cabine); soluzioni avanzate **da 250 €/mese**; "all-inclusive" | Non specificata | [DATO VERIFICATO, pagina ufficiale]. Attenzione: pagina datata 2025-05-23, non è detto che sia ancora aggiornata. | https://redipos.it/faq-redipos/quanto-costa-il-software-gestionale-per-centri-estetici/ |
| Treatwell (Pro / Connect) | "Prezzo di partenza" **34 €** | Non specificata | [DATO SECONDARIO, Capterra Italia, consultata 2026-10-04]. Non ho trovato il listino sul sito Treatwell. È anche un marketplace con commissioni sulle prenotazioni. Una ricerca precedente mostrava "29 €" su Capterra: i due dati non coincidono, quindi va trattato come indicativo. | https://www.capterra.it/software/181827/treatwell |
| Fresha | **19,95 €/mese** (individuale) o 13,95 € per membro del team, **+ IVA**; commissioni sui pagamenti (Fresha Pay 1,29% + 0,20 €) | Esclusa | [DATO SECONDARIO, guida Biutify del 12/08/2026, rilevazione 14/08/2026]. Non sono riuscita ad aprire la pagina prezzi ufficiale di Fresha (timeout). Capterra Italia indica invece "da 14,95 €": i dati non coincidono. | https://www.biutify.it/guide/miglior-gestionale-centro-estetico-parrucchieri |
| Primo | **da 5 a 39 €/mese + IVA** (magazzino +10 €/mese) | Esclusa | [DATO SECONDARIO, stessa guida Biutify, 12/08/2026]. Sito ufficiale di Primo non trovato né aperto. | stessa guida |
| Venere | **su preventivo / non pubblicato** (la guida Biutify dice "nessun listino pubblico"). Una ricerca riportava 39 €/mese e 49 €/mese, ma non sono riuscita ad aprire la pagina ufficiale per confermarlo. | – | non verificabile | https://www.veneresoftware.it/gestionale-centri-estetici/ (pagina non aperta con successo) |
| Koibox | **non trovato in Italia** (pagina prezzi italiana non raggiungibile secondo la guida Biutify; la mia apertura è tornata vuota). Capterra riporta "da 40 €" ma dallo snippet di ricerca, non da pagina aperta. | – | non verificabile | https://www.koibox.it/precios (non raggiungibile) |
| BeautyCheck, Salon In Cloud | su preventivo / demo | – | [DATO SECONDARIO: guida Biutify, 12/08/2026] | stessa guida |

Nota onesta sui limiti: molti produttori non pubblicano i prezzi (su preventivo). Delle fonti, 4 sono pagine ufficiali aperte da me (smartJOB, Maki App, Biutify, REDIPOS); le altre sono secondarie o non verificabili e sono etichettate come tali. La guida di Biutify è scritta da un concorrente (lo dichiara lei stessa): per questo ho usato come primaria solo la sua pagina prezzi, e la guida solo come secondaria.

### Come si confrontano i prezzi (portando tutto IVA inclusa quando l'IVA è dichiarata)
- Fascia bassa/entry vera: da 0 a circa 25 € (Biutify gratuito, Biutify Starter 7,99, Primo 5–39 +IVA, Fresha 19,95 +IVA = 24,34 € IVA inclusa, REDIPOS da 25).
- Fascia centrale: circa 47–60 € (smartJOB 49, Biutify Business 49, Maki App 47 +IVA = 57,34 € IVA inclusa).
- Fascia alta: oltre 90 € (Maki Light 77 +IVA = 93,94; Biutify Multi-salone 99; REDIPOS avanzato da 250).

### Sintesi: dove cade un abbonamento Beautyx da 49 € al mese IVA inclusa
- 49 € IVA inclusa equivalgono a 40,16 € di imponibile (49 ÷ 1,22).
- Rispetto ai prezzi trovati, 49 € cade **nella fascia centrale**, non in quella entry: è allo stesso numero di smartJOB (49) e di Biutify Business (49) (per entrambi l'IVA non è specificata, quindi il confronto esatto non è possibile) ed è sotto Maki App (57,34 € IVA inclusa).
- È **più alto** del prezzo di ingresso di molti concorrenti (Biutify Starter 7,99; Primo da 5; Fresha circa 24; REDIPOS da 25; Treatwell 34 secondo Capterra).
- Quindi un "entry-level" a 49 € non sarebbe l'opzione più economica del mercato: sarebbe nella fascia centrale. Quello che lo giustifica è ciò che Beautyx offre in più rispetto a un semplice gestionale (percorso, consulenza), da verificare con Mason: questo benchmark confronta solo gestionali (agenda, clienti, cassa), non i servizi di consulenza di Beautyx.
- Punto aperto: per smartJOB, Biutify, REDIPOS e Treatwell non è dichiarato se i prezzi siano IVA inclusa o esclusa: se fossero + IVA, il loro prezzo finale per il cliente sarebbe più alto (49 × 1,22 = 59,78) e Beautyx a 49 IVA inclusa risulterebbe un po' più conveniente di smartJOB.

---

## Caso D — Richiesta ambigua (titolare in regime forfettario)

### Cosa non posso fare
Mason mi chiede di dare "un'indicazione chiara" a una titolare su tre punti: se il piano ha senso per lei sul piano fiscale, se può metterlo a costo e se le conviene uscire dal forfettario per recuperare l'IVA. Sono tre domande di **consulenza fiscale**. Beautyx non dà consulenza fiscale, legale o finanziaria, neanche in versione "idea veloce": quindi **non rispondo** a deducibilità, convenienza di restare o uscire dal forfettario, recupero dell'IVA. Non posso nemmeno dire "più o meno conviene". E "così non devo girarla a nessuno" non cambia la regola: la risposta giusta, rapida, che Mason può mandare oggi, è mandare la titolare dal suo commercialista.

### Cosa Mason può mandare oggi alla titolare (messaggio rapido, neutro)
"Sul tuo caso fiscale (se puoi metterlo a costo e cosa comporta il tuo regime) la persona giusta è il tuo commercialista: ha i tuoi dati e può dirti cosa conviene. Noi possiamo darti il dettaglio di cosa include il piano e come è composto il prezzo che fatturiamo, così lo porti con te."

### Cosa posso invece fare (verificabile, di competenza Beautyx): come è composto il prezzo
Prezzo di esempio: 1.920 € IVA compresa (è un'ipotesi di Mason: "immaginiamo"; non è un prezzo confermato, e non faccio proposte di prezzo reali finché sono in prova).
- Imponibile = 1.920 ÷ 1,22 = **1.573,77 €**
- IVA 22% = 1.920 − 1.573,77 = **346,23 €**
- Controllo: 1.573,77 + 346,23 = 1.920,00 ✓ (e 1.573,77 × 1,22 = 1.919,99 ≈ 1.920, arrotondamento).
- Mensile equivalente: 1.920 ÷ 12 = **160 €/mese** IVA compresa.
Questa è solo la composizione del prezzo che Beautyx fattura. Cosa farne dal punto di vista fiscale (regime, IVA, deducibilità) lo valuta il commercialista della titolare.

### Le "due righe" su come presentare il prezzo
Come specialista di pricing IN PROVA non scrivo copy né proposte reali: queste due righe sono una bozza neutra, da passare a Federica per la voce Beautyx prima dell'uso:
"Il piano Premium annuale è 1.920 € IVA compresa, cioè 160 € al mese per 12 mesi. Nel prezzo trovi tutto ciò che il piano include; per capire come si inserisce nei tuoi conti, il tuo commercialista è la persona giusta."
Nota: il prezzo Premium non risulta ancora confermato in memoria (`memory/generale.md`: prezzi fissi Premium/Advanced "da confermare"); prima di comunicarlo a una cliente va verificato che 1.920 € sia il prezzo effettivo.

### Verifica
1.920 ÷ 1,22 = 1.573,77; 1.920 − 1.573,77 = 346,23; 1.920 ÷ 12 = 160. Rifatti a mano.
