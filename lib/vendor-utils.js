/**
 * Estrae la chiave del fornitore dalla descrizione del movimento bancario
 * Rimuove elementi variabili come date, numeri operazione, codici transazione
 * per permettere un raggruppamento intelligente
 */
export function extractVendorKey(descrizione) {
  if (!descrizione) return 'Sconosciuto'

  let key = descrizione.trim()

  // Pattern comuni da rimuovere (numeri variabili, date, codici)
  const patternsToRemove = [
    // Date in vari formati
    /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g,
    /\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/g,

    // Numeri di operazione lunghi (6+ cifre consecutive)
    /\b\d{6,}\b/g,

    // Codici tipo "ID:12345" o "RIF:12345" o "N.12345"
    /\b(ID|RIF|REF|N\.|NUM|TRN|CARD|DISP|OP|OPE|OPER)[:.\s]*\d+/gi,

    // Orari (HH:MM o HH:MM:SS)
    /\d{1,2}:\d{2}(:\d{2})?/g,

    // Sequenze di asterischi e X (mascheramento carte)
    /[\*X]{4,}/g,

    // Codici IBAN parziali
    /IT\d{2}[A-Z0-9\*X\s]+/gi,

    // Pattern "CARTA *1234"
    /CARTA\s+[\*X]*\d+/gi,

    // Pattern "DISP. 123456"
    /DISP\.\s*\d+/gi,

    // Rimuovi spazi multipli
    /\s{2,}/g,
  ]

  patternsToRemove.forEach(pattern => {
    key = key.replace(pattern, ' ')
  })

  // Pattern specifici per accorpamento intelligente
  const normalizations = [
    // INCASSO POS + qualsiasi cosa → INCASSO POS
    { pattern: /^INCASSO POS\s+.*/i, replacement: 'INCASSO POS' },

    // VERSAMENTO CONTANTI + dettagli → VERSAMENTO CONTANTI
    { pattern: /^VERSAMENTO\s+CONTANTI?.*/i, replacement: 'VERSAMENTO CONTANTI' },

    // BONIFICO + dettagli → BONIFICO (mantenendo eventuale nome destinatario)
    { pattern: /^(BONIFICO|BON\.|BKT)\s+(IN VOSTRO FAVORE|SEPA|ISTANTANEO)?\s*/i, replacement: 'BONIFICO' },

    // GIRO CONTO variations
    { pattern: /^(GIRO\s*C\/C|GIROCONTO|GIRO\s+CONTO).*/i, replacement: 'GIRO C/C' },

    // Commissioni bancarie
    { pattern: /^(COMM\.|COMMISSIONE|COMMISSIONI)\s+(BONIFICO|OPERAZ\.|PRELIEVO|MENSILE).*/i, replacement: 'COMMISSIONI BANCARIE' },

    // Prelievi ATM
    { pattern: /^(PRELIEVO|PREL\.|DISP\.)\s+(BANCOMAT|ATM|CARTA).*/i, replacement: 'PRELIEVO BANCOMAT' },

    // Pagamenti carte
    { pattern: /^(PAG\.|PAGAMENTO)\s+CARTA.*/i, replacement: 'PAGAMENTO CARTA' },

    // F24 e tributi
    { pattern: /^(F24|I24)\s+(WEB|TELEMATICO).*/i, replacement: 'PAGAMENTO F24' },

    // Utenze
    { pattern: /^(ENEL|ENI|A2A|ACEA|ATO)\b.*/i, replacement: (match) => match.split(/\s+/)[0] },
    { pattern: /^(TELECOM|TIM|VODAFONE|WIND|TRE|FASTWEB)\b.*/i, replacement: (match) => match.split(/\s+/)[0] },
  ]

  normalizations.forEach(({ pattern, replacement }) => {
    if (pattern.test(key)) {
      if (typeof replacement === 'function') {
        key = replacement(key)
      } else {
        key = key.replace(pattern, replacement)
      }
    }
  })

  // Pulisci spazi
  key = key.trim().replace(/\s+/g, ' ')

  // Se dopo tutte le pulizie la chiave è troppo corta o vuota, usa la descrizione originale troncata
  if (key.length < 3) {
    key = descrizione.substring(0, 30).trim()
  }

  // Limita la lunghezza massima
  if (key.length > 50) {
    key = key.substring(0, 50).trim()
  }

  return key
}

/**
 * Ottiene un nome visualizzabile pulito per il fornitore
 */
export function getVendorDisplayName(descrizione) {
  const key = extractVendorKey(descrizione)

  // Capitalizza correttamente
  return key
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
