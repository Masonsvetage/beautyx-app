// Permette ai test (Node ESM puro) di importare i file di lib/ che usano import
// senza estensione (es. './analytics-alerts'), che funzionano nel bundler di Next.js
// ma non in Node. Non modifica il codice di produzione.
import { register } from 'node:module'
register('./resolver-hooks.js', import.meta.url)
