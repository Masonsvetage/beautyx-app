// Banco domande del questionario di profiling CARE — trascritto integralmente
// da banco-domande-profiling.md (contenuto Federica, revisionato riga-per-riga
// da Elena, verdetto finale "pronto per la fase implementativa" — vedi
// changelog in fondo a quel file, 25/08/2026).
//
// NON modificare il testo qui senza aggiornare anche banco-domande-profiling.md
// (fonte editoriale di riferimento per Elena/Federica) — questo file è la
// trascrizione a runtime, non la fonte.
//
// I tag "elemento" per opzione sono usati SOLO server-side per calcolare i
// punteggi (vedi salvaRispostaScenario in profilingEngine.js) — non vanno mai
// esposti al client/utente (get_prossimo_scenario li rimuove dalla risposta).

export const AMBITI = ['clienti', 'personale', 'spese']

export const NARRAZIONI_LIBERE = {
  clienti: {
    domanda_apertura:
      "Pensa a una cliente in particolare — a un episodio vero, di quelli che ti sono rimasti impressi ancora oggi. Raccontamelo: cosa è successo, e cosa hai fatto tu in quel momento.",
    domande_controllo: [
      'Come ha reagito l\'altra persona?',
      'Come avresti percepito, al posto suo, il tuo comportamento?',
      'Quale altro comportamento avresti potuto adottare, e perché lo hai scartato?',
    ],
  },
  personale: {
    domanda_apertura:
      "Pensa a una dipendente in particolare — a un episodio vero con lei, di quelli che ti sono rimasti impressi ancora oggi. Raccontamelo: cosa è successo, e cosa hai fatto tu in quel momento.",
    domande_controllo: [
      'Come ha reagito l\'altra persona?',
      'Come avresti percepito, al posto suo, il tuo comportamento?',
      'Quale altro comportamento avresti potuto adottare, e perché lo hai scartato?',
    ],
  },
  spese: {
    domanda_apertura:
      "Pensa a una spesa vera che hai fatto per il centro — una di quelle che ricordi ancora nel dettaglio, magari anche la cifra. Raccontamela: di cosa si trattava, e come hai deciso.",
    domande_controllo: [
      'La spesa che hai descritto la consideri una spesa pura o un investimento?',
      'Se è un investimento, in quanto tempo pensi di recuperarla?',
      'Avresti potuto affrontare la cosa diversamente dal punto di vista economico?',
    ],
  },
}

// Ordine di somministrazione per ambito: nucleo (6, sempre) + riserva (6, solo
// se il profilo resta ambiguo dopo il nucleo — vedi verificaProfiloDefinito in
// profilingEngine.js). Tetto massimo per ambito = 12 (mai oltre).
export const SCENARIO_ORDER = {
  clienti: { nucleo: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'], riserva: ['C7', 'C8', 'C9', 'C10', 'C11', 'C12'] },
  personale: { nucleo: ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'], riserva: ['P7', 'P8', 'P9', 'P10', 'P11', 'P12'] },
  spese: { nucleo: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], riserva: ['S7', 'S8', 'S9', 'S10', 'S11', 'S12'] },
}

function opz(lettera, testo, elemento) {
  return { lettera, testo, elemento }
}

export const SCENARI = {
  C1: {
    ambito: 'clienti',
    testo: "Una cliente che viene da te ogni tre settimane da due anni ti disdice l'appuntamento la terza volta in un mese, sempre con una scusa diversa e sempre il giorno prima.",
    opzioni: [
      opz('A', 'La chiami per capire con calma se c\'è qualcosa che non va nel servizio o nella sua vita che la sta frenando.', 'acqua'),
      opz('B', 'La chiami subito e le dici in faccia che così non va, che ti serve sapere se vuole ancora venire da te.', 'fuoco'),
      opz('C', 'Le lasci il suo spazio e aspetti che sia lei a farsi risentire, tenendole comunque l\'agenda aperta come sempre.', 'terra'),
      opz('D', 'Decidi che da quel momento cambi la policy di prenotazione per tutte le clienti, con caparra o conferma obbligatoria il giorno prima.', 'aria'),
      opz('E', 'Ripensi allo spazio fisso che le riservavi prima, per decidere se tenerlo ancora a lei o lasciarlo ad altre clienti più regolari.', 'metallo'),
    ],
  },
  C2: {
    ambito: 'clienti',
    testo: 'Trovi una recensione negativa online, pubblica, di una cliente che si lamenta di un trattamento non andato come si aspettava.',
    opzioni: [
      opz('A', 'Rivedi da capo il protocollo di quel trattamento per tutto il centro, perché se è successo una volta puoi evitare che succeda ancora.', 'aria'),
      opz('B', 'Verifichi nei dettagli il singolo passaggio di quel trattamento andato storto, per capire dove lo standard è scivolato, senza cambiare tutto il resto del protocollo.', 'metallo'),
      opz('C', 'Rispondi alla recensione con educazione e la lasci lì, senza cambiare nulla nel modo in cui lavori di solito.', 'terra'),
      opz('D', 'Le telefoni subito, ancora prima di risponderle online, per sistemare la cosa a voce e chiuderla in giornata.', 'fuoco'),
      opz('E', 'Le scrivi in privato per capire esattamente cosa è successo dal suo punto di vista, prima di rispondere alla recensione.', 'acqua'),
    ],
  },
  C3: {
    ambito: 'clienti',
    testo: 'Scopri per caso che una cliente storica, che veniva da anni, è passata a un altro centro senza dirti nulla.',
    opzioni: [
      opz('A', 'Le scrivi subito un messaggio diretto per chiederle perché se n\'è andata senza dirti niente.', 'fuoco'),
      opz('B', 'Ripensi con calma agli ultimi appuntamenti insieme, cercando di capire se c\'è stato un momento preciso in cui qualcosa si è incrinato.', 'acqua'),
      opz('C', 'Ti chiedi se è il momento di rivedere l\'intera esperienza che offri alle clienti di lunga data, non solo il suo caso.', 'aria'),
      opz('D', 'Ripensi a cosa negli ultimi tempi potresti aver lasciato scivolare nella cura dei dettagli con le clienti di lunga data, e decidi cosa alzare di livello da subito.', 'metallo'),
      opz('E', 'Continui a lavorare come sempre, sapendo che nel tempo qualche cliente va e qualcuna torna.', 'terra'),
    ],
  },
  C4: {
    ambito: 'clienti',
    testo: 'Una cliente nuova, arrivata tramite passaparola, ti chiede uno sconto importante rispetto al listino già al primo appuntamento.',
    opzioni: [
      opz('A', 'Le spieghi che il tuo prezzo riflette uno standard preciso che non abbassi, ma valuti se puoi tagliare qualche extra per venirle incontro senza intaccare il valore del servizio.', 'metallo'),
      opz('B', 'Le spieghi con gentilezza il listino così com\'è, senza cambiarlo, come fai con tutte le clienti.', 'terra'),
      opz('C', 'Cogli l\'occasione per ripensare a come gestisci in generale le richieste di sconto, magari con una policy nuova per le prime volte.', 'aria'),
      opz('D', 'Le fai qualche domanda per capire da dove viene la richiesta, prima di decidere cosa risponderle.', 'acqua'),
      opz('E', 'Decidi subito di andarle incontro, perché il tuo istinto ti dice che con questa cliente vale la pena partire così.', 'fuoco'),
    ],
  },
  C5: {
    ambito: 'clienti',
    testo: 'Una cliente arriva con venti minuti di ritardo e pretende comunque il trattamento completo, con la cliente dopo di lei già in sala d\'attesa.',
    opzioni: [
      opz('A', 'Le chiedi cosa le è successo, per capire se il ritardo è un caso isolato o un segnale di qualcos\'altro.', 'acqua'),
      opz('B', 'Da quel giorno introduci una regola precisa sui ritardi, uguale per tutte, scritta e comunicata a ogni cliente.', 'aria'),
      opz('C', 'Le spieghi subito quali passaggi puoi tagliare senza intaccare il risultato finale, e quali invece non sono negoziabili per mantenere lo standard del trattamento.', 'metallo'),
      opz('D', 'Le dici chiaramente, subito, che con quel ritardo non riesci a fare tutto e trovi una soluzione immediata sul momento.', 'fuoco'),
      opz('E', 'Cerchi comunque di accontentarla, magari accorciando qualche passaggio, per far stare bene sia lei che chi aspetta dopo.', 'terra'),
    ],
  },
  C6: {
    ambito: 'clienti',
    testo: 'Una cliente ti chiede un trattamento nuovo, di moda, che il tuo centro non ha mai fatto e per cui nessuna di voi è formata bene.',
    opzioni: [
      opz('A', 'Ti butti subito a cercare come offrirglielo in tempi brevi, perché quando un\'idea ti prende non vedi l\'ora di provarci.', 'fuoco'),
      opz('B', 'Le dici che non è nelle vostre corde, così come è sempre stato, e le proponi quello che sai fare bene.', 'terra'),
      opz('C', 'Ti informi per capire se vale la pena introdurlo stabilmente nel centro, con la formazione adatta.', 'aria'),
      opz('D', 'Le chiedi cosa l\'attira davvero di quel trattamento, per capire se c\'è un bisogno che puoi soddisfare in un altro modo.', 'acqua'),
      opz('E', 'Le dici con chiarezza che non lo offri finché non puoi garantirlo allo stesso livello di qualità di tutto il resto, anche se questo significa dirle di no per ora.', 'metallo'),
    ],
  },
  C7: {
    ambito: 'clienti',
    testo: 'Una cliente si lamenta che un prodotto per la cura a casa, che le hai consigliato e venduto tu, non le ha dato i risultati promessi.',
    opzioni: [
      opz('A', 'Rifletti se è il caso di cambiare la linea di prodotti che consigli in centro, non solo di gestire questo singolo caso.', 'aria'),
      opz('B', 'Le proponi subito, lì per lì, di cambiarglielo o di trovare una soluzione che la soddisfi immediatamente.', 'fuoco'),
      opz('C', 'Le rispondi seguendo la prassi che usi sempre in questi casi, senza fare eccezioni particolari.', 'terra'),
      opz('D', 'Verifichi con precisione le indicazioni che le avevi dato, e se il prodotto non regge lo standard promesso decidi di toglierlo dai tuoi consigli.', 'metallo'),
      opz('E', 'Le chiedi come lo ha usato esattamente, giorno per giorno, per capire insieme a lei cosa può essere andato storto.', 'acqua'),
    ],
  },
  C8: {
    ambito: 'clienti',
    testo: 'Una cliente con agenda piena da settimane ti chiede di essere vista prima delle altre perché "è urgente".',
    opzioni: [
      opz('A', 'Le rispondi come faresti con chiunque altro, rispettando l\'ordine delle prenotazioni già fatte.', 'terra'),
      opz('B', 'Applichi un criterio preciso che ti sei data per le urgenze reali, e se il suo caso non rientra in quello standard, le spieghi che aspetta il turno come le altre.', 'metallo'),
      opz('C', 'Le fai qualche domanda per capire cosa intende per "urgente", prima di decidere come muoverti.', 'acqua'),
      opz('D', 'Trovi comunque il modo di inserirla subito, magari allungando la tua giornata, perché non sopporti di lasciarla in difficoltà.', 'fuoco'),
      opz('E', 'Approfitti per capire se ti serve un criterio nuovo e più chiaro per gestire le urgenze in generale.', 'aria'),
    ],
  },
  C9: {
    ambito: 'clienti',
    testo: 'Una cliente ha una reazione allergica lieve dopo un trattamento fatto nel tuo centro.',
    opzioni: [
      opz('A', 'Ricontrolli nei minimi dettagli la scheda di anamnesi compilata con lei, per capire se è saltato un passaggio preciso del controllo abituale.', 'metallo'),
      opz('B', 'Rivedi da zero la scheda di anamnesi e i test preliminari che usi prima di ogni trattamento simile.', 'aria'),
      opz('C', 'Passi del tempo a capire con lei, con calma, cosa ha sentito esattamente e da quando.', 'acqua'),
      opz('D', 'Segui punto per punto il protocollo che usi sempre in questi casi, perché è collaudato e sai che tiene.', 'terra'),
      opz('E', 'La chiami subito tu, in prima persona, per assicurarti che stia bene e per rimediare il prima possibile.', 'fuoco'),
    ],
  },
  C10: {
    ambito: 'clienti',
    testo: 'Una cliente abituale porta per la prima volta un\'amica e chiede uno sconto "due per uno" per convincerla a tornare.',
    opzioni: [
      opz('A', 'Accetti subito, entusiasta all\'idea di guadagnare una cliente nuova.', 'fuoco'),
      opz('B', 'Applichi il listino di sempre, spiegando con gentilezza perché non fai sconti last minute.', 'terra'),
      opz('C', 'Valuti se puoi offrire uno sconto preciso e limitato solo per questa occasione, senza intaccare il valore che dai di solito al tuo listino.', 'metallo'),
      opz('D', 'Chiedi a entrambe cosa le farebbe sentire più a loro agio, prima di decidere sul prezzo.', 'acqua'),
      opz('E', 'Pensi che potrebbe essere l\'occasione per creare un\'offerta strutturata per chi porta un\'amica, non solo per questa volta.', 'aria'),
    ],
  },
  C11: {
    ambito: 'clienti',
    testo: 'Una cliente pubblica sui social un video del trattamento fatto da te, senza chiedertelo prima, raccontandolo in un modo che non ti piace per niente.',
    opzioni: [
      opz('A', 'Non ne fai un caso, e continui con lei esattamente come hai sempre fatto.', 'terra'),
      opz('B', 'Le scrivi subito, in privato, per dirle chiaramente cosa non ti è piaciuto di come l\'ha raccontato.', 'fuoco'),
      opz('C', 'Ne approfitti per stabilire una linea chiara su cosa si può condividere sui social riguardo al centro, valida per tutte le clienti.', 'aria'),
      opz('D', 'Ti prendi un momento per capire cosa intendeva comunicare davvero, prima di reagire.', 'acqua'),
      opz('E', 'Le chiedi con calma di correggere solo il punto preciso che non ti convince nel video già pubblicato, senza chiederle di toglierlo del tutto.', 'metallo'),
    ],
  },
  C12: {
    ambito: 'clienti',
    testo: 'Una cliente paga sempre con qualche giorno di ritardo e ogni tanto chiede di "segnare sul conto".',
    opzioni: [
      opz('A', 'Le chiedi con delicatezza se sta attraversando un momento difficile, per capire come aiutarla senza metterla in imbarazzo.', 'acqua'),
      opz('B', 'Continui a fare come hai sempre fatto con lei, senza cambiare nulla nel vostro rapporto di fiducia.', 'terra'),
      opz('C', 'Le dici chiaramente, in quel momento, che da oggi vuoi essere pagata a fine trattamento come tutte le altre.', 'fuoco'),
      opz('D', 'Le fissi una scadenza precisa entro cui saldare quanto deve, mantenendo così uno standard chiaro anche con lei.', 'metallo'),
      opz('E', 'Decidi di introdurre una regola di pagamento chiara e uguale per tutte, per evitare che la situazione si ripeta con altre.', 'aria'),
    ],
  },

  P1: {
    ambito: 'personale',
    testo: 'Una dipendente arriva in ritardo per la terza volta in un mese, sempre con quindici-venti minuti di scarto.',
    opzioni: [
      opz('A', 'Le parli subito, appena entra, dicendole chiaramente che così non puoi tenerla in squadra.', 'fuoco'),
      opz('B', 'Le ricordi con precisione gli orari concordati e le chiedi di rispettarli da subito, valutando se serve rivedere l\'accordo se capita ancora.', 'metallo'),
      opz('C', 'Le fai notare il ritardo, ma il rapporto con lei resta quello di sempre: ti fidi che con il tempo si sistemi.', 'terra'),
      opz('D', 'La prendi da parte con calma per capire cosa le sta succedendo nella vita fuori dal centro.', 'acqua'),
      opz('E', 'Decidi di introdurre un orario di ingresso con cartellino o controllo per tutto lo staff, non solo per lei.', 'aria'),
    ],
  },
  P2: {
    ambito: 'personale',
    testo: 'Una dipendente sbaglia un trattamento su una cliente, un errore che si vede e che la cliente nota subito.',
    opzioni: [
      opz('A', 'Analizzi con lei, passaggio per passaggio, dove esattamente la procedura non ha retto lo standard, per rimetterla a punto subito.', 'metallo'),
      opz('B', 'Ti siedi con lei dopo per capire come si sente e cosa pensa sia andato storto, prima di dire la tua.', 'acqua'),
      opz('C', 'Rivedi le procedure di controllo prima di ogni trattamento per tutto lo staff, così l\'errore non ricapiti a nessuna.', 'aria'),
      opz('D', 'Gestisci l\'errore come hai sempre fatto in questi casi, seguendo la prassi consueta con la cliente e con lei.', 'terra'),
      opz('E', 'Intervieni subito, sul momento, per rimediare con la cliente prima ancora di parlare con la dipendente.', 'fuoco'),
    ],
  },
  P3: {
    ambito: 'personale',
    testo: 'Una dipendente è bravissima con le clienti, che la adorano, ma non rispetta quasi mai i protocolli e le procedure del centro.',
    opzioni: [
      opz('A', 'Continui a lasciarla lavorare come ha sempre fatto, visto che i risultati con le clienti ci sono.', 'terra'),
      opz('B', 'Le dici subito, in faccia, che da domani le procedure valgono anche per lei, senza eccezioni.', 'fuoco'),
      opz('C', 'Ti fermi a ripensare se le procedure vanno adattate o rese più chiare per tutti, non solo imposte a lei.', 'aria'),
      opz('D', 'Le chiedi di rispettare almeno gli standard che per te non sono negoziabili, lasciandole libertà sul resto del suo stile personale.', 'metallo'),
      opz('E', 'Le chiedi di raccontarti perché fa così, per capire cosa la spinge a saltare i passaggi.', 'acqua'),
    ],
  },
  P4: {
    ambito: 'personale',
    testo: 'Una dipendente, dopo un periodo di crescita del centro, ti chiede un aumento o un riconoscimento del suo ruolo.',
    opzioni: [
      opz('A', 'Cogli l\'occasione per ripensare a come valuti e riconosci tutto lo staff, non solo lei.', 'aria'),
      opz('B', 'Le chiedi di raccontarti come si sente rispetto al suo ruolo, prima di prendere una decisione.', 'acqua'),
      opz('C', 'Valuti con lei, nel dettaglio, quali risultati concreti ha raggiunto rispetto allo standard che vi eravate dati, e decidi da lì.', 'metallo'),
      opz('D', 'Le dici subito di sì, sull\'onda dell\'entusiasmo per come sta andando il centro grazie anche a lei.', 'fuoco'),
      opz('E', 'Le rispondi seguendo i criteri che hai sempre usato per valutare aumenti e ruoli nel centro.', 'terra'),
    ],
  },
  P5: {
    ambito: 'personale',
    testo: 'Due dipendenti litigano davanti a delle clienti in sala d\'attesa.',
    opzioni: [
      opz('A', 'Non intervieni sul litigio in sé: rassicuri le clienti in sala e lasci che tra loro si calmino da sole, come è già successo altre volte.', 'terra'),
      opz('B', 'Ti rendi conto che serve una regola chiara su come gestire i conflitti tra colleghe in centro, e la introduci.', 'aria'),
      opz('C', 'Intervieni subito, sul momento, per fermare la scena e riportare la calma in centro.', 'fuoco'),
      opz('D', 'Parli con entrambe separatamente, con calma, per capire cosa c\'è davvero sotto quel litigio.', 'acqua'),
      opz('E', 'Dopo, le richiami entrambe a un limite preciso su cosa è accettabile fare davanti alle clienti, senza discutere subito il merito del litigio.', 'metallo'),
    ],
  },
  P6: {
    ambito: 'personale',
    testo: 'Una dipendente si licenzia all\'improvviso, proprio nel periodo di alta stagione.',
    opzioni: [
      opz('A', 'Ti attivi subito, nello stesso giorno, per trovare una soluzione immediata e non fermare il centro.', 'fuoco'),
      opz('B', 'Controlli subito quali attività o turni puoi tagliare o accorciare nei prossimi giorni per reggere senza di lei, prima ancora di sostituirla.', 'metallo'),
      opz('C', 'Ti prendi il tempo di parlarle per capire cosa l\'ha portata a questa decisione, anche se ormai ha deciso.', 'acqua'),
      opz('D', 'Ti chiedi se è il momento di ripensare al modo in cui organizzi lo staff, per non ritrovarti mai più così scoperta.', 'aria'),
      opz('E', 'Ti organizzi con le persone che hai già, come hai sempre fatto nei momenti di difficoltà.', 'terra'),
    ],
  },
  P7: {
    ambito: 'personale',
    testo: 'Una dipendente ti propone di cambiare il modo in cui lavorate, una nuova procedura che secondo lei renderebbe tutto più semplice.',
    opzioni: [
      opz('A', 'Le fai domande per capire bene cosa intende, cosa cambierebbe davvero nel lavoro di tutti i giorni.', 'acqua'),
      opz('B', 'La ringrazi ma per ora continui con il metodo che usi da sempre, che conosci bene.', 'terra'),
      opz('C', 'Ti entusiasmi subito e provi a metterla in pratica già dai prossimi giorni.', 'fuoco'),
      opz('D', 'Valuti con precisione cosa della sua proposta migliora davvero lo standard di lavoro, e prendi solo quella parte da subito.', 'metallo'),
      opz('E', 'Ti fermi a valutare se conviene rivedere davvero l\'organizzazione del centro partendo dalla sua idea.', 'aria'),
    ],
  },
  P8: {
    ambito: 'personale',
    testo: 'Una dipendente in formazione ha bisogno di più tempo e pazienza del previsto per imparare un trattamento.',
    opzioni: [
      opz('A', 'Ripensi al modo in cui formi le nuove dipendenti in generale, per renderlo più efficace per tutte.', 'aria'),
      opz('B', 'Ti metti accanto a lei subito, di persona, per farla arrivare più in fretta al livello che ti serve.', 'fuoco'),
      opz('C', 'Individui con precisione il singolo passaggio del trattamento su cui è ancora sotto standard, e ci lavori solo su quello finché non lo raggiunge.', 'metallo'),
      opz('D', 'Le dai lo stesso tempo che hai sempre dato a chi si è formata da te in passato, senza fretta.', 'terra'),
      opz('E', 'Le chiedi cosa la blocca esattamente, per capire insieme a lei dove si inceppa.', 'acqua'),
    ],
  },
  P9: {
    ambito: 'personale',
    testo: 'Ti accorgi che una dipendente porta avanti relazioni molto strette con "le sue" clienti e lascia intendere che potrebbe portarle via se se ne andasse.',
    opzioni: [
      opz('A', 'Le parli subito, chiaramente, per mettere le cose in chiaro senza giri di parole.', 'fuoco'),
      opz('B', 'Ripensi a come strutturare il rapporto tra dipendenti e clienti nel centro, per non dipendere mai da una singola persona.', 'aria'),
      opz('C', 'Non cambi il tuo modo di fare con lei: continui a fidarti del rapporto costruito in questi anni, come hai sempre fatto.', 'terra'),
      opz('D', 'Cerchi di capire cosa la spinge a comportarsi così, se si sente poco riconosciuta o altro.', 'acqua'),
      opz('E', 'Rivedi con lei, nel dettaglio, cosa è normale condividere con le clienti e cosa no, per tenere uno standard chiaro anche su questo.', 'metallo'),
    ],
  },
  P10: {
    ambito: 'personale',
    testo: 'Una dipendente ti chiede un giorno libero improvviso per motivi personali, proprio in una giornata critica per il centro.',
    opzioni: [
      opz('A', 'Gestisci la giornata come hai sempre fatto in questi casi, riorganizzando tu stessa gli appuntamenti.', 'terra'),
      opz('B', 'Valuti con lei con precisione cosa si può spostare o tagliare dalla giornata per concederglielo, senza abbassare lo standard di servizio per le clienti già prenotate.', 'metallo'),
      opz('C', 'Le chiedi cosa sta succedendo, per capire quanto è davvero urgente per lei.', 'acqua'),
      opz('D', 'Ti chiedi se serve una policy più chiara sui permessi improvvisi, valida per tutte.', 'aria'),
      opz('E', 'Le dici subito di sì, mossa dall\'istinto di darle una mano prima ancora di pensare all\'organizzazione.', 'fuoco'),
    ],
  },
  P11: {
    ambito: 'personale',
    testo: 'Una dipendente esperta si oppone a un nuovo gestionale o software che vorresti introdurre in centro.',
    opzioni: [
      opz('A', 'Le chiedi cosa la preoccupa esattamente del cambiamento, per capire la resistenza prima di insistere.', 'acqua'),
      opz('B', 'Le dici chiaramente che si farà comunque, con decisione, perché senti che è il momento di andare avanti.', 'fuoco'),
      opz('C', 'Per ora continui con lo strumento che conosci bene e su cui puoi contare, tenendo il cambiamento sullo sfondo ancora per un po\'.', 'terra'),
      opz('D', 'Ti fermi a chiederti se serve un percorso diverso per far accettare i cambiamenti allo staff in generale.', 'aria'),
      opz('E', 'Le mostri con precisione quali standard di lavoro migliorerebbero col nuovo strumento, e valuti insieme quali abitudini vecchie può lasciar andare.', 'metallo'),
    ],
  },
  P12: {
    ambito: 'personale',
    testo: 'Una dipendente ti segnala un problema con una collega, ma ti chiede di non far sapere che è stata lei a dirtelo.',
    opzioni: [
      opz('A', 'Ne approfitti per ripensare a come, in generale, raccogli i segnali di disagio nel tuo staff.', 'aria'),
      opz('B', 'Gestisci la cosa con la discrezione che usi sempre in questi casi, senza cambiare il tuo modo di procedere.', 'terra'),
      opz('C', 'Passi del tempo ad ascoltarla per capire bene cosa c\'è dietro la segnalazione.', 'acqua'),
      opz('D', 'Verifichi con precisione i fatti raccontati prima di agire, mantenendo la riservatezza come uno standard che rispetti sempre in questi casi.', 'metallo'),
      opz('E', 'Affronti subito la situazione, decisa a risolverla prima che peggiori.', 'fuoco'),
    ],
  },

  S1: {
    ambito: 'spese',
    testo: 'Un macchinario importante si guasta all\'improvviso e la riparazione costa più di quanto avevi preventivato.',
    opzioni: [
      opz('A', 'Controlli nel dettaglio il preventivo voce per voce, per capire cosa puoi tagliare o rinegoziare prima di dare il via libera.', 'metallo'),
      opz('B', 'Ne approfitti per ripensare l\'intero parco macchinari del centro, non solo per sistemare quello rotto.', 'aria'),
      opz('C', 'Decidi subito, sul momento, di procedere con la riparazione: per te il centro aperto viene prima, il conto lo guardi dopo.', 'fuoco'),
      opz('D', 'Paghi la riparazione seguendo la stessa logica che usi sempre per le spese impreviste.', 'terra'),
      opz('E', 'Ti prendi un momento per capire davvero se e quanto quel macchinario ti serve ancora, prima di decidere.', 'acqua'),
    ],
  },
  S2: {
    ambito: 'spese',
    testo: 'Un fornitore ti propone un acquisto scontato di prodotti in grande quantità, con un forte risparmio se decidi subito.',
    opzioni: [
      opz('A', 'Segui il criterio che usi sempre per gli acquisti, senza farti tentare dallo sconto.', 'terra'),
      opz('B', 'Ti fermi a valutare con calma quanto userai davvero quei prodotti nei prossimi mesi.', 'acqua'),
      opz('C', 'Controlli con precisione le condizioni reali dell\'offerta, non solo il prezzo scontato, prima di decidere se conviene davvero.', 'metallo'),
      opz('D', 'Accetti subito, entusiasta all\'idea dell\'affare, prima che l\'offerta scada.', 'fuoco'),
      opz('E', 'Cogli l\'occasione per rivedere l\'intero rapporto con i fornitori, non solo questo acquisto.', 'aria'),
    ],
  },
  S3: {
    ambito: 'spese',
    testo: 'Il fatturato di un mese cala rispetto agli altri, in un periodo di bassa stagione.',
    opzioni: [
      opz('A', 'Ripensi con calma a cosa è cambiato rispetto agli altri anni, per capire da dove viene il calo.', 'acqua'),
      opz('B', 'Continui a lavorare come sempre, sapendo che i mesi bassi fanno parte del normale andamento dell\'anno.', 'terra'),
      opz('C', 'Ti chiedi se è il momento di cambiare qualcosa di strutturale in come organizzi il centro nei mesi bassi.', 'aria'),
      opz('D', 'Ti attivi subito con qualche iniziativa per portare più clienti già in questo mese.', 'fuoco'),
      opz('E', 'Guardi nel dettaglio le voci di spesa del mese per capire cosa tagliare subito, senza aspettare che la stagione cambi da sola.', 'metallo'),
    ],
  },
  S4: {
    ambito: 'spese',
    testo: 'Più clienti ti chiedono un trattamento per cui servirebbe un macchinario nuovo e costoso.',
    opzioni: [
      opz('A', 'Decidi in fretta di acquistarlo, spinta dall\'entusiasmo di offrire qualcosa di nuovo alle clienti.', 'fuoco'),
      opz('B', 'Fai due conti precisi su quanto costerebbe mantenerlo a uno standard adeguato nel tempo, non solo il prezzo d\'acquisto.', 'metallo'),
      opz('C', 'Ne approfitti per ripensare l\'offerta di trattamenti del centro nel suo complesso, non solo quel macchinario.', 'aria'),
      opz('D', 'Ti prendi il tempo di capire quante clienti lo userebbero davvero e quanto sarebbero disposte a spendere.', 'acqua'),
      opz('E', 'Aspetti di avere più richieste ancora, come fai sempre prima di investimenti importanti.', 'terra'),
    ],
  },
  S5: {
    ambito: 'spese',
    testo: 'Ti si presenta l\'occasione di un corso di formazione o aggiornamento professionale, con un costo importante.',
    opzioni: [
      opz('A', 'Decidi seguendo lo stesso criterio che usi sempre per le spese di formazione.', 'terra'),
      opz('B', 'Ti iscrivi subito, perché quando un corso ti entusiasma così tanto non aspetti a deciderlo.', 'fuoco'),
      opz('C', 'Ne approfitti per ripensare il piano di formazione di tutto il centro, non solo il tuo.', 'aria'),
      opz('D', 'Controlli nel dettaglio il programma del corso per capire se alza davvero lo standard che ti serve, o se resta solo scintillante in superficie.', 'metallo'),
      opz('E', 'Ti prendi del tempo per capire cosa ti manca davvero e se quel corso risponde a quel bisogno.', 'acqua'),
    ],
  },
  S6: {
    ambito: 'spese',
    testo: 'Una cliente non paga una fattura o ritarda molto il pagamento di un lavoro già fatto.',
    opzioni: [
      opz('A', 'Controlli con precisione da quanto tempo è aperta quella fattura, e le dai una scadenza precisa per saldarla.', 'metallo'),
      opz('B', 'Decidi di introdurre una regola più chiara sui pagamenti per tutte le clienti future.', 'aria'),
      opz('C', 'Le scrivi con calma per capire cosa sta succedendo, prima di parlare di soldi.', 'acqua'),
      opz('D', 'Gestisci la cosa come hai sempre fatto in questi casi, dando alla cliente lo stesso margine che le hai sempre dato.', 'terra'),
      opz('E', 'La contatti subito, in giornata, per sistemare la questione senza aspettare oltre.', 'fuoco'),
    ],
  },
  S7: {
    ambito: 'spese',
    testo: 'Ti rendi conto che l\'arredamento o la vetrina del centro andrebbero rinnovati, con una spesa non piccola.',
    opzioni: [
      opz('A', 'Decidi in fretta di procedere, presa dalla voglia di vedere il centro rinnovato al più presto.', 'fuoco'),
      opz('B', 'Rimandi la spesa, come hai sempre fatto quando non è strettamente necessaria subito.', 'terra'),
      opz('C', 'Fai una lista precisa di cosa è davvero da cambiare e cosa puoi ancora tenere, per capire il costo reale minimo necessario.', 'metallo'),
      opz('D', 'Ti prendi il tempo di capire cosa apprezzerebbero davvero le clienti in un rinnovo, prima di scegliere.', 'acqua'),
      opz('E', 'Ti chiedi se non sia il momento di ripensare tutta l\'immagine del centro, non solo un cambio d\'arredo.', 'aria'),
    ],
  },
  S8: {
    ambito: 'spese',
    testo: 'Valuti se aumentare i prezzi del listino dopo tempo che non li tocchi.',
    opzioni: [
      opz('A', 'Ti prendi il tempo di capire come reagirebbero le clienti, magari parlandone con qualcuna di loro.', 'acqua'),
      opz('B', 'Ne approfitti per ripensare l\'intero listino e il posizionamento del centro, non solo i numeri.', 'aria'),
      opz('C', 'Decidi in fretta di aumentare, sicura che il valore del tuo lavoro lo giustifichi.', 'fuoco'),
      opz('D', 'Rimandi la decisione, restando sui prezzi di sempre, quelli su cui il rapporto con le clienti abituali è già solido.', 'terra'),
      opz('E', 'Ricalcoli con precisione i margini reali di ogni servizio, e alzi solo i prezzi dove lo scarto tra costo e valore non regge più lo standard che vuoi.', 'metallo'),
    ],
  },
  S9: {
    ambito: 'spese',
    testo: 'Investi in pubblicità o social per il centro, ma dopo qualche settimana non vedi risultati misurabili.',
    opzioni: [
      opz('A', 'Continui comunque per un po\', come hai sempre fatto, dando tempo alle cose di dare risultati.', 'terra'),
      opz('B', 'Guardi nel dettaglio i numeri esatti di quella campagna, per capire cosa tagliare e cosa invece merita di restare.', 'metallo'),
      opz('C', 'Ripensi da zero tutto il modo in cui comunichi il centro, non solo quella singola iniziativa.', 'aria'),
      opz('D', 'Cambi subito strategia, sul momento, provando qualcos\'altro senza aspettare oltre.', 'fuoco'),
      opz('E', 'Ti prendi il tempo di capire cosa non ha funzionato, parlando magari con chi te l\'ha proposta.', 'acqua'),
    ],
  },
  S10: {
    ambito: 'spese',
    testo: 'Una cliente ti chiede di pagare a rate un trattamento costoso.',
    opzioni: [
      opz('A', 'Decidi di introdurre una policy chiara sulle rateizzazioni, valida per tutte le clienti future.', 'aria'),
      opz('B', 'Segui il criterio che hai sempre usato in questi casi, senza fare eccezioni particolari.', 'terra'),
      opz('C', 'Le chiedi con calma la sua situazione, per capire come venirle incontro senza esporti troppo.', 'acqua'),
      opz('D', 'Le proponi un piano di rate preciso, con scadenze e importi definiti da subito, con lo stesso standard che vorresti dare a chiunque te lo chiedesse.', 'metallo'),
      opz('E', 'Le dici subito di sì, e la soluzione per le rate te la inventi lì per lì, senza pensarci due volte.', 'fuoco'),
    ],
  },
  S11: {
    ambito: 'spese',
    testo: 'Ti propongono un\'assicurazione o un adempimento non obbligatorio ma consigliato per il centro, con un costo annuale.',
    opzioni: [
      opz('A', 'Leggi nel dettaglio, riga per riga, cosa copre esattamente e cosa no, prima di stabilire se rientra nei tuoi standard di sicurezza.', 'metallo'),
      opz('B', 'Ti prendi il tempo di capire bene cosa copre davvero, magari confrontandoti con qualcuno di fiducia.', 'acqua'),
      opz('C', 'Decidi in fretta, sul momento, di sottoscriverla per toglierti subito il pensiero.', 'fuoco'),
      opz('D', 'Ne approfitti per rivedere tutta la gestione dei rischi e delle coperture del centro, non solo questa proposta.', 'aria'),
      opz('E', 'Decidi seguendo quello che hai sempre fatto finora su questo tipo di spese.', 'terra'),
    ],
  },
  S12: {
    ambito: 'spese',
    testo: 'Ti accorgi di avere in magazzino prodotti in eccesso, alcuni vicini alla scadenza.',
    opzioni: [
      opz('A', 'Ti attivi subito con una promozione o un\'iniziativa per smaltirli in fretta.', 'fuoco'),
      opz('B', 'Ti prendi il tempo di capire perché sono rimasti lì, per evitare che succeda ancora.', 'acqua'),
      opz('C', 'Controlli con precisione quali prodotti sono ormai da tagliare dagli ordini futuri, e quali invece tenere ma gestire meglio.', 'metallo'),
      opz('D', 'Li gestisci come hai sempre fatto, aspettando di usarli nei trattamenti nei prossimi mesi.', 'terra'),
      opz('E', 'Ripensi il modo in cui ordini i prodotti in generale, per non ritrovarti più in questa situazione.', 'aria'),
    ],
  },
}
