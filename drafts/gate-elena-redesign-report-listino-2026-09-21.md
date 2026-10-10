# Gate finale Elena — Redesign /report e /listino (copy Federica + immagini Chiara)

Data: 2026-09-21
Materiali verificati:
- Copy: `drafts/copy-redesign-report-listino-2026-09-21.md` (Federica)
- Immagini: `drafts/immagini-redesign-report-listino-2026-09-21.md` (Chiara) — aperte davvero nel browser (link Canva export PNG, non solo lette a livello descrittivo)
- Struttura pagina attuale: `app/report/page.js` (componente `ReportPublicLanding`), `app/listino/page.js` (componente `ListinoWall`, righe 775-839)

Memoria consultata: `memory/generale.md`, `memory/elena.md`, `memory/voce-beautyx.md`.

---

## PARTE 1 — /report (Identikit CURA)

**[Cosa ho verificato]**
Copy riga per riga contro tutte le regole di voce (Montemagno, soggetto esplicito, no-voi, no-negazione/contagocce, no aggettivi vuoti, no liste travestite, no menzione CARE/meccanismo, no credito/abbonamento, no prova sociale inventata, no scarsità finta, CTA unica, consulente umano sempre con l'AI). Confrontato il testo nuovo con `app/report/page.js` reale per capire dove si innesta. Aperta davvero l'immagine hero (link export Canva, design `DAHV0IFvZDE`) via browser, non solo la descrizione testuale.

**[Cosa funziona]**
- H1 invariato (già gate-ato), sottotitolo riscritto molto meglio: parte dal beneficio concreto, non dal meccanismo, e la frase "Fatto apposta per il tuo centro, quello vero" chiude in positivo invece che con una seconda negazione — buon miglioramento rispetto alla versione precedente.
- Le 3 card sono passate da "cosa contiene il report" a "cosa cambia per te": vero salto di orientamento verso il beneficio, coerente con la regola "vendi lo stato mentale, non il prodotto".
- Card 1 e "clienti/personale/spese" risolti in clausole con verbo proprio, non più lista travestita.
- Consulente umano citato esplicitamente insieme all'AI in card 3 ("a un consulente vero, Luigi, che lavora insieme all'AI").
- Zero menzione credito/abbonamento futuro, formula "90 giorni gratis, poi 60€ una tantum" corretta e unica CTA rispettata.
- Prova di competenza "15 anni dei fondatori" è un fatto già verificato/approvato in memoria (non inventato), solo nuovo su questa pagina specifica.
- Immagine hero: fotografia editoriale di qualità reale — non stock generico, non illustrazione flat. Comunica bene il concetto "riconoscimento, non stupore tecnologico" richiesto nel brief: la titolare (di spalle) che si ferma davanti al lettino vuoto, luce dorata dalle persiane, asciugamano rosa cipria come tocco cromatico coerente con l'accento rosa (#EC4899) già in uso sulla pagina.

**[Anomalie rilevate]**
1. **Sottotitolo — doppia negazione non risolta, e citata come "già approvata" quando non lo era.** "Non è un test online e non è un oroscopo" impila due negazioni di definizione nella stessa frase, senza un "ma Y" positivo a chiudere il contrasto (il positivo arriva solo nella frase successiva). Nell'autoverifica Federica scrive che è "la stessa lettura già validata dal gate di Elena il 04/09/2026" — non è corretto: il gate del 04/09 (vedi `memory/elena.md`) aveva **segnalato** esattamente questo pattern come sopra il tetto di 1 contrasto/blocco su un sottotitolo di /report, chiedendo una decisione a Mason mai arrivata — non lo aveva approvato. È quindi un problema irrisolto che si ripresenta identico in una nuova stesura, non un punto già chiuso. Da correggere (una sola negazione, o riformulare in positivo) oppure portare esplicitamente a Mason per una decisione finale, non farlo passare come già deciso.
2. **Nessuna implementazione reale ancora esistente.** `app/report/page.js` oggi contiene ancora il vecchio copy ("Vale 60€: è il prezzo di una diagnosi scritta sui dati del tuo centro...", vecchie card "Dove il centro è bloccato" ecc.) — il nuovo copy e l'immagine sono ancora solo materiali, non una pagina assemblata. Il giudizio estetico sotto è quindi necessariamente prospettico (su come si comporrebbero i materiali nella struttura attuale), non un giudizio su una pagina reale già esistente.
3. **Immagini non ancora salvate nel repository** (nota tecnica di Chiara, non bloccante per il giudizio ma bloccante per il lavoro di Davide): serve un passaggio del Coordinatore per scaricare i PNG o rigenerarli da Canva.

**[Raccomandazioni per il Coordinatore]**
- Far risolvere a Federica il punto 1 prima che il testo sia "definitivo" — o riscrivere la frase in una sola negazione, o portarla esplicitamente a Mason come decisione aperta (non richiuderla da sola citando un'approvazione che non c'è mai stata).
- Sbloccare il download locale delle immagini (ambiente shell) prima di passare il lavoro a Davide.
- Non dichiarare il task "pronto per Davide" come design finito: è pronto come **materiali di input** per un lavoro di layout che Davide deve ancora fare per intero (vedi giudizio estetico sotto) — servirà un secondo gate di Elena **sulla pagina viva/renderizzata**, non solo sui materiali, prima che arrivi a Mason (coerente con la regola "collaudo dal vivo" e "gate sul file pubblicato" in `memory/generale.md`/`memory/elena.md`).

---

## PARTE 2 — /listino (ListinoWall)

**[Cosa ho verificato]**
Stessa checklist di regole applicata riga per riga. Confrontato col componente `ListinoWall` reale (righe 775-839 di `app/listino/page.js`). Aperta davvero l'immagine hero (design Canva `DAHV0DqLQUo`) via browser.

**[Cosa funziona]**
- H1 riscritto da zero, e bene: passa da un H1-feature ("Margini e costo orario, a colpo d'occhio") a un H1-domanda che parte dal dolore reale ("Quanto ti costa davvero un'ora del tuo centro?") — applica correttamente la regola Montemagno "apri dal problema, mai dal prodotto", che la versione attuale live violava.
- Sottotitolo ancorato a un comportamento reale e riconoscibile (prezzi decisi "a sensazione") prima di spiegare la funzione — buon lavoro.
- Riga nuova pre-CTA disinnesca esplicitamente l'obiezione "sarà l'ennesimo foglio Excel" — scelta di copywriting pertinente, non c'era prima.
- Un solo contrasto non-X-ma-Y nel sottotitolo, nessuna ripetizione del pattern altrove — rispettato il contagocce.
- Formula prezzo corretta e unica ("90 giorni gratis, poi 29€ una tantum"), coerente con la correzione del 20/09/2026 in memoria — nessuna menzione di credito/abbonamento.
- CTA unica verso `/signup?risorsa=tool`, nessuna anomalia.
- Immagine hero: fotografia macro elegante, coerente con l'idea "il numero che si sblocca" — legge bene anche piccola (come richiesto per social/ads), nessun numero finto/illeggibile generato dall'AI (scelta corretta, Chiara lo segnala esplicitamente come problema evitato).

**[Anomalie rilevate]**
1. **Copy: nessuna anomalia bloccante trovata.** È il testo meglio riuscito dei due, pronto così com'è.
2. **Immagine: il bagliore non legge come verde smeraldo.** Il concept dichiarato ("un bagliore verde smeraldo/oro esattamente nel momento del tocco") promette di comunicare il cambio di stato verso il margine sano usando il colore identitario del tool (`#0F6E56`, lo stesso della CTA, del badge, di tutta l'interfaccia del tool dopo il login). Guardando l'immagine reale, il bagliore nel punto di contatto è quasi bianco-dorato caldo: l'accento smeraldo è impercettibile, l'immagine nel complesso è dominata da toni ambra/oro, non verde. Non è un errore grave, ma il collegamento cromatico specifico con l'identità del Listino (che è proprio ciò che doveva differenziarla da una foto generica "mani+luce calda" usata anche altrove nel brand) oggi non si vede.
3. **Nessuna implementazione reale ancora esistente** — stessa situazione di /report: `app/listino/page.js`/`ListinoWall` contiene ancora il vecchio copy, nessuna immagine agganciata.

**[Raccomandazioni per il Coordinatore]**
- Copy: pronto, nessuna richiesta di ritocco.
- Girare a Chiara una richiesta puntuale: spingere il color grade del bagliore verso un verde smeraldo più leggibile (anche solo in post, senza rigenerare la scena) prima di considerare l'immagine definitiva — non bloccante per iniziare il lavoro di Davide, ma da chiudere prima del via libera finale.
- Stessa raccomandazione di /report sul secondo gate dal vivo dopo l'implementazione.

---

## PARTE 3 — Giudizio estetico complessivo (nuovo, esplicito)

Messa nei panni di una titolare che apre la pagina per la prima volta, non da chi controlla le regole.

### /report
- **Bilanciamento testo/immagine:** oggi non è verificabile su una pagina reale, perché non esiste ancora un contenitore per l'immagine nel codice — `ReportPublicLanding` è tutt'ora una singola colonna centrata, testo puro, max-width 560-640px, dall'header al footer. Chiara stessa lo segnala come proposta aperta a Davide ("layout a due colonne, o immagine sopra il blocco H1"), non una scelta già presa. Questo è precisamente il rischio da segnalare: se Davide si limita a incollare l'immagine sopra l'H1 dentro la colonna stretta esistente, il risultato più probabile è un ritratto verticale stretto e alto che "pesa" sopra il testo come un allegato — non un hero editoriale bilanciato. Serve un vero lavoro di layout (verosimilmente una griglia a due colonne su desktop, immagine sopra testo con crop e altezza limitata su mobile), non un inserimento meccanico.
- **Coerenza tono immagine/copy in quel punto:** parzialmente sì. Il concetto — la titolare che nota lo spazio vuoto, luce dorata, riconoscimento — è coerente con "dove sei bloccata oggi" del sottotitolo. Ma il registro visivo è molto più cupo e cinematografico (interno quasi notturno, ombre profonde) di quanto lo sia il resto della pagina, che è chiara, calda, color crema (#f5f1ea) dall'inizio alla fine. Serve un trattamento di transizione (sfumatura ai bordi che si fonde nel crema, non un rettangolo netto) perché l'immagine non sembri "incollata" su uno sfondo che le è estraneo di tono.
- **Il resto della pagina sotto l'hero resta 100% testo puro:** 3 card, blocco prezzo/countdown, blocco miniguida — nessuna variazione visiva oltre ai colori già esistenti (bordi, badge tondi numerati). Anche mettendo un hero perfetto in cima, il resto della pagina continua a somigliare a un modulo informativo ben scritto più che a una landing "che vende qualcosa di valore" — è esattamente il tipo di mancanza che nessun controllo di regole avrebbe mai potuto segnalare. Non serve necessariamente una seconda foto: basterebbe una gerarchia visiva più forte (un blocco che stacca per colore/consistenza, una citazione in Playfair grande, uno spazio bianco più generoso) per portare la stessa cura editoriale della hero anche nel resto dello scroll.

**Verdetto /report: NON APPROVA** — non perché il copy o l'immagine siano sbagliati singolarmente (entrambi sono un salto di qualità reale rispetto a prima), ma perché oggi non esiste una pagina assemblata da giudicare: manca (a) la risoluzione della doppia negazione nel sottotitolo, (b) un vero disegno di layout per ospitare l'immagine (non ancora fatto, solo proposto), (c) un'attenzione esplicita a cosa succede sotto l'hero perché la cura visiva non si esaurisca nei primi 100px di pagina. Va rimandato con questi tre punti, poi richiede un secondo gate di Elena sulla pagina viva prima di Mason.

### /listino
- **Bilanciamento testo/immagine:** stesso problema strutturale di /report, aggravato dal fatto che `ListinoWall` è una pagina ancora più scarna (niente card, niente blocco prezzo — solo header, badge, H1, sottotitolo, CTA, footer). C'è meno "peso" testuale per bilanciare un hero verticale importante: il rischio opposto a /report, cioè che l'immagine domini una pagina troppo corta e la faccia sembrare un singolo banner pubblicitario invece di una landing editoriale, è concreto quanto quello opposto.
- **Coerenza tono immagine/copy:** il concept regge (un tocco che fa succedere qualcosa, un cambio di stato) ma il colore — vedi anomalia sopra — non porta davvero l'identità smeraldo/oro del tool. Accostata al bottone CTA verde scuro (#0F6E56) e al badge verde, l'immagine ambra rischia di sembrare presa da un set fotografico diverso, non pensata apposta per questo strumento.
- **Manca ancora qualcosa:** più che a /report, a questa pagina serve un secondo elemento di gerarchia visiva — anche solo una fascia di colore coerente con la palette del tool (verde/oro) dietro o accanto all'hero, o il badge reso più prominente — perché con solo 5-6 righe di testo e un'immagine, la pagina resta troppo leggera per "sembrare fatta da chi vende qualcosa di valore": oggi somiglia più a una landing di attesa (waitlist) che alla vetrina di uno strumento a pagamento.

**Verdetto /listino: NON APPROVA** — stessa ragione strutturale di /report (nessuna pagina assemblata da giudicare, layout non disegnato), più uno specifico problema di coerenza cromatica dell'immagine da correggere con Chiara prima del via libera finale. Il copy da solo è invece già pronto (APPROVA).

### Nota generale per il Coordinatore
In entrambi i casi il problema più urgente non è "il copy" o "le immagini" prese singolarmente — sono il salto di qualità che Mason chiedeva. Il problema è che il task, come consegnato oggi, si ferma un passo prima del traguardo: ha prodotto ottimi materiali ma non ancora una pagina. Consegnare questo a Mason come "pronto" ripeterebbe l'errore di fondo che ha causato la bocciatura originale — mostrargli qualcosa che sulla carta sembra a posto ma che dal vivo non lo è. Serve un giro di implementazione di Davide con indicazioni di layout esplicite (non lasciate alla sua interpretazione) e un secondo gate mio sulla pagina renderizzata.

---

## PARTE 4 — Le 3 ambiguità di Federica

1. **Prova di competenza "15 anni dei fondatori" su entrambe le pagine, mai usata qui prima.** Nessuna obiezione di regola: è un fatto già verificato e approvato in memoria (non una prova sociale inventata), solo nuovo su queste due pagine specifiche. La posizione proposta (riga piccola/corsivo dopo la CTA) è ragionevole e non compete con la CTA principale. Serve comunque il sì esplicito di Mason perché è una scelta di posizionamento, non solo di copy.
2. **"Luigi" diretto vs "Luigi Perri"/"il consulente".** Nessuna violazione di regola — la voce Beautyx è informale e diretta ("tu"), e il nome proprio da solo è coerente con quel registro, più caldo di "Luigi Perri" in un punto di prodotto breve. Il mio parere è di approvarlo così com'è, salvo una preferenza personale di branding di Mason.
3. **Riuso del countdown dell'Identikit anche su /listino.** Proposta tecnica sensata dal punto di vista sia di coerenza (è davvero la stessa scadenza, non un'urgenza finta) sia — aggiungo dal mio punto di vista estetico — utile: darebbe a /listino proprio quel secondo elemento di gerarchia visiva che oggi le manca (vedi Parte 3). Correttamente Federica non l'ha scritta come se esistesse già. È una decisione di prodotto/roadmap che spetta a Mason, non una richiesta di copy: la segnalo come raccomandazione positiva, non come requisito.
