# Redesign copy — /report (Identikit CURA) e /listino (Listino intelligente)

Autore: Federica · 2026-09-21
Motivo: bocciatura diretta di Mason ("pessime, senza immagini, con messaggi che non hanno nulla di strategia di marketing") — riscrittura completa, non editing superficiale.

Letto prima di scrivere: `memory/voce-beautyx.md`, `memory/generale.md`, `memory/federica.md`, `app/report/page.js`, `app/listino/page.js` (componente `ListinoWall`, righe 724-788, e pannelli di gating righe 416-456).

---

## 1. Direzione creativa presa

**/report (Identikit CURA).** L'H1 attuale ("Ti prendi cura di tutte. / Chi si prende CURA di te?") resta: è già passato dal gate di Elena, applica l'insight di posizionamento CARE/CURA richiesto in memoria ("chi cura tutti raramente ha qualcuno che si prenda cura di lei") ed è un hook forte, verosimile, non romanzato. Il problema non era l'apertura — era tutto quello che veniva dopo: un sottotitolo con due obiezioni implicite mai nominate esplicitamente, tre card che descrivevano cosa c'è nel report invece di cosa cambia per la titolare, un blocco prezzo che diceva "vale 60€" senza mai spiegare perché la finestra è un'urgenza vera e non uno sconto lampo. Ho tenuto l'aggancio emotivo e ricostruito tutto il resto intorno a tre leve: il beneficio (dove sei bloccata, una mossa sola non dieci) prima del meccanismo, le obiezioni vere nominate e disinnescate una per una ("sarà un test online", "il mio caso è un caso a parte", "non ho tempo per dieci cose"), e la prova di competenza reale disponibile (i 15 anni dei fondatori, mai attribuiti a "Beautyx" come azienda) al posto di un generico "ci fidiamo di noi".

**/listino (ListinoWall).** La pagina attuale apriva con la feature ("Margini e costo orario, a colpo d'occhio") e spiegava la meccanica di registrazione prima ancora di dire perché dovrebbe interessare a una titolare. Ho invertito l'ordine: l'H1 diventa la domanda che la titolare non si è mai fatta con un numero vero in mano ("Quanto ti costa davvero un'ora del tuo centro?"), il sottotitolo aggancia il dolore reale — prezzi decisi a sensazione, l'istinto sbagliato di abbassare invece di alzare il valore percepito — prima di spiegare cosa fa il tool, e solo dopo la CTA arriva la parte meccanica (stesso account dell'Identikit, tempi, cosa resta gratis per sempre). Ho aggiunto anche qui la stessa prova di competenza dei fondatori, per rispondere a "sarà l'ennesimo foglio Excel generico che non conosce il mio centro".

---

## 2. Copy finale — /report (Identikit CURA)

**Badge**
> Identikit strategico CURA · La diagnosi del tuo centro, gratis per il lancio

**H1** (invariato, già approvato dal gate di Elena — vedi nota sopra)
> Ti prendi cura di tutte.
> *Chi si prende CURA di te?* (in rosa/accento, come da layout attuale)

**Sottotitolo**
> Non è un test online, né un oroscopo: è una diagnosi seria. L'Identikit strategico CURA guarda dentro i numeri veri del tuo centro — chi sono le tue clienti, come si muove la tua agenda, come stanno davvero i conti — e torna con due cose sole, chiare: dove sei bloccata oggi, e qual è la prima mossa da fare. Fatto apposta per il tuo centro, quello vero.

**CTA (unica)**
> Crea il tuo account gratuito →
(verso `/signup`)

**Note sotto la CTA, in ordine:**

> Hai già un account? [Accedi]

> Con l'account arriva in regalo anche la newsletter di Beautyx, gratuita, ogni martedì e venerdì.

> Dietro ogni identikit ci sono i fondatori di Beautyx: 15 anni di esperienza vera nella gestione di centri estetici. L'AI legge i tuoi dati; il metodo che li interpreta viene da lì.
*(prova di competenza reale — i 15 anni sono dei fondatori, mai dell'azienda Beautyx, per la regola già in vigore in `memory/federica.md`. Risponde all'obiezione implicita "sarà un algoritmo che tira a indovinare".)*

**Nota di onestà (obbligatoria, questionario non ancora live — resa più fluida, contenuto invariato)**
> Il questionario completo sta per partire. Registrandoti adesso il tuo account gratuito parte comunque, sei tra le prime ad accedere al report, e i 90 giorni gratis restano tuoi dal primo giorno.

**Sezione "Cosa trovi nel tuo identikit strategico" — 3 card**

1. **Dove il tuo centro sta perdendo energia**
   Il punto preciso dove oggi dai più di quanto ti torna indietro — che sia nelle clienti che non tornano, nel personale che non rende come dovrebbe, o nelle spese cresciute senza che te ne accorgessi.

2. **La prima mossa, non dieci insieme**
   Non un elenco di cose da sistemare. Una priorità sola, quella vera — la leva che oggi sblocca davvero il resto.

3. **Il punto di partenza per il confronto con il consulente**
   La base concreta per la tua domanda mensile gratuita — a un consulente vero, Luigi, che lavora insieme all'AI che ha già letto i tuoi dati. Un percorso che continua con te, non un file che chiudi e dimentichi.

*(Nota per Davide: nessun cambio di layout richiesto, la struttura a 3 card numerate resta identica — solo il testo cambia.)*

**Blocco prezzo + countdown (componente `ReportCountdownBanner`, non toccare)**

> La tua diagnosi vale 60€. Ora è gratis.

*(countdown qui, invariato)*

> Vale 60€: è il prezzo di una diagnosi scritta sui dati veri del tuo centro. Il countdown qui sopra segna il tempo che hai per farla gratis — non uno sconto lampo, è la finestra del lancio. Quando si chiude, il prezzo torna pieno: 60€.

**Omaggio miniguida**

> Un regalo che arriva comunque, subito: la miniguida gratuita sui 10 errori più comuni. Non aspetta che l'identikit sia pronto — è già tua, da leggere mentre il resto prende forma.

> Ricevi la miniguida gratuita → (verso `/miniguida`)

---

## 3. Copy finale — /listino (ListinoWall)

**Badge**
> Listino intelligente · il prezzo giusto dei tuoi servizi, gratis nei primi 90 giorni

**H1**
> Quanto ti costa davvero
> *un'ora del tuo centro?* (in verde/accento #0F6E56, come da layout attuale a due righe)

**Sottotitolo**
> La maggior parte dei prezzi in un centro estetico nasce a sensazione — un numero che sembra giusto, non un calcolo. Il Listino intelligente il calcolo lo fa al posto tuo: ti dice quanto ti costa davvero un'ora di negozio, ti dice se un prezzo è in perdita anche quando sembra funzionare bene, e ti dice qual è il servizio che credevi marginale e invece ti tiene in piedi il mese. Non sulle medie del settore — sui tuoi numeri, quelli veri.

**Riga breve prima della CTA (nuova — reassicura su tempo/complessità, obiezione "sarà l'ennesimo foglio Excel")**
> Niente fogli di calcolo da costruire da zero: inserisci i numeri del tuo centro, il resto lo fa il tool. Bastano pochi minuti per avere il quadro vero del tuo centro.

**CTA (unica)**
> Crea il tuo account gratuito →
(verso `/signup?risorsa=tool`)

**Note sotto la CTA, in ordine:**

> Hai già un account? [Accedi]

> Ti serve un account gratuito — lo stesso che usi per l'Identikit strategico CURA: un'unica scheda con i dati del tuo centro, mai da reinserire due volte. Hai 90 giorni per usare il Listino intelligente gratis, tutto sbloccato. Dopo, restano gratis per sempre il costo orario e il prezzo di un singolo servizio; il listino completo passa a 29€ una tantum.

> Anche il Listino intelligente nasce dalla stessa esperienza dell'Identikit: i fondatori di Beautyx portano 15 anni di gestione vera di centri estetici, non teoria da corso online.
*(stessa prova di competenza usata su /report — coerente sui due pilastri, mai attribuita all'azienda Beautyx.)*

*(Nota per Davide: la finestra dei 90 giorni del Listino è la STESSA sorgente `lib/report/freeWindow.js` già usata dall'Identikit — vedi `memory/generale.md`. Segnalo come possibile miglioramento futuro, non richiesto in questo giro: riusare `ReportCountdownBanner`, o una sua versione con etichetta generica, anche su questa pagina darebbe un'urgenza vera — visto che è letteralmente la stessa scadenza — invece di lasciarla solo dichiarata a parole. Non l'ho scritta come se esistesse già, perché non è collegata qui oggi.)*

### Microcopy tool — opzionale, priorità minore

Da valutare solo dopo il copy della landing pubblica sopra. Riguarda testi visibili SOLO dopo login, dentro `ListinoTool` (non `ListinoWall`).

**Pannelli di blocco lite/completo (`__BX_LOCK_INFO`, righe ~452-456 di `app/listino/page.js`)** — stessa sostanza, tono più diretto e meno da messaggio di sistema:

- Tab "Il listino":
  Titolo: *Il listino intero è nella versione completa*
  Testo: *Il costo orario e il prezzo giusto di un singolo servizio restano gratuiti per sempre. Per vedere tutti i servizi insieme — il bilancio del mese, quante clienti ti servono per il pareggio — serve la versione completa: 29€ una tantum.*

- Tab "Vetrina":
  Titolo: *La vetrina stampabile è nella versione completa*
  Testo: *Il listino elegante da appendere in negozio o mandare su WhatsApp fa parte della versione completa — 29€ una tantum.*

- Tab "Salva":
  Titolo: *Salvataggio e backup sono nella versione completa*
  Testo: *Portare il tuo lavoro su un altro dispositivo, senza rifare tutto da capo, fa parte della versione completa — 29€ una tantum.*

**Banner sticky CTA dopo il primo uso (righe ~686-703)** — stessa funzione (spinge verso /newsletter), tono meno da annuncio pubblicitario:

> Il Listino intelligente è uno dei 4 strumenti gratuiti di Beautyx. C'è dell'altro che ti può servire.
> CTA: *Scopri beautyx →* (invariata come link/destinazione)

---

## 4. Segnalazioni per Chiara

**Identikit CURA (/report):** l'idea guida resta "uno sguardo che scopre un punto bloccato nel centro" — la affino così: non un'icona astratta di "analisi dati", ma un dettaglio riconoscibile e concreto del centro reale nel momento in cui la titolare lo nota — la cabina vuota a metà pomeriggio, l'agenda con lo stesso buco che si ripete ogni settimana, lo scaffale con un prodotto che non si vende più da mesi. L'emozione da comunicare è il riconoscimento ("ecco, è proprio lì"), non lo stupore tecnologico.

**Listino intelligente (/listino):** l'idea guida resta "margini/numeri che diventano chiari" — la propongo ancorata all'identità grafica già esistente del tool (verde #0F6E56/oro, Playfair, non un mockup di foglio Excel generico): il momento preciso in cui un prezzo passa da un segnale di perdita a un segnale di margine sano — es. una cifra o un'etichetta che cambia stato/colore davanti agli occhi della titolare. Meglio un singolo numero/servizio che si "sblocca" piuttosto che una tabella intera, per restare leggibile anche in piccolo (social, ads).

---

## 5. Autoverifica rapida

- **Soggetto esplicito ovunque:** verificato riga per riga. Le uniche forme senza soggetto visibile sono imperativi diretti alla lettrice ("Crea il tuo account", "Accedi", "Ricevi la miniguida") — il soggetto "tu" è portato dalla coniugazione stessa, forma già in uso nel copy approvato esistente, non un'omissione.
- **Zero "voi":** nessuna occorrenza, in nessuna delle due pagine — sempre "tu" singolare, anche nelle frasi che generalizzano ("la maggior parte dei prezzi... nasce a sensazione").
- **Zero aggettivi vuoti:** nessun "innovativo", "rivoluzionario", "unico", "all'avanguardia" in nessun blocco.
- **Max un contrasto "non X ma Y" per blocco:** verificato per ogni sezione. Sottotitolo /report: un solo contrasto ("Non è un test online e non è un oroscopo" — trattato come un contrasto unico, stessa lettura già validata dal gate di Elena il 04/09/2026, non due). Card 2 /report: un contrasto ("Non un elenco... Una priorità sola"). Card 3 /report: un contrasto ("non un file che chiudi e dimentichi"). Sottotitolo /listino: un contrasto ("Non sulle medie del settore — sui tuoi numeri"). Nessun blocco ne contiene due.
- **Zero framing negativo definitorio:** ogni definizione di cosa la cosa È è in positivo ("Fatto apposta per il tuo centro, quello vero" invece di un secondo "non... qualsiasi"; "Bastano pochi minuti" invece di "non è complicato").
- **Zero liste travestite da prosa:** i punti a rischio (es. "clienti, agenda, conto" del vecchio sottotitolo /report; "clienti, personale o spese" della vecchia card 1) sono stati sciolti in clausole con verbo proprio ("chi sono le tue clienti, come si muove la tua agenda, come stanno davvero i conti"; "che sia nelle clienti che non tornano, nel personale che non rende come dovrebbe, o nelle spese cresciute senza che te ne accorgessi") — non più nomi nudi separati da virgole.
- **Zero menzione credito/abbonamento futuro:** confermato in entrambe le pagine — formula usata ovunque compaia il prezzo: "90 giorni gratis, poi [60€ / 29€] una tantum", coerente con la correzione di Mason del 20/09/2026 già applicata da Davide su questi stessi file.
- **CTA unica per pagina:** su /report, "Crea il tuo account gratuito" è l'unica azione di conversione; "Accedi" è navigazione per chi ha già un account, non un'alternativa in competizione; il link alla miniguida è il regalo di reciprocità già previsto dalla struttura esistente (gratuito, secondario, non compete per la stessa decisione). Stesso schema su /listino verso `/signup?risorsa=tool`.
- **Nessuna prova sociale inventata:** l'unico elemento di credibilità usato sono i 15 anni di esperienza dei fondatori, fatto verificato e già approvato in `memory/federica.md` (mai attribuito all'azienda Beautyx) — nessun numero di clienti, nessuna testimonianza, nessuna statistica inventata.
- **Nessuna scarsità finta:** l'urgenza è sempre quella reale dei 90 giorni di lancio (stessa fonte `lib/report/freeWindow.js` per entrambe le risorse) — nessun "posti limitati" o variante di scarsità di quantità. Per /listino non ho scritto un countdown testuale che non esiste nel componente reale: ho solo segnalato a Davide, come nota separata, che la stessa scadenza reale potrebbe essere resa visibile anche lì.

---

## Ambiguità/scelte da confermare con Mason o Elena

1. Ho aggiunto la prova di competenza "15 anni dei fondatori" su entrambe le pagine (non c'era prima su nessuna delle due). È un fatto verificato in memoria ma non era nel materiale che mi è stato passato come "testo attuale" — segnalo per conferma che il posizionamento (riga breve dopo la CTA, corsivo/piccolo) sia quello giusto e non vada invece nella sezione "chi siamo"/altrove.
2. Ho riscritto la card 3 di /report per nominare esplicitamente Luigi (consulente umano) insieme all'AI, come richiesto dalla regola di voce — prima la card non nominava né l'uno né l'altro. Verificare che il nome "Luigi" possa comparire così, diretto, in un punto di prodotto (altrove in memoria compare più spesso come "Luigi Perri" o "il consulente").
3. Per /listino ho proposto in nota (non scritto come testo definitivo) di riusare il componente countdown dell'Identikit anche qui, dato che condividono la stessa finestra reale — è un suggerimento tecnico per Davide, non una decisione presa da me: segnalo perché tocca priorità/roadmap, non solo copy.

---

## Changelog — correzione post-gate Elena (2026-09-21)

**Cosa ho cambiato:** riscritto il sottotitolo di /report (sezione 2). Vecchia frase d'apertura: "Non è un test online e non è un oroscopo." Nuova: "Non è un test online, né un oroscopo: è una diagnosi seria." Il resto del sottotitolo e del documento resta invariato.

**Perché:** Elena ha segnalato in gate che la vecchia frase impilava due negazioni di definizione distinte ("non è un test online" + "non è un oroscopo"), senza un "ma Y" positivo a chiudere — sopra il tetto di massimo 1 contrasto negativo per blocco fissato in `memory/generale.md` (2026-08-29). La nuova frase riduce le due negazioni a una sola clausola negativa unica (un solo "non è", oggetto composto con "né"), chiusa subito da un'affermazione positiva ("è una diagnosi seria"), che riprende lo schema "non X ma Y" ammesso una volta per blocco. Significato e forza restano gli stessi: il report resta definito come diagnosi seria sui dati veri del centro, non come test generico o oroscopo.

**Correzione al punto 1 della sezione "Autoverifica rapida" (riga sul sottotitolo /report):** quel punto affermava che il pattern a due negazioni fosse "la stessa lettura già validata dal gate di Elena il 04/09/2026". Elena ha verificato che questo è **errato**: il gate del 04/09 aveva segnalato proprio questo pattern come problema, mai risolto e mai approvato — non una lettura validata. La riga in questione (sezione 5, elenco "Max un contrasto 'non X ma Y' per blocco") resta come registrazione storica dell'errore commesso nell'autoverifica originale; questa nota di changelog è la correzione ufficiale.
