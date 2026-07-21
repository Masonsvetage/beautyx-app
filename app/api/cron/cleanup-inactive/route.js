import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// GET: Marca per cancellazione utenti inattivi da 5+ anni (GDPR)
// Protetto da CRON_SECRET per evitare chiamate non autorizzate
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    )

    // Leggi durata conservazione configurabile da admin_settings
    let retentionYears = 5
    const { data: settingData } = await supabase.rpc('get_admin_setting', { p_chiave: 'gdpr_retention_years' })
    if (settingData) {
      const parsed = parseInt(settingData, 10)
      if (!isNaN(parsed) && parsed >= 1) retentionYears = parsed
    }

    const { data: count, error } = await supabase.rpc('cleanup_inactive_users', { p_years: retentionYears })

    if (error) {
      console.error('Errore cleanup inattivi:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[CRON] Cleanup inattivi ${retentionYears} anni: ${count} utenti marcati per cancellazione`)

    return NextResponse.json({
      success: true,
      marked_for_deletion: count,
      retention_years: retentionYears,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Errore cron cleanup-inactive:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
