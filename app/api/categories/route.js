import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')
    const tipo = searchParams.get('tipo') // opzionale: entrata, uscita, entrambi

    let query = supabase
      .from('custom_categories')
      .select('*')
      .eq('centro_id', centroId)
      .order('ordinamento', { ascending: true })

    if (tipo && tipo !== 'entrambi') {
      query = query.or(`tipo.eq.${tipo},tipo.eq.entrambi`)
    }

    const { data, error } = await query

    if (error) throw error

    // Mapping icone di default per categorie (se il campo icona non esiste nel DB)
    const iconMap = {
      'Dipendenti': '👥',
      'Professionisti': '💼',
      'Fornitori': '🏪',
      'Prodotti/Servizi': '📦',
      'Marketing': '📢',
      'Affitto': '🏠',
      'Utenze': '💡',
      'Assicurazioni': '🛡️',
      'Tasse': '🏛️',
      'Manutenzione': '🔧',
      'USCITE VARIE': '📋',
      'Tributi Correnti': '🏛️',
      'Imposte': '💰',
      'Commissioni Bancarie': '🏦'
    }

    // Aggiungi campo icona se non presente
    const categoriesWithIcons = (data || []).map(cat => ({
      ...cat,
      icona: cat.icona || iconMap[cat.nome] || '📁'
    }))

    return NextResponse.json({ categories: categoriesWithIcons })
  } catch (error) {
    console.error('Errore GET categories:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { centro_id, nome, tipo, colore, icona } = await request.json()

    // Ottieni l'ordinamento più alto e aggiungi 1
    const { data: maxOrder } = await supabase
      .from('custom_categories')
      .select('ordinamento')
      .eq('centro_id', centro_id)
      .order('ordinamento', { ascending: false })
      .limit(1)
      .single()

    const ordinamento = maxOrder ? maxOrder.ordinamento + 1 : 100

    const insertData = {
      centro_id,
      nome,
      tipo: tipo || 'entrambi',
      colore: colore || '#10B981',
      ordinamento,
      is_default: false
    }

    // Aggiungi icona solo se il campo esiste nella tabella
    if (icona) {
      insertData.icona = icona
    }

    const { data, error } = await supabase
      .from('custom_categories')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error

    // Aggiungi icona di default se non presente nella risposta
    const categoryWithIcon = {
      ...data,
      icona: data.icona || icona || '📁'
    }

    return NextResponse.json({ success: true, category: categoryWithIcon })
  } catch (error) {
    console.error('Errore POST category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { id, nome, tipo, colore, icona } = await request.json()

    const updateData = { nome, tipo, colore }

    // Aggiungi icona solo se fornita
    if (icona !== undefined) {
      updateData.icona = icona
    }

    const { data, error } = await supabase
      .from('custom_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Aggiungi icona di default se non presente nella risposta
    const categoryWithIcon = {
      ...data,
      icona: data.icona || '📁'
    }

    return NextResponse.json({ success: true, category: categoryWithIcon })
  } catch (error) {
    console.error('Errore PATCH category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    // Verifica che non sia una categoria di default
    const { data: category } = await supabase
      .from('custom_categories')
      .select('is_default')
      .eq('id', id)
      .single()

    if (category?.is_default) {
      return NextResponse.json(
        { error: 'Non puoi eliminare una categoria di sistema' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('custom_categories')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Errore DELETE category:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
