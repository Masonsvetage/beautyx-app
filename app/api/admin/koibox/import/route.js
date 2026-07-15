import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import {
  detectFileType, parseClienti, parseCasse, parseServizi, parseAppuntamenti,
  importTable, readExcelRows,
} from '@/lib/koibox-parsers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

async function getAdminClient(cookieStore) {
  const authClient = createServerClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return cookieStore.getAll() },
      setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
    }
  })
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const { data: profile } = await authClient.from('user_profiles').select('ruolo_livello').eq('id', user.id).maybeSingle()
  if (profile?.ruolo_livello !== 'admin') return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

const TABLE_MAP = {
  clienti:      'koibox_clienti',
  casse:        'koibox_casse',
  servizi:      'koibox_servizi',
  appuntamenti: 'koibox_appuntamenti',
}

const PARSER_MAP = {
  clienti:      parseClienti,
  casse:        parseCasse,
  servizi:      parseServizi,
  appuntamenti: parseAppuntamenti,
}

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const admin = await getAdminClient(cookieStore)
    if (!admin) return Response.json({ error: 'Accesso negato' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file')
    const centroId = formData.get('centro_id')
    if (!file) return Response.json({ error: 'File mancante' }, { status: 400 })
    if (!centroId) return Response.json({ error: 'centro_id mancante' }, { status: 400 })

    const { data: centro } = await admin.from('beauty_centers').select('id, nome').eq('id', centroId).maybeSingle()
    if (!centro) return Response.json({ error: 'Centro non trovato' }, { status: 404 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows, rowsRaw } = readExcelRows(buffer)

    const tipo = detectFileType(rows)
    if (!tipo) {
      return Response.json({ error: 'Tipo file non riconosciuto. Carica un export Koibox valido (Clienti, Casse, Servizi o Appuntamenti).' }, { status: 400 })
    }

    const records = PARSER_MAP[tipo](rowsRaw)
    if (records.length === 0) {
      return Response.json({ error: 'Il file non contiene dati da importare (solo intestazione).' }, { status: 400 })
    }

    const result = await importTable(admin, TABLE_MAP[tipo], records, centroId)

    return Response.json({
      success: true,
      tipo,
      centro: centro.nome,
      totale_righe: records.length,
      importati: result.importati,
      errors: result.errors,
      messaggio: result.errors.length === 0
        ? `${result.importati} record importati con successo`
        : `${result.importati} importati, ${result.errors.length} batch con errori`
    })

  } catch (error) {
    console.error('[KOIBOX IMPORT]', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
