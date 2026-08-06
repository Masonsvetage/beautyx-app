-- Tabella minima per il gating leggero di /guida (guida interattiva "10 errori").
-- Associa email iscritta newsletter -> token di accesso.
-- Nessuna policy per anon/authenticated: solo la service key (bypassa RLS) puo' leggere/scrivere.
-- Direttiva Mason: gating leggero in ingresso, niente watermark/log/anomaly detection.

create table if not exists public.guida_access (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.guida_access enable row level security;

create index if not exists guida_access_token_idx on public.guida_access (token);
