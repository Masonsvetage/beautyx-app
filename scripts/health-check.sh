#!/usr/bin/env bash
# Beautyx — Health check giornaliero (SOLA LETTURA)
# Esegue solo GET/lettura + il test POST /subscribe previsto. Nessuna operazione di
# modifica, eliminazione o cancellazione. Sicuro da eseguire ripetutamente.
#
# Uso:  bash scripts/health-check.sh
# Legge le credenziali da .env.local (BEEHIIV_*, VERCEL_TOKEN).
#
# NOTA (2026-08-29): frequenza ridotta da 3x/giorno a 1x/giorno (06:00) su richiesta
# di Mason — poco traffico reale non giustificava 3 controlli/giorno. Contestualmente
# arricchito con /report + /api/public/news, perché un check di sola disponibilità
# ("il sito risponde 200") non aveva intercettato il bug reale del giorno (tabelle di
# produzione mancanti): quel tipo di problema lo intercetta il check tabelle Supabase
# nel prompt del task schedulato (query reale sulle tabelle critiche), non questo script.
#
# NOTA (2026-09-09): aggiunto check Anthropic (vedi sezione 5 sotto) dopo il bug reale
# dell'08/09/2026 — il codice chiamava un modello Claude ritirato
# (claude-sonnet-4-20250514), causando 500 "problema tecnico" su /api/beautyx/chat
# durante il questionario CURA. NON testiamo /api/beautyx/chat via HTTP diretto: quella
# route richiede una sessione Supabase reale letta dai cookie (verifyCentroOwnership),
# quindi una POST senza sessione riceverebbe sempre 401 a prescindere dallo stato del
# modello — non sarebbe un test valido, solo un falso senso di sicurezza. Testiamo
# invece direttamente il modello Anthropic usato nelle chiamate reali del codice
# (claude-sonnet-5, vedi app/api/beautyx/chat/route.js righe 1105/1168), con una
# richiesta minima. La verifica di raggiungibilità delle tabelle beautyx_conversations/
# beautyx_messages è nel prompt del task schedulato (stesso pattern delle altre tabelle
# critiche via Supabase execute_sql), non in questo script.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

# --- carica env ---
if [ -f .env.local ]; then set -a; . ./.env.local 2>/dev/null; set +a; fi

BASE="https://beautyx-appnews.vercel.app"
ok(){ printf '\xe2\x9c\x85 %s\n' "$1"; }
bad(){ printf '\xe2\x9d\x8c %s\n' "$1"; }
warn(){ printf '\xf0\x9f\x9f\xa1 %s\n' "$1"; }

echo "== BEAUTYX HEALTH CHECK — $(date '+%Y-%m-%d %H:%M %Z') =="

# 1) Pagine pubbliche (GET, senza seguire redirect)
for path in newsletter miniguida report; do
  code=$(curl -s -o /dev/null -w '%{http_code}' "$BASE/$path")
  if [ "$code" = "200" ]; then ok "/$path -> 200"
  elif [ "$code" = "307" ] || [ "$code" = "302" ]; then warn "/$path -> $code (redirect, es. login gate)"
  else bad "/$path -> $code"; fi
done

# 2) API subscribe (POST previsto dal check — unica scrittura, idempotente)
resp=$(curl -s -X POST "$BASE/api/newsletter/subscribe" \
  -H 'Content-Type: application/json' \
  -d '{"email":"healthcheck-beautyx@test.com","website":""}')
if echo "$resp" | grep -q '"success":true'; then ok "API subscribe -> $resp"
else bad "API subscribe -> $resp"; fi

# 2b) API pubblica /public/news (GET, sola lettura — endpoint chiave usato dalla home)
news_resp=$(curl -s -w '\n%{http_code}' "$BASE/api/public/news")
news_code=$(echo "$news_resp" | tail -1)
if [ "$news_code" = "200" ]; then ok "API public/news -> 200"
else bad "API public/news -> $news_code"; fi

# 3) Beehiiv (GET publication + stats, sola lettura)
if [ -n "${BEEHIIV_API_KEY:-}" ] && [ -n "${BEEHIIV_PUBLICATION_ID:-}" ]; then
  bh=$(curl -s -w '\n%{http_code}' \
    "https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}?expand[]=stats" \
    -H "Authorization: Bearer ${BEEHIIV_API_KEY}")
  bcode=$(echo "$bh" | tail -1)
  if [ "$bcode" = "200" ]; then
    subs=$(echo "$bh" | sed '$d' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['stats']['active_subscriptions'])" 2>/dev/null)
    ok "Beehiiv -> 200 (iscritti attivi: ${subs:-?})"
  else bad "Beehiiv -> $bcode"; fi
else warn "Beehiiv -> credenziali mancanti in .env.local"; fi

# 4) Vercel (GET ultimo deploy, sola lettura)
if [ -n "${VERCEL_TOKEN:-}" ]; then
  H=(-H "Authorization: Bearer ${VERCEL_TOKEN}")
  team=$(curl -s "${H[@]}" "https://api.vercel.com/v2/teams" | python3 -c "import sys,json;t=json.load(sys.stdin).get('teams',[]);print(t[0]['id'] if t else '')" 2>/dev/null)
  q="app=beautyx-app_news&limit=1"; [ -n "$team" ] && q="$q&teamId=$team"
  dep=$(curl -s "${H[@]}" "https://api.vercel.com/v6/deployments?$q")
  state=$(echo "$dep" | python3 -c "import sys,json;d=json.load(sys.stdin).get('deployments',[]);print(d[0]['state'] if d else 'NONE')" 2>/dev/null)
  case "$state" in
    READY) ok "Vercel -> deploy READY" ;;
    BUILDING|QUEUED) warn "Vercel -> deploy $state (in corso)" ;;
    NONE) warn "Vercel -> nessun deploy trovato (verifica scope token)" ;;
    *) bad "Vercel -> deploy $state" ;;
  esac
else warn "Vercel -> VERCEL_TOKEN mancante (aggiungi in .env.local)"; fi

# 5) Anthropic — modello AI di produzione raggiungibile (NUOVO 2026-09-09)
# Replica minima del bug reale dell'08/09/2026: chiamata diretta ad Anthropic con
# l'identico modello usato in produzione (claude-sonnet-5), max_tokens:1 per consumare
# pochissimo credito. Se il modello è stato ritirato/rinominato, Anthropic risponde con
# un errore (tipicamente 404 "not_found_error") invece di 200 — stesso identico sintomo
# della causa del bug di ieri, intercettato qui prima che un cliente ci sbatta contro.
if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  ai_resp=$(curl -s -w '\n%{http_code}' https://api.anthropic.com/v1/messages \
    -H "x-api-key: ${ANTHROPIC_API_KEY}" \
    -H "anthropic-version: 2023-06-01" \
    -H "Content-Type: application/json" \
    -d '{"model":"claude-sonnet-5","max_tokens":1,"messages":[{"role":"user","content":"ping"}]}')
  ai_code=$(echo "$ai_resp" | tail -1)
  ai_body=$(echo "$ai_resp" | sed '$d')
  if [ "$ai_code" = "200" ]; then
    ok "Anthropic claude-sonnet-5 -> 200 (modello raggiungibile)"
  else
    bad "Anthropic claude-sonnet-5 -> $ai_code — modello AI non raggiungibile o errore interno chat (stesso sintomo del bug 08/09/2026): $ai_body"
  fi
else
  warn "Anthropic -> ANTHROPIC_API_KEY mancante in .env.local"
fi

# Nota: stato Supabase (progetto + tabelle critiche, incluse beautyx_conversations/
# beautyx_messages da oggi) verificato dal task via MCP (progetto scfumedmisbuxhdywwpb).
#
# NOTA (2026-09-19): il controllo "fallback AI usato nelle ultime 24h" (tabella
# system_events, tipo='ai_fallback_used' — vedi lib/beautyx/callClaudeWithFallback.js,
# commit 20dc8635) vive SOLO nel prompt del task schedulato via MCP Supabase execute_sql,
# non in questo script — stesso motivo e stesso schema del check tabelle critiche sopra:
# questo script non ha credenziali/accesso MCP.
