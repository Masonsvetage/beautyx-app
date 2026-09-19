-- system_events: log di eventi di sistema interrogabili automaticamente (2026-09-19)
--
-- Nasce dal task "fallback automatico modello AI" (vedi memory/davide.md, voce
-- 2026-09-19) — il primo uso è tipo='ai_fallback_used', scritto da
-- lib/beautyx/callClaudeWithFallback.js ogni volta che il modello primario
-- Anthropic fallisce (404 modello ritirato, 5xx, timeout) e viene usato il
-- modello di riserva. Interrogata da Riccardo nel check giornaliero delle
-- 06:00 (stesso pattern già in uso in scripts/health-check.sh per le altre
-- tabelle critiche via execute_sql MCP Supabase).
--
-- NOTA: questa migration è già stata applicata direttamente al progetto
-- Supabase scfumedmisbuxhdywwpb via MCP apply_migration il 19/09/2026 (non
-- serve ri-applicarla manualmente) — questo file è il mirror locale per
-- coerenza con la convenzione del repo (ogni tabella ha un file migration
-- corrispondente), verificato con una scrittura/lettura/pulizia di test reale
-- (execute_sql, non solo list_tables).

create table if not exists public.system_events (
  id bigserial primary key,
  ts timestamptz not null default now(),
  tipo text not null,
  dettaglio jsonb,
  created_at timestamptz not null default now()
);

comment on table public.system_events is 'Log di eventi di sistema interrogabili automaticamente (es. ai_fallback_used). Scritto server-side con SERVICE_KEY. Nessuna policy RLS: accesso riservato al service role (server + MCP), coerente con l''uso interno/diagnostico della tabella.';
comment on column public.system_events.tipo is 'Tipo evento, es. ''ai_fallback_used''';
comment on column public.system_events.dettaglio is 'Dettaglio JSON dell''evento (es. modello_primario, modello_fallback, contesto, errore_primario, errore_fallback, fallback_riuscito)';

create index if not exists idx_system_events_tipo_ts on public.system_events (tipo, ts desc);

alter table public.system_events enable row level security;
-- Nessuna policy aggiunta deliberatamente: RLS abilitato senza policy nega
-- l'accesso a anon/authenticated, coerente col fatto che questa tabella non va
-- mai letta/scritta da client browser, solo da codice server-side (SERVICE_KEY)
-- e da strumenti amministrativi (MCP Supabase, service role).
