# Memoria di Elena — Supervisione trasversale

Istruzioni e correzioni **specifiche** del ruolo di supervisione. Aggiornata dal
Coordinatore quando Mason dà indicazioni che riguardano come Elena deve vigilare.
Le regole superate restano con lo storico (marcate come sostituite, con data).

### Gate obbligatorio prima del "definitivo"
- **In vigore** (2026-07-27): esegui sempre il controllo riga-per-riga end-to-end sul file pubblicato/esportato prima di ogni via libera a Mason (vedi memory/generale.md). Segnala anche l'eventuale presenza di più versioni dello stesso contenuto (bozze vecchie, .md vs .html, v1 vs v2) come anomalia da risolvere prima dell'ok.

### Rifinitura lunedì 31/08/2026 — newsletter martedì + venerdì (gate superato)
- **In vigore** (2026-08-31): eseguito gate riga-per-riga end-to-end sulle due bozze Federica della settimana (`drafts/bozza_martedi_fidelizzazione.md` fidelizzazione/Frequenza; `drafts/bozza_venerdi_bodycare.md` rituale body-care + pricing). Prodotte le versioni rifinite `drafts/rifinitura_*_ELENA.md`. Esiti: entrambe APPROVATE. **1 sola correzione applicata** (venerdì, chiusura): "leggere i vostri" → "leggere il tuo" (regola voi→tu, [[voce-beautyx]]). Verificati e OK: voce Montemagno, maieutica (novità accompagnate, box che fa emergere la Frequenza), nessun "vista/e" generico, confine gestionale sul pricing con disclaimer commercialista, due audience, CTA unica, nessun riferimento SvetAge/CARE. Segnalati a Mason 2 punti come scelte editoriali (non errori): martedì riga 31 "le hai insegnato tu…"; venerdì riga 34 enumerazione sensoriale borderline lista-travestita. **Nota operativa importante per lo step di pubblicazione:** l'archivio "Newsletter già uscite" usa la tabella **`newsletter_posts`** (esiste, 4 righe, colonna `tags` = text[]), NON `news_posts` (quella è news-prodotto homepage). Tassonomia tag già in uso: Clienti & relazione / Marketing & posizionamento / Mindset & identità / Numeri & margini / Vendita & pacchetti. Aggiorna [[beautyx-homepage-articles-idea]] di conseguenza (la tabella ORA esiste).

### Valutare l'impatto emotivo, non solo la correttezza
- **In vigore** (2026-08-07): nella revisione riga-per-riga non basta verificare
  aderenza a voce/regole/fase — devi valutare esplicitamente anche l'IMPATTO
  EMOTIVO di ogni frase chiave (hero, chiusure, "chi siamo"): che emozione produce
  davvero nel lettore, se comunica competenza reale ed esperienza (Beautyx gestisce
  centri estetici da oltre 15 anni — [[federica]]), e se l'arco narrativo
  rassegnazione→serenità è presente e concreto nei testi che devono convertire. Un
  testo può essere formalmente corretto (nessuna negazione, coerente con la fase) e
  comunque bocciato perché resta vago o senza impatto — segnalalo come problema
  reale, non solo i problemi di forma. Motivo: Mason ha bocciato due volte testi già
  "puliti" secondo le regole precedenti perché non trasmettevano né emozione né
  competenza — un gate che guardava solo le regole di forma li ha lasciati passare.

### Coerenza dell'intera pagina, non solo del pezzo appena modificato
- **In vigore** (2026-08-09): quando un compito tocca una pagina che è già stata
  modificata in round/task precedenti (spesso giorni prima, da compiti diversi e
  scollegati), prima di dare il via libera a Mason NON basta controllare riga per
  riga il testo appena scritto — bisogna rileggere l'INTERA pagina live/finale e
  verificare esplicitamente che non ci siano contraddizioni tra parti costruite in
  momenti diversi. Esempio concreto del problema: un round ha costruito il gate
  dell'archivio newsletter (solo iscritti leggono il testo completo); un sottotitolo
  scritto in un round precedente ("Leggile — poi decidi se iscriverti") prometteva
  l'esatto contrario, e nessuno ha rifatto il collegamento — è rimasto in produzione
  finché Mason non l'ha trovato lui. Stessa logica vale per contenuti pubblicati
  separatamente (es. articoli caricati in `newsletter_posts`) che potrebbero violare
  regole stabilite in un secondo momento (es. confine Fase1/Fase2) rispetto a quando
  erano stati scritti/approvati — un'approvazione vecchia NON è più valida se le
  regole sono cambiate nel frattempo, va sempre riverificata contro lo stato attuale
  delle regole, non solo contro se stessa.
  **Motivo:** Mason ha dovuto trovare da solo due incongruenze macroscopiche (leak
  di Fase 2 in una newsletter già "approvata", e un sottotitolo in contraddizione
  diretta col gate appena costruito) che nessun agente aveva rilevato, perché ogni
  round guardava solo il proprio pezzo isolato. Non deve succedere più: il controllo
  di coerenza whole-page è ora un passaggio esplicito e obbligatorio del gate, non
  facoltativo.

### Verificare anche gli elementi adiacenti, non solo l'elemento toccato
- **In vigore** (2026-08-11): quando un fix modifica la posizione/dimensione fisica
  di un elemento visivo (logo, immagine, badge, bottone...), non basta verificare che
  QUELL'elemento sia ora corretto — bisogna controllare anche cosa c'è FISICAMENTE
  INTORNO (sopra/sotto/a fianco) nel layout reale, perché un elemento che cresce o si
  sposta può andare a sovrapporsi con un elemento vicino che nessuno ha toccato.
  Esempio concreto: il fix del logo header (croppato correttamente e reso sporgente
  come richiesto) ha fatto sì che il suo bordo inferiore andasse a toccare il badge
  eyebrow "Newsletter gratuita" subito sotto — nessuno lo aveva calcolato prima di
  consegnare, l'ha trovato Mason. Verifica sempre con uno screenshot reale (non solo
  lettura del CSS) l'area attorno a qualsiasi elemento il cui ingombro è cambiato,
  prima di dare il via libera.
  **Motivo:** Mason ha chiesto esplicitamente di non dover più tornare a sistemare
  cose "già sistemate" — ogni fix isolato che genera un nuovo problema visibile
  nell'area adiacente è esattamente il pattern da eliminare.

### Verificare le percentuali/distribuzioni dichiarate, non fidarsi del numero riportato
- **In vigore** (2026-08-25): quando un collaboratore dichiara una distribuzione/percentuale come prova di bilanciamento (es. "rotazione lettere: A×7 B×7 C×7 D×8 E×7"), ricontare sempre da zero sul testo reale prima di accettarla — non basta che il numero sia scritto e plausibile. Esempio concreto: nella revisione del banco domande a 5 elementi (25/08/2026), Federica dichiarava una distribuzione della quinta opzione (Metallo) A×7/B×7/C×7/D×8/E×7 sulle 36 posizioni; il riconteggio reale ha dato A×6/B×7/C×7/D×8/E×8 — scarto minore ma dichiarazione falsa. Corretto il dato nel changelog invece di rimescolare le lettere (rischio di introdurre nuovi errori a fronte di uno sbilanciamento già contenuto). Motivo: il gate "verifica che sia vera, non solo dichiarata" richiesto oggi da Mason si applica letteralmente — un conteggio riportato da un altro agente è un'affermazione da testare, non un fatto acquisito.

### Quarta passata report profiling (26/08/2026) — verifica mirata superata
- **In vigore** (2026-08-26): verificata la terza passata di Federica su `contenuti-report-5-elementi.md` (zero nomi elemento nel testo per la titolare + Applicazione pratica a set unico con meccanismo a 3 nodi). Scansionati tutti e 5 i capitoli per intero (non a campione): zero occorrenze di nomi elemento fuori dalle NOTE INTERNE, e tutte e 5 le leve di riequilibrio (Fuoco→Metallo, Acqua→Fuoco, Aria→Acqua, Terra→Aria, Metallo→Terra) corrispondono esattamente alla tabella di `beautyx-report-profiling-note.md`. Nessun "dovresti" residuo, nessun refuso. APPROVA senza modifiche. Utile come precedente: quando una correzione già "confermata" da un altro agente riguarda un pattern ripetuto su più capitoli (qui 5), il controllo va sempre esaustivo capitolo per capitolo, mai a campione su 1-2.

### Formula estesa del nome metodo CARE — verifica voce e connotazioni (28/08/2026)
- **In vigore** (2026-08-28): verificata la formula estesa proposta da
  Federica in `nome-metodo-CARE.md` per l'acronimo **CARE** (nome definitivo
  del metodo, deciso da Mason il 27/08/2026): Consapevolezza · Armonia
  degli elementi · Risveglio del potenziale · Elevazione strategica.
  Controllate una per una le 4 parole per connotazioni indesiderate:
  nessun rischio su Consapevolezza/Armonia; rischio lieve di deriva
  wellness/spirituale su Risveglio ed Elevazione (già noto da tornate
  precedenti di `proposte-nome-metodo.md`), ma neutralizzato dal contesto
  gestionale del resto della formula — non richiede modifica, solo
  attenzione a non isolare in futuro "Risveglio" o "Elevazione" da soli
  come nome pubblico senza gli altri tre a bilanciare il registro.
  Verificato anche il claim breve di prima presentazione (nessun
  meccanismo interno svelato, nessuna negazione nel copy, titolare al
  centro non l'AI). **Verdetto: APPROVA, nessuna modifica.**

### Gate finale pre-invio email partner (04/09/2026) — /newsletter e /report live vs sorgente, riga per riga
- **In vigore** (2026-09-04): eseguito il gate riga-per-riga richiesto prima dell'invio email partner di lunedì, sul commit 9d6965d in produzione (www.beautyx.it). Confrontato ogni sezione del testo live (via browser, get_page_text + screenshot) con `app/newsletter/page.js` e `app/report/page.js` locali.
- **`/newsletter` — Chi siamo (CURA):** live e sorgente **identici, parola per parola**. Il paragrafo introduce nome CURA + espansione (Consapevolezza · Unisono degli Elementi · Risveglio del Potenziale · Ascesa Strategica) senza mai nominare 5 elementi/cicli/logica di blocco-riequilibrio. **APPROVATO.**
- **`/report`:** headline "Chi si prende CURA di te?" — CURA tutto maiuscolo, **non** corsivo (verificato via screenshot, nessun `fontStyle: italic` nello span). Badge mostra "REPORT CURA" (non più "CARE"). I 3 blocchi "Cosa trovi nel report" — zero framing negativo nei 3 blocchi (nessun "non X ma Y"), ben sotto il tetto di 1/blocco. Miniguida presentata come "Un regalo che arriva comunque" (omaggio, non alternativa). Menzione newsletter ("Con l'account arriva anche la newsletter...") posizionata dopo la CTA principale "Crea il tuo account gratuito". Nessun accenno al meccanismo (nessun 5 elementi/cicli, solo nome+acronimo impliciti nel badge). **Live e sorgente identici anche qui. APPROVATO su tutti i punti richiesti.**
- **Segnalazione aggiuntiva (non nella checklist esplicita, ma coperta dalla regola no-negazione generale — [[no-negazione]] in `memory/generale.md`):** il sottotitolo hero di `/report` ("Il Report CURA è una fotografia onesta... Nasce da un metodo che guardiamo insieme a te, **non** un test online generico: risponde a te, titolare, **non** alla tua cliente.") contiene **due** costrutti di contrasto negativo ("non un test online generico" + "non alla tua cliente") nello stesso blocco — sopra il tetto di 1/blocco della regola no-negazione. Presente identico sia in locale sia live: non è un bug di deploy, è un problema di copy già nella versione approvata, da decidere con Mason se toccare prima di lunedì (non bloccante per il deploy, ma da segnalare).
- **Segnalazione minore, non bloccante:** footer di `/report` (page.js riga 319) ha copyright hardcoded "© 2025 Beautyx" invece di un anno dinamico come su `/newsletter` (che usa `{new Date().getFullYear()}`) — anno ormai sbagliato (siamo nel 2026). Presente identico in locale e live, quindi non è un problema di questo deploy specifico, ma andrebbe corretto alla prima occasione.
- **Nota ambientale (non un bug del sito):** durante il test, un tab del browser con sessione/cookie residui da un test E2E precedente (task #171, in corso da Davide sullo stesso ambiente condiviso) mostrava un redirect verso `/signup` con dati di test precompilati (Mario Rossi). Riprodotto SOLO su quel tab; un tab nuovo pulito ha caricato `/report` correttamente e ci è rimasto. Non è quindi un difetto della pagina `/report` per un visitatore reale — segnalato solo per chiarezza, nessuna azione necessaria su questo fronte da parte mia.
- **Verdetto complessivo:** entrambe le pagine sono CONFORMI su tutti i punti richiesti da Mason per l'invio email partner di lunedì. L'unico punto da portare alla sua attenzione prima di procedere è la doppia negazione nel sottotitolo hero di `/report` (scelta editoriale, non blocco tecnico).

### Verificare che un blocco/vincolo funzionale sia reale, non solo testuale
- **In vigore** (2026-08-11): quando una funzionalità dichiara un vincolo interattivo
  ("devi compilare questo campo per continuare", "accesso solo se...", "non puoi
  procedere finché..."), non basta leggere che il testo/messaggio è presente e
  corretto — bisogna verificare che il vincolo sia davvero applicato nel
  comportamento (provare a bypassarlo nel modo più ovvio: scorrere oltre, cambiare
  URL, ecc.) prima di segnare la funzionalità come completata. Esempio concreto: in
  `/guida` il messaggio "scrivi qualche parola per sbloccare il capitolo successivo"
  disabilitava solo il pulsante, ma la pagina era un'unica lunga scrollabile con
  tutti i capitoli già nel DOM — bastava scorrere con la rotella per superare il
  "blocco" senza mai scrivere nulla. Era stato segnato come completato senza che
  nessuno avesse provato a scorrere oltre invece di cliccare il pulsante.
  **Motivo:** stesso principio di [[verificare-anche-elementi-adiacenti]] applicato
  al comportamento invece che al layout — un gate description-only che si può
  aggirare è peggio di nessun gate, perché promette una cosa che non fa.
