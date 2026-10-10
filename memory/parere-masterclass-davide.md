# Parere tecnico di Davide — telefonata gratuita, videoguide e incontri in abbonamento

Data: 2026-10-06. Richiesta del Coordinatore per Mason. Solo parere: nessun codice scritto, nessun prezzo inventato.

Proposta: a chi compra l'agenda (o il bundle) si offre una telefonata gratuita di aiuto all'avvio, le videoguide, e poi gli incontri in abbonamento (2 al mese da 90 minuti, circa 40 euro al mese).

## 1. Cosa c'è DAVVERO oggi (verificato nel codice e nel database di produzione)

- **Stripe c'è, ma non per questo uso.** Esistono `app/api/subscriptions/checkout/route.js` e `app/api/webhooks/stripe/route.js`. Il checkout può creare un abbonamento mensile (`mode: 'subscription'`), ma solo per i "pacchetti minuti HPA" e per gli addon token. I prezzi sono scritti al volo (`price_data`), non esistono Prodotti/Prezzi salvati su Stripe.
- **Il checkout non può funzionare in produzione.** Il codice legge la tabella `subscription_packages` e scrive su `client_subscriptions`. Nel database di produzione (progetto "beautyx", controllato oggi) queste due tabelle NON esistono. Esistono `subscription_plans`, `user_subscriptions`, `user_purchases`, `addon_packages` (vuota, come già annotato in `generale.md`).
- **Il webhook gestisce solo 3 eventi:** pagamento completato, fattura pagata, abbonamento cancellato. Mancano pagamento fallito e abbonamento modificato/in ritardo: per un abbonamento vero servono.
- **Versione API Stripe:** il codice fissa `2023-10-16` con libreria 20.x. Va ricontrollata prima di costruire qualcosa di nuovo (non verificato il comportamento).
- **Nessuna pagina porta l'utente a pagare** (già noto: livello 3 non scopribile per scelta di Mason).
- **Prenotazione:** esiste `app/api/booking/route.js` (slot con una funzione SQL `get_available_slots`, pensata per le consulenze HPA). Nel database di produzione non ho trovato tabelle di prenotazione/disponibilità: non funziona oggi.
- **Video e registrazioni:** nel progetto non c'è alcuno strumento video, né hosting di video. Per le email c'è solo `nodemailer`.
- **Legame col codice edizione/identikit:** il tipo dell'edizione dell'agenda dipende dall'esito del test (decisione di Mason, 06/10). Il test vive già nel sistema (identikit). La tabella `user_resource_access` (acquisti tracciati) è scritta come migration ma NON applicata in produzione. Un codice edizione stampato sull'agenda non esiste ancora.

## 2. Valutazione punto per punto

| Cosa | Fattibilità | Note |
|---|---|---|
| Abbonamento 40 euro/mese Stripe | Media. Strada più corta: **Stripe Payment Link o Checkout** con prodotto salvato su Stripe, senza passare dal codice dei pacchetti HPA | Serve una tabella nuova di abbonati e 2 eventi in più nel webhook. Fiscalità (fattura, IVA, regime) da chiedere al commercialista, non da me |
| Accesso solo agli abbonati | Facile se l'abbonamento è su `user_subscriptions` come gli altri piani; la regola "solo abbonati" è una riga di controllo sulla pagina | Va decisa la scadenza: cosa succede il giorno dopo la disdetta |
| Telefonata gratuita | Quasi niente da costruire: un link di prenotazione di terzi + una email dopo l'acquisto | Il collegamento con l'acquisto (chi ha diritto alla telefonata) è il vero lavoro: serve un codice nell'agenda |
| Prenotazione incontri di gruppo | Si può usare uno strumento di terzi. Costruirlo noi non conviene | Da verificare: Calendly, Cal.com, Google Calendar con modulo, Zoho Bookings, strumento di eventi tipo Luma. Costi e limiti da controllare sui siti ufficiali |
| Collegamento video | Strumento di terzi | Da verificare: Google Meet, Zoom, Microsoft Teams, Jitsi (gratuito e ospitabile), Whereby, Daily. Per gruppi da 90 minuti controllare limiti di durata e partecipanti nei piani gratuiti. Nessun prezzo qui: non verificato |
| Videoguide | Facile come **link nascosti** (non indicizzati) su una pagina protetta | Hosting da verificare: Vimeo, YouTube non in elenco, Bunny Stream, Cloudflare Stream, Supabase Storage (già in uso per i file, ma il video pesante costa banda). Protezione contro copia completa non esiste con nessuno strumento |
| Registrazioni degli incontri | Possibile, ma è la parte con più rischio (vedi punto 4) | Meglio decidere PRIMA se si registra |
| Legame col codice edizione/identikit | Medio. Un codice univoco per agenda (stampato o dentro il QR) che sblocca telefonata e videoguide, collegato all'account | Serve un'anagrafica di codici, un modulo "inserisci il codice" e una tabella. Va fatto bene anche per evitare che lo stesso codice sia usato da molte persone |

## 3. Cosa si avvia in giorni, in settimane, e cosa NON conviene costruire

**In giorni (2-5 giorni di lavoro, con strumenti di terzi):**
- Pagina "dopo l'acquisto" con link di prenotazione della telefonata (strumento di terzi) e le videoguide su link non indicizzati.
- Abbonamento incontri con un Payment Link Stripe e un elenco manuale degli abbonati (anche un foglio), accesso agli incontri tramite link inviato via email agli abbonati. Poche decine di persone si gestiscono a mano.

**In settimane (2-4 settimane):**
- Tabelle vere (abbonati, codici edizione, diritti di accesso) e migration applicata, con collaudo dal vivo (regola del team).
- Webhook completo (pagamento fallito, disdetta, ripresa) e pagina area abbonati agganciata a `user_subscriptions`.
- Codice edizione sull'agenda collegato all'account e all'esito del test.

**NON conviene costruire subito:**
- Un sistema di videoconferenza o un player video nostro.
- Un calendario di prenotazione nostro: per ora usare strumenti di terzi.
- Registrazione automatica e archivio delle chiamate.
- Area "community" con commenti, chat o forum.
- Gestione fiscale automatica di fatture (decide il commercialista).
- Il pacchetto HPA a minuti non va riusato: ha un'altra logica e tabelle non presenti in produzione.

Prima di tutto: applicare le migration mancanti non è un passo "automatico". Va deciso e collaudato (regola di Mason su dati di produzione).

## 4. Rischi privacy/GDPR da far valutare a un professionista (non decido io)

1. **Registrazioni di chiamate e incontri:** voce e immagine sono dati personali. Serve capire base giuridica, informativa prima della registrazione, tempi di conservazione, chi può rivederle, e cosa succede se una partecipante chiede di cancellarsi.
2. **Incontri di gruppo:** nelle registrazioni compaiono altre titolari e a volte dati dei loro clienti o dipendenti che le partecipanti raccontano. Serve una regola chiara (cosa si può dire, cosa no).
3. **Strumenti di terzi (video, calendario, hosting):** dove sono i server, contratto di nomina a responsabile, eventuale trasferimento fuori dall'UE. Da far verificare per ognuno.
4. **Telefonata gratuita:** si raccolgono numero di telefono e appunti sulla titolare. Nota: collegare questi dati all'esito del test (tipo F.A.T.A.M.) richiede di dire chiaramente alla persona come si usa il dato. Mason ha già deciso che le domande del test non sono dati sensibili: la scelta resta sua, ma conviene farla confermare per iscritto da un professionista prima di legare i dati a incontri personali.
5. **Dati di pagamento:** restano su Stripe, noi non li vediamo. Ma l'informativa e le condizioni di abbonamento (recesso, rinnovo, disdetta) vanno scritte da un professionista.
6. **Registro dei trattamenti e informativa:** `app/privacy/page.js` non cita registrazioni né strumenti video. Va aggiornata prima del lancio.

## 5. In sintesi per Mason

Si può partire in pochi giorni con strumenti di terzi e senza costruire nulla di pesante. La piattaforma oggi NON ha un checkout abbonamenti funzionante per questo (le tabelle usate dal codice non sono in produzione). Conviene rimandare registrazioni e community finché un professionista non ha valutato la privacy.
