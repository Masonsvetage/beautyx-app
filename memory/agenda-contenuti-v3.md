# Agenda annuale 2027 — contenuti v3 (cicli energetici + utile visibile ogni giorno)

Autrice: Federica. Data: 06/10/2026. Stato: proposta per Mason, nulla è approvato. Nessun gate di revisione (Elena e Alessia sono fuori dal team).
Questo file SUPERA `agenda-contenuti-v2.md`, che resta com'è come storico.

**USO INTERNO.** Le sezioni 1 e 2 nominano elementi e cicli: non vanno mai in testi pubblici. Pubblico solo ciò che è marcato "testo pubblico" (nomi delle edizioni dopo approvazione, microcopy della sezione 7, diciture).

Fonti lette: v2; scheda SvetAge; Manuale Operativo e Documento Riepilogativo; `mappa-cicli-proposta.md`; `cinque-elementi-fonti.md`; `lib/beautyx/profilingEngine.js` (solo lettura); `memory/generale.md` (sezioni del 06/10) e voce Beautyx.
Sigle: **L r.NNN** = riga del libro (come citata dalla scheda); **R1...R8** = Regole del libro; **Err.N** = capitolo dell'Errore N; **Man.** = Manuale Operativo.

---

## 1. Cosa esce davvero dal test (e quante edizioni servono)

Il motore (`profilingEngine.js`, `individuaBlocco`, righe 106-117, e `calcolaPunteggiFinali`, righe 517-601) somma i punteggi di tutti gli scenari e produce:
- **elemento dominante** = quello col punteggio più alto (a parità vince il primo nell'ordine fuoco, acqua, aria, terra, metallo);
- **carenza** = il controllore del dominante nel ciclo di controllo;
- **leva** = il nutritore della carenza nel ciclo generativo;
- più `tipo_blocco` (trasversale o localizzato, cioè se il dominante guida tutti e 3 gli ambiti) e `significativo` (il dominante spicca sulla media?).

La carenza e la leva NON sono misurate: sono calcolate dal dominante. Quindi la regola lega le tre cose 1 a 1. Combinazioni (dominante, debole, leva) raggiungibili: **5**, non 125. Edizioni distinte necessarie: **5**.

**Cicli della tradizione, con Aria = Legno (decisione del 06/10, ipotesi di lavoro, certezza media; fonte `mappa-cicli-proposta.md`, sez. 2.1).** Ho ricontrollato ogni riga a mano sui due cicli: nutrimento Aria → Fuoco → Terra → Metallo → Acqua → Aria; controllo Aria → Terra → Acqua → Fuoco → Metallo → Aria.

| Edizione | Dominante (tono) | Debole = controllore | Leva = nutritore del debole |
|---|---|---|---|
| 1 | Fuoco | Acqua | Metallo |
| 2 | Acqua | Terra | Fuoco |
| 3 | Aria | Metallo | Terra |
| 4 | Terra | Aria | Acqua |
| 5 | Metallo | Fuoco | Aria |

Tre avvisi:
1. **Il codice oggi usa ancora i cicli vecchi** (righe 69 e 73 del motore, non ancora aggiornate da Davide). Con i cicli vecchi la tabella cambia in 4 righe su 5: Acqua (debole Aria, leva Fuoco), Aria (debole Terra, leva Acqua), Terra (debole Metallo, leva Aria), Metallo (debole Fuoco, leva Terra); solo il Fuoco resta uguale. Le edizioni non si possono scrivere in via definitiva finché il motore e la mappa non coincidono.
2. **Con una persona "senza dominante netto"** (`significativo` falso) il motore dà comunque un dominante. Cosa stampare in quel caso: vedi sezione 9, D2.
3. `tipo_blocco` (2 varianti) non serve all'agenda: usarlo darebbe 10 edizioni. Lo lascio fuori.

---

## 2. Come "elemento debole e leva" diventano pagine concrete

**Regola (mia traduzione della correzione di Mason, da fargli confermare).** Ogni edizione ha tre livelli, e solo il primo parla al dominante:
1. **Tono** (frasi, titoli, modo di dire le cose): parla il linguaggio del dominante, così la titolare si riconosce.
2. **Esercizi e rituali** (cosa si fa nella pagina): sono i gesti della **leva**. Nutrono il debole, quindi mitigano l'eccesso.
3. **Domande della settimana e del mese**: portano l'attenzione sul comportamento del **debole**, senza mai dire che le manca.

Come si traduce nel concreto: ogni elemento diventa un comportamento osservabile (definizioni di Mason, profiling note r. 40-44; descrizioni delle fonti solo come tendenze).

| Elemento (interno) | Comportamento che diventa pagina |
|---|---|
| Fuoco | iniziare subito, entusiasmo, festeggiare un passo chiuso |
| Acqua | fermarsi, osservare, ascoltare, capire prima di decidere |
| Aria | rivedere una regola o un'offerta, provare una novità |
| Terra | ripetere con costanza, abitudini stabili, portare a termine |
| Metallo | criteri scritti, controllo finale, rifinire, tagliare il superfluo |

| Ed. | Tono (dominante) | Esercizi e rituali (leva) | Domande (debole) | Pagina ad hoc |
|---|---|---|---|---|
| 1 Fuoco | Diretto, energico, frasi brevi. Riconosce lo slancio. | Metallo: "I miei 3 criteri" scritti prima di ogni spesa; stessa checklist di chiusura ogni sera; a fine settimana "una cosa da rifinire" invece di una nuova. | Acqua: "Cosa ho notato che prima mi era sfuggito?" "Cosa decido dopo averci dormito sopra?" | "Aspetto 2 giorni" (idee in sala d'attesa: data, costo, ancora convinta?) |
| 2 Acqua | Calmo, riflessivo, spazio per le note. | Fuoco: "un passo piccolo con data entro 48 ore"; un gesto di festa quando lo chiudi; dire a una persona un numero. | Terra: "Cosa ripeto ogni giorno alla stessa ora?" "Cosa porto a termine questa settimana?" | "Passi chiusi" (registro dei passi con data) |
| 3 Aria | Chiaro, orientato alla direzione e alle scelte. | Terra: "cosa tengo di ciò che funziona" prima di ogni cambiamento; una routine uguale ogni giorno; una novità alla volta. | Metallo: "Quale standard tengo uguale per tutte?" "Cosa ho finito bene prima di partire con altro?" Verifica a 14 giorni obbligatoria. | "Novità in prova" (cosa cambio, quando verifico, com'è andata) |
| 4 Terra | Caldo, di cura, concreto. | Acqua: 5 minuti di osservazione senza decidere; "un numero che mi sorprende"; mezzo minuto di silenzio prima di rispondere sì a una richiesta. | Aria: "Quale abitudine del centro riguarderei con occhi nuovi?" "Quale prova piccola faccio per due settimane?" | "Per me" (il mio stipendio, una cosa fatta per me ogni settimana) + "Cosa ho osservato" |
| 5 Metallo | Preciso, ordinato, essenziale. | Aria: "esperimento della settimana" (una cosa nuova, lasciata imperfetta, controllo solo dopo); rivedere una regola mia ogni mese; tolleranza scritta ("sotto 1 euro non correggo"). | Fuoco: "Cosa mi ha divertito nel centro?" "Quando basta 'abbastanza bene'?" | "Cosa ho provato" (esperimenti e cosa è successo) |

Cosa cambia rispetto alla v2: lì la titolare riceveva più di ciò che aveva già (ad esempio "Slancio" festeggiava i traguardi a chi ha già troppo slancio). Ora lo stesso tipo riceve il gesto opposto, detto con la sua voce.

**Limiti dichiarati.** Le descrizioni sono tendenze di una tradizione, non un risultato scientifico, e "Aria = Legno" è un'ipotesi. L'agenda dice sempre "spunto di riflessione" (formula sicura, `limiti-validita.md` sez. 4). Il debole è dedotto, non misurato: due titolari con lo stesso dominante ricevono la stessa edizione.

---

## 3. Nomi pubblici da far approvare

Le 5 edizioni sono le righe della tabella. Le due colonne di nomi sono **alternative** per la stessa edizione: se ne sceglie una per riga, non nascono edizioni in più. Il tipo interno è scritto solo qui e non compare mai sulla copertina.

| Edizione (tipo interno, solo qui) | Proposta 1 | Proposta 2 |
|---|---|---|
| 1 (Fuoco) | Slancio | Vivace |
| 2 (Acqua) | Sguardo | Lungimirante |
| 3 (Aria) | Rotta | Decisa |
| 4 (Terra) | Punto Fermo | Premurosa |
| 5 (Metallo) | Misura | Meticolosa |

Il nome riconosce il dominante (come il tono). Nessun nome richiama una parola-elemento: controllo fatto a mano, non da terzi. Marchio e omonimie: non verificati.

---

## 4. Struttura dell'anno 2027 (1 gennaio – 31 dicembre)

Anno solare, con le date stampate. Il 1 gennaio 2027 è un venerdì e il 31 dicembre un venerdì. Non è un planner di appuntamenti: nessuna ora, nessun nome di cliente.

### 4.1 Calendario di lavoro

| Tappa | Date | Tema | Regole/Errori del libro |
|---|---|---|---|
| 1 | 1 gen – 31 mar | Guardo i miei numeri | R2 (risparmiare senza toccare la qualità, L r.2378-2395), R3 (spese e investimenti) |
| 2 | 1 apr – 30 giu | Metto d'accordo costi, tempi e prezzi | R4, R5 (listino, L r.3829-4040) |
| 3 | 1 lug – 30 set | Guardo chi mi sceglie | R6, R7 |
| 4 | 1 ott – 31 dic | Consolido e preparo l'anno dopo | R8, aggiornamento = investimento (L r.5232-5233), "mai sentirsi arrivati" (L r.615) |

- **Riepiloghi settimanali: 53.** Settimane lunedì–domenica: la prima copre venerdì 1 – domenica 3 gennaio (3 giorni), poi 51 settimane intere dal 4 gennaio al 26 dicembre, l'ultima va da lunedì 27 a venerdì 31 dicembre (5 giorni). Controllo: 3 + 51 x 7 + 5 = 365.
- **Tagliandi mensili: 12**, da fare entro i primi 5 giorni del mese dopo, riferiti a: 31 gen, 28 feb, 31 mar, 30 apr, 31 mag, 30 giu, 31 lug, 31 ago, 30 set, 31 ott, 30 nov, 31 dic. Le tasse annuali si accantonano nei mesi da gennaio a ottobre (Man. sez. 3).
- **Festività 2027 da stampare** (da verificare sul calendario scelto): 1 gen, 6 gen, Pasqua dom 28 mar, Pasquetta lun 29 mar, 25 apr, 1 mag, 2 giu, 15 ago, 1 nov, 8 dic, 25 dic, 26 dic.
- Nessun vincolo di fiere sul calendario.

### 4.2 Pagine di apertura (8 pagine, si compilano una volta)

| Pagina | Contenuto | Fondamento |
|---|---|---|
| A1 "Perché ho aperto" | Motivazioni di allora e di oggi; frase "Il mio centro è lo strumento con cui voglio..." | R1, es. 1-2 (L r.1933-1938); Mario e Michele (L r.1783-1811) |
| A2 "Il mio sogno e la mia scala" | Sogno in una frase; obiettivo dell'anno con numero o data; 4 livelli (uno per tappa) con mission, punto di partenza, punto di arrivo, 3 step con data, data di verifica | R1, es. 3-4 (L r.1840-1865, 1940-1947) |
| A3 "Le mie 3S" | Cerchio Serenità, Stima, Soldi più Successo al centro; "Come sto oggi?" per spicchio | 3S+1 (L r.1445-1690) |
| A4 "Il mio punto di partenza" | Tabella dei costi annui (23 voci del libro + righe libere), compreso il mio stipendio. Poi: giorni di apertura all'anno, ore di apertura al giorno. Calcolo guidato (sotto). | L r.5407-5466, 5468-5479; Err.3 (L r.3252-3263) |
| **A5 "Prima si risparmia" (nuova)** | Le mie percentuali e importi, scritti da me con il mio commercialista (campi sotto). Dove tengo gli accantonamenti. Dicitura fissa. | Man. sez. 2-3 |
| A6 "Spese, investimenti, da definire" | Schema a 3 colonne; domanda "Quanto mi rende?" | R3 (L r.3019, 3061, 2910) |
| A7 "I miei 10 errori" | Tabella con una riga per errore; cerchio sui più commessi | L r.2150-2273 |
| A8 "Le regole in vista + il patto" | Le 8 Regole; patto "Cinque minuti al giorno. Se salto, riprendo da oggi."; "Dopo queste pagine mi sento carica o stanca?" | L r.1233-1247, 1949-1954 |

**Pagina A2 (obiettivi e step), schema invariato dalla v2:**
```
IL MIO SOGNO (una frase)  ->  IL MIO OBIETTIVO DELL'ANNO (con un numero o una data; "È davvero mio?")
LIVELLO 1 (tappa 1) | LIVELLO 2 | LIVELLO 3 | LIVELLO 4
Per ogni livello: mission; da dove parto (un numero); dove arrivo (lo stesso numero);
3 step con data; data di verifica: raggiunto? [ ] sì [ ] in parte [ ] no, cosa cambio
Esempio stampato (libro): livello 1 = ottimizzare i costi; livello 2 = far tornare le clienti che non vedo da tempo (L r.1855-1860)
```
Le domande guida di A2 cambiano per edizione (sezione 2): il dominante imposta il livello, il debole sceglie il primo step.

**Pagina A4, calcolo guidato (formule fisse):**
- costo giornaliero del centro = spese annue ÷ giorni di apertura annui
- ore di apertura annue = giorni di apertura x ore di apertura al giorno
- **costo al minuto = (spese annue ÷ ore di apertura annue) ÷ 60**
- Esempio del libro, ricalcolato a mano (230 giorni, 10 ore, spese 77.650 €): 77.650 ÷ 230 = 337,61 al giorno; 230 x 10 = 2.300 ore; 77.650 ÷ 2.300 = 33,76 all'ora; 33,76 ÷ 60 = 0,56 al minuto. Solo esempio: la titolare usa i SUOI giorni e le SUE ore.
- Accanto a ogni voce una lettera: **C** = costo corrente (rientra nella quota giornaliera) oppure **A** = lo accantono a parte (TFR, tasse). Le voci A restano nel costo totale (serve al costo al minuto e al Listino) ma non si contano due volte nella pagina giornaliera.

**Pagina A5, campi (tutti scritti dalla titolare):**
1. Aliquota IVA: ____ % (esempio del libro: 22%; casella "non applico IVA").
2. IVA a credito: come la gestisco col mio commercialista: ____
3. TFR: importo mensile ____ €, arrotondato per eccesso (Man.: se 210, accantona 250). Casella "non ho dipendenti".
4. Tasse annuali: importo dell'anno scorso ____ ÷ 10 = ____ € al mese, da gennaio a ottobre.
5. Fondo Serenità: ____ % dell'incasso senza IVA (la scelgo io).
6. Il mio stipendio mensile (dentro i costi): ____ €.
7. Dove tengo gli accantonamenti (conto o busta separata dal conto del centro): ____
8. Dicitura stampata sotto: **"Beautyx non è consulenza fiscale. Le percentuali e gli importi li scrivi tu, con il tuo commercialista."**

### 4.3 Pagina giornaliera: dall'incasso all'utile (3-5 minuti)

Mason: il cuore dell'agenda è la **scala del denaro**, con l'**utile del giorno** nel riquadro più grande. Nel Manuale la regola d'oro è "Prima si risparmia, poi si spende" e gli accantonamenti si fanno subito dopo ogni incasso (Man. sez. 2). Ordine dei campi:

1. Data stampata. **Il mio scopo di oggi** (una riga, la mattina; L r.1888-1890).
2. **La scala del denaro:**
   - **A. Incassato oggi (IVA inclusa)** ____
   - **B. meno IVA da accantonare** = A x aliquota ÷ (100 + aliquota) ____
   - **C. = Incasso senza IVA** ____
   - **D. meno accantonamenti di oggi:** TFR ____ + Tasse annuali ____ + Fondo Serenità ____ = ____ (quote giornaliere dalla testata del mese)
   - **E. = Resta per il centro** ____
   - **F. meno la quota del costo del centro** (dalla testata del mese; il mio stipendio è già dentro) ____
   - **G. = UTILE DEL GIORNO** ____ (riquadro grande)
3. [ ] **Ho messo da parte oggi** IVA e accantonamenti nel posto separato.
4. Di cui vendita prodotti ____ · Clienti servite ____ (L r.3439, 3925).
5. **Speso oggi**, fino a 3 righe: per cosa | quanto | S / I / ? (R3, L r.2910). [ ] Questo costo torna ogni mese? (lo riporto nel tagliando).
6. Una frase sentita da una cliente (facoltativo; L r.1558-1580).

Versione minima nei giorni pesanti: solo A e G ("giornata no? bastano due righe"). Per le giornate con utile negativo la pagina stampa: "Un giorno sotto il costo è un dato, non un giudizio. Guarda la settimana."

**Testata del mese** (una pagina all'inizio di ogni mese, compilata dalla titolare con le formule):
- costo giornaliero corrente = (spese annue − voci A) ÷ giorni di apertura annui;
- TFR di ogni giorno = TFR mensile ÷ giorni di apertura del mese;
- tasse di ogni giorno = (importo annuo ÷ 10) ÷ giorni di apertura del mese (zero a novembre e dicembre);
- Fondo Serenità = la % scelta; aliquota IVA; giorni di apertura del mese.

**Esempio svolto (solo per spiegare; numeri inventati salvo la tabella del libro; ricalcolato a mano).** Libro: spese 77.650 €, TFR 700 € (voce A), stipendio titolare 20.000 €, 230 giorni. Valori della titolare inventati per l'esempio: aliquota 22%, 20 giorni di apertura nel mese, tasse dell'anno scorso 6.000 €, Fondo Serenità 5%.
- Costo giornaliero corrente: (77.650 − 700) ÷ 230 = 76.950 ÷ 230 = **334,57**. Di cui stipendio: 20.000 ÷ 230 = 86,96.
- TFR al giorno: 700 ÷ 12 = 58,33, per eccesso 60 al mese; 60 ÷ 20 = **3,00**.
- Tasse al giorno: 6.000 ÷ 10 = 600 al mese; 600 ÷ 20 = **30,00**.
- Giornata con incasso 600,00 IVA inclusa: IVA = 600 x 22 ÷ 122 = **108,20**; senza IVA = 491,80. Fondo Serenità = 5% di 491,80 = **24,59**. Accantonamenti D = 3,00 + 30,00 + 24,59 = **57,59**. Resta per il centro = 491,80 − 57,59 = **434,21**. Quota costo = **334,57**. **Utile del giorno = 434,21 − 334,57 = 99,64.**
- Se l'incasso di quel giorno fosse 450,00: IVA 81,15; senza IVA 368,85; Fondo 18,44; accantonamenti 51,44; resta 317,41; utile 317,41 − 334,57 = **−17,16**. Per questo conta la settimana (4.4).

### 4.4 Riepilogo settimanale (ogni 7 giorni circa, 10 minuti)

Si apre con gli obiettivi, poi i numeri:
1. **Il mio obiettivo** (dal livello in corso, A2).
2. **Lo step della settimana**: fatto? [ ] sì [ ] in parte [ ] no, senza giudizio (R1 rifl. 3, L r.1926-1927). Sono sulla rotta? "Quello che ho fatto è utile per la mia mission?" (L r.1929).
3. **I numeri della settimana:** incassato (IVA inclusa) | IVA accantonata | incasso senza IVA | accantonato (TFR + tasse + Fondo) | costo del centro della settimana | **UTILE DELLA SETTIMANA** (riquadro) | accantonato da inizio anno. Giorno migliore e giorno più debole.
4. **Tre domande fisse:** quale spesa rifarei e quanto mi ha reso (L r.2910); cosa mi hanno detto le clienti (L r.1565-1580); mi sento carica o stanca (L r.1949-1954).
5. **La domanda della settimana** (n. 1-53, cambia per edizione) e **l'esercizio della settimana** (della leva).
6. **Il mio passo della prossima settimana** + data di verifica.

**Esempio svolto (5 giorni, stessi valori dell'esempio sopra, ricalcolato a mano).** Incassi IVA inclusa: lunedì 600, martedì 450, mercoledì 520, giovedì 380, venerdì 700.

| Giorno | Incasso | IVA | Senza IVA | Accantonamenti (TFR 3 + tasse 30 + Fondo 5%) | Costo | Utile |
|---|---|---|---|---|---|---|
| Lun | 600,00 | 108,20 | 491,80 | 57,59 | 334,57 | 99,64 |
| Mar | 450,00 | 81,15 | 368,85 | 51,44 | 334,57 | −17,16 |
| Mer | 520,00 | 93,77 | 426,23 | 54,31 | 334,57 | 37,35 |
| Gio | 380,00 | 68,52 | 311,48 | 48,57 | 334,57 | −71,66 |
| Ven | 700,00 | 126,23 | 573,77 | 61,69 | 334,57 | 177,51 |
| **Settimana** | **2.650,00** | **477,87** | **2.172,13** | **273,60** | **1.672,85** | **225,68** |

Controlli: 2.650 − 477,87 = 2.172,13; 2.172,13 − 273,60 − 1.672,85 = 225,68; somma degli utili giornalieri 99,64 − 17,16 + 37,35 − 71,66 + 177,51 = 225,68. Accantonato in totale nella settimana (IVA + altri) = 477,87 + 273,60 = **751,47**.

### 4.5 Riepilogo mensile e riconciliazione (30 minuti, collegato al Listino)

1. **Riconciliazione con i costi reali.** Quota usata nei giorni = giorni di apertura x costo giornaliero corrente. Costi reali del mese (da estratto conto e fatture). Scarto = reali − quota. **Utile del mese corretto = somma degli utili giornalieri − scarto.** Esempio (numeri inventati): 20 x 334,57 = 6.691,40; costi reali 6.850,00; scarto 6.850,00 − 6.691,40 = 158,60; con utili giornalieri sommati pari a 1.800,00, utile corretto 1.800,00 − 158,60 = **1.641,40**.
2. **IVA corretta con l'IVA a credito** (Man. sez. 3): IVA accantonata nel mese, IVA pagata sugli acquisti (dalle fatture), differenza. Esempio (inventato): 2.000,00 − 450,00 = **1.550,00** da versare stimati; i 450,00 liberati li destino come mi dice il commercialista.
3. **TFR e tasse:** accantonato nel mese contro importo scritto in A5; casella "mese di tasse: sì (gen-ott) / no".
4. **Fondo Serenità:** saldo da inizio anno.
5. **Tabella costi aggiornata** (voci di A4, con lettera C/A): costo di ieri | di oggi | cosa è cambiato. Ricalcolo con i MIEI giorni e ore: spese annue ÷ giorni = costo giornaliero; (spese annue ÷ ore annue) ÷ 60 = **costo al minuto**. Nuova testata del mese seguente.
6. **Il prezzo di un servizio (uno al mese, a rotazione):** minuti reali con margine (circa 10-15 minuti, L r.3812-3816) x costo al minuto + prodotti + materiali = costo; + utile scelto da me; + IVA = prezzo ottimale; il mio prezzo di oggi; la differenza. Esempio del libro (75 minuti, 0,30 al minuto): 22,50 + 2,00 + 0,80 = 25,30; con utile 50% = 50,60; con IVA = 61,73 (L r.3829-3975, ricalcolato). **"Riporta qui il risultato del Listino"**: il costo al minuto di A4 e quello del Listino devono coincidere (R5, L r.4063).
7. Consumi prodotti contro il mese scorso (L r.2644-2645). Sconti del mese (solo tappa 2): markup 50% e sconto 20% = margine 16,67%, non 30% (L r.4040).
8. **Livello in corso:** raggiunto? Nuovo step con data. Mini 3S (scala a 5 gradini: mia invenzione, D6).
9. **La domanda del mese** (diversa per edizione) e i costi fissi da riportare.

### 4.6 Chiusura anno (7 pagine)

1. **Il mio anno in numeri:** 12 righe (mese | incassato senza IVA | accantonato per voce | costo | utile corretto | costo al minuto).
2. **Accantonamenti dell'anno:** IVA versata, TFR accantonato, tasse accantonate contro tasse pagate, saldo del Fondo Serenità.
3. **Prima e dopo:** A4 contro oggi; cerchio 3S di A3 contro oggi.
4. **I miei livelli:** raggiunto / in parte / no, con una riga di cosa ho imparato.
5. **I 10 errori di nuovo**, senza guardare la tabella vecchia (L r.3092-3098).
6. **Da riportare nell'agenda 2028:** costi, aliquote, importo delle tasse dell'anno (pagina da ricopiare).
7. **Una lettera a me stessa:** "La titolare che sono diventata".

Pagine totali, ordine di grandezza: 8 + 313 giornaliere (lunedì–sabato; domeniche 2027: 52) + 53 settimanali + 12 mensili + 8 di tappa + 7 di chiusura = circa 400. Il numero pesa su costi e peso: D1.

---

## 5. Architettura: nucleo + inserto o 5 edizioni complete

Cosa è **identico** in tutte: calendario con date, pagine A1-A8, pagina giornaliera (la scala del denaro è la stessa per tutte), strutture di settimana e mese, tabella costi, formule, schema S/I/?, 3S, 10 errori, tappe, frase "non è consulenza fiscale", frase "spunto di riflessione, non una diagnosi".
Cosa **cambia**: tono (microcopy), 53 domande settimanali, 12 mensili, esercizi della leva, domande guida di A2, pagina ad hoc.

La scala del denaro rende il nucleo molto grande e uguale per tutti, e la parte personalizzata piccola: questo rafforza l'architettura 2.

| | Architettura 1: 5 edizioni complete | Architettura 2: nucleo + inserto (2b: più 5 copertine) |
|---|---|---|
| Pro | Un oggetto fatto per lei, effetto "è mia" massimo | Una grande tiratura sola; si può cambiare o aggiungere un inserto senza ristampare; campionario leggero per i rappresentanti; meno testo da controllare |
| Contro | 5 tirature con minimi, scorte di un tipo invendute, 5 bozze da rileggere (circa 400 pagine l'una), chi sbaglia edizione ha comprato quella sbagliata | Il tono vive in un fascicolo a parte, attrito tra agenda e fascicolo, l'inserto si può perdere, assemblaggio da chiedere |

Nel nucleo la pagina settimanale ha la riga "Domanda n. __ e Esercizio n. __ (dal tuo fascicolo)". Inserto: pagina "Come lavori tu", domande guida di A2, 53 domande settimanali, 12 mensili, esercizi, pagina ad hoc, frasi di tono (16-32 pagine, da definire). **Raccomandazione: 2b per la prima edizione**; solo dopo, edizioni complete per i tipi più richiesti.

**Cosa chiedere alle tipografie (nessun costo inventato):**
- Costo unitario a 500, 1.000, 2.000 copie (quantità da decidere da Mason) per: (a) agenda identica; (b) 5 versioni con interno diverso; (c) 5 copertine con stesso interno; (d) 5 fascicoli da 16, 24, 32 pagine.
- Minimo per versione e avviamento per ogni versione diversa (digitale o offset).
- Formato (A5?), carta adatta alla penna senza trasparenza, rilegatura, elastico, segnalibro.
- Inserimento del fascicolo (busta, incollato, graffa): costo e tempi.
- Effetto del numero di pagine su prezzo e peso (400 pagine contro la settimana a tabella, D1).
- Data di consegna per essere in vendita a inizio gennaio 2027: da oggi mancano circa 12 settimane. Tempi di bozza e correzione.
- Costo dei campioni per i rappresentanti (5 completi, oppure 1 nucleo + 5 fascicoli).
- Ristampa dell'anno dopo se cambiano solo le date.
- Numero di edizione stampato (per collegare l'acquisto all'esito del test).
Nessun listino utilizzabile nel fascicolo pricing (`canali-agenda-cartacea.md`): vanno chieste direttamente.

---

## 6. Come si vende: pubblicità social, rappresentanti, visite dirette

Nessuna fiera nel piano 2027 (decisione di Mason). Il test dà tre cose, ma per vendere l'edizione basta il **dominante**: la regola 1 a 1 della sezione 1 vuol dire che un test breve che riconosca solo il dominante è sufficiente. Dove serve un dato lo segno "da chiedere".

**Meccanismo 1: mini-test su carta in visita (2-3 minuti).** Il rappresentante lascia una cartolina con 5-6 situazioni (es. "Una cliente chiede uno sconto: cosa fai?") e 5 risposte con simboli (mai lettere che richiamano gli elementi). La titolare segna "quella che mi somiglia di più"; il simbolo più frequente indica l'edizione. Il retro riporta i nomi delle edizioni.
- Serve: versione breve del banco domande, controllata da Irene e approvata da Mason.
- Limiti: non è validata e si può "barare". Lo dichiaro: "È un assaggio. L'esito completo lo trovi nell'Identikit." Quante risposte servono per un esito stabile: non so.

**Meccanismo 2: carta con QR e codice edizione (rappresentanti e visite dirette).** Biglietto con QR e spazio per il codice del rappresentante. La titolare fa l'Identikit quando vuole; la pagina dell'esito mostra il nome dell'edizione e un codice con cui ordina. Usa il test vero e l'account completo. Resta la regola del referral unico (generale.md, 25/09): il QR porta a `/newsletter?ref=codice` o a `/pilastri`, nessuna landing nuova per l'agenda (D9).

**Meccanismo 3: "prenota il nucleo, scegli l'inserto dopo" (solo architettura 2).** In visita si prenota il nucleo; il fascicolo si sceglie dopo l'Identikit entro una data. Il campionario è 1 agenda + 5 fascicoli. Servono buono con scadenza e consegna del fascicolo (posta, ritiro, PDF?). Costi da chiedere.

**Meccanismo 4 (nuovo): annuncio social, test, edizione.** L'annuncio promette l'esito del test ("scopri l'agenda che lavora sul tuo modo di dirigere il centro"); il test (gratuito nei 90 giorni, se ancora attivi) mostra il nome dell'edizione e il codice; da lì si ordina. È la versione online del meccanismo 2. Da chiedere: dove atterra l'annuncio (la landing `/report` esiste già per le ads) e se il codice richiede il pagamento dei 60 € dopo i 90 giorni.

**Rappresentanti.** Incentivi secondo i tre livelli di generale.md (segnalazione libera, non monetario, commissione): la commissione solo dopo parere legale sul contratto di agenzia. Provvigioni e costi: da chiedere.
**Privacy:** il test raccoglie dati personali, serve informativa e consenso; il rappresentante non conserva risposte. Parere legale non esaminato da me.
**Prezzi e bundle (agenda + guida + newsletter):** li decide Marta dopo il suo test (generale.md, 06/10). Non propongo cifre.

---

## 7. Microcopy: 4 per edizione (testo pubblico, voce Beautyx)

Costruite con la regola della sezione 2: riconoscono il dominante e portano verso la leva o il debole. Controllate: nessun nome di elemento, ciclo o sigla; "tu" diretto; niente "viste"; niente consigli fiscali; massimo un "non X ma Y" per blocco. Sono imperativi gentili, non diagnosi.

**Slancio / Vivace**
1. "Hai già in testa la prossima idea. Scrivila qui e aspetta due giorni: se ti brillano ancora gli occhi, controlla quanto costa."
2. "Prima di comprare qualcosa di nuovo, scrivi tre criteri e guarda se li rispetta. Dieci secondi in più, poi decidi tu."
3. "Una cosa iniziata e rifinita vale più di tre iniziate. Quale chiudi questa settimana?"
4. "Cosa hai notato questa settimana che prima ti era sfuggito? Scrivilo accanto ai numeri."

**Sguardo / Lungimirante**
1. "Hai osservato abbastanza. Scegli un passo piccolo e scrivi la data di domani."
2. "Questa settimana fai ogni giorno, alla stessa ora, una cosa che sai già fare bene. Segna qui quando l'hai fatta."
3. "Un passo chiuso merita una festa piccola. Come la fai oggi?"
4. "Quale cosa che funziona nel tuo centro fai ancora in modo diverso ogni volta? Scegli come farla sempre uguale."

**Rotta / Decisa**
1. "Hai una novità in testa? Una sola. Scrivi cosa cambia e fra quanti giorni controlli come è andata."
2. "Prima di cambiare, scrivi cosa tieni di ciò che già funziona. Poi scegli."
3. "Questa settimana ripeti una cosa uguale ogni giorno. Un centro si regge sulle abitudini che restano ferme."
4. "Quale standard tieni uguale per tutte le clienti, anche quando hai fretta di passare oltre?"

**Punto Fermo / Premurosa**
1. "Qui dentro c'è anche il tuo stipendio. Tra i costi del centro ha la stessa dignità dell'affitto."
2. "Questa settimana ti sei presa cura di tutti. Che cosa hai fatto per te? Una riga basta."
3. "Fermati cinque minuti e scrivi cosa hai notato questa settimana, senza decidere nulla."
4. "C'è un'abitudine del centro che non guardi più da tempo? Scegli una prova piccola, con la data di fine."

**Misura / Meticolosa**
1. "Una pagina scritta a metà vale più di una pagina perfetta mai iniziata."
2. "Questa settimana prova una cosa nuova e lasciala imperfetta. Il controllo lo fai dopo."
3. "Cosa ti ha divertito questa settimana nel centro? Scrivilo prima dei numeri."
4. "C'è una regola tua che non riguardi da un anno? Provala diversa per sette giorni."

Da decidere: se queste frasi stanno solo nell'edizione o anche nel testo di vendita (voce più sicura: solo dentro l'agenda, perché le frasi di un tipo fanno capire che c'è una classificazione).

---

## 8. Cosa tengo dalla v2 e cosa tolgo

Tengo: pagine di apertura con obiettivi e step (A2), riepilogo settimanale ogni 7 giorni, giornaliero, tagliando mensile, microcopy, architettura nucleo + inserto, cosa chiedere alle tipografie, meccanismi di vendita legati al test. Tolgo: fiere e vincolo del calendario fiere, "Set A e Set B", ipotesi di costo al minuto con dubbio dei 365 giorni, edizioni costruite solo sul tipo prevalente, il campo "incasso senza IVA meno costo giornaliero" come unico numero del giorno.

---

## 9. Cosa non so / da decidere

### Cosa non so
- **Cicli:** "Aria = Legno" è un'ipotesi di lavoro (certezza media). Se Mason cambia mappa, le edizioni 2-5 cambiano. Il motore oggi usa ancora i cicli vecchi (righe 69 e 73): finché Davide non li aggiorna, il test consegnerebbe un debole e una leva diversi da quelli di questa agenda.
- **Debole dedotto, non misurato:** il motore non calcola l'elemento con il punteggio più basso né un secondario. Non so se per Mason il "debole" debba restare quello dedotto dalla regola.
- **Fondo Serenità:** il Manuale lo elenca tra gli accantonamenti principali ma non lo definisce e non dà una percentuale. L'ho trattato come una quota scelta dalla titolare: è una mia lettura.
- **IVA:** il Manuale scrive "22% degli incassi", il libro scorpora (30 € diventano 24,59 + 5,41). Ho usato lo scorporo: A x 22 ÷ 122. Con "22% dell'incasso" 600 € darebbero 132,00 invece di 108,20.
- **TFR e tasse nel costo al minuto:** il libro conta "le tasse" nei costi (L r.3100, 3436) ma la sua tabella non ha una riga di imposte. Non so se nel costo al minuto del Listino vadano incluse.
- Quante titolari sono senza IVA o senza dipendenti (campi "non applico IVA" e "non ho dipendenti").
- Se il Listino ampliato permette già di inserire spese a mano, gli accantonamenti e il campo S/I/? (Davide deve verificare prima di costruire).
- Come si distribuiscono i 5 tipi nelle titolari reali: nessun dato. Costi di stampa, minimi e tempi: nessun listino. Formato, giorni di apertura del centro tipo.
- Se i 3 scenari sullo stipendio del Manuale (nessuno, insufficiente, eccessivo) vanno nell'agenda o restano nel tool.
- Se il test è ancora gratuito per 90 giorni all'uscita dell'agenda.
- Marchio e omonimie dei nomi. Abitudini reali delle titolari nello scrivere i conti a mano: nessuna ricerca.
- Il test non è validato come strumento scientifico: nessuna promessa di risultato economico legata al tipo.
- Rischio abbandono: la scala del denaro è più pesante della v2; da provare con titolari reali.
- Volume di scrittura: 53 + 12 domande e gli esercizi per 5 edizioni, da far approvare riga per riga senza Elena. Proposta: iniziare con 13 domande per tipo (una tappa).

### Da decidere (Mason), con la mia proposta
| N. | Domanda | Proposta |
|---|---|---|
| D1 | Una pagina per giorno (circa 400 pagine) o "settimana a tabella" (circa 150)? | Provare entrambe con 3 titolari. |
| D2 | Per chi ha un profilo piatto (`significativo` falso) che edizione si assegna? | Quella del dominante comunque, con la frase "tutte le domande valgono per tutte". |
| D3 | Le percentuali (IVA, TFR, tasse) restano tutte da scrivere a mano, con 22% solo come esempio del libro? | Sì, come da tua indicazione. |
| D4 | Il "target giornaliero" del libro (L r.5294-5300) entra? | No: l'utile del giorno lo sostituisce. |
| D5 | Il Fondo Serenità viene tolto prima dei costi (come nel Manuale) o dopo? | Prima, come da regola d'oro, ma l'utile del giorno ne risente: da dichiarare in pagina. |
| D6 | Scala a 5 gradini per la mini 3S (invenzione mia) o solo il cerchio del libro? | 5 gradini. |
| D7 | Architettura della prima edizione. | 2b (nucleo + inserto + 5 copertine). |
| D8 | Nomi: Proposta 1 o 2 per ogni riga? | Proposta 1, riga per riga, ma decidi tu. |
| D9 | Il QR può portare direttamente all'Identikit o solo al punto d'ingresso unico? | Chiedo conferma (eccezione al referral unico). |
| D10 | Chi completa il libro (Errori 8-10, numeri sbagliati, quinto elemento e due cicli)? | Non blocca l'agenda. |
| D11 | Mason conferma la regola "tono = dominante, esercizi = leva, domande = debole" (sezione 2)? | Va confermata prima di scrivere le 53 domande. |
