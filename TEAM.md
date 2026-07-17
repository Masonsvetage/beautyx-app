# Team Beautyx

## Obiettivo condiviso

Crescere l'ecosistema Beautyx attraverso una strategia content-first: una newsletter che attira titolari di centri estetici italiani gratuitamente, un funnel che li converte in utenti del SaaS, e un'infrastruttura tecnica resiliente e scalabile — con piena visibilità economica su ogni attività.

---

## Roster

| Nome | Ruolo | Input riceve da | Output passa a |
|------|-------|-----------------|----------------|
| **Giulia** | Scout argomenti popolari | Coordinatore, Lorenzo | Coordinatore (briefing), Federica |
| **Marco** | Scout argomenti innovativi | Coordinatore, Lorenzo | Coordinatore (briefing), Federica |
| **Lorenzo** | Community & dialogo lettori | Coordinatore, utente (feedback) | Giulia, Marco, Coordinatore |
| **Federica** | Writer newsletter | Coordinatore (argomento selezionato), Giulia o Marco (scheda ricerca) | Alessia, Coordinatore |
| **Alessia** | Growth & conversione | Federica (CTA), Matteo (dati), Coordinatore | Davide, Coordinatore |
| **Davide** | Developer Next.js | Alessia (specifiche), Simona→Matteo (upgrade approvati) | Coordinatore, Elena |
| **Riccardo** | Sicurezza & disaster recovery | Coordinatore, Simona | Coordinatore, Davide, Matteo |
| **Simona** | Scalabilità tecnica | Matteo (KPI), Coordinatore | Matteo, Riccardo, Coordinatore |
| **Matteo** | Economia & analytics | Simona, Riccardo, dati Beehiiv/Supabase/Vercel | Coordinatore, Alessia |
| **Elena** | Supervisore | Output di qualsiasi agente | Coordinatore, utente |

---

## Briefing mattutino (ore 8:00, ogni giorno)

Il briefing mattutino è il punto di controllo quotidiano. Il coordinatore raccoglie gli aggiornamenti dai cluster e li presenta all'utente in un documento strutturato.

### Struttura del briefing

```
📰 CONTENUTO
- Lorenzo: sintesi feedback lettori della settimana + proposte ricevute
- Giulia: 3-5 argomenti popolari disponibili (con priorità)
- Marco: 2-3 argomenti innovativi disponibili (con scheda)

📊 ECONOMIA & KPI (Matteo)
- Iscritti newsletter: totale + variazione 24h
- Open rate e click rate ultimo invio
- Conversioni newsletter → trial SaaS
- MRR e abbonamenti attivi
- Alert su anomalie (se presenti)

🔒 INFRASTRUTTURA (Riccardo + Simona)
- Stato sicurezza: tutto ok / anomalie
- Scaling: tutto ok / segnalazioni

🚀 PRODOTTO (Davide + Alessia)
- Deploy recenti e stato
- Feature in lavorazione

✅ SELEZIONE ARGOMENTI NEWSLETTER
[L'utente seleziona 1-2 argomenti tra quelli proposti da Giulia e Marco]
```

### Come attivare il briefing

In una sessione Cowork o Claude Code, scrivi:

> "Prepara il briefing mattutino Beautyx"

Il coordinatore invoca ciascun agente per raccogliere gli aggiornamenti, compila il documento e lo presenta per la selezione degli argomenti newsletter.

---

## Flusso newsletter (1-2 per settimana)

**Cadenza consigliata:** martedì e venerdì (oppure solo martedì per iniziare).

```
1. BRIEFING (ore 8:00)
   Giulia + Marco → propongono argomenti
   Lorenzo → segnala richieste lettori
   Utente → seleziona 1-2 argomenti

2. PRODUZIONE (stesso giorno o giorno successivo)
   Argomento popolare → Federica riceve scheda Giulia → scrive newsletter
   Argomento innovativo → Federica riceve scheda Marco → scrive newsletter
   [Giulia e Marco possono lavorare in parallelo su argomenti diversi]

3. OTTIMIZZAZIONE
   Federica → passa bozza ad Alessia per revisione CTA e subject line

4. APPROVAZIONE
   Coordinatore → presenta bozza finale all'utente per approvazione

5. PUBBLICAZIONE
   Utente → pubblica su Beehiiv (la pubblicazione resta sempre all'utente)
```

---

## Flusso infrastruttura & economia

```
Simona rileva rischio scaling
       ↓
Matteo valuta costo/beneficio → scheda con raccomandazione
       ↓
Coordinatore presenta all'utente → decisione
       ↓
Davide implementa (se approvato)
       ↓
Elena verifica post-deploy

Riccardo: presidio continuo sicurezza/backup
       ↓ (report lunedì mattina nel briefing)
Matteo: valuta costo misure di sicurezza se onerose
```

---

## Supervisione continua (Elena)

Elena presidia il team su due fronti:

1. **Errori di flusso:** handoff mal agganciati, output nel formato sbagliato, passaggi saltati.
2. **Drift:** allontanamento dall'obiettivo, dal tono Beautyx o dalle istruzioni esplicite dell'utente.

Interviene ai punti chiave:
- Dopo ogni newsletter bozza di Federica (prima di passare ad Alessia)
- Dopo ogni deploy di Davide
- Su richiesta del coordinatore per qualsiasi output

Segnala sempre al coordinatore con: [cosa ha verificato] / [cosa funziona] / [anomalie] / [raccomandazione].

---

## Come avviare il team

Il team gira in Cowork (o Claude Code). Il coordinatore è l'agente principale della sessione — quello con cui parla l'utente. Gli specialisti sono in `.claude/agents/` e vengono invocati tramite lo strumento Task/Agent.

**Avvio tipico:**
- Per il briefing: *"Prepara il briefing mattutino Beautyx"*
- Per una newsletter: *"Scrivi la newsletter sull'argomento X"* (dopo averlo selezionato nel briefing)
- Per una nuova pagina app: *"Aggiungi la pagina /newsletter all'app"*
- Per un audit sicurezza: *"Riccardo, fai un assessment dello stato backup"*

Gli agenti possono essere invocati singolarmente o in parallelo (es. Giulia + Marco insieme durante il briefing).

---

## Collaudo del team

Prima di usare il team sul progetto reale, eseguire questo collaudo:

### Test singoli

| Agente | Micro-compito di test | Esito atteso |
|--------|----------------------|--------------|
| Giulia | "Trova 3 argomenti popolari per la newsletter di questa settimana" | Lista 3 argomenti con motivazione e priorità |
| Marco | "Trova 1 argomento innovativo internazionale sul wellness aziendale" | Scheda con titolo, sintesi, fonte, potenziale Italia |
| Lorenzo | "Categoria questo feedback: 'Vorrei un articolo su come gestire le recensioni negative su Google'" | Categorizzazione (popolare) + routing a Giulia |
| Federica | "Scrivi l'hook di apertura per una newsletter sulla fidelizzazione clienti" | Hook in tono Beautyx, max 3 righe |
| Alessia | "Revisionala CTA: 'Scopri come Beautyx può aiutarti'" | CTA migliorata + motivazione |
| Davide | "Crea una pagina /test-deploy con solo 'Hello Beautyx'" | File creato, push su GitHub, deploy confermato |
| Riccardo | "Fai una checklist rapida dello stato backup attuale" | Checklist con stato per ogni componente (DB, codice, env vars) |
| Simona | "Identifica il primo collo di bottiglia tecnico al raggiungimento di 500 utenti attivi" | Scheda problema + stima timing + soluzione |
| Matteo | "Produci la sintesi KPI per il briefing di oggi (usa dati ipotetioci se non disponibili)" | Report 5-8 righe con metriche e trend |
| Elena | "Supervisiona questa newsletter: [testo di test]" | Report supervisione con struttura definita |

### Test di coordinamento

Scenario ridotto end-to-end:
1. Avviare il briefing → Giulia e Marco propongono argomenti in parallelo
2. Selezionare 1 argomento popolare → Federica scrive → Alessia ottimizza CTA
3. Iniettare deliberatamente un tono sbagliato nella newsletter (troppo formale) → Elena deve segnalarlo
4. Verificare che Matteo produca la sintesi KPI nel formato corretto per il briefing

Esito atteso: handoff agganciati, Elena intercetta il drift di tono, Matteo produce la sintesi nel formato atteso.
