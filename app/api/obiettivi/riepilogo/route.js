import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * GET /api/obiettivi/riepilogo?centro_id=xxx&data=2025-01-16
 * Recupera riepilogo giornaliero con obiettivi attivi e relativi progressi
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const data = searchParams.get('data') || new Date().toISOString().split('T')[0]

    if (!centroId) {
      return NextResponse.json(
        { error: 'centro_id richiesto' },
        { status: 400 }
      )
    }

    // Recupera tutti gli obiettivi attivi del centro
    const { data: obiettivi, error: obError } = await supabase
      .from('obiettivi')
      .select('*')
      .eq('centro_id', centroId)
      .eq('attivo', true)
      .or(`data_fine.is.null,data_fine.gte.${data}`)
      .lte('data_inizio', data)
      .order('priorita', { ascending: true })
      .order('created_at', { ascending: false })

    if (obError) throw obError

    // Recupera i progressi per la data specificata
    const { data: progressi, error: prError } = await supabase
      .from('progressi_obiettivi')
      .select('*')
      .eq('centro_id', centroId)
      .eq('data', data)

    if (prError) throw prError

    // Combina obiettivi con progressi
    const riepilogo = (obiettivi || []).map(ob => {
      const progresso = (progressi || []).find(p => p.obiettivo_id === ob.id)
      return {
        ...ob,
        progresso: progresso || null,
        valore_oggi: progresso?.valore_registrato ?? null,
        percentuale: progresso?.percentuale_raggiungimento ?? 0,
        raggiunto: progresso?.obiettivo_raggiunto ?? false
      }
    })

    // Calcola statistiche generali
    const stats = {
      totale_obiettivi: riepilogo.length,
      compilati: riepilogo.filter(r => r.valore_oggi !== null).length,
      raggiunti: riepilogo.filter(r => r.raggiunto).length,
      percentuale_media: riepilogo.length > 0
        ? Math.round(riepilogo.reduce((sum, r) => sum + (r.percentuale || 0), 0) / riepilogo.length)
        : 0
    }

    return NextResponse.json({
      data,
      obiettivi: riepilogo,
      stats
    })
  } catch (error) {
    console.error('Errore GET riepilogo obiettivi:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
