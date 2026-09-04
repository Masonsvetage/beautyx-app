# Memoria di Alessia — Growth & conversione

File del sistema di memoria del team (`memory/`). Contiene le istruzioni e le regole
apprese **specifiche** di questo agente, che Alessia rilegge all'inizio di ogni
compito (insieme a `memory/generale.md`). Le regole superate non si cancellano: si marcano
come sostituite con la data (storico).

> Consolidato il 2026-07-27 dal precedente `ALESSIA_GROWTH_LOG.md` (archiviato in
> `memory/_archivio-log-storici/`). Questa è l'unica fonte operativa: non usare più il vecchio log.

---

## POSIZIONAMENTO FONDAMENTALE

**Beautyx NON è una rivista di tendenze del settore estetico.** È uno strumento di consulenza strategica gestionale per titolari di centri estetici. La differenza è sostanziale e va rispettata in ogni pagina, CTA e sequenza email.

**Modelli di riferimento approvati:** Roberto Montemagno, SpiegameloFacile — approccio diretto, consulenza pratica, tono autorevole ma accessibile.

---

## STRUTTURA FUNNEL

### ~~Superata (2026-08-28)~~
```
AD (Instagram/Facebook Reel) 
  → /miniguida (landing page lead magnet)
  → iscrizione newsletter
  → welcome email immediata con link miniguida
  → newsletter 2x settimana (martedì e venerdì)
  → domanda mensile al consulente (Luigi Perri)
```
~~Regola critica: la miniguida era il benvenuto dell'iscrizione, non un prodotto separato. CTA sempre "iscriviti — la miniguida arriva subito gratis".~~ — sostituita dopo decisione definitiva di Mason: il vero prodotto civetta ora è il report CARE, non la miniguida né la newsletter.

### In vigore (2026-08-28) — decisione definitiva di Mason

Nuova architettura, in ordine:

```
1. Miniguida "10 errori" (basso impegno: un'email, 2 min di lettura)
   → funzione: costruire fiducia e RINFORZARE la decisione di fare il report
     (non più fine a se stessa)
   → cattura comunque email/iscrizione newsletter come sempre
   → CTA: "iscriviti — la miniguida arriva subito"

2. Report di profiling CARE (impegno più alto, ~36 domande)
   → VERO PRODOTTO CIVETTA del funnel
   → GRATIS per i primi 90 giorni dal lancio
   → framing: urgenza/vantaggio a chi decide subito (scarsità TEMPORALE,
     mai scarsità finta di quantità/posti)
   → dopo i 90 giorni: costa 60€, ma i 60€ diventano CREDITO SCALABILE
     sull'abbonamento alla piattaforma per chi prosegue (chi paga il report
     e poi si abbona si vede scontare i 60€ — non paga due volte)

3. Newsletter → iscrizione CONSEGUENZIALE, non più l'obiettivo primario delle CTA.
   Chi scarica la miniguida o fa il report finisce comunque iscritto, ma il
   messaggio pubblicitario/di ingresso non è più costruito intorno alla newsletter.

4. Domanda mensile gratuita al consulente (Luigi Perri) — touchpoint già
   esistente, mantenuto invariato.

5. Abbonamento alla piattaforma SaaS + consulenze — obiettivo finale di
   monetizzazione. Piattaforma ancora da completare tecnicamente (non blocca
   la strategia, ma va tenuto presente).
```

**Logica di ingresso per tipo di traffico** (nota di conversione confermata dal Coordinatore con Mason):
- **Traffico freddo** (ads, ricerca, chi non ci conosce) → si parte dalla miniguida (impegno minimo) prima di chiedere il report (impegno maggiore, ~36 domande).
- **Traffico già caldo** (consigliato da qualcuno, contatto diretto, chi ci conosce già) → si può mandare dritti al report, saltando la miniguida. Non è un passaggio obbligato rigido — la miniguida serve solo a chi non ci conosce ancora.

---

## STRUTTURA URL E NAVIGAZIONE

- `beautyx.it` → redirect a `/newsletter` per utenti non autenticati (task Davide pendente al 24/07/2026) — **da rivedere alla luce del nuovo funnel** (vedi gap sotto): non è più ovvio che l'atterraggio di default debba restare `/newsletter`.
- `/newsletter` → landing page principale newsletter (consultazione + iscrizione)
- `/miniguida` → landing page ottimizzata per ads (più diretta, meno contenuto)
- `/privacy` → privacy policy (contatto: privacy@beautyx.it)
- App piattaforma → NON linkare pubblicamente fino a verifica funzionamento completo

**GAP (2026-08-28) — nessuna pagina per il report CARE:** non esiste ancora, in nessun file consultato, una rotta/pagina dedicata al report di profiling CARE (le 36 domande, la consegna del risultato, il framing "gratis 90 giorni / poi 60€ scalabili sull'abbonamento"). Con la nuova architettura il report è il prodotto civetta principale — serve una landing propria (ipotesi di nome: `/report` o `/check-up`) prima che qualunque ads o outreach possa puntarci traffico. Segnalato in fondo per Davide, non è compito mio implementarlo.

---

## TARGET

- **Primario:** titolare di centro estetico, donna, già con centro aperto, gestisce tutto da sola o con poco staff
- **Secondario:** chi vuole aprire un centro e cerca orientamento gestionale
- I contenuti parlano sempre a entrambi — non escludere nessuna delle due audience

---

## REGOLE CTA

- **Una sola CTA per pezzo** — non tre call to action diverse in una newsletter o pagina
- Mai "scopri di più" come CTA principale — troppo vago, non converte
- **In vigore (2026-08-28):** la CTA principale del funnel di ingresso ora punta al **report CARE** (traffico caldo) o alla **miniguida come primo passo** (traffico freddo) — non più genericamente "iscriviti alla newsletter". La newsletter resta una conseguenza dell'iscrizione/del report, non l'azione richiesta esplicitamente nel copy.
  - CTA verso la miniguida (traffico freddo): "Iscriviti — la miniguida arriva subito"
  - CTA verso il report (traffico caldo, o step successivo alla miniguida): da definire in copy specifico quando la pagina/rotta del report esiste (vedi gap in STRUTTURA URL) — deve comunicare chiaramente sia il valore ("scopri dove il tuo centro è bloccato") sia l'urgenza temporale (gratis solo nei primi 90 giorni), mai con toni da finta scarsità di quantità.
- ~~Superata (2026-08-28): CTA di iscrizione newsletter come azione principale del funnel ("Iscriviti gratis" come CTA di ingresso)~~ — sostituita: la newsletter è ora conseguenziale, non il fulcro del messaggio di ingresso.

---

## PIANO ADS (approvato, non ancora lanciato)

- **Formato:** Reels 9:16 (1080×1920px) — stesso formato per Instagram e Facebook (stesso ecosistema Meta)
- ~~Superata (2026-08-29): Budget indicativo €10-15/giorno nella fase di test~~ — sostituita: Mason ha stanziato un budget di lancio FISSO e UNICO di 500€ (non ricorrente, non ci sarà un secondo budget se questo non produce risultati misurabili). Vedi piano di allocazione dettagliato sotto.
- **Obiettivo campagna — aggiornato (2026-08-28):** l'obiettivo non è più genericamente l'iscrizione newsletter, ma portare il traffico freddo alla **miniguida** come primo passo (impegno minimo), che a sua volta rinforza la decisione di fare il **report CARE**. La newsletter resta una conseguenza automatica dell'iscrizione, non l'obiettivo dichiarato della campagna.
  - ~~Superato (2026-08-28): Lead Form Ads → iscrizione newsletter~~ — sostituito dalla nuova architettura di funnel (miniguida → report CARE → newsletter conseguenziale).
- **Landing di atterraggio:** `/miniguida` resta valida per traffico freddo da ads (più diretta). **Nota:** quando la pagina del report CARE esisterà (vedi gap in STRUTTURA URL), da valutare se le ads più mature (retargeting di chi ha già scaricato la miniguida) debbano puntare direttamente lì — non ancora deciso, le ads restano comunque non lanciate.
- **Non lanciare** le ads finché il sito non è completamente verificato e funzionante
- **Beehiiv Boosts — SCARTATO (2026-08-28):** Mason ha verificato di persona sul proprio account Beehiiv che il marketplace Boosts è quasi tutto newsletter in inglese, mercato USA — irrilevante per un pubblico italiano di centri estetici. Non è un canale utilizzabile per Beautyx, non riproporlo.
- **In vigore** (2026-08-28): gate di lancio aggiornato — oltre al sito verificato, le ads non partono finché il funnel organico non mostra conversione misurabile (iscritti + tasso apertura). Le ads sono un ACCELERATORE da accendere dopo che l'imbuto organico converte, non il motore per i primi iscritti. Motivo: evidenza da 3 case study reali del beauty italiano (VeraLab, Estetista Imprenditrice, Beauty Mentoring), portata dalla sessione parallela "Strategia & Lancio" (ponte: `C:\Users\luigi\progetti\beautyx-project\STATO-PROGETTO.md`). Con zero iscritti oggi, ads comunque escluse nelle prime 2-4 settimane.

### PIANO ALLOCAZIONE 500€ — budget fisso e unico di lancio (2026-08-29)

Mason: "pensando agli aspetti marketing vorrei destinare ad un lancio un budget di 500 euro cerca di massimizzare il rendimento perché non ho intenzione di sprecarlo né di spenderci altro se i primi 500 non funzioneranno." Non è un budget mensile ricorrente: è un test di mercato unico, senza secondo tentativo se fallisce. Piano pronto per l'esecuzione, ma **non lanciare** finché il Coordinatore non conferma che sito/report funzionano tecnicamente (resta valido il gate sopra).

**1) Allocazione tra canali — 400€ Meta / 100€ Google Search, non 50/50**
- Meta Ads (obiettivo Lead/Conversioni → `/newsletter`): 400€. Motivo: creatività già pronta e approvata (Reels 9:16, hook già scritto), targeting per interessi/lookalike efficace su un pubblico di nicchia (titolari di centri estetici) che NON cerca attivamente "report CARE" o "gestione centro estetico" su Google — è un prodotto sconosciuto, va scoperto per interruzione nel feed, non intercettato per intento di ricerca. Con CPL Meta Italia noto 4-18€, concentrare qui la maggioranza del budget è anche l'unico modo di avvicinarsi a un volume di conversioni sufficiente perché l'algoritmo di ottimizzazione (obiettivo Lead) esca dalla fase di apprendimento — spalmare troppo poco su Meta rischia di restare bloccati in learning phase senza ottimizzare mai.
- Google Search: 100€, solo su parole chiave a intento già esistente tipo "software gestionale centro estetico", "gestionale per estetiste", "consulenza gestione centro estetico" (CPC noto locale/servizi 0,50-2€). Attenzione onesta: quel range di CPC è verificato su ricerche locali/servizi generiche (tipo "centro estetico + città"), NON necessariamente sulle query gestionali B2B-simili che ci servono — probabile **volume di ricerca molto basso in Italia** su questi termini specifici, con rischio concreto di sotto-spesa (budget che non riesce a esaurirsi per mancanza di query) più che di CPC alto. Lo tratto come un test a rischio, non come un canale core: 100€ bastano a scoprire se esiste domanda di ricerca reale, senza scommetterci sopra.
- Non 50/50 perché Google, per un prodotto che nessuno cerca ancora per nome, è strutturalmente il canale sbagliato per portare volume — è lì solo per catturare la domanda residua già consapevole.

**2) Metrica di successo, decisa PRIMA di spendere**
- **Primaria (decide se continuare o fermarsi):** costo per iscrizione reale (CPL medio pesato sui due canali) ≤ 10€ — punto medio-basso della forbice nota 4-18€, non il best case. Sopra i 10€ di media il test non ha "funzionato" secondo la soglia concordata.
- **Numero minimo di iscritti reali:** almeno 50 iscritti totali sui 500€ (coerente con CPL ≤10€). Sotto i 50 iscritti = soglia non raggiunta, a prescindere da quanto tutto il budget sia stato speso.
- **Secondaria (qualità, non solo quantità):** tasso di completamento del report tra chi si iscrive ≥30% entro 7 giorni dall'iscrizione. Se il CPL è basso ma pochissimi completano il report, il traffico è "a buon mercato" ma di bassa qualità — segnale da riportare comunque a Mason anche se la metrica primaria passa.
- **Soglia di stop-loss anticipata (vedi punto 3):** dopo i primi 150€ spesi, se il CPL supera 25€ (oltre il worst-case noto di 18€) o il completamento report è <10%, ci si ferma e non si impegna il resto — è un segnale di messaggio/landing/audience disallineati, non risolvibile aumentando la spesa.

**3) Sequenza consigliata — NON spendere tutto insieme (parere onesto)**
Sì, ha senso testare prima con una parte piccola. Fase 1: 150€ (100€ Meta + 50€ Google) su 5-7 giorni, per validare che messaggio/landing convertano davvero e raccogliere un primo CPL reale. Fase 2: se le soglie di stop-loss del punto 2 sono superate, si impegnano i restanti 350€ concentrandoli sul canale che ha performato meglio (verosimilmente Meta, per i motivi al punto 1) invece di seguire rigidamente la proporzione iniziale 400/100. Motivo per non spendere tutto in un colpo solo: 500€ sono pochi e unici, l'algoritmo Meta comunque richiede giorni di dati prima di ottimizzare — quindi il test non costa tempo aggiuntivo, costa solo la disciplina di non impegnare tutto prima di aver visto un primo segnale.

**4) Creatività/copy — coerenza annuncio→landing verificata, un punto da chiudere**
Hook ads approvato ("sei davvero sicura di saper gestire il tuo centro al massimo? scoprilo con un test avanzato di valutazione di livello professionale, oggi gratuito, countdown reale") e landing `/newsletter` (headline "Ti prendi cura di tutte. Chi si prende cura di te?", countdown reale sui 90gg, CTA unica "Ricevi tutto — un solo passaggio →"): il match tecnico è pieno su "test/valutazione" (report ~36 domande), "gratuito" (countdown reale già richiesto sulla pagina) e "niente posti limitati" (coerente, mai finta scarsità). **Punto ancora aperto (già segnalato nella sezione PAGINA /newsletter):** l'hook parla di "competenza professionale/test di livello", la headline parla di "cura di chi cura tutte" — sono due angoli emotivi diversi (competenza vs. burnout/cura). Consiglio: usare l'hook ads come **kicker sopra l'H1** nella landing (non sostituirlo, affiancarlo), così chi arriva dall'ads vede prima la promessa esatta del click ("test gratuito, countdown reale") e poi scende nell'angolo emotivo più profondo CARE. Da confermare col Coordinatore prima di scrivere il kicker definitivo — non lo decido da sola perché tocca il copy già consegnato a Davide.

**5) Rischio onesto sui numeri attesi — non gonfiare le aspettative**
Con 400€ su Meta e CPL noto 4-18€ Italia: tra 22 iscritti (worst case 18€) e 100 iscritti (best case 4€), ma la stima realistica di centro forbice (8-12€ CPL, più plausibile per un pubblico di nicchia B2B-simile) è **33-50 iscritti**. Sui 100€ Google, CPL stimato per estrapolazione (CPC 0,5-2€ diviso un tasso di conversione click→iscrizione ipotizzato 10-20%) è molto incerto, tra 2,5€ e 20€ a lead, con probabile basso volume assoluto per lo stesso motivo di scarsa domanda di ricerca già segnalato al punto 1 — realisticamente poche unità, non decine. **Stima onesta totale: tra 30 e 60 iscritti reali su tutti i 500€, più probabile un numero vicino a 40-45.** Va comunicato chiaramente a Mason: è un campione piccolo, sufficiente per un primo segnale di direzione (funziona/non funziona il messaggio), non per conclusioni statisticamente solide su metriche fini come il tasso di completamento report — che con n=40-45 ha comunque un margine di incertezza ampio.

## CORREZIONE — non dare per scontate risorse che Mason non ha (2026-08-28)
- **In vigore**: mai costruire un piano che presupponga risorse non confermate esplicitamente da Mason — "contatti caldi", "gruppi FB in cui è già dentro", una rete di conoscenze pregresse. Mason ha corretto duramente un piano che dava per scontati entrambi ("non ho contatti caldi", "quali sono i gruppi? perché non ci state voi in ascolto?"). Verificare prima, o meglio: fare noi la ricerca (Alessia ha WebSearch) invece di scaricare su Mason un compito di scoperta che possiamo fare noi.
- **Confine reale outreach/ascolto gruppi:** la RICERCA (trovare gruppi FB/community italiane pertinenti, compilare shortlist reale con nomi/link) la facciamo noi via WebSearch — non è lavoro da chiedere a Mason. L'AZIONE dentro i gruppi (iscriversi, leggere post privati, commentare, DM sotto la sua identità) richiede il suo account personale: o la fa lui con materiali già pronti da noi, o la facciamo noi tramite computer-use sul suo browser loggato, solo con permesso esplicito caso per caso.
- **Niente sigle non spiegate con Mason:** mai usare acronimi/gergo marketing (IG, CTR, CAC, ecc.) senza scioglierli — Mason non è un marketer, va parlato in chiaro.

## RICERCA GRUPPI/PARTNER REALI (2026-08-28, via WebSearch — sostituisce l'assunzione "gruppi in cui Mason è già dentro")
- ~~ConfesteticA "Estetiste Professioniste Confestetica" (gruppo)~~ — **ELIMINATO (2026-08-28), verificato dal regolamento reale incollato da Mason**: il gruppo esclude esplicitamente "rappresentanti e aziende", "chi non è estetista", e ammette "professionisti" solo come eccezione insindacabile degli admin. Luigi si presenta come cofondatore/consulente, non è un'estetista — non qualifica per l'iscrizione garantita. Vietata anche qualsiasi pubblicità verso altri gruppi/pagine/siti (regola 5) — anche se ammesso, niente link a Beautyx comunque. Resta viva SOLO la Pagina Facebook pubblica di Confestetica (facebook.com/confestetica.it, non un gruppo): lì si può commentare pubblicamente sotto i post, nessuna iscrizione richiesta, categoria "associazione di settore" non concorrente diretta.
- **PATTERN STRUTTURALE emerso (2026-08-28), non solo un caso singolo:** i gruppi Facebook professionali del settore (Beautycians, ConfesteticA, probabilmente altri) sono per estetiste/titolari in prima persona — escludono sistematicamente consulenti/aziende esterne, indipendentemente dal regolamento specifico. Luigi come "cofondatore/consulente" (non estetista) rischia di non qualificare per NESSUNO di questi gruppi. Punto aperto per il Coordinatore/Mason: valutare se sua moglie (che gestisce il centro nel quotidiano, è lei l'estetista/titolare reale) è il soggetto giusto per una eventuale presenza in questi spazi, o se conviene spostare il focus su canali dove un consulente/business ha posto naturale (associazioni di categoria in modalità partnership, LinkedIn, contenuti ospiti, podcast) invece di continuare a verificare gruppo per gruppo.
- Gruppi regionali minori (Emilia Romagna/Marche, Roma e Lazio) — non ancora verificati, stesso rischio strutturale sopra: da controllare prima di investire tempo, ma probabile stesso esito.
- ~~BIUTOP Club~~ — **ELIMINATO (2026-08-28)**: community di un consulente (Marco Postiglione) — casa di altri.
- ~~Beautycians~~ — **ELIMINATO (2026-08-28)**: verificato che è il gruppo FB di Beautycians S.p.A., startup che vende prodotti/formazione/dispositivi alle estetiste (fondata da Davide Antichi e soci) — stessa situazione di BIUTOP, azienda concorrente non territorio neutro.
- **REGOLA GENERALE, non solo per BIUTOP/Beautycians (2026-08-28):** prima di aggiungere qualunque gruppo/community alla lista, verificare chi lo possiede/gestisce. Se è la community proprietaria di un consulente o di un'azienda che vende alle stesse titolari (formazione, prodotti, consulenza), è casa di altri — si esclude a prescindere dalla dimensione o dall'apertura del gruppo.
- **Limite onesto:** la ricerca web dà nome/iscritti/tipo gruppo ma non il contenuto interno (Facebook non indicizza i post dei gruppi) — la verifica reale richiede iscrizione con l'identità di Mason, o computer-use sul suo browser loggato con permesso esplicito caso per caso.
- **Partner outreach concreti** (base per task #52, non "contatti caldi"): Estetispa, MabellaFest, Bookizon, CNA (confermata reale, ha un'unione dedicata CNA Benessere e Sanità) — più Confartigianato Benessere e Confestetica come aggiunte emerse dalla ricerca.
- **Divisione carico settimana 1-2:** fa il team senza coinvolgere Mason — shortlist con link, bozze messaggi di presentazione per ogni gruppo, le 4 email outreach del task #52 già pronte. Fa solo Mason (richiede la sua identità, non delegabile) — iscriversi ai gruppi shortlistati (messaggio già pronto da incollare), inviare le email già scritte, eventuale post di presentazione già scritto da noi.

## BEAUTYCIANS — VINCOLO REGOLAMENTO REALE, corregge il piano precedente (2026-08-28)
Mason ha incollato il regolamento reale del gruppo FB Beautycians (~5.300 iscritte). Il punto 5 vieta esplicitamente "chi accederà al Gruppo allo scopo di acquisire nominativi da contattare privatamente per indirizzarli su propri prodotti o gruppi o iniziative" (ban immediato). I punti 4 e 10 vietano anche post/commenti a scopo promozionale o pubblicità di "marchi, prodotti, servizi e corsi". **Il piano di outreach precedente (entrare, individuare titolari interessanti, DM per invitarle alla newsletter) va in conflitto diretto col regolamento — non va eseguito così com'è.**

- **COSA È PERMESSO:** partecipazione genuina nel formato "post perfetto" del regolamento (punto 6): tag tra parentesi quadre — es. [GESTIONE TEAM], [BUSINESS], [CRESCITA PERSONALE] — + una riflessione/spunto/domanda reale + eventuale "link di approfondimento". Rispondere bene alle domande di altre estetiste nei commenti, con competenza vera, senza secondi fini visibili.
- **Sul "link di approfondimento":** valutato e scartato. Anche se il regolamento lo ammette in teoria, un link a un contenuto Beautyx (articolo, newsletter, sito) resta un link verso un'entità commerciale propria — il rischio che un admin lo legga come "post a scopo di visibilità" (vietato dal punto 4) è alto e la sanzione (ban) è sproporzionata rispetto al beneficio. **Regola: mai nessun link a Beautyx/newsletter/sito in Beautycians**, né nei post né nei commenti. Se serve un "link di approfondimento" per essere credibili, usare solo fonti terze (studi, articoli non Beautyx) o nessun link.
- **COSA NON SI PUÒ FARE, mai:** DM di prospecting a chi commenta/posta; link alla newsletter o al sito come CTA in post o commenti; raccolta nominativi/contatti dal gruppo per uso esterno; qualunque riferimento anche indiretto a "vieni a leggerci altrove".
- **RUOLO NEL FUNNEL — riposizionato:** Beautycians è **Livello 0 — Voce**, non un canale di acquisizione diretta. Serve a costruire reputazione/autorevolezza autentica di Mason come consulente competente, non a generare iscritti tracciabili nel breve termine. Onestà verso Mason: questo canale NON produce iscritti diretti misurabili a breve; il beneficio (se c'è) è indiretto e sul lungo periodo — es. qualcuno che lo nota lì e in autonomia cerca "Beautyx" o "Luigi Perri" altrove, mai perché sollecitato nel gruppo.
- **Esempi di "post perfetto" pronti (nessun link, nessun riferimento a Beautyx):**
  1. **[GESTIONE TEAM]** — "Quando un'estetista brava lascia il centro, spesso si porta dietro anche le clienti più affezionate. L'ho visto succedere più volte, e la differenza tra chi perde la cliente e chi no di solito non è la bravura tecnica di chi resta, ma se la cliente si sentiva legata alla persona o al modo in cui il centro nel suo insieme la accoglieva. Voi come lo gestite: puntate a fidelizzare sulla persona o sul sistema del centro?"
  2. **[BUSINESS]** — "Il rialzo prezzi è uno dei momenti che spaventa di più: si teme di perdere clienti storiche. Nella mia esperienza chi lo comunica con una spiegazione chiara del perché (non solo il quanto) perde molto meno di chi lo fa in silenzio sperando che nessuno se ne accorga. Voi come l'avete affrontato l'ultima volta che avete cambiato il listino?"
  3. **[CRESCITA PERSONALE]** — "Chi ha un centro passa la giornata a prendersi cura degli altri — clienti, a volte anche del personale — e raramente si ferma a chiedersi chi si prende cura di lei. Ho notato che le titolari che reggono meglio nel tempo sono quelle che si sono ritagliate anche solo 10 minuti fissi a settimana per fare il punto su come stanno loro, non il centro. Voi ce l'avete un momento così, o è sempre l'ultima cosa della lista?"
- Gli altri gruppi/partner della ricerca precedente (ConfesteticA, BIUTOP Club, gruppi regionali, Estetispa, MabellaFest, Bookizon, CNA, Confartigianato Benessere) restano validi come indicato sopra e non sono toccati da questa correzione — ognuno va comunque verificato sul proprio regolamento reale prima di qualunque azione di outreach diretto.

## CANALI DI ACQUISIZIONE — meccanismo, non contenuto (2026-08-29, via WebSearch)

**Attenzione: questa sezione è diversa dalla ricerca precedente.** La ricerca precedente (pattern "3 storie specchio" di Beauty Mentoring, "onestà scomoda" di VeraLab) riguardava il COSA/COME dicono i contenuti — resta valida per tono/hook, Mason ha chiarito che non va copiata (il metodo CARE non si contamina). Questa sezione riguarda un piano diverso: il CANALE/MECCANISMO con cui questi concorrenti sono arrivati davanti alla gente la PRIMA volta, non cosa hanno detto una volta arrivati.

### VeraLab / Cristina Fogazzi — canale verificato: fanbase personale pre-esistente, costruita PRIMA del prodotto
- Cronologia verificata: 2009 apre il centro estetico Bellavera a Milano; **2013** apre un blog + pagina Facebook "Estetista Cinica" per farsi pubblicità come professionista (contenuto gratuito, tono diretto/ironico, smonta bufale del settore); **2015**, DUE ANNI DOPO, nasce il brand cosmetico VeraLab, venduto inizialmente online alla fanbase già costruita sul blog/social.
- Il canale di acquisizione reale non è stato un annuncio pubblicitario a freddo: è stata l'audience organica costruita in 2 anni di contenuto gratuito (blog + Facebook) PRIMA di avere qualcosa da vendere — il prodotto è arrivato quando la fiducia c'era già ("con il passaparola e la credibilità social mi sono affermata"). Fonti: [fsnews.it](https://www.fsnews.it/it/persone/incontri/estetista-cinica-storia-cristina-fogazzi-intervista.html), [dealogando.com](https://www.dealogando.com/imprenditoria/estetista-cinica-chi-e-cristina-fogazzi/).
- **Rilevanza per Beautyx:** conferma (non aggiunge un canale nuovo) la logica già in piano — organico prima delle ads, fiducia prima della vendita — ma con un dato in più: nel caso VeraLab il "prima" è durato 2 anni, non 2-4 settimane come nel gate attuale di Alessia. Onestà: non è un canale diverso da quelli già mappati, è una conferma di sequenza/tempistica.

### Beauty Mentoring — canale NON verificabile con fonti pubbliche
- Verificato solo il "chi": co-fondato da Marzia Mazza (estetista quasi 20 anni, titolare di un centro reale in Umbria) e Alessandro Rizzello (business coach, già imprenditore in altri marchi: Ottimix, Costoamico.it). Entrambi arrivano al progetto con un pubblico professionale pre-esistente nel proprio ambito (lei estetista con rete di colleghe, lui business coach con rete di clienti aziendali).
- **Non trovato** con ricerca pubblica: come hanno acquisito le prime clienti del percorso Beauty Mentoring specificamente (webinar a pagamento? ads Meta? passaparola nella rete professionale di lei?). Nessuna intervista/case study pubblico ha risposto a questa domanda. Dichiaro il limite invece di ipotizzare.

### Altri player italiani (Estetista Imprenditrice, Estetispa, Maison Academy, Smart Business Lab) — pattern ricorrente osservato
- Ricerca ha mostrato più corsi "Da estetista a imprenditrice" di player diversi (BusinessinClass, Maison Academy, Estetispa Academy, Smart Business Lab). Un dato ricorrente e verificabile: **Smart Business Lab** usa esplicitamente un **webinar gratuito** come porta d'ingresso ("Webinar gratuito per estetiste — Da operativa a imprenditrice"). Questo è un meccanismo di acquisizione diverso da ads dirette a un prodotto a pagamento: webinar gratuito → vendita nel webinar stesso. Non è nuovo per il settore SaaS/infoprodotti in generale, ma è un dato concreto e verificabile trovato nella ricerca, non presente nella lista canali già valutata da Alessia in precedenza.

### KOIBOX — pista del Coordinatore verificata: NIENTE marketplace/programma partner pubblico verso terzi
Ricerca mirata su koibox.it, koibox.cloud, docs.koibox.cloud, LinkedIn Koibox, e incrociata col codice Beautyx (`lib/koibox/`, `app/api/user/koibox/*`, migrazioni Supabase `ESEGUI_koibox_*`) per capire cosa esiste già tecnicamente.
- **Cosa esiste davvero, verificato:** Koibox ha una **API REST pubblica per sviluppatori** (docs.koibox.cloud), con webhook e integrazione supportata verso Zapier/Make. **Ma l'accesso all'API richiede un piano "Platinum" attivo** — è pensata per l'integrazione tecnica bidirezionale di dati (appuntamenti, incassi), non per un canale di visibilità commerciale verso l'utenza. Nel codice Beautyx questa integrazione è già usata proprio così: sync di casse/incassi/servizi dal gestionale del singolo centro (già cliente Koibox) verso Beautyx — un flusso di **dati**, non di **marketing**.
- **Partnership commerciali di Koibox trovate:** Koibox si presenta come "partner ufficiale di Wella e Sassoon" — ma solo in **Spagna e Portogallo**, ed è una partnership di co-branding prodotto (marchi di cosmetica/formazione), non un programma aperto a SaaS terzi tipo Beautyx.
- **Non trovato, onestamente:** nessun marketplace pubblico di app/integrazioni rivolto agli utenti Koibox (a differenza per esempio di un Google Workspace Marketplace o Atlassian Marketplace), nessuna newsletter verso i centri clienti Koibox che ospiti contenuti/promozioni di terzi, nessun programma di affiliazione o "diventa partner" rivolto a fornitori di servizi complementari come Beautyx. Il sito koibox.it/koibox.cloud non espone alcuna pagina "partner program" o "app directory" consultabile pubblicamente.
- **Conclusione onesta sulla pista:** la pista Koibox **non è confermata** come canale distributivo di marketing nel senso sperato (una vetrina o newsletter verso la loro base utenti esistente). Quello che esiste oggi è solo un canale tecnico (API dati, dietro paywall Platinum) già sfruttato correttamente da Beautyx per la sincronizzazione dati dei centri che sono già clienti sia di Koibox sia di Beautyx — non un meccanismo per **acquisire nuovi** centri che non conoscono ancora Beautyx. Se in futuro Koibox aprisse un programma partner/marketplace, andrebbe riverificato, ma oggi (29/08/2026) non risulta da fonti pubbliche.
- **Fonti:** [docs.koibox.cloud](https://docs.koibox.cloud/en/), [koibox.it](https://koibox.it/), [softwarekoibox.it partner Wella/Sassoon](https://softwarekoibox.it/partner-wella-sassoon.php).

### Fiere di settore (Cosmoprof) — nessuna presenza verificata dei concorrenti diretti
- Cosmoprof Worldwide Bologna è la fiera di riferimento del settore beauty italiano (filiera completa: materie prime, prodotti finiti, saloni). Nessuna fonte pubblica trovata conferma la presenza di VeraLab, Beauty Mentoring o Koibox come espositori a Cosmoprof — possibile che ci siano ma non emerge da ricerca pubblica, oppure che questi player non la usino come canale (VeraLab e Beauty Mentoring vendono online/corsi online, non hanno bisogno di un canale fisico B2B). Onestà: canale segnalabile come "da considerare in teoria per un SaaS B2B come Beautyx" ma nessuna evidenza che i concorrenti diretti lo usino, quindi non è "quello che fanno loro".

### Distributori/fornitori di prodotti e macchinari — nessuna verifica specifica trovata, ma nessun vincolo deontologico
- Non ho trovato fonti pubbliche su accordi commerciali reali tra un SaaS gestionale (Koibox o altri) e un distributore di prodotti/macchinari per centri estetici. A differenza di commercialisti/consulenti del lavoro (vincolati da codici deontologici, vedi regola in memoria generale), i distributori sono soggetti commerciali senza ordine professionale: un eventuale accordo con royalty/commissione sarebbe lecito in linea di principio, ma resta da verificare caso per caso (es. contratti di esclusiva del distributore con altri gestionali) prima di proporlo. Nessun distributore specifico individuato come pista concreta in questa ricerca.

### Programma di referral tra clienti Beautyx — nessun vincolo deontologico, canale pulito e disponibile
- A differenza delle segnalazioni da professionisti terzi (commercialisti/consulenti del lavoro, dove vige la regola "mai royalty"), un referral tra clienti Beautyx stessi (titolare che segnala un'altra titolare) non ha alcun ordine professionale di mezzo — nessun vincolo deontologico. Nessun dato pubblico su chi tra i concorrenti lo usa già (non verificabile dall'esterno, i programmi referral privati non sono indicizzati), ma è un canale strutturalmente libero da vincoli, a differenza degli altri già valutati. Segnalo come pista praticabile per il Coordinatore/Mason, ma non è nato da un'evidenza sui concorrenti — è un'opportunità propria di Beautyx.

### Limite dichiarato su questa ricerca
Nessun problema di browser in questa sessione: ho usato solo WebSearch (non ho avuto bisogno del browser interattivo). Il limite reale è quello tipico della ricerca pubblica: dati interni (funnel esatti, numeri di CAC/CPL, contratti di partnership non annunciati pubblicamente) restano non verificabili da fonti aperte — dichiarato esplicitamente sopra caso per caso invece di ipotizzare.

---

## TASK #52 — EMAIL OUTREACH PARTNER (2026-08-30, verifica via WebSearch + email prodotte)

Prodotto il file `email-outreach-partner-task52.md` nella root del repo: 4 email complete (oggetto + corpo) + 1 template riadattabile per associazioni. Prima di scrivere ho verificato ciascun partner via WebSearch (regola "mai scrivere alla cieca"). Cosa ho verificato e con quali fonti:

- **Estetispa** — NON è un centro estetico né un concorrente SaaS: è una **community + rivista digitale di in-formazione per estetiste**, fondata da Valentina Benedetto ("la community di estetiste più grande d'Italia", testata online gratuita). Fonti: [estetispa-academy.it/chi-siamo](https://estetispa-academy.it/chi-siamo/). ⚠️ Attenzione posizionamento: loro fanno informazione/formazione, noi "non siamo una rivista" — email calibrata sul piano *strumento gestionale/diagnostico* per evitare rotta di collisione col nostro stesso posizionamento. Taglio: co-contenuto/media partner.
- **MabellaFest** — è **"Il Festival dell'Estetista"**, evento annuale organizzato da Mabella (3ª edizione a Milano, Museo Leonardo da Vinci, ~500 partecipanti; ha sponsor e partner ufficiali). Format ibrido: formazione + networking brand/professioniste + celebrazione. Fonti: [ilfestivaldellestetista.it](https://ilfestivaldellestetista.it/), [ilfestivaldellestetista.it/partner](https://ilfestivaldellestetista.it/partner/). Taglio: partnership evento (contributo/talk alla prossima edizione).
- **Bookizon** — **app multicategoria di prenotazione** (parrucchiere/estetista, ristoranti, palestre, shopping) + lato "**Bookizon Business**" che è un **gestionale per negozi/punti vendita/food**. Fonti: [bookizon.it](https://bookizon.it/), [business.bookizon.it/shops](https://business.bookizon.it/shops/pricing). ⚠️ **Unico partner con sovrapposizione potenziale reale** (fanno anche gestionale/prenotazioni): email marca la linea "loro operatività/booking, noi strategia gestionale a monte", ma segnalato a Mason come il contatto da confermare prima dell'invio.
- **CNA Benessere e Sanità** — confermata **associazione di categoria vera** (unione di mestiere CNA); i quattro mestieri sono acconciatori, **estetiste**, sanità, palestre/riabilitazione; fa rappresentanza, formazione, info normativa, rapporti sindacali per i CCNL. Fonti: [cna.it Benessere e Sanità](https://www.cna.it/area-tematica/benessere-e-sanita/risultati/). Taglio: convenzione/benefit per gli associati (no royalty coerente per definizione con rapporto associativo).

**Confartigianato Benessere / Confestetica** — trattate come associazioni di categoria (template CNA riadattato). Ho lasciato in memoria e nel file un **alert su Confestetica**: destinatario ambiguo (esiste un gruppo FB chiuso Confestetica che esclude aziende/consulenti — vedi sezione ricerca gruppi 2026-08-28 — accanto a una realtà associativa/pagina pubblica). Da verificare che il destinatario sia l'ente associativo prima dell'invio.

**Scelte applicate:** tono B2B tra pari (niente apertura-con-dolore, riservata alle titolari); nessun accenno a compensi/royalty/provvigioni; posizionamento non sovrapposto ripetuto in ogni email (Beautyx = strategie gestionali, fuori da fiscale/contrattuale/normativa); leva "brave tecnicamente ma sole sulla gestione"; **una sola CTA per email** (call/incontro conoscitivo); metodo **CARE non spiegato** (solo intravisto come "momento diagnostico / dove il centro è bloccato").

**Resta a Mason (richiede la sua identità, non delegabile):** reperire i contatti/referenti reali, personalizzare i campi `{…}`, decidere sul rischio-sovrapposizione Bookizon, verificare la natura di Confestetica, e **inviare** le email dalla propria identità.

---

## APERTO — da decidere col Coordinatore/Mason (2026-08-28)
- **Landing per traffico organico:** i primi 30 giorni puntano su canali "caldi" (gruppi FB/community shortlistate sopra, outreach partner) — per questo traffico `/newsletter` (più contenuto, prova sociale) è probabilmente la destinazione giusta, non `/miniguida` (pensata per traffico freddo da ads). Non ancora deciso.
- ~~Doppio lead magnet — APERTO (2026-08-28): la miniguida "10 errori" resta il benvenuto dell'iscrizione oggi; il futuro quiz-diagnosi "Check-up del centro" → report CARE è un secondo possibile meccanismo d'ingresso. Va deciso se convivono, quale precede l'altro, o se il quiz sostituisce la miniguida.~~ — **RISOLTO (2026-08-28):** Mason ha deciso, convivono entrambi in sequenza. Miniguida = primo touchpoint leggero che rinforza la decisione; report CARE = vero prodotto civetta che segue. Traffico freddo passa da entrambi, traffico caldo può saltare direttamente al report. Vedi STRUTTURA FUNNEL sopra.

---

## PAGINA /newsletter — REGOLE DI CONTENUTO

### ~~Superata (2026-08-29)~~
```
Approvato da Mason (luglio 2026) dopo due versioni rifiutate:
- Headline: "Il tuo centro lo sai fare. Gestirlo bene è un'altra storia."
- Differenziatore: "Non è una rivista. È uno strumento di lavoro."
- Sezione newsletter archivio: mostra le ultime newsletter (hardcoded FALLBACK se API fallisce)
- Tono: consulenza, non intrattenimento — chi arriva qui cerca soluzioni gestionali
- Nessun riferimento esplicito al metodo SvetAge nella pagina pubblica
```
~~Superata solo nella parte headline/obiettivo: quella pagina comunicava la newsletter come prodotto principale. Con l'architettura di funnel del 28/08/2026 (report CARE prodotto civetta) la newsletter non è più il fulcro del messaggio.~~ — La sezione archivio, il tono consulenziale e "nessun riferimento esplicito al metodo" restano validi e NON sono toccati da questa correzione: superata solo la parte di posizionamento/headline.

### In vigore (2026-08-29) — decisione definitiva di Mason: /newsletter diventa la landing UNICA

Nuova decisione di Mason (28/08/2026, confermata 29/08/2026): niente iscrizioni separate. `/newsletter` è ora l'UNICA landing page — anche per il traffico ads che punta al Report CARE. Un solo form di iscrizione attiva tutto insieme: report CARE gratis 90gg + miniguida + newsletter. `/report` (pagina scritta da Davide il 28/08) resta viva come pagina di presentazione/dettaglio del report, ma il punto di conversione unico ora è `/newsletter`.

Specifica di copy completa consegnata a Davide (28-29/08/2026), in sintesi:

- **Badge/eyebrow:** "Report CARE gratis + miniguida + newsletter · Beautyx" (sostituisce "Newsletter gratuita · Beautyx" — comunica subito il pacchetto, non solo la newsletter).
- **Headline (H1):** "Ti prendi cura di tutte. Chi si prende cura di te?" — ripresa IDENTICA dalla pagina `/report` per coerenza di taglio doloroso CARE (insight: chi cura tutti non è curato da nessuno). Sostituisce "Il tuo lavoro lo sai fare. Gestirlo bene è un'altra storia."
- **Sottotitolo:** comunica subito il report gratis + bundle in un solo passaggio (report + miniguida + newsletter), non più solo la newsletter. Il vecchio paragrafo emotivo lungo resta ma condensato più in basso, nella sezione "Chi siamo" — non più in apertura.
- **Blocco countdown (NUOVO, richiesto da Mason):** ben visibile, subito sotto il sottotitolo e sopra la CTA. Conta i giorni reali rimanenti dei 90gg gratuiti del report (mai finta scarsità di quantità/posti, sempre scadenza reale — principio già fissato). Testo di supporto per stato: **X>1** → "gratis ancora per {X} giorni, poi 60€"; **X=1** → "gratis ancora per 1 giorno, poi 60€ — è oggi l'ultimo giorno"; **X=0/scaduto** → "il periodo gratuito è terminato: il report costa 60€, scalabili sull'abbonamento se poi continui". Riga di rassicurazione sotto: "Nessun limite di posti — il vantaggio è nel farlo entro questi giorni, mentre è gratis."
- **Miniguida:** non più CTA/link separato (il vecchio blocco "alternativa per traffico freddo" di `/report`, con link a `/miniguida`, va RIMOSSO su questa pagina — creerebbe una seconda uscita/secondo punto di ingresso). Diventa un punto del bundle dentro "Cosa succede quando ti iscrivi" (report + miniguida + newsletter, in quest'ordine).
- **CTA unica:** "Ricevi tutto — un solo passaggio →", ripetuta identica in nav e hero (stessa azione, stesso submit — non sono 3 CTA diverse, rispetta la regola "una sola CTA per pezzo"). Microcopy sotto il bottone: "Inserisci l'email, conferma con un click: report, miniguida e newsletter arrivano insieme." Mai "scopri di più", nessuna negazione nel copy di vendita (vedi memory/generale.md).
- **Nota aperta per il Coordinatore/Mason:** l'hook pubblicitario del report già approvato ("sei davvero sicura di saper gestire il tuo centro al massimo?") è coerente con questo taglio — consigliato riprenderlo come kicker sopra l'headline per continuità annuncio→landing, ma non è stato imposto: da confermare.

Resta valido, non toccato da questa correzione: sezione archivio newsletter (fallback hardcoded se API fallisce), tono consulenziale non da intrattenimento, nessun riferimento esplicito al metodo CARE/SvetAge nella pagina pubblica (si fa solo intravedere, mai spiegato — regola generale).

---

## EMAIL INFO@BEAUTYX.IT

- Contatto generale visibile su newsletter e homepage app
- Non ancora aggiunto alle pagine — task pendente

---

## STATO LANCIO (aggiornato 24/07/2026)

- Dominio beautyx.it: attivo, SSL in provisioning
- Newsletter: impostata su Beehiiv, non ancora lanciata pubblicamente
- Ads: non ancora attive
- App piattaforma: funzionante ma con dati di test — non linkare pubblicamente
