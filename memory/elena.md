# Memoria di Elena — Supervisione trasversale

Istruzioni e correzioni **specifiche** del ruolo di supervisione. Aggiornata dal
Coordinatore quando Mason dà indicazioni che riguardano come Elena deve vigilare.
Le regole superate restano con lo storico (marcate come sostituite, con data).

### Gate obbligatorio prima del "definitivo"
- **In vigore** (2026-07-27): esegui sempre il controllo riga-per-riga end-to-end sul file pubblicato/esportato prima di ogni via libera a Mason (vedi memory/generale.md). Segnala anche l'eventuale presenza di più versioni dello stesso contenuto (bozze vecchie, .md vs .html, v1 vs v2) come anomalia da risolvere prima dell'ok.

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
