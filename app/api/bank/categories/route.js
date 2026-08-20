import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * GET /api/bank/categories?centro_id=xxx
 * Recupera TUTTE le categorie: predefinite (globali) + custom (specifiche del centro)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const centroId = searchParams.get('centro_id')

    if (!centroId) {
      return NextResponse.json(
        { error: 'centro_id è obbligatorio' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centroId)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Carica categorie predefinite (globali) dalla tabella categories
    const { data: predefinedCategories, error: predefinedError } = await supabase
      .from('categories')
      .select('*')
      .order('nome', { ascending: true })

    if (predefinedError) throw predefinedError

    // 2. Carica categorie custom del centro
    const { data: customCategories, error: customError } = await supabase
      .from('custom_categories')
      .select('*')
      .eq('centro_id', centroId)
      .order('ordinamento', { ascending: true })

    if (customError) throw customError

    // 3. Merge intelligente: custom sovrascrive predefinite con stesso nome
    const categoryMap = new Map()

    // Prima aggiungi le predefinite
    predefinedCategories?.forEach(cat => {
      categoryMap.set(cat.nome.toLowerCase(), {
        ...cat,
        is_custom: false,
        source: 'predefined'
      })
    })

    // Poi le custom (sovrascrivono le predefinite con stesso nome)
    customCategories?.forEach(cat => {
      categoryMap.set(cat.nome.toLowerCase(), {
        ...cat,
        is_custom: true,
        source: 'custom',
        icona: cat.icona || '📁'
      })
    })

    // Converti a array ordinato per nome
    const allCategories = Array.from(categoryMap.values())
      .sort((a, b) => a.nome.localeCompare(b.nome))

    console.log(`[CATEGORIES] Returning ${allCategories.length} categories (${predefinedCategories?.length || 0} predefined, ${customCategories?.length || 0} custom)`)

    return NextResponse.json({ categories: allCategories })

  } catch (error) {
    console.error('Errore recupero categorie:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero delle categorie' },
      { status: 500 }
    )
  }
}
