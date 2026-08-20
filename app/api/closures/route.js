import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyCentroOwnership, verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

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

    const { data, error } = await supabase
      .from('exceptional_closures')
      .select('*')
      .eq('centro_id', centroId)
      .order('data_inizio', { ascending: false })

    if (error) throw error

    return NextResponse.json({ closures: data || [] })
  } catch (error) {
    console.error('Errore GET closures:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { centro_id, data_inizio, data_fine, motivo, ricorrente, tipo_ricorrenza } = await request.json()

    if (!centro_id) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data, error } = await supabase
      .from('exceptional_closures')
      .insert({
        centro_id,
        data_inizio,
        data_fine,
        motivo,
        ricorrente: ricorrente || false,
        tipo_ricorrenza: ricorrente ? tipo_ricorrenza : null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, closure: data })
  } catch (error) {
    console.error('Errore POST closure:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'exceptional_closures', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { error } = await supabase
      .from('exceptional_closures')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE closure:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
