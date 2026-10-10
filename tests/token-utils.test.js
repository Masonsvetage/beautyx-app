// Test di lib/token-utils.js (conversione token -> caratteri, formattazione contatori).
// Valori attesi a mano. 1 token = 4 caratteri (CHARS_PER_TOKEN).
import test from 'node:test'
import assert from 'node:assert/strict'
import { CHARS_PER_TOKEN, tokensToChars, formatTokens, formatChars } from '../lib/token-utils.js'

test('CHARS_PER_TOKEN = 4 e tokensToChars: 250000 token = 1.000.000 caratteri', () => {
  assert.equal(CHARS_PER_TOKEN, 4)
  assert.equal(tokensToChars(250000), 1000000)
  assert.equal(tokensToChars(1), 4)
  assert.equal(tokensToChars(0), 0)
})

test('tokensToChars: null/undefined => 0 ; frazioni arrotondate (0,3 token = 1,2 => 1)', () => {
  assert.equal(tokensToChars(null), 0)
  assert.equal(tokensToChars(undefined), 0)
  assert.equal(tokensToChars(0.3), 1)
})

test('formatTokens: soglie 999 / 1.000 / 1.500 / 1.000.000 / 1.250.000', () => {
  assert.equal(formatTokens(0), '0')
  assert.equal(formatTokens(999), '999')
  assert.equal(formatTokens(1000), '1K')
  assert.equal(formatTokens(1499), '1K')
  assert.equal(formatTokens(1500), '2K')
  assert.equal(formatTokens(50000), '50K')
  assert.equal(formatTokens(1000000), '1.0M')
  assert.equal(formatTokens(1250000), '1.3M') // 1,25 arrotondato a 1 decimale (half up) = 1,3
})

test('formatTokens: null/undefined => "?"', () => {
  assert.equal(formatTokens(null), '?')
  assert.equal(formatTokens(undefined), '?')
})

test('formatTokens: 999.999 token vale ~1 milione => "1.0M", MAI "1000K"', () => {
  assert.equal(formatTokens(999999), '1.0M')
  assert.equal(formatTokens(999500), '1.0M')
  assert.equal(formatTokens(999499), '999K')
})

test('formatChars: stesse soglie e 999.999 => "1.0M"', () => {
  assert.equal(formatChars(999), '999')
  assert.equal(formatChars(2000), '2K')
  assert.equal(formatChars(1000000), '1.0M')
  assert.equal(formatChars(999999), '1.0M')
  assert.equal(formatChars(null), '?')
})
