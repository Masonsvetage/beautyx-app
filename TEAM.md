# Team Beautyx

## Obiettivo condiviso

Costruire l'ecosistema Beautyx in tre fasi: (1) newsletter settimanale per attrarre titolari di centri estetici italiani e costruire community, (2) lancio del libro Beautyx come primo prodotto commerciale quando la community è solida (obiettivo: 500+ iscritti attivi), (3) SaaS/app come evoluzione naturale per chi è già cliente. Infrastruttura tecnica resiliente e piena visibilità economica su ogni attività.

---

## Struttura: 3 squadre + supervisione

### 🟡 Squadra Contenuti
| Agente | Ruolo | Input | Output |
|--------|-------|-------|--------|
| **Giulia** | Scout argomenti popolari | Coordinatore, Lorenzo | Coordinatore, Federica |
| **Marco** | Scout argomenti innovativi + rubrica globale | Coordinatore, Lorenzo | Coordinatore, Federica |
| **Lorenzo** | Community & feedback lettori | Coordinatore, utente | Giulia, Marco, Coordinatore |
| **Federica** | Writer (voce Beautyx) | Coordinatore, Giulia o Marco | Elena → Coordinatore |

> Giulia + Marco + Lorenzo girano **in parallelo** durante il briefing.
> Federica scrive solo dopo che l'utente ha selezionato l'argomento.
> Elena rivede sempre l'output di Federica **prima** che arrivi al Coordinatore o ad Alessia.

---

### 🟢 Squadra Crescita & Dati
| Agente | Ruolo | Input | Output |
|--------|-------|-------|--------|
| **Matteo** | Economia, KPI, analytics del progetto | Simona, Riccardo, dati Beehiiv/Supabase/Vercel | Coordinatore, Alessia |
| **Alessia** | Growth & conversione (campagne, funnel) | Federica (CTA), Matteo (dati), Coordinatore | Davide, Coordinatore |

> Matteo alimenta Alessia con i dati sugli argomenti e le CTA che convertono meglio.
> Matteo fa *management accounting* (KPI, costi/ricavi del progetto). **Non** fa contabilità fiscale.

---

### 🔵 Squadra Tecnica
| Agente | Ruolo | Input | Output |
|--------|-------|-------|--------|
| **Riccardo** | Sicurezza & disaster recovery | Coordinatore, Simona | Coordinatore, Davide, Matteo |
| **Simona** | Scalabilità tecnica | Matteo (KPI), Coordinatore | Matteo, Riccardo, Coordinatore |
| **Davide** | Developer Next.js / deploy | Alessia (specifiche), upgrade approvati | Coordinatore, Elena |

> Riccardo + Simona auditano **in parallelo** → Davide implementa solo ciò che il Coordinatore approva.
> Elena verifica ogni deploy di Davide prima di segnalare all'utente.

---

### ⭐ Supervisione trasversale
| Agente | Ruolo |
|--------|-------|
| **Elena** | Presidia flussi, qualità e voce Beautyx su tutte e tre le squadre. Sola lettura. |

Elena interviene:
- Dopo ogni bozza di Federica (prima di passare a Coordinatore/Alessia)
- Dopo ogni deploy di Davide
- Su richiesta del Coordinatore per qualsiasi output

Segnala sempre in forma: **[cosa ha verificato] / [cosa funziona] / [anomalie] / [raccomandazione]**

---

## Briefing mattutino

Attivazione: *"Prepara il briefing mattutino Beautyx"*

Il Coordinatore lancia in parallelo:
- **Giulia** → 3-5 argomenti popolari con priorità
- **Marco** → 2-3 argomenti innovativi con scheda
- **Lorenzo** → sintesi feedback lettori + proposte
- **Matteo** → KPI delle ultime 24h e alert
- **Riccardo + Simona** → stato infrastruttura (se lunedì o su richiesta)

Poi compila il documento briefing e lo presenta per la selezione degli argomenti newsletter.

---

## Flusso newsletter

```
1. BRIEFING
   Giulia + Marco + Lorenzo → IN PARALLELO → propongono argomenti
   Utente → seleziona 1-2 argomenti

2. PRODUZIONE
   Federica → scrive (riceve scheda Giulia o Marco)

3. REVISIONE
   Elena → revisiona voce e qualità
   Alessia → ottimizza CTA e subject line

4. APPROVAZIONE
   Coordinatore → presenta bozza all'utente

5. PUBBLICAZIONE
   Utente → pubblica su Beehiiv (sempre)
```

---

## Flusso infrastruttura

```
Riccardo + Simona → IN PARALLELO → auditano (sicurezza + scalabilità)
       ↓
Matteo valuta costo/beneficio → raccomandazione
       ↓
Coordinatore presenta all'utente → decisione
       ↓
Davide implementa (se approvato)
       ↓
Elena verifica post-deploy
```

---

## Collaudo

### Test singoli

| Agente | Micro-compito | Esito atteso |
|--------|---------------|--------------|
| Giulia | "Trova 3 argomenti popolari per questa settimana" | Lista con motivazione e priorità |
| Marco | "Trova 1 argomento innovativo internazionale sul wellness" | Scheda: titolo, sintesi, fonte, potenziale Italia |
| Lorenzo | "Categorizza: 'Vorrei un articolo sulle recensioni negative Google'" | Categorizzazione + routing a Giulia |
| Federica | "Scrivi l'hook di apertura per una newsletter sulla fidelizzazione" | Hook tono Beautyx, max 3 righe |
| Alessia | "Revisiona questa CTA: 'Scopri come Beautyx può aiutarti'" | CTA migliorata + motivazione |
| Davide | "Crea una pagina /test con solo 'Hello Beautyx'" | File creato, push, deploy confermato |
| Riccardo | "Checklist rapida stato backup attuale" | Checklist per componente (DB, codice, env vars) |
| Simona | "Primo collo di bottiglia tecnico a 500 utenti attivi" | Scheda problema + stima timing + soluzione |
| Matteo | "Sintesi KPI per il briefing di oggi (dati ipotetici se non disponibili)" | Report 5-8 righe con metriche e trend |
| Elena | "Supervisiona questa newsletter: [testo di test]" | Report con struttura: verificato / funziona / anomalie / raccomandazione |

### Test di coordinamento

Scenario end-to-end ridotto:
1. Briefing → Giulia e Marco **in parallelo** → propongono argomenti
2. Selezionare 1 argomento → Federica scrive → Elena revisiona → Alessia ottimizza CTA
3. Iniettare tono sbagliato nella newsletter → Elena deve segnalarlo
4. Verificare che Matteo produca la sintesi KPI nel formato corretto

Esito atteso: handoff agganciati, Elena intercetta il drift di tono, parallelismo funziona.

---

## Come avviare il team

Il team gira in Cowork o Claude Code. Il Coordinatore è l'agente principale della sessione.

- Briefing: *"Prepara il briefing mattutino Beautyx"*
- Newsletter: *"Scrivi la newsletter sull'argomento X"*
- Sviluppo: *"Aggiungi la funzionalità Y all'app"*
- Audit sicurezza: *"Riccardo, assessment dello stato backup"*
- KPI: *"Matteo, come stiamo questa settimana?"*

Gli specialisti sono in `.claude/agents/` e vengono invocati tramite lo strumento Task/Agent — singolarmente o in parallelo.
