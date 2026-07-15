# Pattern Standard: Ordinamento Elenchi

## Principio Base

**TUTTI gli elenchi in BeautyX devono avere la possibilità di ordinamento.**

Questo vale per:
- ✅ Movimenti bancari (raggruppati, per categoria, dettagliati)
- ✅ Accantonamenti
- ✅ Analytics (categorie, trend)
- ✅ Liste clienti
- ✅ Qualsiasi futuro elenco

---

## Implementazione Standard

### 1. Aggiungi stato per l'ordinamento

```javascript
const [sortBy, setSortBy] = useState('default_value')
```

### 2. Aggiungi logica di ordinamento nel useMemo

```javascript
const sortedData = useMemo(() => {
  const data = [...yourData] // copia array per non mutare

  switch(sortBy) {
    case 'option1':
      return data.sort((a, b) => /* logica ordinamento */)
    case 'option2':
      return data.sort((a, b) => /* logica ordinamento */)
    default:
      return data
  }
}, [yourData, sortBy]) // IMPORTANTE: aggiungere sortBy alle dipendenze
```

### 3. Aggiungi UI per selezionare ordinamento

#### Opzione A: Componente Riutilizzabile (Consigliato)

```javascript
import SortSelector from '@/components/common/SortSelector'

<SortSelector
  options={[
    { value: 'amount', label: 'Importo', icon: '💰' },
    { value: 'date', label: 'Data', icon: '📅' },
    { value: 'category', label: 'Categoria', icon: '📂' }
  ]}
  value={sortBy}
  onChange={setSortBy}
  variant="light" // o 'dark' per header colorati
  size="md" // 'sm', 'md', 'lg'
  label="Ordina per:" // opzionale
/>
```

#### Opzione B: Select Manuale

```javascript
<select
  value={sortBy}
  onChange={(e) => setSortBy(e.target.value)}
  className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-teal-50 text-teal-700 border border-teal-200"
>
  <option value="option1">💰 Importo</option>
  <option value="option2">📅 Data</option>
</select>
```

---

## Posizionamento UI

### Regola Generale
Posiziona il selettore ordinamento:
- **In alto a destra** dell'elenco
- **Vicino ai filtri** se presenti
- **Nell'header** del componente

### Esempi di Posizionamento

#### Vista con Header Colorato (GroupedView)
```javascript
<div className="p-6 bg-gradient-to-r from-teal-600 to-cyan-600">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h3>Titolo</h3>
      <p>Descrizione</p>
    </div>
    <SortSelector variant="dark" options={...} />
  </div>
</div>
```

#### Vista con Filtri (CategoryDetailView)
```javascript
<div className="bg-white rounded-xl p-4">
  <div className="flex items-center justify-between mb-3">
    <h3>🔍 Filtri</h3>
    <SortSelector variant="light" options={...} />
  </div>
  {/* Filtri qui */}
</div>
```

#### Vista con Barra Filtri Orizzontale (MovementsTable)
```javascript
<div className="flex flex-wrap gap-3">
  {/* Filtro 1 */}
  <select>...</select>

  {/* Filtro 2 */}
  <select>...</select>

  {/* Ricerca */}
  <input type="text" />

  {/* Ordinamento (ultimo elemento) */}
  <SortSelector variant="dark" options={...} />
</div>
```

---

## Opzioni di Ordinamento Comuni

### Per Movimenti Bancari
```javascript
const sortOptions = [
  { value: 'date_desc', label: 'Data ↓ (recente)', icon: '📅' },
  { value: 'date_asc', label: 'Data ↑ (vecchia)', icon: '📅' },
  { value: 'amount_desc', label: 'Importo ↓ (alto)', icon: '💰' },
  { value: 'amount_asc', label: 'Importo ↑ (basso)', icon: '💰' },
  { value: 'category', label: 'Categoria', icon: '📂' }
]
```

### Per Elenchi Raggruppati (Vendor, Categorie)
```javascript
const sortOptions = [
  { value: 'amount', label: 'Importo', icon: '💰' },
  { value: 'category', label: 'Categoria', icon: '📂' },
  { value: 'count', label: 'N° Movimenti', icon: '🔢' },
  { value: 'date', label: 'Data Recente', icon: '📅' }
]
```

### Per Analytics/Categorie
```javascript
const sortOptions = [
  { value: 'amount', label: 'Importo Totale', icon: '💰' },
  { value: 'alphabetic', label: 'Nome Categoria', icon: '🔤' },
  { value: 'count', label: 'N° Movimenti', icon: '🔢' },
  { value: 'entrate', label: 'Entrate', icon: '↗️' },
  { value: 'uscite', label: 'Uscite', icon: '↙️' }
]
```

### Per Accantonamenti
```javascript
const sortOptions = [
  { value: 'saldo', label: 'Saldo Attuale', icon: '💰' },
  { value: 'percentuale', label: 'Percentuale Obiettivo', icon: '📊' },
  { value: 'alphabetic', label: 'Nome', icon: '🔤' },
  { value: 'created', label: 'Data Creazione', icon: '📅' }
]
```

---

## Esempi Implementati

### ✅ GroupedView (movimenti raggruppati)
- **File**: `components/bank/GroupedView.js`
- **Opzioni**: Importo, Categoria, N° Movimenti, Data
- **Posizione**: Header destra, variant dark
- **Default**: Importo (amount)

### ✅ CategoryDetailView (movimenti per categoria)
- **File**: `components/bank/CategoryDetailView.js`
- **Opzioni**: Importo, Alfabetico, N° Movimenti, Entrate, Uscite
- **Posizione**: Header filtri destra, variant light
- **Default**: Importo (amount)

### ✅ MovementsTable (lista dettagliata)
- **File**: `components/bank/MovementsTable.js`
- **Opzioni**: Data ↑/↓, Importo ↑/↓, Categoria
- **Posizione**: Barra filtri, ultimo elemento
- **Default**: Data discendente (date_desc)

---

## Checklist per Nuovi Componenti

Quando crei un nuovo componente con elenco:

- [ ] Aggiunto stato `sortBy`
- [ ] Implementata logica ordinamento in `useMemo`
- [ ] Aggiunto `sortBy` alle dipendenze del `useMemo`
- [ ] Aggiunto SortSelector nell'UI
- [ ] Posizionato in alto a destra o vicino ai filtri
- [ ] Scelto variant appropriato (light/dark)
- [ ] Testato tutti i criteri di ordinamento
- [ ] Default sensato per l'utente

---

## Best Practices

### ✅ DA FARE
- Usa emoji negli option label per chiarezza visiva
- Ordina in modo sensato per default (es: data recente, importo alto)
- Aggiungi frecce ↑/↓ per ordinamenti crescenti/decrescenti
- Testa con grandi quantità di dati
- Mantieni consistenza tra viste simili

### ❌ NON FARE
- Non mutare l'array originale (usa spread operator `[...data]`)
- Non dimenticare dipendenze nel useMemo
- Non usare ordinamenti ambigui (es: solo "Data" senza dire crescente/decrescente)
- Non nascondere il selettore in menu dropdown (deve essere sempre visibile)

---

## Note Tecniche

### Performance
- `useMemo` previene ri-ordinamenti non necessari
- `sortBy` nelle dipendenze assicura aggiornamento quando cambia
- Per liste >1000 elementi, considera virtualizzazione

### Localizzazione
- `localeCompare()` per stringhe (rispetta accenti/caratteri speciali)
- `toLocaleDateString()` per date formattate correttamente

### Type Safety (se usi TypeScript)
```typescript
type SortOption = 'amount' | 'date' | 'category' // etc
const [sortBy, setSortBy] = useState<SortOption>('amount')
```

---

## Aggiornato
Ultimo aggiornamento: 2026-01-14

Pattern implementato in seguito a richiesta utente:
> "nella vista raggruppata me li puoi elencare in ordine di categoria così è più semplice cercli? anzi dai la possibilità all'utente di scegliere come ordinare gli elenchi (questo vale per qualsiasi elenco abbiamo nel programma e mantieni questa indicazione anche per futuri elenchi che potremmo creare in beautyx)"
