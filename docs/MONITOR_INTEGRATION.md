# 📊 Integrazione Monitor Panel con Beautyx AI

## Obiettivo
Separare i **dati numerici/strutturati** dalla **risposta testuale** di Beautyx per renderli visualizzabili nel Monitor Panel laterale in modalità full-screen.

## Problema Attuale
Beautyx restituisce tutto nella risposta testuale:
```
> BEAUTYX: ## **Costo Totale Centro Estetico 2025**
**💰 Costi Totali Effettivi:**
- **Uscite registrate**: 286.218,46€
- **Meno giroconti compensati dai POS**: -112.548,28€
...
```

**Risultato**: Risposta difficile da leggere, troppi dati mescolati con il testo.

## Soluzione: Monitor Panel
**Risposta separata in due parti:**
1. **Testo** → Nella chat (commenti, spiegazioni)
2. **Dati strutturati** → Nel monitor (tabelle, breakdown, grafici)

---

## 🔧 Modifica API `/api/beautyx/chat`

### File: `app/api/beautyx/chat/route.js`

**PRIMA:**
```javascript
export async function POST(request) {
  const { message, context } = await request.json()

  // Genera risposta con AI
  const aiResponse = await generateBeautyxResponse(message, context)

  return NextResponse.json({
    response: aiResponse,  // Solo testo
    metadata: {}
  })
}
```

**DOPO:**
```javascript
export async function POST(request) {
  const { message, context } = await request.json()

  // Genera risposta con AI
  const aiResponse = await generateBeautyxResponse(message, context)

  // NUOVO: Estrai dati strutturati dalla risposta
  const monitorData = extractStructuredData(aiResponse, context)

  return NextResponse.json({
    response: cleanTextResponse(aiResponse),  // Testo pulito senza dati
    monitor: monitorData,  // Dati strutturati per il monitor
    metadata: {}
  })
}
```

---

## 📋 Formato Monitor Data

### Struttura Base
```javascript
{
  title: "Titolo Monitor",  // Es: "Analisi Costi 2025"
  cards: [
    {
      type: "breakdown",  // O "metrics", "chart", "draft"
      title: "Titolo Card",
      // ... dati specifici per tipo
    }
  ]
}
```

### Tipi di Card Disponibili

#### 1. **Breakdown Card** - Scomposizione Totali
```javascript
{
  type: "breakdown",
  title: "Costi Totali 2025",
  total: {
    label: "Totale Uscite",
    value: 286218.46
  },
  items: [
    { icon: "👥", label: "Dipendenti", value: 56204, percentage: 32 },
    { icon: "🏛️", label: "Tributi", value: 44741, percentage: 26 },
    { icon: "💼", label: "Finanziamenti", value: 14631, percentage: 8 },
    { icon: "📦", label: "Fornitori", value: 13837, percentage: 8 },
    { icon: "🏠", label: "Affitto", value: 13263, percentage: 8 }
  ]
}
```

#### 2. **Metrics Card** - KPI Rapidi
```javascript
{
  type: "metrics",
  title: "KPI Principali",
  metrics: [
    { label: "Costo/Giorno", value: "714€", trend: "neutral" },
    { label: "Costo/Mese", value: "21.709€", trend: "up" },
    { label: "Giorni Operativi", value: "243", trend: "neutral" },
    { label: "Margine", value: "58%", trend: "up", subtitle: "Profitto netto" }
  ]
}
```

#### 3. **Chart Card** - Grafici a Barre
```javascript
{
  type: "chart",
  title: "Trend Mensile Costi",
  chartType: "bar",
  dataPoints: [
    { label: "Gen", value: 18500 },
    { label: "Feb", value: 19200 },
    { label: "Mar", value: 21300 },
    { label: "Apr", value: 20800 },
    { label: "Mag", value: 22100 },
    { label: "Giu", value: 23500 }
  ]
}
```

#### 4. **Draft Card** - Bozze/Proposte
```javascript
{
  type: "draft",
  title: "Piano Ottimizzazione Costi",
  status: "draft",  // "draft", "review", "ready"
  content: `Proposta di riduzione costi:

1. Rinegoziare contratto fornitori (-8%)
2. Ottimizzare turni dipendenti (-5%)
3. Revisione abbonamenti software (-3%)

Risparmio stimato: 2.500€/mese`
}
```

---

## 🤖 Prompt Engineering per Beautyx

### Sistema Prompt da Aggiungere
```
Quando fornisci analisi con dati numerici:
1. Separa la tua risposta in DUE parti
2. TESTO: Commenta i dati in modo discorsivo (max 3-4 frasi)
3. DATI: Struttura i numeri in formato JSON per il monitor

Esempio:
TESTO: "I tuoi costi del 2025 sono ben controllati. Il margine di profitto del 58% è eccellente per il settore. I dipendenti rappresentano la voce principale come da aspettarsi."

DATI (JSON):
{
  "title": "Costi 2025",
  "cards": [
    {
      "type": "breakdown",
      "title": "Scomposizione Costi",
      "total": { "label": "Totale", "value": 173670.18 },
      "items": [...]
    }
  ]
}
```

---

## 🎯 Esempi di Casi d'Uso

### Caso 1: Domanda sui Costi
**User**: "Quanto è stato il costo del mio negozio nel 2025?"

**Response (testo pulito)**:
```
I tuoi costi operativi del 2025 sono stati di 173.670€ su 243 giorni lavorativi.
Questo significa circa 714€ al giorno. I dipendenti rappresentano la voce principale (32%), seguiti dai tributi (26%). Il tuo margine di profitto è eccellente al 58%.
```

**Monitor (dati strutturati)**:
```javascript
{
  title: "Analisi Costi 2025",
  cards: [
    {
      type: "breakdown",
      title: "Scomposizione Costi Reali",
      total: { label: "Costo Esercizio", value: 173670.18 },
      items: [
        { icon: "👥", label: "Dipendenti", value: 56204, percentage: 32 },
        { icon: "🏛️", label: "Tributi Correnti", value: 44741, percentage: 26 },
        { icon: "💼", label: "Finanziamenti", value: 14631, percentage: 8 },
        { icon: "📦", label: "Fornitori", value: 13837, percentage: 8 },
        { icon: "🏠", label: "Affitto", value: 13263, percentage: 8 }
      ]
    },
    {
      type: "metrics",
      title: "KPI Operativi",
      metrics: [
        { label: "Giorni Operativi", value: "243" },
        { label: "Costo/Giorno", value: "714€" },
        { label: "Costo/Mese", value: "21.709€" },
        { label: "Margine Profitto", value: "58%", trend: "up" }
      ]
    }
  ]
}
```

### Caso 2: Confronto Periodi
**User**: "Confronta i costi di gennaio e febbraio 2025"

**Response**: "Febbraio ha registrato costi leggermente superiori (+3.7%) rispetto a gennaio. L'aumento è dovuto principalmente ai tributi stagionali."

**Monitor**:
```javascript
{
  title: "Confronto Gen-Feb 2025",
  cards: [
    {
      type: "chart",
      title: "Andamento Costi",
      chartType: "bar",
      dataPoints: [
        { label: "Gennaio", value: 18500 },
        { label: "Febbraio", value: 19200 }
      ]
    },
    {
      type: "breakdown",
      title: "Delta Variazioni",
      items: [
        { icon: "🏛️", label: "Tributi", value: 850, percentage: 75 },
        { icon: "👥", label: "Dipendenti", value: 200, percentage: 17 },
        { icon: "📦", label: "Fornitori", value: -150, percentage: -13 }
      ]
    }
  ]
}
```

---

## 🛠️ Implementazione Rapida (3 Passi)

### Step 1: Funzione Extract Data
```javascript
// lib/beautyx/monitorExtractor.js
export function extractMonitorData(aiResponse, queryContext) {
  // Parsing intelligente della risposta AI
  // Cerca pattern di numeri, percentuali, breakdown

  const hasFinancialData = /\d+[.,]\d+€/.test(aiResponse)

  if (hasFinancialData && queryContext.tipo === 'costi') {
    return {
      title: "Analisi Costi",
      cards: [
        extractBreakdown(aiResponse),
        extractMetrics(aiResponse)
      ]
    }
  }

  return null  // Nessun dato strutturato
}
```

### Step 2: Funzione Clean Text
```javascript
// lib/beautyx/textCleaner.js
export function cleanTextResponse(aiResponse) {
  // Rimuovi tabelle, breakdown numerici, liste di dati
  // Mantieni solo il testo discorsivo

  return aiResponse
    .replace(/\*\*.*?:\*\*\s*[\d.,]+€/g, '')  // Rimuovi breakdown
    .replace(/^[-*]\s+.*/gm, '')  // Rimuovi liste
    .replace(/\n{3,}/g, '\n\n')  // Pulisci spazi
    .trim()
}
```

### Step 3: Aggiorna Route Handler
```javascript
// app/api/beautyx/chat/route.js
import { extractMonitorData } from '@/lib/beautyx/monitorExtractor'
import { cleanTextResponse } from '@/lib/beautyx/textCleaner'

export async function POST(request) {
  const { message, context } = await request.json()

  const aiResponse = await generateBeautyxResponse(message, context)

  const monitorData = extractMonitorData(aiResponse, context)
  const cleanText = monitorData
    ? cleanTextResponse(aiResponse)
    : aiResponse

  return NextResponse.json({
    response: cleanText,
    monitor: monitorData,
    metadata: {}
  })
}
```

---

## ✅ Checklist Implementazione

- [ ] Creare `lib/beautyx/monitorExtractor.js`
- [ ] Creare `lib/beautyx/textCleaner.js`
- [ ] Modificare `app/api/beautyx/chat/route.js`
- [ ] Aggiornare prompt sistema AI per generare risposte separate
- [ ] Testare con domande finanziarie (costi, ricavi, confronti)
- [ ] Testare con domande non-numeriche (devono restare come prima)

---

## 🎨 UI Behaviour

**Frontend già implementato:**
- ✅ Monitor Panel visibile solo in full-screen
- ✅ Schermo vuoto tipo terminale quando `monitorData === null`
- ✅ Rendering automatico delle card in base al tipo
- ✅ Bottone "Demo" per testare (da rimuovere in produzione)

**Come funziona:**
1. User invia messaggio
2. API restituisce `{ response, monitor }`
3. Frontend mostra `response` nella chat
4. Frontend popola monitor con `monitor` (se presente)
5. Monitor rimane visibile fino a nuovo messaggio

---

## 🚀 Risultato Finale

**PRIMA:**
```
> USER: Quanto è costato il negozio nel 2025?
> BEAUTYX: ## **Costo Totale 2025**
💰 Costi Totali: 173.670€
- Dipendenti: 56.204€ (32%)
- Tributi: 44.741€ (26%)
...
[40 righe di dati]
```

**DOPO:**
```
┌─────────────────────┬───────────────────┐
│ > USER: Quanto è    │                   │
│ costato il negozio  │ 📊 MONITOR DATI   │
│ nel 2025?           │ ───────────────── │
│                     │ Analisi Costi 2025│
│ > BEAUTYX: I tuoi   │                   │
│ costi operativi del │ Costo Esercizio   │
│ 2025 sono stati di  │ 173.670€          │
│ 173.670€ su 243     │                   │
│ giorni. Il margine  │ 👥 Dipendenti     │
│ di profitto del 58% │    56.204€ (32%) │
│ è eccellente!       │ 🏛️ Tributi       │
│                     │    44.741€ (26%) │
│                     │ ...              │
└─────────────────────┴───────────────────┘
```

**Vantaggi:**
- ✅ Risposta testuale concisa e leggibile
- ✅ Dati numerici organizzati e consultabili
- ✅ Separazione chiara tra commento e dati
- ✅ UX professionale tipo dashboard

---

**Note**: Questa è una soluzione temporanea lato client. La soluzione definitiva richiede modifica del backend API come descritto sopra.
