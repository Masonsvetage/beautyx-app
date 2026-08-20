import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

/**
 * POST /api/obiettivi/suggeriti
 * Genera obiettivi suggeriti standard per un centro
 * Da chiamare durante o dopo una consulenza con Beautyx
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { centro_id } = body

    if (!centro_id) {
      return NextResponse.json(
        { error: 'centro_id richiesto' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // Obiettivi standard suggeriti - da personalizzare durante la consulenza
    const suggerimentiStandard = [
      {
        centro_id,
        nome: 'Incasso giornaliero',
        descrizione: 'Superare il punto di pareggio e generare margine',
        icona: '💰',
        tipo: 'economico',
        unita_misura: 'euro',
        valore_riferimento: 714,
        valore_obiettivo: 900,
        direzione: 'maggiore',
        frequenza: 'giornaliero',
        stato: 'suggerito',
        creato_da: 'beautyx',
        analisi_situazione: 'Obiettivo base per garantire la copertura dei costi e generare margine.',
        esigenze_identificate: 'Raggiungere e superare il break-even giornaliero',
        motivazione: 'Un incasso costante sopra il punto di pareggio assicura sostenibilità'
      },
      {
        centro_id,
        nome: 'Clienti giornalieri',
        descrizione: 'Aumentare il numero di clienti serviti rispetto alla media storica',
        icona: '👥',
        tipo: 'clienti',
        unita_misura: 'numero',
        valore_riferimento: 6,
        valore_obiettivo: 8,
        direzione: 'maggiore',
        frequenza: 'giornaliero',
        stato: 'suggerito',
        creato_da: 'beautyx',
        analisi_situazione: 'Aumentare la base clienti è fondamentale per la crescita.',
        esigenze_identificate: 'Necessità di aumentare il flusso di clienti',
        motivazione: 'Più clienti significa più ricavi e maggiore visibilità'
      },
      {
        centro_id,
        nome: 'Scontrino medio',
        descrizione: 'Aumentare il valore medio per cliente',
        icona: '🧾',
        tipo: 'economico',
        unita_misura: 'euro',
        valore_riferimento: 65,
        valore_obiettivo: 80,
        direzione: 'maggiore',
        frequenza: 'giornaliero',
        stato: 'suggerito',
        creato_da: 'beautyx',
        analisi_situazione: 'Aumentare lo scontrino medio permette di crescere senza aumentare i clienti.',
        esigenze_identificate: 'Ottimizzare il valore di ogni visita',
        motivazione: 'Lo scontrino medio alto indica servizi premium e clienti soddisfatti'
      },
      {
        centro_id,
        nome: 'Vendita prodotti',
        descrizione: 'Incrementare la vendita di prodotti per aumentare lo scontrino medio',
        icona: '🛍️',
        tipo: 'prodotti',
        unita_misura: 'numero',
        valore_riferimento: 2,
        valore_obiettivo: 4,
        direzione: 'maggiore',
        frequenza: 'giornaliero',
        stato: 'suggerito',
        creato_da: 'beautyx',
        analisi_situazione: 'I prodotti hanno margini elevati e fidelizzano il cliente.',
        esigenze_identificate: 'Aumentare i ricavi da vendita prodotti',
        motivazione: 'La vendita prodotti aumenta il margine senza aumentare il tempo lavoro'
      },
      {
        centro_id,
        nome: 'Tempo medio servizio',
        descrizione: 'Ottimizzare i tempi di servizio mantenendo la qualità',
        icona: '⏱️',
        tipo: 'efficienza',
        unita_misura: 'minuti',
        valore_riferimento: 45,
        valore_obiettivo: 40,
        direzione: 'minore',
        frequenza: 'giornaliero',
        stato: 'suggerito',
        creato_da: 'beautyx',
        analisi_situazione: 'Ridurre i tempi morti aumenta la capacità produttiva.',
        esigenze_identificate: 'Ottimizzare i processi di lavoro',
        motivazione: 'Efficienza maggiore permette di servire più clienti'
      },
      {
        centro_id,
        nome: 'Recensioni positive',
        descrizione: 'Raccogliere feedback positivi dai clienti',
        icona: '⭐',
        tipo: 'qualita',
        unita_misura: 'numero',
        valore_riferimento: 1,
        valore_obiettivo: 2,
        direzione: 'maggiore',
        frequenza: 'giornaliero',
        stato: 'suggerito',
        creato_da: 'beautyx',
        analisi_situazione: 'Le recensioni positive attraggono nuovi clienti.',
        esigenze_identificate: 'Migliorare la reputazione online',
        motivazione: 'Le recensioni sono il miglior marketing a costo zero'
      },
      {
        centro_id,
        nome: 'Riduzione costi operativi',
        descrizione: 'Ottimizzare le spese mantenendo la qualità del servizio',
        icona: '📉',
        tipo: 'economico',
        unita_misura: 'percentuale',
        valore_riferimento: 100,
        valore_obiettivo: 95,
        direzione: 'minore',
        frequenza: 'mensile',
        stato: 'suggerito',
        creato_da: 'beautyx',
        analisi_situazione: 'Ridurre i costi del 5% migliora significativamente il margine.',
        esigenze_identificate: 'Ottimizzare la struttura dei costi',
        motivazione: 'Ogni euro risparmiato è un euro di margine in più'
      }
    ]

    // Verifica quali obiettivi non esistono già
    const { data: esistenti } = await supabase
      .from('obiettivi')
      .select('nome')
      .eq('centro_id', centro_id)
      .in('stato', ['suggerito', 'attivo', 'in_valutazione'])

    const nomiEsistenti = esistenti?.map(o => o.nome) || []
    const nuoviSuggerimenti = suggerimentiStandard.filter(s => !nomiEsistenti.includes(s.nome))

    // Inserisci solo i nuovi suggerimenti
    if (nuoviSuggerimenti.length > 0) {
      const { data: inseriti, error: insertError } = await supabase
        .from('obiettivi')
        .insert(nuoviSuggerimenti)
        .select()

      if (insertError) throw insertError

      return NextResponse.json({
        success: true,
        obiettivi_creati: inseriti?.length || 0,
        obiettivi: inseriti
      })
    }

    return NextResponse.json({
      success: true,
      obiettivi_creati: 0,
      message: 'Tutti gli obiettivi standard sono già presenti'
    })

  } catch (error) {
    console.error('Errore generazione suggeriti:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
