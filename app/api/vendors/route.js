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
      .from('vendors')
      .select('*')
      .eq('centro_id', centroId)
      .order('nome', { ascending: true })

    if (error) throw error

    return NextResponse.json({ vendors: data || [] })
  } catch (error) {
    console.error('Errore GET vendors:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const payload = await request.json()

    if (!payload?.centro_id) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, payload.centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data, error } = await supabase
      .from('vendors')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, vendor: data })
  } catch (error) {
    console.error('Errore POST vendor:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, nome, pattern_match, categoria, note } = await request.json()

    const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'vendors', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const updateData = {
      nome,
      pattern_match,
      categoria,
      note,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, vendor: data })
  } catch (error) {
    console.error('Errore PATCH vendor:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'vendors', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE vendor:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
