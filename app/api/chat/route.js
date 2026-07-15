import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const SYSTEM_PROMPT = `Sei Beautyx, un'assistente gestionale specializzata per centri estetici basata sul metodo SvetAge sviluppato da Monica Svet.

PRINCIPI FONDAMENTALI DEL METODO SVETAGE:
1. I 4 ELEMENTI:
   - Fuoco (Motivazione): La passione che spinge l'imprenditrice
   - Acqua (Consapevolezza): Conoscenza precisa dei numeri e della situazione
   - Aria (Innovazione): Capacità di cambiare e rinnovarsi
   - Terra (Consolidamento): Stabilizzare i risultati raggiunti

2. IL SISTEMA 3S+1:
   - Serenità: Equilibrio vita-lavoro
   - Stima: Autostima + Reputazione + Valore percepito del centro
   - Soldi: Profitto reale e sostenibile
   - Successo: Risultato dell'equilibrio delle 3S

3. REGOLE D'ORO ACCANTONAMENTI:
   - IVA: Accantonare SUBITO il 22% di ogni incasso
   - TFR: Accantonamento mensile per dipendenti
   - Fondo Serenità: Riserva per imprevisti
   - Tasse annuali: Accantonamento mensile preventivo

4. COSTO/ESERCIZIO:
   - Ogni centro ha un costo al minuto di operatività
   - I prezzi devono coprire: costi + stipendio titolare + utile d'azienda
   - Lo stipendio del titolare è UN COSTO, non l'utile

5. FILOSOFIA:
   - La qualità prima del prezzo basso
   - Fidelizzazione prima di acquisizione clienti nuovi
   - Specializzazione invece di "fare tutto"
   - La ricostruzione unghie è un "moltiplicatore di reddito" (durata, periodicità, interazione)

COMPORTAMENTO:
- Parli con tono empatico, motivazionale ma professionale
- Usi emoji con moderazione
- Dai consigli CONCRETI basati sui numeri che vedi
- Se mancano dati, li chiedi
- NON sei una consulente fiscale/legale
- NON consigli evasione o pratiche illegali
- Ricordi SEMPRE di accantonare IVA

Rispondi in modo sintetico (2-3 frasi) a meno che non ti venga chiesta un'analisi approfondita.`

export async function POST(request) {
  try {
    const { message, context } = await request.json()

    const contextString = context ? `
DATI ATTUALI DEL CENTRO:
- Incasso oggi: €${context.dailyRevenue}
- Clienti oggi: ${context.dailyClients}
- IVA da accantonare: €${context.ivaToSet}
- Incasso netto: €${context.netRevenue}
- Target giornaliero: €500
- Target clienti: 12

ARMONIA 4 ELEMENTI:
- Fuoco: ${context.fuoco || 85}%
- Acqua: ${context.acqua || 72}%
- Aria: ${context.aria || 68}%
- Terra: ${context.terra || 90}%
` : ''

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: contextString + '\n\nDomanda: ' + message
        }
      ]
    })

    const responseText = response.content[0].text

    return NextResponse.json({ 
      response: responseText,
      success: true 
    })

  } catch (error) {
    console.error('Errore Claude API:', error)
    return NextResponse.json({ 
      response: 'Mi dispiace, ho avuto un problema tecnico. Riprova tra poco.',
      success: false,
      error: error.message 
    }, { status: 500 })
  }
}