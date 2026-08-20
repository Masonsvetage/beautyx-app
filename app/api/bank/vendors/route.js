import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * GET /api/bank/vendors?centro_id=xxx
 * Recupera tutti i vendor mappings
 */
export async function GET(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
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

    const { data, error } = await supabase
      .from('vendor_mappings')
      .select('*, categories(nome, icona, colore)')
      .eq('centro_id', centroId)

    if (error) throw error

    return NextResponse.json({ vendors: data })

  } catch (error) {
    console.error('Errore recupero vendor mappings:', error)
    return NextResponse.json(
      { error: 'Errore durante il recupero dei vendor mappings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bank/vendors
 * Crea o aggiorna vendor mapping
 */
export async function POST(request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { centro_id, vendor_key, vendor_display, category_id, categoria_custom } = await request.json()

    if (!centro_id || !vendor_key || !vendor_display) {
      return NextResponse.json(
        { error: 'centro_id, vendor_key e vendor_display sono obbligatori' },
        { status: 400 }
      )
    }

    const ownership = await verifyCentroOwnership(request, centro_id)
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    // Deve avere almeno category_id O categoria_custom
    if (!category_id && !categoria_custom) {
      return NextResponse.json(
        { error: 'Specificare category_id (predefinita) o categoria_custom' },
        { status: 400 }
      )
    }

    console.log('[VENDOR MAPPING] Creating/updating:', {
      vendor_key,
      category_id,
      categoria_custom
    })

    const { data, error } = await supabase
      .from('vendor_mappings')
      .upsert({
        centro_id,
        vendor_key,
        vendor_display,
        category_id: category_id || null,
        categoria_custom: categoria_custom || null
      }, {
        onConflict: 'centro_id,vendor_key'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      vendor: data
    })

  } catch (error) {
    console.error('Errore salvataggio vendor mapping:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return NextResponse.json(
      {
        error: 'Errore durante il salvataggio del vendor mapping',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    )
  }
}
