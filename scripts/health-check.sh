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

# Nota: stato Supabase verificato dal task via MCP (progetto scfumedmisbuxhdywwpb).
