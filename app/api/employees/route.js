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
    const attivo = searchParams.get('attivo')

    if (!centroId) {
      return NextResponse.json({ error: 'centro_id richiesto' }, { status: 400 })
    }

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    let query = supabase
      .from('employees')
      .select('*')
      .eq('centro_id', centroId)
      .order('cognome', { ascending: true })
      .order('nome', { ascending: true })

    if (attivo !== null && attivo !== undefined) {
      query = query.eq('attivo', attivo === 'true')
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ employees: data || [] })
  } catch (error) {
    console.error('Errore GET employees:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const {
      centro_id,
      nome,
      cognome,
      ore_contrattuali_settimanali,
      data_assunzione,
      ruolo,
      email,
      telefono,
      note
    } = await request.json()

    if (!centro_id || !nome || !cognome) {
      return NextResponse.json(
        { error: 'centro_id, nome e cognome richiesti' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data, error } = await supabase
      .from('employees')
      .insert({
        centro_id,
        nome,
        cognome,
        ore_contrattuali_settimanali: parseFloat(ore_contrattuali_settimanali || 40),
        data_assunzione,
        ruolo,
        email,
        telefono,
        note,
        attivo: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, employee: data })
  } catch (error) {
    console.error('Errore POST employee:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const {
      id,
      nome,
      cognome,
      ore_contrattuali_settimanali,
      data_assunzione,
      data_cessazione,
      ruolo,
      email,
      telefono,
      note,
      attivo
    } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'employees', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const updateData = {}
    if (nome !== undefined) updateData.nome = nome
    if (cognome !== undefined) updateData.cognome = cognome
    if (ore_contrattuali_settimanali !== undefined) {
      updateData.ore_contrattuali_settimanali = parseFloat(ore_contrattuali_settimanali)
    }
    if (data_assunzione !== undefined) updateData.data_assunzione = data_assunzione
    if (data_cessazione !== undefined) updateData.data_cessazione = data_cessazione
    if (ruolo !== undefined) updateData.ruolo = ruolo
    if (email !== undefined) updateData.email = email
    if (telefono !== undefined) updateData.telefono = telefono
    if (note !== undefined) updateData.note = note
    if (attivo !== undefined) updateData.attivo = attivo

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, employee: data })
  } catch (error) {
    console.error('Errore PATCH employee:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'employees', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // Soft delete
    const { error } = await supabase
      .from('employees')
      .update({ attivo: false, data_cessazione: new Date().toISOString().split('T')[0] })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE employee:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
