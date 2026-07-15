/**
 * Estrae dati strutturati dalla risposta di Beautyx per il Monitor Panel
 *
 * IMPORTANTE: Questa funzione è SOLO un parser passivo.
 * NON fa calcoli autonomi. Beautyx è il Single Source of Truth.
 * Beautyx genera il marker [MONITOR_DATA:{...}] con tutti i dati già calcolati.
 */

export function extractMonitorData(aiResponse, businessData, userMessage) {
  console.log('[MONITOR EXTRACTOR] Starting extraction...')
  console.log('[MONITOR EXTRACTOR] User message:', userMessage)

  // Cerca marker [MONITOR_START]...JSON...[MONITOR_END] generato da Beautyx
  const monitorMatch = aiResponse.match(/\[MONITOR_START\](.*?)\[MONITOR_END\]/s)
  if (monitorMatch) {
    try {
      const jsonString = monitorMatch[1].trim()
      const monitorData = JSON.parse(jsonString)
      console.log('[MONITOR EXTRACTOR] ✅ Found MONITOR data from Beautyx')
      console.log('[MONITOR EXTRACTOR] Title:', monitorData.title)
      console.log('[MONITOR EXTRACTOR] Cards count:', monitorData.cards?.length || 0)
      return monitorData
    } catch (e) {
      console.error('[MONITOR EXTRACTOR] ❌ Errore parsing JSON:', e.message)
      console.error('[MONITOR EXTRACTOR] Raw data:', monitorMatch[1].substring(0, 200) + '...')
      return null
    }
  }

  console.log('[MONITOR EXTRACTOR] ℹ️  No MONITOR markers found - Beautyx did not generate structured data')
  return null
}

/**
 * Pulisce la risposta testuale rimuovendo i marker MONITOR
 */
export function cleanTextResponse(aiResponse) {
  // Rimuovi marker [MONITOR_START]...[MONITOR_END]
  let cleaned = aiResponse.replace(/\[MONITOR_START\].*?\[MONITOR_END\]/gs, '')

  // Pulisci newlines eccessivi
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n')
  cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n')

  return cleaned.trim()
}
