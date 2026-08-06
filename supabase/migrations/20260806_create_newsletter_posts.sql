-- newsletter_posts: archivio storico dei numeri di newsletter Beautyx già usciti,
-- mostrato nella sezione "Newsletter già uscite" di /newsletter.
--
-- NB: esiste già una tabella public.news_posts (migrazione 20260722_create_news_posts.sql)
-- ma è il feed "Ultime novità" della homepage prodotto (app/page.js, categorie
-- novita/aggiornamento/evento/offerta, gestito da /admin/marketing). Riusarla per
-- l'archivio newsletter avrebbe fatto comparire i numeri di newsletter anche tra le
-- "Ultime novità" del prodotto (e viceversa). Per questo creiamo una tabella dedicata.
create table if not exists public.newsletter_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titolo text not null,
  contenuto text not null,
  estratto text,
  tags text[] not null default '{}',
  pubblicato boolean not null default false,
  data_pubblicazione timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newsletter_posts enable row level security;

-- Lettura pubblica: chiunque può leggere i soli articoli pubblicati (contenuto marketing).
drop policy if exists "public can read published newsletter posts" on public.newsletter_posts;
create policy "public can read published newsletter posts"
  on public.newsletter_posts
  for select
  to anon, authenticated
  using (pubblicato = true);

-- Nessuna policy di insert/update/delete: con RLS attivo, solo la service role
-- (che bypassa RLS) può scrivere. Lo script scripts/publish-newsletter.js usa
-- SUPABASE_SERVICE_KEY per questo motivo.

create index if not exists newsletter_posts_pub_idx
  on public.newsletter_posts (pubblicato, data_pubblicazione desc);

create index if not exists newsletter_posts_tags_idx
  on public.newsletter_posts using gin (tags);

comment on table public.newsletter_posts is 'Archivio storico newsletter Beautyx, mostrato in /newsletter sezione "Newsletter già uscite". Distinta da news_posts (news prodotto homepage).';
