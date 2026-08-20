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
      .from('accantonamenti')
      .select('*')
      .eq('centro_id', centroId)
      .order('created_at', { ascending: false })

    if (attivo !== null && attivo !== undefined) {
      query = query.eq('attivo', attivo === 'true')
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ accantonamenti: data || [] })
  } catch (error) {
    console.error('Errore GET accantonamenti:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const {
      centro_id,
      nome,
      descrizione,
      importo_obiettivo,
      contributo_mensile,
      tipo_versamento,
      percentuale_incasso,
      colore,
      icona,
      categoria_collegata
    } = await request.json()

    if (!centro_id || !nome) {
      return NextResponse.json(
        { error: 'centro_id e nome richiesti' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data, error } = await supabase
      .from('accantonamenti')
      .insert({
        centro_id,
        nome,
        descrizione,
        importo_obiettivo: parseFloat(importo_obiettivo || 0),
        saldo_attuale: 0, // Sempre 0 alla creazione
        contributo_mensile: parseFloat(contributo_mensile || 0),
        tipo_versamento: tipo_versamento || 'manuale',
        percentuale_incasso: parseFloat(percentuale_incasso || 0),
        colore: colore || '#8b5cf6',
        icona: icona || '💰',
        categoria_collegata,
        attivo: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, accantonamento: data })
  } catch (error) {
    console.error('Errore POST accantonamento:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const {
      id,
      nome,
      descrizione,
      importo_obiettivo,
      contributo_mensile,
      tipo_versamento,
      percentuale_incasso,
      colore,
      icona,
      categoria_collegata,
      attivo
    } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id richiesto' }, { status: 400 })
    }

    const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'accantonamenti', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const updateData = {}
    if (nome !== undefined) updateData.nome = nome
    if (descrizione !== undefined) updateData.descrizione = descrizione
    if (importo_obiettivo !== undefined) updateData.importo_obiettivo = parseFloat(importo_obiettivo)
    if (contributo_mensile !== undefined) updateData.contributo_mensile = parseFloat(contributo_mensile)
    if (tipo_versamento !== undefined) updateData.tipo_versamento = tipo_versamento
    if (percentuale_incasso !== undefined) updateData.percentuale_incasso = parseFloat(percentuale_incasso)
    if (colore !== undefined) updateData.colore = colore
    if (icona !== undefined) updateData.icona = icona
    if (categoria_collegata !== undefined) updateData.categoria_collegata = categoria_collegata
    if (attivo !== undefined) updateData.attivo = attivo

    const { data, error } = await supabase
      .from('accantonamenti')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, accantonamento: data })
  } catch (error) {
    console.error('Errore PATCH accantonamento:', error)
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

    const ownership = await verifyRowCentroOwnership(request, supabase, { table: 'accantonamenti', id })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // Verifica che il saldo sia 0 prima di eliminare
    const { data: accantonamento } = await supabase
      .from('accantonamenti')
      .select('saldo_attuale')
      .eq('id', id)
      .single()

    if (accantonamento && parseFloat(accantonamento.saldo_attuale) !== 0) {
      return NextResponse.json(
        { error: 'Non puoi eliminare un accantonamento con saldo diverso da 0' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('accantonamenti')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE accantonamento:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
