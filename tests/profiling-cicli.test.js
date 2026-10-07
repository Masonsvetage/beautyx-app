// Test dei cicli di profilingEngine.js (cicli della tradizione, Aria = Legno,
// decisione Mason 2026-10-06). Valori attesi scritti a mano dalla tabella in
// memory/generale.md (sezione "Decisioni di Mason (conferme)").
import test from 'node:test'
import assert from 'node:assert/strict'

// profilingEngine.js crea il client Supabase al caricamento: servono variabili d'ambiente
// fittizie (nessuna connessione viene aperta; le funzioni testate sono pure).
// Import dinamico perche' gli import statici verrebbero eseguiti prima di queste righe.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_KEY ||= 'test-key-fittizia'
const { controllore, nutritore, individuaBlocco } = await import('../lib/beautyx/profilingEngine.js')

const ELEMENTI = ['fuoco', 'acqua', 'aria', 'terra', 'metallo']

// eccesso -> [carenza (controllore), leva (nutritore del controllore)]
const BLOCCHI_ATTESI = {
  fuoco: ['acqua', 'metallo'],
  acqua: ['terra', 'fuoco'],
  aria: ['metallo', 'terra'],
  terra: ['aria', 'acqua'],
  metallo: ['fuoco', 'aria'],
}

// Ciclo di controllo atteso (chi compensa chi): Aria -> Terra -> Acqua -> Fuoco -> Metallo -> Aria
// letto come "E e' controllato da": fuoco<-acqua, acqua<-terra, terra<-aria, aria<-metallo, metallo<-fuoco
const NUTRITORI_ATTESI = { fuoco: 'aria', terra: 'fuoco', metallo: 'terra', acqua: 'metallo', aria: 'acqua' }

test('tabella dei 5 blocchi: eccesso -> carenza -> leva', () => {
  for (const [eccesso, [carenza, leva]] of Object.entries(BLOCCHI_ATTESI)) {
    // punteggi con un solo elemento in netto eccesso
    const totali = Object.fromEntries(ELEMENTI.map((e) => [e, e === eccesso ? 20 : 4]))
    const b = individuaBlocco(totali)
    assert.equal(b.eccesso, eccesso)
    assert.equal(b.dominante, eccesso)
    assert.equal(b.carenza, carenza, `carenza per eccesso ${eccesso}`)
    assert.equal(b.leva, leva, `leva per eccesso ${eccesso}`)
    assert.equal(b.significativo, true)
  }
})

test('controllore(): Fuoco->Acqua, Acqua->Terra, Terra->Aria, Aria->Metallo, Metallo->Fuoco', () => {
  assert.equal(controllore('fuoco'), 'acqua')
  assert.equal(controllore('acqua'), 'terra')
  assert.equal(controllore('terra'), 'aria')
  assert.equal(controllore('aria'), 'metallo')
  assert.equal(controllore('metallo'), 'fuoco')
})

test('nutritore(): Aria nutre Fuoco, Fuoco->Terra, Terra->Metallo, Metallo->Acqua, Acqua->Aria', () => {
  for (const [x, n] of Object.entries(NUTRITORI_ATTESI)) {
    assert.equal(nutritore(x), n, `nutritore di ${x}`)
  }
})

test('proprieta dei cicli: ogni elemento compare una volta e i cicli chiudono su 5 passi', () => {
  // controllore() e nutritore() sono permutazioni dei 5 elementi (ognuno compare una volta)
  assert.deepEqual([...new Set(ELEMENTI.map(controllore))].sort(), [...ELEMENTI].sort())
  assert.deepEqual([...new Set(ELEMENTI.map(nutritore))].sort(), [...ELEMENTI].sort())
  // seguendo il ciclo di controllo si torna al punto di partenza dopo esattamente 5 passi
  for (const e of ELEMENTI) {
    let x = e
    const visti = new Set()
    for (let i = 0; i < 5; i++) { visti.add(x); x = controllore(x) }
    assert.equal(visti.size, 5, `ciclo di controllo da ${e} tocca 5 elementi`)
    assert.equal(x, e)
    x = e
    const vistiN = new Set()
    for (let i = 0; i < 5; i++) { vistiN.add(x); x = nutritore(x) }
    assert.equal(vistiN.size, 5, `ciclo generativo da ${e} tocca 5 elementi`)
    assert.equal(x, e)
  }
})

test('proprieta: carenza = controllore(eccesso) e leva = nutritore(controllore); leva mai uguale a eccesso/carenza', () => {
  for (const e of ELEMENTI) {
    const c = controllore(e)
    const l = nutritore(c)
    assert.notEqual(c, e)
    assert.notEqual(l, c)
    // un elemento non puo' essere controllore di se stesso ne' nutrire se stesso
    assert.notEqual(controllore(e), e)
    assert.notEqual(nutritore(e), e)
    // e' la regola dei 3 nodi: coincide con la tabella attesa
    assert.deepEqual([c, l], BLOCCHI_ATTESI[e])
  }
})

test('coerenza con la tradizione (Aria = Legno): chi nutre l\'elemento controllato dall\'eccesso non e\' il suo controllore', () => {
  // Nei cicli della tradizione il controllore di E (ke) non coincide mai con il nutritore (sheng) di E.
  for (const e of ELEMENTI) {
    assert.notEqual(controllore(e), nutritore(e), `controllore e nutritore di ${e} sono diversi`)
  }
})
