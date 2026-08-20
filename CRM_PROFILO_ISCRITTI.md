# CRM Profilo Iscritti — Manuale Operativo

**Versione:** 1.0 — luglio 2026
**Responsabile:** Lorenzo (community & relazione lettori)
**Aggiornato da:** Lorenzo + Mason (consulente) + Beehiiv (automatico)

---

## 1. Schema del Profilo Iscritto

Ogni iscritto alla newsletter ha una scheda profilo. I campi si dividono in tre livelli: disponibili subito all'iscrizione, raccolti nella welcome sequence, arricchiti nel tempo dall'attività.

---

### Livello A — Disponibili all'iscrizione (automatici)

| Campo | Tipo | Fonte | Esempio |
|-------|------|-------|---------|
| `email` | text | Beehiiv form / landing /miniguida | giulia.ferretti@gmail.com |
| `data_iscrizione` | date | Beehiiv | 2026-07-15 |
| `fonte_acquisizione` | text | UTM / landing page | ads_instagram / miniguida / organico |
| `lead_magnet_scaricato` | boolean | Beehiiv tag | true |
| `beehiiv_subscriber_id` | text | Beehiiv API | sub_abc123xyz |

---

### Livello B — Raccolti nella welcome sequence (email 2 o form consulente)

La seconda email della welcome sequence include un link a un form Tally (o Typeform gratuito) con 3 domande rapide. Il consulente le raccoglie anche verbalmente quando risponde alla domanda mensile.

| Campo | Tipo | Come si raccoglie | Esempio |
|-------|------|-------------------|---------|
| `tipo_centro` | text (select) | Form welcome / domanda consulente | estetica / nail / centro benessere / multiservizio / non ancora aperto |
| `citta` | text | Form welcome | Napoli |
| `anni_attivita` | integer | Form welcome | 4 |
| `n_dipendenti` | text (range) | Form welcome | 0 / 1-2 / 3-5 / 6+ |
| `obiettivo_principale` | text | Form welcome | aumentare i clienti fissi / gestire meglio il team / aprire un secondo centro |

> Nota: il form non chiede 20 cose. Chiede 3-4. Il resto si ricava dall'attività.

---

### Livello C — Arricchiti nel tempo (comportamento + interazioni)

| Campo | Tipo | Fonte | Aggiornato da |
|-------|------|-------|---------------|
| `newsletter_aperte_totali` | integer | Beehiiv analytics | automatico |
| `click_totali` | integer | Beehiiv analytics | automatico |
| `argomenti_cliccati` | text[] | Beehiiv tag per topic | automatico / Lorenzo |
| `domande_consulente` | jsonb array | Risposta mensile Mason | Mason + Lorenzo |
| `categoria_domanda_prevalente` | text | Derivato da domande | Lorenzo (ogni 30 gg) |
| `stadio_funnel` | text (enum) | Valutazione complessiva | Lorenzo |
| `note_consulente` | text | Interazione diretta | Mason |
| `ultima_interazione` | date | Form / email / social | Lorenzo o automatico |
| `ready_for_consulenza` | boolean | Valutazione Lorenzo/Mason | Lorenzo |

---

### Stadi del Funnel

Ogni iscritto ha uno stadio. Si aggiorna quando cambia qualcosa di concreto.

```
solo_newsletter        → iscritto, legge ma non ha mai interagito oltre
ha_chiesto_consulente  → ha inviato la domanda mensile almeno una volta
consulenza_in_corso    → ha prenotato una call a pagamento (o è in processo)
cliente_attivo         → ha un abbonamento attivo sull'app Beautyx
```

---

### Categorie Domanda Prevalente

Quando un'iscritta fa più domande nel tempo, emerge una categoria dominante. Le categorie sono:

- `pricing` — listino, sconti, prezzi concorrenza, abbonamenti clienti
- `agenda` — gestione appuntamenti, disdette, no-show, software
- `fidelizzazione` — come far tornare le clienti, programmi fedeltà, riattivazione
- `team` — dipendenti, contratti, produttività, turni, conflitti
- `comunicazione` — social, ads, newsletter, personal branding della titolare
- `gestione_economica` — costi fissi, margini, cassa, pianificazione
- `apertura` — chi vuole aprire un centro, iter burocratico, startup
- `altro` — tutto il resto

---

### Esempio concreto di profilo compilato

```
EMAIL: federica.m@centrobellezza.it
DATA ISCRIZIONE: 2026-06-03
FONTE: ads_instagram_miniguida
LEAD MAGNET: sì
BEEHIIV ID: sub_9f3k2a

CENTRO: estetica tradizionale + nail
CITTÀ: Torino
ANNI: 7
DIPENDENTI: 1-2
OBIETTIVO: fidelizzare le clienti esistenti

NEWSLETTER APERTE: 11/14
CLICK TOTALI: 8
ARGOMENTI CLICCATI: fidelizzazione, pricing, team

DOMANDE CONSULENTE:
  - 2026-06-20 | categoria: fidelizzazione | "Come faccio a far tornare chi viene solo in estate?"
  - 2026-07-10 | categoria: pricing | "Conviene fare tessere prepagare o abbonamento mensile?"

CATEGORIA PREVALENTE: fidelizzazione

STADIO: ha_chiesto_consulente
READY FOR CONSULENZA: sì
NOTE CONSULENTE (Mason): "Sa già cosa non funziona, manca un metodo. Profilo interessante per call."
ULTIMA INTERAZIONE: 2026-07-10
```

---

## 2. Come Si Aggiorna il Profilo

Il profilo si costruisce nel tempo. Nessuno lo compila in un'unica sessione.

---

### Aggiornamenti automatici da Beehiiv

Beehiiv tiene traccia di aperture e click. Lorenzo o Davide (via API o export settimanale) sincronizza questi dati in Supabase ogni settimana:

- Ogni volta che una newsletter viene aperta → `newsletter_aperte_totali` +1
- Ogni volta che un link viene cliccato → `click_totali` +1, e se il link ha un tag topic → aggiunto a `argomenti_cliccati`

> Azione tecnica: Davide configura un webhook Beehiiv → endpoint Next.js → upsert su `subscriber_profiles`. Priorità media (dopo il lancio ads).

---

### Aggiornamenti manuali di Lorenzo

Lorenzo aggiorna i profili dopo tre tipologie di evento:

**a) Risposta a un commento o messaggio social**
Quando un'iscritta commenta un post Beautyx o risponde a una newsletter via email, Lorenzo:
1. Identifica l'iscritta (email o username)
2. Apre il suo profilo in Supabase (o nel foglio di lavoro temporaneo)
3. Aggiunge l'argomento del commento a `argomenti_cliccati` se non c'è già
4. Aggiorna `ultima_interazione` con la data

**b) Revisione settimanale (vedi sezione 5)**

**c) Segnalazione profilo "pronto"**
Quando Lorenzo nota che un'iscritta ha il pattern giusto (alta apertura + domanda consulente + argomento coerente), imposta `ready_for_consulenza = true` e manda segnalazione a Mason.

---

### Aggiornamenti manuali di Mason (consulente)

Dopo ogni risposta alla domanda mensile, Mason aggiorna:

- `domande_consulente` → aggiunge la nuova domanda con data e categoria
- `categoria_domanda_prevalente` → aggiorna se la categoria dominante è cambiata
- `note_consulente` → aggiunge osservazione qualitativa se l'interazione lo merita
- `ready_for_consulenza` → può impostarlo a true se la domanda segnala chiaramente bisogno urgente

> Mason non apre Supabase ogni volta. Usa un form interno semplice (o commenta in una chat condivisa) e Lorenzo sincronizza.

---

## 3. Come il Profilo Alimenta Attività Mirate

Il profilo da solo non serve a niente. Serve per fare cose diverse per persone diverse.

---

### Segmentazione newsletter

**Scenario A — Ha cliccato 3+ articoli su pricing**
→ La prossima newsletter su prezzi o listino ha una CTA personalizzata nella welcome bar o in chiusura: "Se stai ancora cercando la tua struttura di prezzi, Mason risponde una volta al mese a una domanda. La prossima scadenza è [data]."

**Scenario B — Apre quasi sempre ma non ha mai cliccato nulla**
→ Profilo "spettatrice silenziosa". Non è pronta. Non forzi. Continua a nutrirla con contenuto di valore. Ricontrollare tra 60 giorni.

**Scenario C — Ha inviato già due domande, argomenti coerenti (es. entrambe su team)**
→ Invia una email 1-to-1 firmata da Mason: "Ho notato che torni spesso su X. C'è qualcosa di specifico che non torna?" Non è una vendita, è un'apertura.

---

### Selezione iscritte da invitare nella community

Quando la community Beautyx apre (obiettivo: 500+ iscritti), non si invita tutto l'elenco in blocco. Si selezionano le prime ondate così:

1. Stadio `ha_chiesto_consulente` + `ready_for_consulenza = true` → prima ondata (early adopters)
2. Alta apertura (>70% delle newsletter) + almeno 2 categorie di interesse cliccate → seconda ondata
3. Tutti gli altri → lancio pubblico

---

### Priorità nella risposta alle domande mensili

Ogni mese arrivano domande. Mason non può rispondere a tutte in modo approfondito. Il profilo aiuta a dare priorità:

- **Alta priorità:** `ready_for_consulenza = true` / stadio avanzato / domanda con categoria coerente con le precedenti
- **Media priorità:** prima domanda in assoluto (va coltivata con attenzione)
- **Normale:** domanda generica, profilo poco attivo (risponde in modo sintetico e educativo)

---

### Identificazione delle iscritte pronte per la consulenza a pagamento

Segnali cumulativi che indicano readiness:

- Almeno 2 domande inviate al consulente
- Apertura newsletter > 60% delle uscite
- Almeno 1 click su articoli di approfondimento (non solo titoli)
- Categoria dominante chiara (non frammentata su tutto)
- Nota del consulente con osservazione positiva sull'interazione

Quando 3+ di questi segnali sono attivi → Lorenzo imposta `ready_for_consulenza = true` e notifica Mason.

---

## 4. Tabella Supabase Proposta: `subscriber_profiles`

Tabella semplice, senza over-engineering. I dati più complessi (array di domande, click per topic) vengono gestiti come JSONB per evitare troppe tabelle nella fase iniziale.

```sql
CREATE TABLE subscriber_profiles (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                       TEXT NOT NULL UNIQUE,
  beehiiv_subscriber_id       TEXT UNIQUE,

  -- Iscrizione
  data_iscrizione             DATE,
  fonte_acquisizione          TEXT,                        -- ads_instagram / organico / miniguida / referral
  lead_magnet_scaricato       BOOLEAN DEFAULT FALSE,

  -- Centro (raccolti via form welcome o consulente)
  tipo_centro                 TEXT,                        -- estetica / nail / benessere / multiservizio / non_ancora_aperto
  citta                       TEXT,
  anni_attivita               INTEGER,
  n_dipendenti                TEXT,                        -- '0' / '1-2' / '3-5' / '6+'
  obiettivo_principale        TEXT,

  -- Comportamento newsletter (sync da Beehiiv)
  newsletter_aperte_totali    INTEGER DEFAULT 0,
  click_totali                INTEGER DEFAULT 0,
  argomenti_cliccati          TEXT[] DEFAULT '{}',         -- es: ['pricing', 'fidelizzazione']

  -- Interazioni consulente
  domande_consulente          JSONB DEFAULT '[]',          -- [{data, categoria, testo}, ...]
  categoria_domanda_prevalente TEXT,                       -- pricing / agenda / fidelizzazione / ...
  note_consulente             TEXT,

  -- Funnel
  stadio_funnel               TEXT DEFAULT 'solo_newsletter'
                              CHECK (stadio_funnel IN (
                                'solo_newsletter',
                                'ha_chiesto_consulente',
                                'consulenza_in_corso',
                                'cliente_attivo'
                              )),
  ready_for_consulenza        BOOLEAN DEFAULT FALSE,

  -- Timestamps
  ultima_interazione          DATE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Indici utili
CREATE INDEX idx_subscriber_stadio ON subscriber_profiles(stadio_funnel);
CREATE INDEX idx_subscriber_ready  ON subscriber_profiles(ready_for_consulenza) WHERE ready_for_consulenza = TRUE;
CREATE INDEX idx_subscriber_fonte  ON subscriber_profiles(fonte_acquisizione);

-- RLS: solo admin e service key
ALTER TABLE subscriber_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_only" ON subscriber_profiles
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND ruolo_livello = 'admin'
    )
  );
```

> Struttura di `domande_consulente` (JSONB array):
> ```json
> [
>   {"data": "2026-06-20", "categoria": "fidelizzazione", "testo": "Come faccio a far tornare chi viene solo in estate?"},
>   {"data": "2026-07-10", "categoria": "pricing", "testo": "Conviene fare tessere prepagate o abbonamento mensile?"}
> ]
> ```

---

## 5. Regola Operativa per Lorenzo

Routine settimanale. Non richiede strumenti speciali, solo costanza.

---

### Mercoledì mattina — 20 minuti (dopo il briefing argomenti)

**Cosa guarda:**
1. Export settimanale Beehiiv (aperture + click dell'ultima newsletter)
2. Eventuali risposte email ricevute dagli iscritti
3. Commenti ai post social Beautyx della settimana

**Cosa aggiorna:**
- Per ogni risposta email o commento social identificato → cerca il profilo in Supabase → aggiorna `argomenti_cliccati` e `ultima_interazione`
- Se una lettrice ha inviato una domanda al consulente quella settimana → aggiorna `stadio_funnel` a `ha_chiesto_consulente`
- Controlla se ci sono profili con 3+ segnali readiness → imposta `ready_for_consulenza = true` e manda nota a Mason

**Output finale:**
- Eventuale segnalazione a Mason: "Questa settimana ho marcato 2 profili come ready. Te li mando."
- Nessun report lungo. Solo azione diretta sui profili.

---

### Fine mese — 30 minuti

**Cosa fa:**
- Esporta da Supabase tutti i profili con `ready_for_consulenza = true` e li passa a Mason per valutazione
- Aggiorna `categoria_domanda_prevalente` per chi ha fatto domande quel mese
- Guarda i profili in stadio `solo_newsletter` da più di 90 giorni con apertura <30% → li marca internamente come "freddi" (non li cancella, ma smette di investire attenzione su di loro)
- Aggiorna il conteggio di iscritte per stadio funnel e lo passa a Matteo per i KPI mensili

**Tempo stimato totale per settimana:** 20-25 minuti (mercoledì) + 30 minuti (fine mese).

---

## Note finali

Questo sistema non è un CRM da agenzia. E' uno strumento per fare meno cose, ma su persone giuste. Meglio una call con 5 iscritte davvero pronte che mandare 500 email uguali a chi non sa ancora chi siamo.

Il profilo si costruisce lentamente. Nei primi 3 mesi post-lancio ads, molti campi saranno vuoti. Va bene. L'obiettivo e' avere dati utili su almeno il 20% degli iscritti entro fine 2026.

Lorenzo e' il custode del dato, non il produttore. I dati arrivano dall'attivita' reale delle iscritte. Lorenzo li raccoglie, li pulisce e li rende leggibili per Mason e per il team.
