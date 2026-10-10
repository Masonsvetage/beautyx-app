# Agenda cartacea annuale — 3 proposte di struttura dei contenuti

Autrice: Federica. Data: 06/10/2026. Stato: proposte per Mason, nessuna è approvata.
Nessun gate di revisione eseguito (Elena è fuori dal team dal 02/10): le controllo io sulle regole di voce, ma serve l'occhio di Mason.

## Cosa ho trovato già definito (e cosa no)

Fonti usate:
- `memory/generale.md`: nome CURA (voci del 03/09), cosa si può mostrare del metodo, regole sulla negazione, maieutica, nessuna consulenza fiscale/legale/finanziaria (voce 20/08 sui temi gestionali).
- `nome-metodo-CARE.md` (parte CURA, in cima): le 4 fasi sono Consapevolezza · Unisono degli Elementi · Risveglio del Potenziale · Ascesa Strategica. Claim: "CURA, il metodo che si prende cura di te, prima ancora che del tuo centro". Insight: la titolare cura tutti e nessuno cura lei.
- `memory/davide.md` (audit del 26/09, righe ~3762-3785): cosa fa oggi la parte gestionale. Spese su `/movimenti`, incasso giornaliero su `app/api/revenue/daily`, fondi (accantonamenti) su `app/api/accantonamenti/*`, obiettivi, pianificazione.
- `lib/listino-calc.js`: il costo di un servizio parte da "spese di 365 giorni diviso ore di apertura". Questo è il ponte tra il costo mensile in agenda e il Listino.
- `memory/voce-beautyx.md`: voce Montemagno, "tu" diretto, soggetto esplicito, niente "viste", niente liste travestite, un solo contrasto "non X ma Y" per blocco.

Cosa NON è definito: vedi l'ultima sezione.

## Regole che ho tenuto per ogni proposta

1. Si può nominare CURA e le sue 4 parole. Non si spiega mai il meccanismo (elementi, cicli, blocchi). Quindi nell'agenda non compaiono Fuoco/Acqua/Aria/Terra/Metallo.
2. Nessuna percentuale, nessuna aliquota, nessun "devi mettere da parte il X%". La titolare scrive le sue cifre. Per tasse, IVA e personale c'è una frase fissa: "Le cifre giuste le definisci con il tuo commercialista". Beautyx non le dà.
3. Domande, non ordini (maieutica). Nessuna AI, nessun punteggio automatico.
4. Se una titolare salta dei giorni, l'agenda non la fa sentire in difetto.

---

## PROPOSTA 1 — "Chiudi la Giornata"

Idea: cinque minuti a fine giornata, ogni giorno la stessa pagina. La più semplice, pensata per non mollare.

**Rituale giornaliero (3-5 minuti). Campi esatti:**
1. Data.
2. Incassato oggi (euro).
3. Speso oggi: fino a 3 righe, ognuna con "per cosa" e "quanto".
4. Clienti servite (numero).
5. "Oggi ho notato che…" (una riga libera).

**Rituale settimanale (la domenica o il lunedì, 10 minuti).** Pagina "La mia settimana": totale incassato, totale speso, differenza. Poi una sola domanda a rotazione (esempi: "Quale spesa rifarei? Quale no?", "Quale giorno ha reso di più?"). Una riga di risposta.

**Rituale mensile: aggiornamento costi (20-30 minuti).** Pagina "Il tagliando dei costi". Tabella con una riga per ogni costo fisso (affitto, utenze, prodotti, stipendi, rate, software, altro). Colonne: "mese scorso", "questo mese", "è cambiato? perché". In fondo: totale costi del mese e "il costo di un minuto di apertura del mio centro" (costi del mese diviso minuti di apertura: formula scritta passo per passo, la titolare fa il conto a mano). Chiude una domanda: "C'è un prezzo del mio listino che va rivisto?".

**Apertura anno.** "Il punto di partenza": costi fissi di oggi, ore di apertura, quanto vorrei che restasse a fine anno, una frase su che titolare voglio essere tra 12 mesi. Pagina patto: "Cinque minuti, ogni sera. Se salto, riprendo dal giorno dopo."

**Chiusura anno.** "Il mio anno in numeri": tabelle riepilogo mese per mese (incassi, spese, differenza), tre scoperte, tre decisioni per l'anno dopo. Ultima pagina: costi fissi da riportare nella nuova agenda.

**Dove entra CURA.** Leggero. Quattro pagine di apertura trimestre, una per fase (Consapevolezza, Unisono degli Elementi, Risveglio del Potenziale, Ascesa Strategica), ognuna con una citazione breve e una domanda. Il rituale quotidiano resta uguale tutto l'anno.

**Dialogo con il tool digitale.** I campi dell'agenda hanno gli stessi nomi del tool: "Incassato oggi" come l'incasso giornaliero, "Speso" come i movimenti, costi mensili come base per il Listino. La titolare può ricopiare il totale settimanale nel tool. Nessun collegamento automatico: la carta resta carta.

**5 esempi di microcopy**
1. "Cinque minuti, una penna. Poi il centro si spegne e tu pure."
2. "Hai incassato 380 euro e non ricordi dove sono finiti? Questa pagina serve a questo."
3. "Giornata storta? Scrivi lo stesso. Anche un 'zero' è un numero vero."
4. "Una spesa che rifaresti, una che no. Basta questo per cambiare il mese."
5. "Hai saltato tre giorni? L'agenda non tiene il conto. Riparti da oggi."

**Rischi**
- Troppo piccola: sembra un quaderno qualunque, CURA quasi non si vede.
- Abbandono dopo 3 settimane: la prevengo con la regola del "riprendi da oggi" scritta nella pagina patto, e con la pagina settimanale che dà un risultato visibile ogni 7 giorni. Aggiungo una "pagina di salvataggio" al primo mese: "Se hai mollato, comincia da qui, serve un minuto: scrivi solo l'incasso di oggi".
- Il "costo di un minuto" è un conto che può spaventare: servono un esempio svolto e una calcolatrice stampata a lato.

---

## PROPOSTA 2 — "Le Buste"

Idea: ogni incasso viene diviso in "buste" prima di essere speso. Parte dall'idea di fondi/accantonamenti già presente nel tool.

**Rituale giornaliero (4-5 minuti). Campi esatti:**
1. Data.
2. Incassato oggi (euro).
3. Una riga per ogni busta: nome della busta e quanto ci metto oggi. Le buste sono scelte dalla titolare a inizio anno, 4-6 righe pre-stampate con nome vuoto (l'agenda propone solo esempi: "Tasse", "Imprevisti", "Formazione", "Serenità", "Stipendio mio").
4. Speso oggi (fino a 2 righe: per cosa, quanto, da quale busta).
5. "Oggi mi sono fidata dei numeri?" (sì / così così / no).

**Rituale settimanale (10 minuti).** "Il giro delle buste": per ogni busta, saldo all'inizio, quanto entrato, quanto uscito, saldo finale. Una domanda: "Quale busta è più vuota di come la volevo?".

**Rituale mensile: aggiornamento costi (30 minuti).** Tabella costi come nella Proposta 1, più una colonna "da quale busta esce". Poi: "I miei costi sono saliti? Quanto mi serve in più nelle buste il mese prossimo?". La titolare scrive la sua stima; le cifre fiscali le conferma con il commercialista.

**Apertura anno.** "Le mie buste": si scelgono nomi e obiettivi di ogni busta. Pagina "Cosa c'è già dentro oggi" (scrivere i saldi di partenza).

**Chiusura anno.** "Quanto c'era in ogni busta": confronto inizio e fine anno, busta per busta. Tre domande: quale è cresciuta, quale si è svuotata, quale cambio per l'anno dopo.

**Dove entra CURA.** Nelle pagine settimanali: la domanda di ogni settimana richiama una delle 4 fasi (esempio per Consapevolezza: "Dove sono andati i miei soldi questa settimana?"). Il rapporto con il metodo è più forte che nella Proposta 1, ma resta a livello di domande.

**Dialogo con il tool digitale.** È il più vicino: nel tool esistono già i fondi (accantonamenti) con saldo e movimenti, e l'incasso giornaliero con suggerimento di allocazione. Le buste di carta e i fondi del tool hanno gli stessi nomi. Chi usa solo la carta impara il meccanismo, chi passa al tool lo ritrova uguale.

**5 esempi di microcopy**
1. "Prima di spenderli, quei soldi hanno già un posto. Scegli tu quale."
2. "Una busta vuota è un'informazione, non un fallimento."
3. "Quanto hai incassato oggi? Adesso dividilo. Ci vogliono due minuti."
4. "Le cifre giuste per tasse e IVA le fissi con il tuo commercialista. Qui scrivi quelle che hai deciso."
5. "Serenità: la busta che nessuna cliente vede e che tu senti ogni mattina."

**Rischi**
- Rischio più alto: dividere ogni giorno in buste può sembrare consulenza fiscale/finanziaria, o essere letto come "metti da parte il X%". Mitigazione: nessuna percentuale stampata, frase fissa sul commercialista, nomi delle buste scelti dalla titolare. Resta comunque il punto più delicato.
- Più campi, più abbandono: 3 settimane sono il punto critico. Prevenzione: versione "minima" indicata in pagina (solo incasso + una busta) per i giorni difficili.
- Chi ha saldi complicati (più fondi già esistenti) fatica a partire; serve una pagina di avvio guidata.
- Il tool usa oggi percentuali sull'incasso per i fondi: la carta, senza percentuali, può non coincidere. Da verificare.

---

## PROPOSTA 3 — "Il Giro di CURA"

Idea: l'anno diviso in quattro tappe, una per fase CURA. Ogni tappa dura circa tre mesi e ha una domanda guida. Il rituale giornaliero è breve; la domanda cambia a ogni tappa.

**Rituale giornaliero (3-4 minuti). Campi esatti:**
1. Data.
2. Incassato oggi (euro).
3. Speso oggi (1-2 righe).
4. "La domanda della tappa": una riga di risposta, stampata sotto i campi e uguale per tutta la settimana (cambia ogni lunedì, 13 domande per tappa).
5. Una casella da riempire: "Giornata: ☐ pesante ☐ normale ☐ buona".

**Rituale settimanale (10 minuti).** "Cosa mi dicono i numeri": totale incassi, totale spese, giorno migliore, giorno peggiore. Poi "Una cosa che cambio la prossima settimana" (una sola riga).

**Rituale mensile: aggiornamento costi (30 minuti).** Come nelle altre, con una variante: la pagina cambia titolo e domande in base alla tappa. Tappa 1: "Quanto costa davvero il mio centro?" Tappa 2: "Come stanno insieme costi, tempo e prezzi?" Tappa 3: "Quale costo posso togliere o trasformare?" Tappa 4: "Quale costo è un investimento?". Il lavoro pratico resta lo stesso: tabella costi, totale, costo di un minuto.

**Apertura anno.** "Il giro che sto per fare": presentazione delle 4 tappe con il claim di CURA ("Il metodo che si prende cura di te, prima ancora che del tuo centro"). Pagina "Chi sono oggi", da rileggere a fine anno.

**Chiusura anno.** "Il mio giro": una pagina per ogni tappa, con le risposte più significative da ricopiare. Poi "La titolare che sono diventata" accanto alla pagina "Chi sono oggi" dell'inizio.

**Dove entra CURA.** Ovunque, in forma di struttura: le 4 tappe sono le 4 fasi, con il loro nome. Le domande sono maieutiche. Il meccanismo (elementi, cicli, blocchi) non compare. Qui l'agenda diventa anche il biglietto da visita del metodo.

**Dialogo con il tool digitale.** A ogni tappa un rimando: Tappa 1 (Consapevolezza) con spese e incassi nel tool; tappa 3 con il Listino; tappa 4 con gli obiettivi. Se la titolare ha il tool, può confrontare i totali mensili con quelli dell'agenda. Se non lo ha, l'agenda funziona da sola.

**5 esempi di microcopy**
1. "Tappa 1: guarda i numeri. Non devi cambiare niente, devi solo guardare."
2. "Questa settimana una sola domanda: dove va il tuo tempo? Rispondi in una riga."
3. "Chi cura tutti ha bisogno di un posto dove curarsi lei. Questo è il tuo: dieci righe, ogni sera."
4. "Hai chiuso il primo mese. La maggior parte delle persone si ferma prima. Tu no."
5. "Fra tre mesi cambia la tappa. Per ora fai solo questo: scrivi quanto hai incassato."

**Rischi**
- Dipende da una scelta non ancora fatta: la fase "Unisono degli Elementi" (seconda tappa) non ha una traduzione pratica approvata per un pubblico che non conosce il metodo. Senza spiegare gli elementi, le domande della Tappa 2 rischiano di essere vaghe. Serve una decisione di Mason su cosa si può dire.
- Struttura più complicata: 13 domande per 4 tappe = 52 domande da scrivere e far approvare.
- Abbandono: prevenzione con la domanda che cambia (novità ogni lunedì), il passaggio di tappa come piccolo traguardo e la frase "non recuperare i giorni saltati".
- Chi parte a metà anno (visita lampo a ottobre) si trova nella Tappa 4: serve una pagina "parti da qui, ovunque tu sia".

---

## Vendita ricorrente, bundle e canali (valido per tutte e tre)

- Rinnovo annuale: l'ultima pagina riporta i costi fissi nell'agenda dell'anno dopo. Chi ha già scritto un anno non riparte da zero con un'altra marca.
- Visite lampo, rappresentanti, fiere: serve una "pagina assaggio" da lasciare sul banco, con un giorno già compilato e i 4 campi quotidiani. In 30 secondi si capisce che non è un planner di appuntamenti.
- Bundle con guida e newsletter: la guida spiega il perché (la titolare non sa dove vanno i soldi), l'agenda dà il rituale, la newsletter la tiene compagnia durante l'anno. Una sola CTA per pezzo, come da regola.

## La mia raccomandazione

Consiglio la **Proposta 3 come struttura, con il rituale giornaliero della Proposta 1**, e le buste della Proposta 2 solo come pagina mensile facoltativa.

Motivi:
1. Il rituale deve restare piccolo. I quattro campi della Proposta 1 sono la cosa più facile da mantenere, e senza abitudine non c'è metodo.
2. Le quattro tappe di CURA danno ciò che manca al quaderno semplice: un percorso, un motivo per riaprire l'agenda ogni lunedì, un oggetto che si riconosce tra mille e che si ricompra l'anno dopo.
3. Le buste quotidiane (Proposta 2) sono il punto più vicino a un consiglio finanziario. Meglio tenerle fuori dal rituale di ogni sera e lasciarle come pagina del mese, con la frase sul commercialista.
4. La Proposta 3 coincide con l'insight del metodo: chi cura tutti ha bisogno di uno spazio per sé. Questo è il dolore concreto da cui partire nei testi di vendita.

Condizione: prima di scrivere le domande servono le risposte di Mason ai punti aperti qui sotto, in particolare su "Unisono degli Elementi".

---

## Cosa non so / fonti mancanti

- **Il tool "consapevolezza & strategia" non esiste con questo nome.** Ho cercato "consapevolezza & strategia", "consapevolezza e strategia" e "gestione spese" nel repo e in `Documents\BEAUTYX`: nessun file lo definisce. Ho dedotto il tool da ciò che c'è nel codice (movimenti, incasso giornaliero, fondi/accantonamenti, obiettivi, pianificazione, Listino) e dall'audit di Davide del 26/09. Serve la descrizione di Mason di cosa il tool contiene e di come si chiama davvero.
- **Spese a mano nel tool.** `/movimenti` è descritto come import da estratto conto con CRUD; non ho verificato se si può inserire una spesa giornaliera a mano come nell'agenda. Se non si può, il dialogo carta-tool cambia.
- **L'incasso giornaliero del tool** registra solo un totale con suggerimento di allocazione; non ho trovato campi per numero clienti o note.
- **Percentuali e fondi.** In `STATO_PROGETTO_BEAUTYX.md` (cartella BEAUTYX) compaiono percentuali per IVA, TFR, tasse e un fondo "Serenità": non le ho usate, non ho verificato nulla e non vanno stampate. Non so quali accantonamenti Beautyx voglia davvero far entrare nell'agenda, né come dirlo senza sembrare consulenza fiscale.
- **Metodo CURA.** Il significato pratico di "Unisono degli Elementi" per una lettrice che non conosce il metodo non è definito in nessun file che ho trovato. Il meccanismo non si può spiegare (`memory/generale.md`, 03/09): resta aperto cosa si può scrivere nella tappa 2.
- **Pubblico di partenza.** Non so quante titolari scrivono già a mano i conti, né se preferiscono formato grande o tascabile: nessuna ricerca in repo. Nessun test con titolari reali.
- **Formato e costi di produzione.** Non so formato, numero pagine, carta, copertina, prezzo, costo di stampa e di distribuzione, né chi stampa. Il pricing in questa fase lo gestisce Mason (`memory/generale.md`, 02/10).
- **Bundle.** Il bundle agenda + guida + newsletter non è definito in nessun file. La "guida" non so se sia la miniguida o un altro prodotto. Non so se il tool digitale fa parte del bundle o di un piano a parte (i piani sono ancora in definizione).
- **Canali.** Visite lampo, rappresentanti e fiere: non ci sono materiali nel repo oltre al programma referral (`memory/generale.md`, 25/09), che parla di segnalazioni e non di vendita dell'agenda.
- **Nessun gate.** Elena e Alessia sono fuori dal team: nessuno ha controllato il testo riga per riga né i numeri. Prima di stampare serve la revisione di Mason, e un controllo legale/fiscale sulle frasi che toccano tasse e accantonamenti (questa non è una decisione mia).
- Ho fatto ricerche per parola chiave, non ho letto tutti i 151 file che nominano CURA/listino/accantonamenti: potrebbero esistere materiali che non ho visto.
