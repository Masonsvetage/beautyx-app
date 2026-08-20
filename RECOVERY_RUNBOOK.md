# Recovery Runbook — Beautyx
**Responsabile:** Riccardo | **Aggiornato:** Luglio 2026

Questo documento è il riferimento operativo per ogni scenario di disastro. Ogni scenario ha: causa, impatto, procedura, tempo stimato.

---

## Mappa componenti e dipendenze

```
[Utente] → [beautyx-appnews.vercel.app] → [Vercel CDN]
                                                ↓
                                         [Next.js App]
                                         /           \
                              [Supabase DB]    [Beehiiv API]
                              (autenticazione)  (newsletter)
```

**Se Vercel è down** → sito irraggiungibile per tutti
**Se Supabase è down** → login e dati non funzionano; newsletter subscription OK
**Se Beehiiv è down** → iscrizioni newsletter non funzionano; resto del sito OK

---

## SCENARIO 1 — Sito non raggiungibile
**Sintomi:** HTTP 5xx, timeout, pagina bianca
**Impatto:** Tutti gli utenti bloccati
**Tempo stimato recovery: 5-15 min**

```
1. curl -s -o /dev/null -w "%{http_code}" https://beautyx-appnews.vercel.app/newsletter
2. Se 5xx → vai su vercel.com → beautyx-app_news → Deployments
3. Se ultimo deploy ha errori → Redeploy manuale
4. Se redeploy fallisce → leggi log build → passa errore a Davide
5. ETA: redeploy riuscito = 2 min | fix codice = 15-30 min
```

---

## SCENARIO 2 — API newsletter rotta ({"error":"Configurazione mancante"})
**Sintomi:** iscrizioni non vanno, form dà errore
**Impatto:** Nessuna nuova iscrizione possibile
**Tempo stimato recovery: 10-20 min**

```
1. Causa più probabile: BEEHIIV_API_KEY o BEEHIIV_PUBLICATION_ID mancanti su Vercel
2. Vercel → beautyx-app_news → Settings → Environment Variables
3. Aggiungi variabili mancanti (valori su KeePass o Beehiiv → Settings → Workspace → API)
4. Redeploy → test POST /api/newsletter/subscribe
5. ETA: se le chiavi sono disponibili = 10 min | se vanno rigenerate = 20 min
```

---

## SCENARIO 3 — Supabase paused
**Sintomi:** login non funziona, errori di connessione DB
**Impatto:** Gestionale inaccessibile; newsletter subscription OK
**Tempo stimato recovery: 3-5 min**

```
1. supabase.com → progetto scfumedmisbuxhdywwpb → se "Paused" → tasto Restore
2. Attendi 2-3 minuti → test login
3. Se incidente Supabase → status.supabase.com → ETA da loro
```

---

## SCENARIO 4 — git index.lock blocca commit dalla sandbox
**Sintomi:** "fatal: Unable to create .git/index.lock: File exists"
**Impatto:** Nessun deploy automatico possibile dalla sandbox
**Tempo stimato recovery: 2 min**

```
CAUSA: VS Code (o altro IDE) aperto su beautyx-app tiene il lock
FIX: chiudi VS Code → ritenta dalla sandbox
ALTERNATIVA: usa il terminale PowerShell di Windows direttamente:
  cd C:\Users\luigi\Documents\beautyx-app
  git add .
  git commit -m "messaggio"
  git push
NON fare: tentare di rimuovere index.lock dalla sandbox Linux (non funziona)
```

---

## SCENARIO 5 — Perdita totale HD
**Impatto:** Tutto il lavoro locale perso
**Tempo stimato recovery: 30-60 min**

```
1. git clone https://github.com/Masonsvetage/beautyx-app → recupera codice + agent files
2. Crea nuovo .env.local con valori da KeePass
3. Vercel ha già tutte le env vars → sito in produzione è già OK
4. Documenti strategici → repo beautyx-docs (se creato) o OneDrive
5. Supabase → dati al sicuro nel cloud
6. Beehiiv → iscritti al sicuro nel cloud
```

---

## Health check rapido (30 secondi)

Script unico in **sola lettura** (nessuna operazione di modifica/eliminazione):

```bash
bash scripts/health-check.sh
```

Copre: pagine `/newsletter` e `/miniguida`, POST `/api/newsletter/subscribe`,
Beehiiv (stato + iscritti attivi, GET), Vercel (stato ultimo deploy, GET).
Legge le credenziali da `.env.local` (`BEEHIIV_*`, `VERCEL_TOKEN`).

Fallback manuale se lo script non è disponibile:

```bash
curl -s -o /dev/null -w "newsletter: %{http_code}\n" https://beautyx-appnews.vercel.app/newsletter
curl -s -o /dev/null -w "miniguida: %{http_code}\n" https://beautyx-appnews.vercel.app/miniguida
curl -s -X POST https://beautyx-appnews.vercel.app/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"healthcheck@test.com","website":""}' | python3 -m json.tool
```

**Risultati attesi:** 200; `/miniguida` 307 → /login (gate autenticazione, atteso); {"success":true}

### Accesso monitoraggio diretto (sola lettura)
- **Beehiiv** — `BEEHIIV_API_KEY` + `BEEHIIV_PUBLICATION_ID` già in `.env.local`. Endpoint: `GET https://api.beehiiv.com/v2/publications/{id}?expand[]=stats`.
- **Vercel** — crea un token in *vercel.com → Settings → Tokens*, scope limitato al team `luigis-projects-5fcd891f`, e incollalo in `.env.local` come `VERCEL_TOKEN`. Usato solo per `GET .../v6/deployments` (stato deploy). Mai scrittura/redeploy automatico.

---

## Contatti e accessi rapidi

| Servizio | URL | Dove trovi le chiavi |
|---|---|---|
| Vercel | vercel.com/luigis-projects-5fcd891f | KeePass |
| Supabase | supabase.com → scfumedmisbuxhdywwpb | KeePass |
| Beehiiv | app.beehiiv.com → Settings → Workspace → API | KeePass |
| GitHub | github.com/Masonsvetage/beautyx-app | KeePass |
