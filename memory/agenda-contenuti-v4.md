# Agenda annuale 2027 — contenuti v4 (cicli della tradizione, IVA scorporata, accantonamenti stabiliti dalla titolare e verificati nel tempo)

Autrice: Federica. Data: 06/10/2026. Stato: proposta per Mason, nulla è approvato. Nessun gate di Elena o Alessia (fuori dal team): il controllo spetta al Coordinatore, con ricalcolo a mano dei numeri (elenco dei punti da guardare in fondo, sezione 9).
Questo file SUPERA `agenda-contenuti-v3.md`, che resta com'è come storico (e v3 supera v2).

**USO INTERNO.** Le sezioni 1 e 2 nominano elementi e cicli: non vanno mai in testi pubblici. Pubblico solo ciò che è marcato "testo pubblico" (nomi delle edizioni dopo approvazione, microcopy della sezione 7, righe dell'inserto della sezione 2, diciture).

Fonti lette: v3; `mappa-cicli-proposta.md` (sez. 2.1, 3.2); `memory/generale.md` (sezioni 06/10: decisioni di Mason su cicli, IVA, Fondo Serenità); `lib/beautyx/profilingEngine.js` (solo lettura); scheda SvetAge (sez. 3.5 IVA, 3.10 tabella costi, "cosa del Manuale è nel libro"); `memory/voce-beautyx.md`.
Sigle: **L r.NNN** = riga del libro (come citata dalla scheda); **R1...R8** = Regole del libro; **Err.N** = capitolo dell'Errore N; **Man.** = Manuale Operativo (conosciuto solo tramite la scheda: il testo originale non è nella cartella).

## Cosa cambia rispetto alla v3

1. **Cicli:** Aria = Legno e cicli della tradizione sono decisi da Mason (06/10). Tolte tutte le formule "ipotesi di lavoro / da confermare". Tabella delle 5 combinazioni ricontrollata a mano (sezione 1): coincide con quella della v3, ora con la catena che la giustifica.
2. **IVA:** solo scorporata, `incasso × aliquota ÷ (100 + aliquota)`. Tolta la discussione "22% dell'incasso" contro scorporo.
3. **Accantonamenti:** la pagina A5 si apre con percentuali e importi che stabilisce la titolare, accanto a un consiglio indicativo di partenza e alla dicitura "non è consulenza fiscale". Ideale: compilarla in un incontro iniziale; poi si regola nel tempo.
4. **Riepilogo settimanale:** nuovo blocco "Verifica del mio target di accantonamento" (troppo basso? troppo alto? cosa cambio da lunedì).
5. **Tagliando mensile:** confronto tra quanto previsto dal mio target e quanto ho accantonato davvero, voce per voce.
6. **Edizioni:** tono (dominante), esercizi (leva) e domande (debole) riscritti anche per il nuovo blocco di verifica; microcopy da 4 a 5 per edizione (aggiunta l'apertura di A5); pagine ad hoc con la riga del target.
7. **"Da decidere":** ridotto a ciò che è davvero aperto (sezione 9).

---

## 1. Cosa esce davvero dal test (e quante edizioni servono)

Il motore (`profilingEngine.js`, `individuaBlocco`, riga 107; `calcolaPunteggiFinali`, riga 518) somma i punteggi di tutti gli scenari e produce:
- **elemento dominante** = quello col punteggio più alto (a parità vince il primo nell'ordine fuoco, acqua, aria, terra, metallo);
- **carenza** = il controllore del dominante nel ciclo di controllo;
- **leva** = il nutritore della carenza nel ciclo generativo;
- più `tipo_blocco` (trasversale o localizzato) e `significativo` (il dominante spicca sulla media?).

La carenza e la leva NON sono misurate: sono calcolate dal dominante. La regola lega le tre cose 1 a 1. Combinazioni (dominante, debole, leva) raggiungibili: **5**, non 125. Edizioni distinte necessarie: **5**.

**Cicli della tradizione, Aria = Legno (decisione e conferma di Mason, 06/10; fonte `mappa-cicli-proposta.md`, sez. 2.1).**
- Nutrimento: Aria → Fuoco → Terra → Metallo → Acqua → Aria.
- Controllo: Aria → Terra → Acqua → Fuoco → Metallo → Aria.

**Come ho ricontrollato la tabella, riga per riga.** Debole = chi controlla il dominante (nel ciclo di controllo è l'elemento che lo precede). Leva = chi nutre il debole (nel ciclo di nutrimento è l'elemento che lo precede).

| Edizione | Dominante (tono) | Debole = controllore | Perché (ciclo di controllo) | Leva = nutritore del debole | Perché (ciclo di nutrimento) |
|---|---|---|---|---|---|
| 1 | Fuoco | Acqua | Acqua → Fuoco | Metallo | Metallo → Acqua |
| 2 | Acqua | Terra | Terra → Acqua | Fuoco | Fuoco → Terra |
| 3 | Aria | Metallo | Metallo → Aria | Terra | Terra → Metallo |
| 4 | Terra | Aria | Aria → Terra | Acqua | Acqua → Aria |
| 5 | Metallo | Fuoco | Fuoco → Metallo | Aria | Aria → Fuoco |

Controlli incrociati fatti: (a) i due cicli, riletti dall'elenco di Mason (Fuoco→Acqua→Metallo; Acqua→Terra→Fuoco; Aria→Metallo→Terra; Terra→Aria→Acqua; Metallo→Fuoco→Aria): le 5 righe coincidono; (b) la tabella 3.2 di `mappa-cicli-proposta.md` (carenza e leva nuove): coincide su tutte e 5; (c) ogni elemento compare esattamente una volta come dominante, una come debole e una come leva (5 + 5 + 5, nessun doppione); (d) il motore: `CICLO_CONTROLLO = ['fuoco','acqua','terra','aria','metallo']` (riga 71) con controllore = successivo, e `CICLO_GENERATIVO = ['aria','fuoco','terra','metallo','acqua']` (riga 74) con nutritore = precedente, danno le stesse 5 terne (letto e ricalcolato a mano, non eseguito: il test Node delle funzioni pure e il ricontrollo di Riccardo spettano a Davide).

Con i cicli vecchi (storico, non più in vigore) cambiavano 4 righe su 5 (restava uguale solo il Fuoco). Nota di mappa 1.5, da non perdere: la regola dei 3 nodi (eccesso → carenza del controllore → leva) e la leva sono "impostazione del metodo" di Mason, non "tradizione": si può dire "cicli della tradizione" solo per le due catene, mai per il debole/leva calcolati.

Due avvisi che restano:
1. **Report già generati con i cicli vecchi:** contengono ancora debole e leva vecchi (`mappa-cicli-proposta.md`, sez. 4.1; decisione di rigenerarli non registrata). Per l'agenda non è un problema se l'edizione viene scelta dal solo **dominante** (che non cambia) e debole e leva si leggono dalla tabella sopra, non dal report salvato. Va ricordato a chi collega l'acquisto all'esito.
2. `tipo_blocco` (2 varianti) non serve all'agenda: usarlo darebbe 10 edizioni. Lo lascio fuori. Per chi ha un profilo "senza dominante netto" (`significativo` falso): sezione 9, D2.

---

## 2. Come "elemento debole e leva" diventano pagine concrete

**Regola (indicata nell'incarico del 06/10; correzione di Mason del 06/10: parlare nel linguaggio del dominante, lavorare su debole e leva per mitigare gli eccessi).** Ogni edizione ha tre livelli, e solo il primo parla al dominante:
1. **Tono** (frasi, titoli, modo di dire le cose): il linguaggio del dominante, così la titolare si riconosce.
2. **Esercizi e rituali** (cosa si fa nella pagina): sono i gesti della **leva**. Nutrono il debole, quindi mitigano l'eccesso.
3. **Domande della settimana e del mese**: portano l'attenzione sul comportamento del **debole**, senza mai dire che le manca.

Come si traduce nel concreto: ogni elemento diventa un comportamento osservabile (definizioni di Mason, profiling note r. 40-44; solo tendenze).

| Elemento (interno) | Comportamento che diventa pagina |
|---|---|
| Fuoco | iniziare subito, entusiasmo, festeggiare un passo chiuso |
| Acqua | fermarsi, osservare, ascoltare, capire prima di decidere |
| Aria | rivedere una regola o un'offerta, provare una novità |
| Terra | ripetere con costanza, abitudini stabili, portare a termine |
| Metallo | criteri scritti, controllo finale, rifinire, tagliare il superfluo |

| Ed. | Tono (dominante) | Esercizi e rituali (leva) | Domande (debole) | Pagina ad hoc (con la riga del target) |
|---|---|---|---|---|
| 1 Fuoco | Diretto, energico, frasi brevi. Riconosce lo slancio. | Metallo: "I miei 3 criteri" scritti prima di ogni spesa; stessa checklist di chiusura ogni sera; a fine settimana "una cosa da rifinire" invece di una nuova. | Acqua: "Cosa ho notato che prima mi era sfuggito?" "Cosa decido dopo averci dormito sopra?" | "Aspetto 2 giorni" (idee in sala d'attesa: data, costo, ancora convinta?). Riga target: "Se voglio cambiare una percentuale di A5, la scrivo qui e dopo due giorni mi chiedo se ne sono ancora convinta." Funzione: debole (attendere). |
| 2 Acqua | Calmo, riflessivo, spazio per le note. | Fuoco: "un passo piccolo con data entro 48 ore"; un gesto di festa quando lo chiudi; dire a una persona un numero. | Terra: "Cosa ripeto ogni giorno alla stessa ora?" "Cosa porto a termine questa settimana?" | "Passi chiusi" (registro dei passi con data). Riga target: il primo passo scritto è "ho compilato A5 e ho scritto la data in cui la rivedo". Funzione: leva (agire). |
| 3 Aria | Chiaro, orientato alla direzione e alle scelte. | Terra: "cosa tengo di ciò che funziona" prima di ogni cambiamento; una routine uguale ogni giorno; una novità alla volta. | Metallo: "Quale standard tengo uguale per tutte?" "Cosa ho finito bene prima di partire con altro?" Verifica a 14 giorni obbligatoria. | "Novità in prova" (cosa cambio, quando verifico, com'è andata). Riga target: ogni cambio di percentuale è una novità in prova, con data di verifica a quattro settimane. Funzione: leva (tenere fermo) e debole (verificare). |
| 4 Terra | Caldo, di cura, concreto. | Acqua: 5 minuti di osservazione senza decidere; "un numero che mi sorprende"; mezzo minuto di silenzio prima di rispondere sì a una richiesta. | Aria: "Quale abitudine del centro riguarderei con occhi nuovi?" "Quale prova piccola faccio per due settimane?" | "Per me" (il mio stipendio, una cosa fatta per me ogni settimana) + "Cosa ho osservato". Riga target: in "Cosa ho osservato", cinque minuti sui numeri degli accantonamenti, senza decidere. Funzione: leva (osservare). |
| 5 Metallo | Preciso, ordinato, essenziale. | Aria: "esperimento della settimana" (una cosa nuova, lasciata imperfetta, controllo solo dopo); rivedere una regola mia ogni mese; tolleranza scritta ("sotto 1 euro non correggo"). | Fuoco: "Cosa mi ha divertito nel centro?" "Quando basta 'abbastanza bene'?" | "Cosa ho provato" (esperimenti e cosa è successo). Riga target: la percentuale che ho provato questo mese e cosa è successo ai soldi messi da parte. Funzione: leva (provare). |

### 2bis. Il blocco "Verifica del mio target" cambia per edizione (testo pubblico, va nell'inserto)

Il blocco della sezione 4.4 è identico per tutte (nucleo). Le tre righe sotto sono quelle dell'edizione: apertura nel tono del dominante, un esercizio della leva sul modo di cambiare il target, una domanda sul comportamento del debole.

| Ed. | Apertura (tono) | Esercizio (leva) | Domanda (debole) |
|---|---|---|---|
| 1 | "Guarda i segnali, poi decidi: ti bastano pochi minuti." | "Prima di cambiare una percentuale scrivi il tuo criterio: quale segnale, ripetuto per quante settimane." | "Cosa hai notato nei tuoi numeri questa settimana che prima ti era sfuggito?" |
| 2 | "Guarda i numeri con calma, poi scegli una cifra." | "Scrivi una cifra oggi, anche provvisoria, e la data in cui la riguardi. Una cifra scritta si può regolare." | "Questa settimana hai messo da parte i soldi sempre alla stessa ora? Cosa porti a termine nei prossimi sette giorni?" |
| 3 | "Questa è la tua rotta: dove vuoi che vadano i soldi messi da parte?" | "Tieni ferma la percentuale per quattro settimane prima di cambiarla: una regola ha bisogno di tempo per mostrare se funziona." | "Il saldo del conto separato lo hai guardato sull'estratto conto, con la cifra esatta?" |
| 4 | "Un passo alla volta, ogni settimana lo stesso: guarda come è andata." | "Prima di dire 'va bene così' guarda i numeri per cinque minuti, senza decidere nulla. Poi scegli." | "C'è una percentuale che tieni uguale solo perché l'hai sempre tenuta? Quale prova piccola faresti per due settimane?" |
| 5 | "Cifre precise, scarti scritti: guarda cosa dicono i numeri." | "Una volta al mese prova una percentuale diversa per quattro settimane e segna cosa succede. Il controllo fine lo fai dopo." | "Sotto quale cifra lasci andare lo scarto? Scrivi qui il tuo 'abbastanza vicino'." |

Coerenza controllata riga per riga: ogni esercizio usa un comportamento della leva dell'edizione (1 criteri scritti = Metallo; 2 una cifra con data = Fuoco; 3 tenere fermo = Terra; 4 osservare = Acqua; 5 provare = Aria); ogni domanda usa un comportamento del debole (1 notare = Acqua; 2 stessa ora e portare a termine = Terra; 3 cifra esatta sull'estratto conto = Metallo; 4 occhi nuovi = Aria; 5 "abbastanza vicino" = Fuoco, il "basta così").

**Limiti dichiarati.** Le descrizioni sono tendenze di una tradizione, non un risultato scientifico. L'agenda dice sempre "spunto di riflessione", mai diagnosi (formula sicura, `limiti-validita.md` sez. 4; Mason, 06/10: tipologie di approccio, non profili psicologici). Il debole è dedotto dal dominante, non misurato: due titolari con lo stesso dominante ricevono la stessa edizione.

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

Il nome riconosce il dominante (come il tono). Nessun nome richiama una parola-elemento: controllo fatto a mano. Marchio e omonimie: non verificati.

---

## 4. Struttura dell'anno 2027 (1 gennaio – 31 dicembre)

Anno solare, con le date stampate. Il 1 gennaio 2027 è un venerdì e il 31 dicembre un venerdì (verificato). Non è un planner di appuntamenti: nessuna ora, nessun nome di cliente.

### 4.1 Calendario di lavoro

| Tappa | Date | Tema | Regole/Errori del libro |
|---|---|---|---|
| 1 | 1 gen – 31 mar | Guardo i miei numeri | R2 (risparmiare senza toccare la qualità, L r.2378-2395), R3 (spese e investimenti) |
| 2 | 1 apr – 30 giu | Metto d'accordo costi, tempi e prezzi | R4, R5 (listino, L r.3829-4040) |
| 3 | 1 lug – 30 set | Guardo chi mi sceglie | R6, R7 |
| 4 | 1 ott – 31 dic | Consolido e preparo l'anno dopo | R8, aggiornamento = investimento (L r.5232-5233), "mai sentirsi arrivati" (L r.615) |

- **Riepiloghi settimanali: 53.** Settimane lunedì–domenica: la prima copre venerdì 1 – domenica 3 gennaio (3 giorni), poi 51 settimane intere dal 4 gennaio al 26 dicembre, l'ultima va da lunedì 27 a venerdì 31 dicembre (5 giorni). Controllo: 3 + 51 x 7 + 5 = 365.
- **Tagliandi mensili: 12**, da fare entro i primi 5 giorni del mese dopo, riferiti a: 31 gen, 28 feb, 31 mar, 30 apr, 31 mag, 30 giu, 31 lug, 31 ago, 30 set, 31 ott, 30 nov, 31 dic. Le tasse annuali si accantonano nei mesi da gennaio a ottobre (Man., tramite la scheda).
- **Festività 2027 da stampare** (da verificare sul calendario scelto): 1 gen, 6 gen, Pasqua dom 28 mar (verificata), Pasquetta lun 29 mar, 25 apr, 1 mag, 2 giu, 15 ago, 1 nov, 8 dic, 25 dic, 26 dic.
- Nessun vincolo di fiere sul calendario.

### 4.2 Pagine di apertura (8 pagine, si compilano una volta; A5 occupa due facciate)

| Pagina | Contenuto | Fondamento |
|---|---|---|
| A1 "Perché ho aperto" | Motivazioni di allora e di oggi; frase "Il mio centro è lo strumento con cui voglio..." | R1, es. 1-2 (L r.1933-1938); Mario e Michele (L r.1783-1811) |
| A2 "Il mio sogno e la mia scala" | Sogno in una frase; obiettivo dell'anno con numero o data; 4 livelli (uno per tappa) con mission, punto di partenza, punto di arrivo, 3 step con data, data di verifica | R1, es. 3-4 (L r.1840-1865, 1940-1947) |
| A3 "Le mie 3S" | Cerchio Serenità, Stima, Soldi più Successo al centro; "Come sto oggi?" per spicchio | 3S+1 (L r.1445-1690) |
| A4 "Il mio punto di partenza" | Tabella dei costi annui (23 voci del libro + righe libere), compreso il mio stipendio. Poi: giorni di apertura all'anno, ore di apertura al giorno. Calcolo guidato (sotto). | L r.5407-5466, 5468-5479; Err.3 (L r.3252-3263) |
| **A5 "Prima si risparmia: il mio piano di accantonamento"** | Percentuali e importi stabiliti da me, con un consiglio indicativo accanto. Dove li tengo. Registro delle regolazioni. Dicitura fissa. (Sotto.) | Regola d'oro del Man. (tramite la scheda); decisione di Mason 06/10 |
| A6 "Spese, investimenti, da definire" | Schema a 3 colonne; domanda "Quanto mi rende?" | R3 (L r.3019, 3061, 2910) |
| A7 "I miei 10 errori" | Tabella con una riga per errore; cerchio sui più commessi | L r.2150-2273 |
| A8 "Le regole in vista + il patto" | Le 8 Regole; patto "Cinque minuti al giorno. Se salto, riprendo da oggi."; "Dopo queste pagine mi sento carica o stanca?" | L r.1233-1247, 1949-1954 |

**Pagina A2 (obiettivi e step), schema invariato:**
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

**Pagina A5 (testo pubblico per le righe stampate; le scelte le scrive la titolare)**

*Apertura:* una riga nel tono dell'edizione (microcopy n. 5, sezione 7). Poi, uguale per tutte:
> "Qui scrivi tu quanto metti da parte, e come. Accanto a ogni voce trovi un consiglio per cominciare: la scelta resta tua. Se puoi, compila questa pagina in un incontro iniziale, con il tuo commercialista o con chi ti segue. Poi la tua scelta si regola nel tempo, con la verifica del riepilogo della settimana e il confronto di fine mese."

| Voce | Cosa è | Consiglio indicativo di partenza | La mia scelta (la scrivo io) |
|---|---|---|---|
| 1. IVA | La parte dell'incasso che non è tua | Aliquota 22% (quella dell'esempio del libro); scrivi la tua, oppure barra "non applico IVA". Si scorpora sempre: incasso x aliquota ÷ (100 + aliquota). | Aliquota ____ % [ ] non applico IVA |
| 2. TFR | Per chi ha dipendenti | L'importo mensile te lo dà il tuo consulente del lavoro; arrotonda per eccesso (Man.: se sono 210, accantona 250). | ____ € al mese [ ] non ho dipendenti |
| 3. Tasse annuali | La stima di ciò che pagherai a fine anno | Tasse e contributi pagati l'anno scorso ____ ÷ 10 = importo mensile, da gennaio a ottobre (Man.). Se la stima cambia, vedi "Come ricalcolo" sotto. | Stima dell'anno ____ € → ____ € al mese |
| 4. Fondo Serenità | Il cuscino per i mesi bassi e gli imprevisti | Punto di partenza: 5% dell'incasso senza IVA. Obiettivo, se ti aiuta: un mese di costi del centro (spese annue ÷ 12). | ____ % dell'incasso senza IVA. Obiettivo ____ € entro ____ |
| 5. Il mio stipendio | Sta già dentro i costi del centro | Scrivilo come una voce di costo, come tutte le altre. | ____ € al mese |
| 6. Dove li tengo | Un posto separato dal conto del centro | Un conto o una busta con un nome, solo per questi soldi. | ______ |
| 7. Quando li rivedo | Ogni lunedì (riepilogo) e a fine mese (tagliando) | Prima revisione completa: dopo quattro settimane. | Data: ____ |

**Come ricalcolo le tasse in corso d'anno** (se la stima cambia): nuovo importo mensile = (nuova stima − già accantonato davvero) ÷ mesi che restano fino a ottobre, arrotondato per eccesso.

**Come scelgo il Fondo partendo da un obiettivo:** % = obiettivo ÷ (incasso annuo senza IVA stimato x anni che mi do). Esempio (numeri inventati; spese annue del libro, ricalcolato a mano): un mese di costi = 77.650 ÷ 12 = 6.470,83. Con un incasso annuo senza IVA stimato di 100.000 €: in 2 anni serve il 3,24% (6.470,83 ÷ 200.000); in 1 anno serve il 6,47% (6.470,83 ÷ 100.000). Una scelta a metà, 5%, porta 5.000 € l'anno e arriva all'obiettivo in circa 15 mesi e mezzo (6.470,83 ÷ 5.000 = 1,29 anni).

**Registro delle regolazioni (6 righe):** data | voce | da | a | perché.

**Dicitura stampata sotto, fissa:** **"Beautyx non è consulenza fiscale. Le percentuali e gli importi li scrivi tu, con il tuo commercialista. I consigli qui sopra sono un punto di partenza."**

### 4.3 Pagina giornaliera: dall'incasso all'utile (3-5 minuti)

Mason: il cuore dell'agenda è la **scala del denaro**, con l'**utile del giorno** nel riquadro più grande. Regola d'oro: "Prima si risparmia, poi si spende": gli accantonamenti si fanno subito dopo ogni incasso (Man., tramite la scheda). Ordine dei campi:

1. Data stampata. **Il mio scopo di oggi** (una riga, la mattina; L r.1888-1890).
2. **La scala del denaro:**
   - **A. Incassato oggi (IVA inclusa)** ____
   - **B. meno IVA scorporata** = A x aliquota ÷ (100 + aliquota) ____
   - **C. = Incasso senza IVA** ____
   - **D. meno accantonamenti di oggi:** TFR ____ + Tasse annuali ____ + Fondo Serenità ____ = ____ (quote giornaliere dalla testata del mese)
   - **E. = Resta per il centro** ____
   - **F. meno la quota del costo del centro** (dalla testata del mese; il mio stipendio è già dentro) ____
   - **G. = UTILE DEL GIORNO** ____ (riquadro grande)
3. [ ] **Ho messo da parte oggi** IVA e accantonamenti nel posto separato.
4. Di cui vendita prodotti ____ · Clienti servite ____ (L r.3439, 3925).
5. **Speso oggi**, fino a 3 righe: per cosa | quanto | S / I / ? (R3, L r.2910). [ ] Questo costo torna ogni mese? (lo riporto nel tagliando).
6. Una frase sentita da una cliente (facoltativo; L r.1558-1580).

Versione minima nei giorni pesanti: solo A e G ("giornata no? bastano due righe"). Per le giornate con utile negativo la pagina stampa: "Un giorno sotto il costo è un dato, non un giudizio. Guarda la settimana." Sotto il riquadro dell'utile, una riga fissa: "L'utile del giorno arriva dopo gli accantonamenti: più metti da parte, più basso lo vedi, ed è giusto così."

**Testata del mese** (una pagina all'inizio di ogni mese, compilata dalla titolare con le formule):
- costo giornaliero corrente = (spese annue − voci A) ÷ giorni di apertura annui;
- TFR di ogni giorno = TFR mensile (da A5, aggiornato) ÷ giorni di apertura del mese;
- tasse di ogni giorno = importo mensile (da A5, aggiornato) ÷ giorni di apertura del mese (zero a novembre e dicembre);
- Fondo Serenità = la % in vigore (da A5, aggiornata); aliquota IVA; giorni di apertura del mese;
- data dell'ultima regolazione (dal registro di A5).

**Esempio svolto (solo per spiegare; numeri inventati salvo la tabella del libro; ricalcolato a mano).** Libro: spese 77.650 €, TFR 700 € (voce A), stipendio titolare 20.000 €, 230 giorni. Valori della titolare inventati per l'esempio: aliquota 22%, 20 giorni di apertura nel mese, tasse dell'anno scorso 6.000 €, Fondo Serenità 5%.
- Costo giornaliero corrente: (77.650 − 700) ÷ 230 = 76.950 ÷ 230 = **334,57**. Di cui stipendio: 20.000 ÷ 230 = 86,96.
- TFR al giorno: 700 ÷ 12 = 58,33, per eccesso 60 al mese; 60 ÷ 20 = **3,00**.
- Tasse al giorno: 6.000 ÷ 10 = 600 al mese; 600 ÷ 20 = **30,00**.
- Giornata con incasso 600,00 IVA inclusa: IVA = 600 x 22 ÷ 122 = **108,20**; senza IVA = 491,80. Fondo Serenità = 5% di 491,80 = **24,59**. Accantonamenti D = 3,00 + 30,00 + 24,59 = **57,59**. Resta per il centro = 491,80 − 57,59 = **434,21**. Quota costo = **334,57**. **Utile del giorno = 434,21 − 334,57 = 99,64.**
- Se l'incasso di quel giorno fosse 450,00: IVA 81,15; senza IVA 368,85; Fondo 18,44; accantonamenti 51,44; resta 317,41; utile 317,41 − 334,57 = **−17,16**. Per questo conta la settimana (4.4).

### 4.4 Riepilogo settimanale (ogni 7 giorni circa, 10 minuti)

Si apre con gli obiettivi, poi i numeri, poi la verifica del target:
1. **Il mio obiettivo** (dal livello in corso, A2).
2. **Lo step della settimana**: fatto? [ ] sì [ ] in parte [ ] no, senza giudizio (R1 rifl. 3, L r.1926-1927). Sono sulla rotta? "Quello che ho fatto è utile per la mia mission?" (L r.1929).
3. **I numeri della settimana:** incassato (IVA inclusa) | IVA scorporata | incasso senza IVA | accantonato (TFR + tasse + Fondo) | costo del centro della settimana | **UTILE DELLA SETTIMANA** (riquadro) | accantonato da inizio anno. Giorno migliore e giorno più debole.
4. **Verifica del mio target di accantonamento (5 minuti, nuovo).** Testo pubblico del nucleo:
   - **a. Messo da parte davvero:** questa settimana ho spostato ____ nel posto separato. Il mio target prevedeva ____ (TFR + tasse + Fondo, dalla riga "accantonato" dei numeri). Scarto: ____. Se la differenza viene da giorni in cui non ho versato, è un'abitudine da riprendere, non un problema di target.
   - **b. I segnali** (segno quelli che vedo):
     - Può essere **troppo basso** se: [ ] ho usato soldi messi da parte per altre spese; [ ] una scadenza dei prossimi 30 giorni (tasse, TFR, IVA) non è coperta dal saldo; [ ] il commercialista o un acconto mi hanno dato una stima più alta di quella scritta in A5.
     - Può essere **troppo alto** se: [ ] senza gli accantonamenti questa settimana sarebbe in positivo e con gli accantonamenti no (utile della settimana + accantonato, contro utile della settimana); [ ] ho rimandato un pagamento ordinario (fornitore, stipendio) pur avendo soldi nel fondo; [ ] il Fondo ha già raggiunto l'obiettivo scritto in A5; [ ] la stima del dovuto è scesa.
   - **c. Come lo vedo oggi:** [ ] troppo basso [ ] giusto per ora [ ] troppo alto.
   - **d. Cosa cambio da lunedì** (anche: niente): voce ____ da ____ a ____. Un aiuto: ogni punto percentuale in più sul Fondo = 1% x incasso senza IVA della settimana = ____ in più messi da parte, ____ in meno di utile. Se cambio, lo scrivo nel registro di A5 con la data.
   - **e. Le tre righe della tua edizione** (apertura, esercizio, domanda: tabella 2bis, dal fascicolo).
   - Dicitura piccola: "Non è consulenza fiscale."
5. **Tre domande fisse:** quale spesa rifarei e quanto mi ha reso (L r.2910); cosa mi hanno detto le clienti (L r.1565-1580); mi sento carica o stanca (L r.1949-1954).
6. **La domanda della settimana** (n. 1-53, cambia per edizione) e **l'esercizio della settimana** (della leva).
7. **Il mio passo della prossima settimana** + data di verifica.

**Esempio svolto (5 giorni, stessi valori dell'esempio sopra, ricalcolato a mano).** Incassi IVA inclusa: lunedì 600, martedì 450, mercoledì 520, giovedì 380, venerdì 700.

| Giorno | Incasso | IVA | Senza IVA | Accantonamenti (TFR 3 + tasse 30 + Fondo 5%) | Costo | Utile |
|---|---|---|---|---|---|---|
| Lun | 600,00 | 108,20 | 491,80 | 57,59 | 334,57 | 99,64 |
| Mar | 450,00 | 81,15 | 368,85 | 51,44 | 334,57 | −17,16 |
| Mer | 520,00 | 93,77 | 426,23 | 54,31 | 334,57 | 37,35 |
| Gio | 380,00 | 68,52 | 311,48 | 48,57 | 334,57 | −71,66 |
| Ven | 700,00 | 126,23 | 573,77 | 61,69 | 334,57 | 177,51 |
| **Settimana** | **2.650,00** | **477,87** | **2.172,13** | **273,60** | **1.672,85** | **225,68** |

Controlli: 2.650 − 477,87 = 2.172,13; 2.172,13 − 273,60 − 1.672,85 = 225,68; somma degli utili giornalieri 99,64 − 17,16 + 37,35 − 71,66 + 177,51 = 225,68. Accantonato in totale nella settimana (IVA + altri) = 477,87 + 273,60 = **751,47**. Il Fondo della settimana è la somma dei cinque giorni: 24,59 + 18,44 + 21,31 + 15,57 + 28,69 = 108,60 (5% di 2.172,13 darebbe 108,61: l'arrotondamento giorno per giorno differisce di un centesimo).

**Verifica del target su questa settimana (numeri inventati dove non calcolati).**
- a. Messo da parte davvero: 240,00; previsto 273,60; scarto −33,60 (martedì e giovedì non ho versato). È un'abitudine da riprendere.
- b. Segnali: nessuno tra quelli di "troppo basso"; per "troppo alto": utile della settimana 225,68, quindi in positivo anche con gli accantonamenti (senza: 225,68 + 273,60 = 499,28). Nessun segnale.
- c. Giusto per ora. d. Da lunedì: niente. Se volessi alzare il Fondo da 5% a 6%: 1% x 2.172,13 = **21,72** in più messi da parte, 21,72 in meno di utile (utile della settimana da 225,68 a 203,96).

### 4.5 Riepilogo mensile e riconciliazione (30 minuti, collegato al Listino)

1. **Riconciliazione con i costi reali.** Quota usata nei giorni = giorni di apertura x costo giornaliero corrente. Costi reali del mese (da estratto conto e fatture). Scarto = reali − quota. **Utile del mese corretto = somma degli utili giornalieri − scarto.**
2. **IVA corretta con l'IVA a credito** (Man., tramite la scheda): IVA scorporata nel mese, IVA pagata sugli acquisti (dalle fatture), differenza = da versare stimata; la quota liberata la destino come mi dice il commercialista.
3. **Confronto tra il mio target e quanto ho accantonato davvero (nuovo).** Per ogni voce: previsto dal mio target nel mese | accantonato davvero (dall'estratto del conto separato) | scarto | saldo reale da inizio anno | previsto da inizio anno | scarto da inizio anno. Previsto: TFR = importo mensile di A5; tasse = importo mensile di A5 (gen-ott); Fondo = % x incasso senza IVA del mese. Poi tre domande: (a) lo scarto torna da due mesi? Se sì, il target è più alto di quanto riesco a rispettare: mi conviene abbassarlo e rispettarlo (meglio un 4% mantenuto che un 5% a metà) oppure capire cosa mi impedisce di versare; (b) le scadenze del mese dopo sono coperte dal saldo? (c) il saldo del Fondo, rispetto all'obiettivo di A5? Poi la decisione: [ ] confermo [ ] alzo [ ] abbasso, voce ____, nuovo valore ____ da ____ (si scrive anche nel registro di A5).
4. **Tabella costi aggiornata** (voci di A4, con lettera C/A): costo di ieri | di oggi | cosa è cambiato. Ricalcolo con i MIEI giorni e ore: spese annue ÷ giorni = costo giornaliero; (spese annue ÷ ore annue) ÷ 60 = **costo al minuto**. Nuova testata del mese seguente (con i valori di A5 aggiornati).
5. **Il prezzo di un servizio (uno al mese, a rotazione):** minuti reali con margine (circa 10-15 minuti, L r.3812-3816) x costo al minuto + prodotti + materiali = costo; + utile scelto da me; + IVA = prezzo ottimale; il mio prezzo di oggi; la differenza. Esempio del libro (75 minuti, 0,30 al minuto): 22,50 + 2,00 + 0,80 = 25,30; con utile 50% = 50,60; con IVA = 61,73 (L r.3829-3975, ricalcolato). **"Riporta qui il risultato del Listino"**: il costo al minuto di A4 e quello del Listino devono coincidere (R5, L r.4063).
6. Consumi prodotti contro il mese scorso (L r.2644-2645). Sconti del mese (solo tappa 2): markup 50% e sconto 20% = margine 16,67%, non 30% (L r.4040).
7. **Livello in corso:** raggiunto? Nuovo step con data. Mini 3S (scala a 5 gradini: mia invenzione, D4).
8. **La domanda del mese** (diversa per edizione) e i costi fissi da riportare. Per ogni edizione, una delle 12 domande del mese riguarda il target: la scrive Federica sul debole dell'edizione (esempi: Ed.1 "Quale segnale dei miei numeri ho notato per la prima volta questo mese?"; Ed.2 "Quale versamento ho fatto ogni mese senza saltarlo?"; Ed.3 "Quale numero ho guardato nello stesso modo tutti i mesi?"; Ed.4 "Quale percentuale rivedrei con occhi nuovi?"; Ed.5 "Quando mi basta 'abbastanza vicino'?").

**Esempio svolto del mese (numeri inventati dove non calcolati; ricalcolato a mano; stesso centro e stessi valori dell'esempio giornaliero).** Mese di marzo, 20 giorni di apertura, incassato IVA inclusa 10.800,00.
- IVA scorporata = 10.800 x 22 ÷ 122 = **1.947,54**; incasso senza IVA = 10.800 − 1.947,54 = **8.852,46**.
- Previsto dal mio target: TFR 60,00; tasse 600,00; Fondo 5% di 8.852,46 = **442,62**; totale **1.102,62**. Resta per il centro = 8.852,46 − 1.102,62 = **7.749,84**.
- Quota costo del mese = 20 x 334,57 = **6.691,40**. Utile del mese sulla carta = 7.749,84 − 6.691,40 = **1.058,44** (stima dal totale del mese: la somma dei singoli giorni può differire di qualche centesimo per gli arrotondamenti).
- Costi reali 6.850,00; scarto = 6.850,00 − 6.691,40 = **158,60**; **utile del mese corretto = 1.058,44 − 158,60 = 899,84**.
- IVA: pagata sugli acquisti 450,00; da versare stimata = 1.947,54 − 450,00 = **1.497,54**.
- Accantonato davvero (dall'estratto del conto separato): TFR 60,00; tasse 500,00; Fondo 420,00; totale **980,00**. Scarto per voce: 0,00; −100,00; −22,62; totale **−122,62** (1.102,62 − 980,00).
- Tasse da inizio anno: previsto 600 x 3 = 1.800,00; accantonato davvero 600 + 600 + 500 = 1.700,00; mancano **100,00**.
- Se a fine marzo la stima delle tasse sale da 6.000 a 7.000: nuovo importo mensile = (7.000 − 1.700) ÷ 7 mesi (aprile–ottobre) = 5.300 ÷ 7 = 757,14, per eccesso **760,00**; quota giornaliera su 20 giorni = 760 ÷ 20 = **38,00** (prima 30,00). Da aprile cambio la riga delle tasse nella testata del mese e lo scrivo nel registro.

### 4.6 Chiusura anno (7 pagine)

1. **Il mio anno in numeri:** 12 righe (mese | incassato senza IVA | accantonato per voce, previsto e reale | costo | utile corretto | costo al minuto).
2. **Accantonamenti dell'anno:** IVA versata, TFR accantonato, tasse accantonate contro tasse pagate (con lo scarto finale), saldo del Fondo Serenità contro l'obiettivo di A5.
3. **Le mie regolazioni:** dal registro di A5, quante volte ho cambiato il target, quale voce, con quale effetto; cosa ho imparato (una riga).
4. **Prima e dopo:** A4 contro oggi; cerchio 3S di A3 contro oggi.
5. **I miei livelli:** raggiunto / in parte / no, con una riga di cosa ho imparato.
6. **I 10 errori di nuovo**, senza guardare la tabella vecchia (L r.3092-3098).
7. **Da riportare nell'agenda 2028:** costi, aliquote, importi e percentuali di fine anno (non quelli di gennaio), importo delle tasse dell'anno (pagina da ricopiare). Una lettera a me stessa: "La titolare che sono diventata".

Pagine totali, ordine di grandezza: 8 (A5 su due facciate) + 313 giornaliere (lunedì–sabato; domeniche 2027: 52) + 53 settimanali + 12 mensili + 8 di tappa + 7 di chiusura = circa 400. Il numero pesa su costi e peso: D1.

---

## 5. Architettura: nucleo + inserto o 5 edizioni complete

Cosa è **identico** in tutte: calendario con date, pagine A1-A8 (A5 con le sue colonne di consigli), pagina giornaliera (la scala del denaro è la stessa), strutture di settimana e mese (compreso il blocco "Verifica del mio target" e il confronto mensile), tabella costi, formule, schema S/I/?, 3S, 10 errori, tappe, frasi "non è consulenza fiscale" e "spunto di riflessione, non una diagnosi".
Cosa **cambia**: tono (microcopy, compresa l'apertura di A5), le tre righe del blocco di verifica (tabella 2bis), 53 domande settimanali, 12 mensili, esercizi della leva, domande guida di A2, pagina ad hoc con la riga del target.

La scala del denaro rende il nucleo molto grande e uguale per tutti, e la parte personalizzata piccola: questo rafforza l'architettura 2.

| | Architettura 1: 5 edizioni complete | Architettura 2: nucleo + inserto (2b: più 5 copertine) |
|---|---|---|
| Pro | Un oggetto fatto per lei, effetto "è mia" massimo | Una grande tiratura sola; si può cambiare o aggiungere un inserto senza ristampare; campionario leggero per i rappresentanti; meno testo da controllare |
| Contro | 5 tirature con minimi, scorte di un tipo invendute, 5 bozze da rileggere (circa 400 pagine l'una), chi sbaglia edizione ha comprato quella sbagliata | Il tono vive in un fascicolo a parte, attrito tra agenda e fascicolo, l'inserto si può perdere, assemblaggio da chiedere |

Nel nucleo la pagina settimanale ha la riga "Domanda n. __ e Esercizio n. __ (dal tuo fascicolo)" e, nel blocco di verifica, "Le tre righe della tua edizione (dal tuo fascicolo)". Inserto: pagina "Come lavori tu", domande guida di A2, apertura di A5, 53 domande settimanali, 12 mensili, esercizi, tabella 2bis, pagina ad hoc, frasi di tono (16-32 pagine, da definire). **Raccomandazione: 2b per la prima edizione**; solo dopo, edizioni complete per i tipi più richiesti.

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

**Meccanismo 2: carta con QR e codice edizione (rappresentanti e visite dirette).** Biglietto con QR e spazio per il codice del rappresentante. La titolare fa l'Identikit quando vuole; la pagina dell'esito mostra il nome dell'edizione e un codice con cui ordina. Usa il test vero e l'account completo. Resta la regola del referral unico (generale.md, 25/09): il QR porta a `/newsletter?ref=codice` o a `/pilastri`, nessuna landing nuova per l'agenda (D7).

**Meccanismo 3: "prenota il nucleo, scegli l'inserto dopo" (solo architettura 2).** In visita si prenota il nucleo; il fascicolo si sceglie dopo l'Identikit entro una data. Il campionario è 1 agenda + 5 fascicoli. Servono buono con scadenza e consegna del fascicolo (posta, ritiro, PDF?). Costi da chiedere.

**Meccanismo 4: annuncio social, test, edizione.** L'annuncio promette l'esito del test ("scopri l'agenda che lavora sul tuo modo di dirigere il centro"); il test (gratuito nei 90 giorni, se ancora attivi) mostra il nome dell'edizione e il codice; da lì si ordina. È la versione online del meccanismo 2. Da chiedere: dove atterra l'annuncio (la landing `/report` esiste già per le ads) e se il codice richiede il pagamento dei 60 € dopo i 90 giorni.

**Rappresentanti.** Incentivi secondo i tre livelli di generale.md (segnalazione libera, non monetario, commissione): la commissione solo dopo parere legale sul contratto di agenzia. Provvigioni e costi: da chiedere.
**Privacy:** il test raccoglie dati personali, serve informativa e consenso; il rappresentante non conserva risposte. Parere legale non esaminato da me.
**Prezzi e bundle (agenda + guida + newsletter):** li decide Marta dopo il suo test (generale.md, 06/10). Non propongo cifre.

---

## 7. Microcopy: 5 per edizione (testo pubblico, voce Beautyx)

Costruite con la regola della sezione 2: riconoscono il dominante e portano verso la leva o il debole. Controllate a mano: nessun nome di elemento, ciclo o sigla; "tu" diretto; niente "viste"; niente consigli fiscali; massimo un "non X ma Y" per blocco. Sono imperativi gentili, non diagnosi. La numero 5 di ogni edizione è l'apertura della pagina A5 (tono del dominante).

**Slancio / Vivace**
1. "Hai già in testa la prossima idea. Scrivila qui e aspetta due giorni: se ti brillano ancora gli occhi, controlla quanto costa."
2. "Prima di comprare qualcosa di nuovo, scrivi tre criteri e guarda se li rispetta. Dieci secondi in più, poi decidi tu."
3. "Una cosa iniziata e rifinita vale più di tre iniziate. Quale chiudi questa settimana?"
4. "Cosa hai notato questa settimana che prima ti era sfuggito? Scrivilo accanto ai numeri."
5. (A5) "Scrivi qui le tue percentuali in dieci minuti. Con i soldi già al sicuro, ogni idea nuova parte più leggera."

**Sguardo / Lungimirante**
1. "Hai osservato abbastanza. Scegli un passo piccolo e scrivi la data di domani."
2. "Questa settimana fai ogni giorno, alla stessa ora, una cosa che sai già fare bene. Segna qui quando l'hai fatta."
3. "Un passo chiuso merita una festa piccola. Come la fai oggi?"
4. "Quale cosa che funziona nel tuo centro fai ancora in modo diverso ogni volta? Scegli come farla sempre uguale."
5. (A5) "Guarda con calma i conti dell'anno scorso, poi scrivi qui i numeri che ti sembrano giusti. Si possono sempre regolare."

**Rotta / Decisa**
1. "Hai una novità in testa? Una sola. Scrivi cosa cambia e fra quanti giorni controlli come è andata."
2. "Prima di cambiare, scrivi cosa tieni di ciò che già funziona. Poi scegli."
3. "Questa settimana ripeti una cosa uguale ogni giorno. Un centro si regge sulle abitudini che restano ferme."
4. "Quale standard tieni uguale per tutte le clienti, anche quando hai fretta di passare oltre?"
5. (A5) "Questa pagina decide dove vanno i tuoi soldi prima che diventino spese. Scrivi la tua direzione: la rivedi ogni settimana."

**Punto Fermo / Premurosa**
1. "Qui dentro c'è anche il tuo stipendio. Tra i costi del centro ha la stessa dignità dell'affitto."
2. "Questa settimana ti sei presa cura di tutti. Che cosa hai fatto per te? Una riga basta."
3. "Fermati cinque minuti e scrivi cosa hai notato questa settimana, senza decidere nulla."
4. "C'è un'abitudine del centro che non guardi più da tempo? Scegli una prova piccola, con la data di fine."
5. (A5) "Qui scrivi quanto metti da parte per il centro e per te. È la base su cui tutto il resto resta in piedi."

**Misura / Meticolosa**
1. "Una pagina scritta a metà vale più di una pagina perfetta mai iniziata."
2. "Questa settimana prova una cosa nuova e lasciala imperfetta. Il controllo lo fai dopo."
3. "Cosa ti ha divertito questa settimana nel centro? Scrivilo prima dei numeri."
4. "C'è una regola tua che non riguardi da un anno? Provala diversa per sette giorni."
5. (A5) "Cifre precise, una per riga. Scrivile con la data: ogni cambio futuro avrà il suo posto e il suo perché."

Classificazione di controllo (tono = T, leva = L, debole = D): Ed.1: 1 D (aspettare), 2 L, 3 L, 4 D, 5 T. Ed.2: 1 T/L (riconosce l'osservazione, poi un passo), 2 D, 3 L, 4 D, 5 T. Ed.3: 1 T/D (una novità, con verifica), 2 L, 3 L, 4 D, 5 T. Ed.4: 1 T, 2 T, 3 L, 4 D, 5 T. Ed.5: 1 D (iniziare), 2 L, 3 D, 4 L, 5 T. Ogni edizione ha almeno un T, un L e un D. Il tono puro sta soprattutto nella numero 5 e nelle aperture della tabella 2bis; il tono vero e proprio è anche nel modo di scrivere ogni riga.

---

## 8. Cosa tengo dalla v3 e cosa tolgo

Tengo: struttura dell'anno, pagine A1-A4 e A6-A8, giornaliero con scala del denaro e utile del giorno, tabella delle 5 combinazioni, regola tono/leva/debole, nomi, architettura nucleo + inserto, tipografie, meccanismi di vendita, esempi svolti (ricalcolati).
Tolgo: la discussione IVA (scorporo contro "22% degli incassi" del Manuale: il 22% sul totale è superato, decisione di Mason 06/10); gli avvisi "ipotesi di lavoro / da far confermare" sui cicli; l'avviso "il codice usa ancora i cicli vecchi" (il motore coincide, righe 71 e 74); le righe "percentuali tutte da scrivere a mano" (sostituite dal consiglio indicativo più scelta della titolare); D3 (percentuali), D4 (target giornaliero del libro: sostituito dall'utile del giorno), D5 (Fondo prima dei costi: deciso dalla regola d'oro e dichiarato in pagina), D10 (completamento del libro: non riguarda l'agenda, non la blocca), D11 (regola tono/leva/debole: indicata nell'incarico).

---

## 9. Cosa non so / da decidere

### Cosa non so
- **Aria = Legno** è confermata da Mason, ma `mappa-cicli-proposta.md` la dava a certezza media (6-7 su 10); la regola dei 3 nodi e la leva non sono "della tradizione" (sezione 1). Un giro di prova su casi reali resterebbe utile.
- **Debole dedotto, non misurato:** il motore non calcola l'elemento con il punteggio più basso. Non so se per Mason il debole possa restare quello dedotto dalla regola nei casi in cui i punteggi dicono altro.
- **Il consiglio sul Fondo Serenità (5%) non ha fonte:** il libro non lo ha ("la serenità è una delle 3S, ma non c'è un fondo", scheda), il Manuale lo elenca ma, per quanto riporta la scheda, non dà una percentuale. Il 5% è un punto di partenza che propongo io, ricavato dall'esempio (sezione 4.2). Da approvare.
- **Consigli su TFR e tasse:** sono metodi del Manuale (importo dal consulente, tasse dell'anno scorso ÷ 10), non cifre mie. Il testo originale del Manuale non è nella cartella: ho usato la scheda.
- **Rumore del segnale settimanale:** una settimana sola può ingannare (giorni storti, scadenze). Ho limitato il rischio con la regola dell'edizione (criteri scritti, quattro settimane di prova, cinque minuti senza decidere) e con il confronto mensile; non l'ho provato con titolari reali. Il blocco settimanale è più pesante della v3: rischio abbandono da verificare.
- **Titolari senza IVA o senza dipendenti:** ho previsto le caselle "non applico IVA" e "non ho dipendenti"; non so quante titolari siano in questi casi (nessun dato) né come cambi per loro la scala del denaro oltre all'azzeramento di quella riga.
- **TFR e tasse nel costo al minuto:** il libro conta "le tasse" nei costi (L r.3100, 3436) ma la sua tabella non ha una riga di imposte. Non so se nel costo al minuto del Listino vadano incluse.
- Se il Listino ampliato permette già di inserire spese a mano, gli accantonamenti e il campo S/I/? (Davide deve verificare prima di costruire).
- Come si distribuiscono i 5 tipi nelle titolari reali: nessun dato. Costi di stampa, minimi e tempi: nessun listino. Formato, giorni di apertura del centro tipo.
- Se i 3 scenari sullo stipendio del Manuale (nessuno, insufficiente, eccessivo) vanno nell'agenda o restano nel tool.
- Se il test è ancora gratuito per 90 giorni all'uscita dell'agenda.
- Marchio e omonimie dei nomi. Abitudini reali delle titolari nello scrivere i conti a mano: nessuna ricerca.
- Il test non è validato come strumento scientifico: nessuna promessa di risultato economico legata al tipo.
- Volume di scrittura: 53 + 12 domande e gli esercizi per 5 edizioni, da far approvare riga per riga senza Elena. Proposta: iniziare con 13 domande per tipo (una tappa).
- Stato del codice (lettura, non esecuzione): il motore ha i cicli nuovi alle righe 71 e 74; i testi del report (`contenuti-report-5-elementi.md`) sono stati aggiornati oggi ma `reportContent.js` è ancora da rigenerare (compito di Davide).

### Da decidere (Mason), con la mia proposta
| N. | Domanda | Proposta |
|---|---|---|
| D1 | Una pagina per giorno (circa 400 pagine) o "settimana a tabella" (circa 150)? | Provare entrambe con 3 titolari. |
| D2 | Per chi ha un profilo piatto (`significativo` falso) che edizione si assegna? | Quella del dominante comunque, con la frase "tutte le domande valgono per tutte". |
| D3 | L'incontro iniziale per compilare A5: con chi (commercialista della titolare, Luigi Perri, un gruppo di lavoro), a pagamento o dentro l'agenda, con quale nome pubblico? (Il nome "consulenza" in pubblico suona a pagamento, voce Beautyx: ho scritto "incontro iniziale".) Il 5% di partenza per il Fondo va bene? | Nel testo pubblico: "incontro iniziale con il tuo commercialista o con chi ti segue", senza promettere nulla di Beautyx finché non decidi tu. 5% come punto di partenza, con le tre alternative per obiettivo (3,24% / 5% / 6,47%) nell'esempio. |
| D4 | Scala a 5 gradini per la mini 3S (invenzione mia) o solo il cerchio del libro? | 5 gradini. |
| D5 | Architettura della prima edizione. | 2b (nucleo + inserto + 5 copertine). |
| D6 | Nomi: Proposta 1 o 2 per ogni riga? | Proposta 1, riga per riga, ma decidi tu. |
| D7 | Il QR può portare direttamente all'Identikit o solo al punto d'ingresso unico? | Chiedo conferma (eccezione al referral unico). |
| D8 | Le frasi di tono (microcopy) e le righe del blocco di verifica stanno solo nell'agenda o anche nel testo di vendita? | Solo dentro l'agenda: le frasi di un tipo fanno capire che esiste una classificazione. |
