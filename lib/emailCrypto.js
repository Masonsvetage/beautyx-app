import crypto from 'crypto'

const KEY_HEX = process.env.EMAIL_ENCRYPTION_KEY
const ALGORITHM = 'aes-256-gcm'

function getKey() {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_KEY mancante o non valida in .env.local (deve essere 64 caratteri hex)')
  }
  return Buffer.from(KEY_HEX, 'hex')
}

export function encryptPassword(plaintext) {
  const key = getKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let enc = cipher.update(plaintext, 'utf8', 'hex')
  enc += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${tag}:${enc}`
}

export function decryptPassword(encrypted) {
  const key = getKey()
  const [ivHex, tagHex, enc] = encrypted.split(':')
  if (!ivHex || !tagHex || !enc) throw new Error('Formato password cifrata non valido')
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  let dec = decipher.update(enc, 'hex', 'utf8')
  dec += decipher.final('utf8')
  return dec
}
