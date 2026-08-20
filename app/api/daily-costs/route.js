import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { format, subDays, subYears, parseISO, eachDayOfInterval, isWithinInterval, getYear } from 'date-fns'
import { verifyCentroOwnership, centroOwnershipErrorResponse } from '@/lib/auth/verifyCentroOwnership'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

/**
 * Calcolo costi allineato a Analytics con "Solo Operativi" attivo:
 * - Esclude Giroconti (tecnici) e Finanziamenti
 * - Detrae IVA per ottenere costo netto
 * Questo replica il comportamento di filterOperationalMovements + calculateKPIs
 */
const CATEGORIE_ESCLUSE = new Set(['Giroconti', 'Finanziamenti'])

/**
 * GET /api/daily-costs?centro_id=xxx
 * Calcola i costi giornalieri medi per diversi periodi
 * Usa metodo compensazione giroconti/POS (allineato a lib/analytics.js)
 * Ritorna costi NETTI (escludendo IVA detraibile)
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

    // Recupera tutti i movimenti
    const PAGE_SIZE = 1000
    let allMovements = []
    let page = 0
    let hasMore = true

    while (hasMore) {
      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data: pageData, error: pageError } = await supabase
        .from('bank_movements')
        .select('*')
        .eq('centro_id', centroId)
        .order('data', { ascending: false })
        .range(from, to)

      if (pageError) throw pageError

      if (pageData && pageData.length > 0) {
        allMovements = allMovements.concat(pageData)
        page++
        hasMore = pageData.length === PAGE_SIZE
      } else {
        hasMore = false
      }
    }

    // Recupera orari apertura per calcolare giorni lavorativi
    const { data: openingHours } = await supabase
      .from('opening_hours')
      .select('*')
      .eq('centro_id', centroId)

    // Recupera chiusure eccezionali
    const { data: closures } = await supabase
      .from('exceptional_closures')
      .select('*')
      .eq('centro_id', centroId)

    const today = new Date()
    const currentYear = getYear(today)

    // Definisci i periodi
    const periods = {
      // Anno solare precedente (es. 2025)
      prevYear: {
        label: String(currentYear - 1),
        start: `${currentYear - 1}-01-01`,
        end: `${currentYear - 1}-12-31`
      },
      // 12 mesi rolling (oggi - 365 giorni)
      rolling12m: {
        label: '12 mesi',
        start: format(subDays(today, 365), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      },
      // 180 giorni
      days180: {
        label: '180gg',
        start: format(subDays(today, 180), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      },
      // 90 giorni
      days90: {
        label: '90gg',
        start: format(subDays(today, 90), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      },
      // 30 giorni
      days30: {
        label: '30gg',
        start: format(subDays(today, 30), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd')
      }
    }

    // Calcola costi per ogni periodo
    const costs = {}

    for (const [key, period] of Object.entries(periods)) {
      const result = calculatePeriodCosts(
        allMovements,
        period.start,
        period.end,
        openingHours || [],
        closures || []
      )
      costs[key] = {
        label: period.label,
        ...result
      }
    }

    return NextResponse.json({
      costs,
      currentYear,
      calculatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Errore calcolo costi giornalieri:', error)
    return NextResponse.json(
      { error: 'Errore durante il calcolo dei costi giornalieri' },
      { status: 500 }
    )
  }
}

/**
 * Calcola i costi operativi per un periodo
 * Allineato a Analytics con "Solo Operativi" attivo:
 * - Esclude Giroconti e Finanziamenti (come filterOperationalMovements)
 * - Calcola costo netto (esclusa IVA detraibile)
 */
function calculatePeriodCosts(movements, startDate, endDate, openingHours, closures) {
  // Filtra movimenti nel periodo
  const filtered = movements.filter(mov => {
    const movDate = mov.data
    return movDate >= startDate && movDate <= endDate
  })

  // Uscite operative (esclude Giroconti e Finanziamenti)
  const usciteOperative = filtered
    .filter(m => m.tipo === 'uscita' && !CATEGORIE_ESCLUSE.has(m.categoria))
    .reduce((sum, m) => sum + Math.abs(parseFloat(m.importo)), 0)

  // IVA detraibile sui costi
  const IVA_RATE = 22
  const ivaDetraibile = usciteOperative * (IVA_RATE / (100 + IVA_RATE))
  const usciteNette = usciteOperative - ivaDetraibile

  // Calcola giorni lavorativi nel periodo
  const giorniLavorativi = calculateWorkingDays(startDate, endDate, openingHours, closures)

  // Costo giornaliero lordo
  const costoGiornalieroLordo = giorniLavorativi > 0 ? usciteOperative / giorniLavorativi : 0

  // Costo giornaliero netto (esclusa IVA detraibile)
  const costoGiornalieroNetto = giorniLavorativi > 0
    ? usciteNette / giorniLavorativi
    : 0

  return {
    costoGiornalieroLordo: Math.round(costoGiornalieroLordo * 100) / 100,
    costoGiornalieroNetto: Math.round(costoGiornalieroNetto * 100) / 100,
    totaleCosti: Math.round(usciteOperative * 100) / 100,
    giorniLavorativi,
    ivaDetraibile: Math.round(ivaDetraibile * 100) / 100,
    numMovimenti: filtered.filter(m => m.tipo === 'uscita' && !CATEGORIE_ESCLUSE.has(m.categoria)).length
  }
}

/**
 * Calcola i giorni lavorativi in un periodo
 */
function calculateWorkingDays(startDate, endDate, openingHours, closures) {
  try {
    const days = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate)
    })

    let workingDays = 0

    days.forEach(day => {
      // Converti giorno settimana: 0=Dom -> 6, 1=Lun -> 0, etc.
      const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1
      const dayConfig = openingHours.find(h => h.giorno_settimana === dayOfWeek)

      // Se non configurato o chiuso, salta
      if (!dayConfig || !dayConfig.aperto) return

      // Verifica chiusure eccezionali
      const isClosed = closures?.some(closure => {
        if (closure.ricorrente) {
          if (closure.tipo_ricorrenza === 'annuale') {
            const closureDate = parseISO(closure.data_inizio)
            return day.getDate() === closureDate.getDate() &&
                   day.getMonth() === closureDate.getMonth()
          }
        }

        const closureStart = parseISO(closure.data_inizio)
        const closureEnd = parseISO(closure.data_fine)
        return isWithinInterval(day, { start: closureStart, end: closureEnd })
      })

      if (!isClosed) {
        workingDays++
      }
    })

    return workingDays
  } catch (e) {
    // Fallback: stima basata su 5 giorni lavorativi a settimana
    const diffTime = new Date(endDate) - new Date(startDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.round(diffDays * 5 / 7)
  }
}
