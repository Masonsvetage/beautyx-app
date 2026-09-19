import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyRowCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Recupera messaggi di una conversazione
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const conversation_id = searchParams.get('conversation_id')
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!conversation_id) {
      return NextResponse.json({ error: 'conversation_id richiesto' }, { status: 400 })
    }

    // beautyx_messages non ha centro_id proprio: l'ownership si risolve sul
    // genitore beautyx_conversations (stesso pattern di verifyRowCentroOwnership
    // già usato in conversations/route.js e insights/route.js).
    const ownership = await verifyRowCentroOwnership(request, supabase, {
      table: 'beautyx_conversations',
      id: conversation_id
    })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data, error } = await supabase
      .from('beautyx_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('timestamp', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('Errore GET messages:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ messages: data || [] })
  } catch (error) {
    console.error('Errore GET messages:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Salva nuovo messaggio
export async function POST(request) {
  try {
    const body = await request.json()
    const { conversation_id, sender, contenuto, page_context, metadata } = body

    if (!conversation_id || !sender || !contenuto) {
      return NextResponse.json({
        error: 'conversation_id, sender e contenuto richiesti'
      }, { status: 400 })
    }

    if (!['user', 'beautyx'].includes(sender)) {
      return NextResponse.json({
        error: 'sender deve essere user o beautyx'
      }, { status: 400 })
    }

    const ownership = await verifyRowCentroOwnership(request, supabase, {
      table: 'beautyx_conversations',
      id: conversation_id
    })
    if (!ownership.ok) return centroOwnershipErrorResponse(ownership)

    const { data, error } = await supabase
      .from('beautyx_messages')
      .insert({
        conversation_id,
        sender,
        contenuto,
        page_context: page_context || null,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Errore POST message:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: data })
  } catch (error) {
    console.error('Errore POST message:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
