import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// POST: Crea il profilo admin (dopo che la migrazione SQL è stata eseguita)
export async function POST(request) {
  try {
    const adminId = 'de45748d-86cb-4619-86a7-5d5bf97523d2'

    // Prova a inserire il profilo admin
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: adminId,
        email: 'admin@beautyx.it',
        ruolo: 'admin',
        piano: 'pro',
        attivo: true,
        nome: 'Admin',
        cognome: 'Beautyx'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        hint: error.code === '42P01'
          ? 'La tabella user_profiles non esiste. Esegui prima la migrazione SQL.'
          : null
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profilo admin creato!',
      admin: data
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// GET: Verifica stato setup
export async function GET() {
  try {
    // Verifica se user_profiles esiste
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, ruolo')
      .limit(5)

    if (profilesError?.code === '42P01') {
      return NextResponse.json({
        status: 'migration_needed',
        message: 'La tabella user_profiles non esiste. Esegui la migrazione SQL.',
        migration_file: 'supabase/migrations/20260127_auth_roles.sql'
      })
    }

    // Verifica se admin esiste
    const admin = profiles?.find(p => p.ruolo === 'admin')

    // Verifica hpa_centro_assignments
    const { error: assignmentsError } = await supabaseAdmin
      .from('hpa_centro_assignments')
      .select('id')
      .limit(1)

    return NextResponse.json({
      status: admin ? 'ready' : 'admin_needed',
      tables: {
        user_profiles: !profilesError,
        hpa_centro_assignments: !assignmentsError
      },
      admin_exists: !!admin,
      profiles_count: profiles?.length || 0
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error.message
    }, { status: 500 })
  }
}
