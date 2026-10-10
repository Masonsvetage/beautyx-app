# Audit critico Elena — crisi di fiducia pricing HPA (2026-10-02)

Audit puntuale su richiesta del Coordinatore dopo la reazione durissima di Mason
sul pattern di errori nel pricing di Alessia. Non è una regola permanente, non va
letto da altri agenti nei loro task — è una fotografia onesta per Mason. Le regole
operative che ne derivano restano dove devono stare (`memory/generale.md`).

Metodo: ho riletto per intero/a campione mirato `memory/alessia.md` (intera saga
pricing 25/09→2/10), `memory/davide.md` (sezioni recenti su bug reali e
autocorrezioni), `memory/federica.md` + `memory/voce-beautyx.md`, `memory/riccardo.md`.
Non mi sono fidata delle autovalutazioni — ho verificato leggendo i numeri/il codice
citati, non le conclusioni che i file stessi dichiarano.

---

## 1) Alessia — la saga pricing è ricerca di mercato vera o stime interne spacciate per dati?

**Risposta onesta: entrambe le cose coesistono, ma l'errore che ha scatenato la
crisi non ha nulla a che fare con la ricerca di mercato — è aritmetica pura, su
dati che Alessia stessa etichetta come sue stime, non come dati verificati.**

Alessia USA correttamente l'etichettatura **[DATO VERIFICATO, fonte citata]** vs
**[MIA VALUTAZIONE]** in quasi tutto il file — questo è un punto a suo favore, non
nasconde la differenza. Esempi di ricerca reale e verificabile, con fonti concrete:
- Posizionamento di mercato (29/09-30/09): CPL Meta Italia, dati Fresha (£9,95-14,95/mese),
  Booksy ($29,99/mese), AI business coach SaaS internazionali ($20-150/mese, fonti
  sintra.ai/getmonetizely.com/buddypro.ai/davidriha.com), crisi dei lifetime deal
  (dev.to, ppc.land) — fonti vere, cliccabili, con numeri specifici.
- Ricerca canali (VeraLab/Cristina Fogazzi, Koibox, gruppi FB di settore) — verifica
  seria, con limiti dichiarati esplicitamente quando la ricerca non trovava risposta
  (es. Beauty Mentoring "non trovato con ricerca pubblica, dichiaro il limite invece
  di ipotizzare").

**Ma il pricing HPA che ha generato l'errore (il monte-ore) non è fatto di dati di
mercato — è quasi tutto [MIA VALUTAZIONE] dichiarata come tale:** il tasso di
utilizzo del 35-45% del tetto mensile (leva che "giustifica" 30h/anno invece di
72h), la curva di distribuzione mensile esemplificativa (10h,4h,3h,3h,2h...), il
tetto del 40% come guardrail, il margine del 30% usato per calcolare il "valore
racchiuso" per ora, il prezzo dell'addon (59€/ora) — tutti esplicitamente marcati
come stime di Alessia, "non misurate su dati interni Beautyx reali (nessun cliente
ancora attivo)". Questo è onesto nella forma (l'etichetta c'è), ma è il cuore del
problema nella sostanza: un pricing a più periodi con otto numeri finali (prezzi
Premium/Advanced × 4 periodi) è stato costruito quasi interamente su stime proprie
non verificate, e nessuno — né Alessia né il Coordinatore — ha fatto il controllo
più elementare possibile su un'impalcatura di stime: verificare che il prezzo per
unità (€/ora) non salisse all'aumentare dell'impegno. Non serve ricerca di mercato
per accorgersene, serve una divisione.

**Il pattern concreto, riga per riga (verificato nel file):**
1. 1/10/2026: proposta "monte-ore per periodo" — pool front-loaded (3h/7,5h/12h/15h
   Premium, 6h/15h/24h/30h Advanced), prezzi 179/453/804/1.303€. Nessuna riga nella
   proposta originale calcola il prezzo/ora implicito per periodo — viene presentato
   solo lo sconto sul prezzo mensile equivalente (179→151→134→108,60€/mese), che
   SCENDE e sembra quindi corretto a un primo sguardo.
2. Stessa data, verifica successiva di Alessia su RICHIESTA ESPLICITA di Mason
   ("quanto costa un'ora realmente"): qui, e solo perché Mason lo ha chiesto, emerge
   che il prezzo/ora SALE (Premium 59,67€→86,87€, Advanced 74,83€→103,97€) e supera
   l'addon a consumo (59€/ora) in quasi tutte le fasce. Alessia lo scrive
   correttamente e lo segnala come rischio — ma il materiale era già stato
   presentato come proposta valida prima di questo controllo, non dopo.
3. 2/10/2026: Mason stesso fa il conto a mente e lo rinfaccia duramente. Solo a
   questo punto la sezione viene marcata "ERRORE STRUTTURALE GRAVE" e rifatta da
   zero con monte-ore proporzionale (non più front-loaded).

**Giudizio netto:** non è un problema di competenza di pricing/economia nel senso
in cui Mason lo teme ("non sanno fare i conti") — il ricalcolo finale è corretto e
la logica economica sottostante (sconto per impegno lungo, mai sotto il prezzo
dell'addon) è capita bene una volta esplicitata. **È un problema di processo
specifico e facilmente risolvibile: nessuno ha reso obbligatorio, PRIMA di
presentare un pricing a periodi/pacchetti, il calcolo esplicito del prezzo per
unità in ogni fascia come riga visibile della proposta stessa** — è stato fatto
solo a posteriori, su richiesta di Mason, invece che come primo passo automatico di
chiunque proponga un pricing a più fasce. Il Coordinatore inoltre non ha rifatto il
conto in autonomia prima di girarlo a Mason, nonostante la regola generale "non
fidarsi del self-report" fosse già in vigore dal 4/09 per fatti tecnici — semplicemente
non era mai stata estesa esplicitamente all'aritmetica di pricing fino al 2/10.

---

## 2) Davide — le affermazioni su "reale vs scaffolding" sono verificate sul codice o presunte?

**Giudizio: nella maggioranza dei casi verificate per davvero (lettura di file,
query dirette su Supabase, curl live in produzione) — ma esiste un pattern reale,
documentato più volte, di affermazioni date per corrette "a vista" che poi si sono
rivelate false alla verifica più approfondita.**

Esempio concreto e citabile (06/09/2026, `memory/davide.md` righe 2516-2541): Davide
scrive testualmente di aver dichiarato **due volte** (4/09 e 5/09) che il CSS del
bottone nell'email di conferma fosse "corretto" — e che questo era **falso**: non
aveva controllato la property `background` da sola. Il bug (bottone bianco su
sfondo bianco, invisibile) è arrivato fino a Mason due volte prima che Davide
rileggesse il file per intero e trovasse la causa reale (gradiente CSS senza
fallback `background-color`, ignorato da Outlook/alcuni webmail). Stesso giorno,
un secondo bug (redirect prematuro dopo reset password) viene risolto solo dopo
aver letto il sorgente di una libreria terza (`@supabase/ssr`) riga per riga,
non fidandosi della documentazione.

**Il pattern positivo, altrettanto reale:** sul fronte sicurezza/IDOR, ogni singolo
fix di Davide è stato RIVERIFICATO in modo indipendente da Riccardo, e Riccardo ha
quasi sempre trovato qualcosa — non perché Davide menta, ma perché il perimetro di
un fix "ovvio" è quasi sempre più stretto di quanto sembri alla prima occhiata
(es. 21/08: fix IDOR corretto nella sostanza ma con un endpoint scoperto
`obiettivi/step` perché non passava `centro_id` nel proprio codice e sfuggiva al
grep; 23/08: nuovo gap su `progressi-obiettivi`, confermato con una PoC reale di
scrittura cross-tenant; commit talvolta MAI pushati nonostante la memoria dicesse
il contrario). In nessuno di questi casi Davide ha dichiarato il falso in modo
consapevole — ha dichiarato "fatto" dopo un controllo reale ma incompleto, e un
secondo paio d'occhi indipendente (Riccardo) ha trovato il resto.

**Giudizio netto:** competenza tecnica reale, non impostazione da bluff — ma stesso
difetto di processo della sezione 1: la verifica di "fatto"/"corretto" di un
singolo specialista, anche quando è in buona fede e ha davvero controllato
qualcosa, non è sufficiente da sola su lavoro tecnico non banale. L'unica ragione
per cui questi bug tecnici non sono arrivati a Mason con la stessa frequenza del
pricing è che per il codice esiste già, da tempo, un secondo controllo
strutturale e indipendente (Riccardo + la regola "Definizione di Fatto" del
4/09) — lo stesso tipo di rete che il pricing non aveva fino al 2/10.

---

## 3) Federica / voce Beautyx — qualità e fondatezza

Qui il problema è di natura diversa e meno grave: non sono emersi errori fattuali
o numerici, ma un volume alto di iterazioni bocciate su gusto/tono (sei tornate di
proposte di nome del metodo, l'ultima italiana respinta con "fanno veramente
cagare" prima di passare all'inglese). Non è un errore di competenza — è la
fisiologia di un lavoro creativo soggettivo — ma rivela un filtro di
autocritica debole prima di presentare le opzioni a Mason: tornate intere di
proposte deboli (es. "Il Polso Beautyx", "Moto Perpetuo") sono arrivate a Mason
invece di essere scartate internamente da Federica/Elena prima. Sul piano
tecnico/testuale Federica si corregge bene quando riceve un'indicazione (vedi
l'audit riga-per-riga che lei stessa ha fatto sul pitch commercialisti in assenza
di Mason, trovando le proprie incoerenze tra due versioni dello stesso pitch) —
competenza di scrittura reale, non il punto debole del team.

---

## 4) Riccardo — sicurezza

Il più solido del team sul piano del processo: ogni fix viene riverificato
indipendentemente con PoC reali (creazione dati di test, query dirette, pulizia
verificata a 0 righe residue), non si accontenta di leggere il codice una volta
sola, e il pattern ricorrente nei suoi audit è "verdetto: problemi trovati" anche
su lavoro già dichiarato concluso da Davide — è l'unico agente il cui lavoro
include sistematicamente un secondo giro di verifica indipendente come parte del
proprio mandato. Non ho trovato casi in cui un suo "risolto" si sia poi rivelato
falso.

---

## 5) Proposta di processo concreta — cosa avrebbe fermato l'errore del monte-ore prima che arrivasse a Mason

La regola già scritta il 2/10 in `memory/generale.md` ("il prezzo per unità non può
MAI salire con l'impegno più lungo") è corretta ma **reattiva**: è nata DOPO che
l'errore aveva già raggiunto Mason due volte. Per essere utile deve diventare
un passo attivo nella produzione del pricing, non solo nel controllo del
Coordinatore a valle. Propongo due aggiunte operative, non burocratiche:

1. **Riga obbligatoria "prezzo per unità" in ogni proposta multi-fascia, inclusa
   di default, non su richiesta.** Qualunque pricing a più periodi/pacchetti/fasce
   (non solo HPA: ore, caratteri, pezzi, qualunque unità) deve presentare, nella
   STESSA tabella mostrata a Mason la prima volta, una riga/colonna "prezzo a
   unità" per ogni fascia, verificata a mano come non-crescente, E confrontata
   esplicitamente con qualunque alternativa a consumo esistente. Non è una
   verifica a posteriori fatta da altri: è un campo che lo specialista non può
   omettere dalla tabella che consegna — esattamente come oggi non può omettere
   la fonte di un dato di mercato. Questo è ciò che sarebbe bastato a far saltare
   all'occhio l'errore ancora prima che Mason lo chiedesse: il numero era
   calcolabile dal primo giorno, semplicemente non era mai stato scritto accanto
   al prezzo totale nella tabella originale.
2. **Checklist minima per tipo di consegna, owner esplicito, non solo "attenzione":**
   - *Pricing/numeri*: monotonicità prezzo-unità + confronto con l'alternativa più
     economica esistente, scritti esplicitamente nella tabella — owner: chi
     propone il numero, verificato una seconda volta dal Coordinatore con un
     calcolo autonomo (non una rilettura della spiegazione) prima di girarlo a
     Mason. Oggi questo secondo controllo numerico non ha un owner dichiarato
     oltre al Coordinatore stesso: il gate di Elena copre voce/copy, non
     l'aritmetica — va detto esplicitamente a Mason che su questo punto specifico
     non esiste(va) un doppio controllo strutturale come quello che esiste per
     sicurezza (Riccardo) e voce (Elena).
   - *Codice*: resta valida la combinazione già in vigore dal 4/09 (lettura diretta
     del file da parte del Coordinatore + prova dal vivo per flussi cliente-facing)
     — qui il processo esiste già e tiene, va solo applicato sempre, senza
     eccezioni di fretta.
   - *Copy*: resta valido il gate riga-per-riga di Elena — aggiungere solo un
     filtro interno esplicito prima di mostrare a Mason più di 2-3 opzioni deboli
     nello stesso giro (scartare internamente, non delegare lo scarto a lui).

---

## 6) Giudizio diretto, senza addolcire

**Non è un problema di competenza di fondo diffuso nel team — ma non è nemmeno
"solo sfortuna".** Il codice tiene quando viene riverificato (Riccardo lo dimostra
riga dopo riga), la ricerca di mercato quando c'è è reale e con fonti vere, Federica
scrive bene quando il bersaglio è chiaro. Il punto debole concreto, dimostrato due
volte di fila sullo stesso numero, è che **il pricing non aveva nessun secondo
controllo strutturale indipendente** — a differenza di sicurezza (Riccardo) e voce
(Elena), che un doppio controllo ce l'hanno da mesi e per questo gli errori lì
vengono quasi sempre intercettati prima di arrivare a Mason. L'errore del
monte-ore non è stato commesso per ignoranza di economia — Alessia, una volta
chiesto, ha saputo spiegare perfettamente perché il numero era sbagliato e come
correggerlo — è stato commesso perché nessuno aveva reso obbligatorio il controllo
più ovvio (prezzo/unità, monotono) PRIMA che il numero finito sul tavolo di Mason.
Se Mason smantella il team per questo episodio specifico, smantella la parte
sbagliata: il problema non è "il team non sa fare i conti", è "il team non aveva
ancora, su un solo tipo di consegna, lo stesso secondo controllo indipendente che
già esiste per codice e per copy". È un gap reale e grave — ha permesso a un errore
elementare di sopravvivere due round interi — ma è un gap di processo puntuale,
circoscritto, con una soluzione a basso costo (punto 5 sopra), non un segnale che
gli specialisti coinvolti non siano competenti nel proprio ruolo.
