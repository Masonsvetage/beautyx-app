import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')

    if (!centroId) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // Carica tutti i movimenti bancari
    const { data: movements, error: movError } = await supabase
      .from('bank_movements')
      .select('tipo, importo')
      .eq('centro_id', centroId)

    if (movError) throw movError

    // Calcola saldo totale banca
    const totalBank = (movements || []).reduce((sum, m) => {
      const importo = parseFloat(m.importo || 0)
      return sum + (m.tipo === 'entrata' ? importo : -importo)
    }, 0)

    // Carica accantonamenti attivi
    const { data: accantonamenti, error: accError } = await supabase
      .from('accantonamenti')
      .select('saldo_attuale')
      .eq('centro_id', centroId)
      .eq('attivo', true)

    if (accError) throw accError

    // Calcola totale accantonato
    const totalReserved = (accantonamenti || []).reduce(
      (sum, a) => sum + parseFloat(a.saldo_attuale || 0),
      0
    )

    // Liquidità disponibile
    const available = totalBank - totalReserved

    return NextResponse.json({
      totalBank: parseFloat(totalBank.toFixed(2)),
      totalReserved: parseFloat(totalReserved.toFixed(2)),
      available: parseFloat(available.toFixed(2)),
      isNegative: available < 0
    })
  } catch (error) {
    console.error('Errore GET liquidity:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
