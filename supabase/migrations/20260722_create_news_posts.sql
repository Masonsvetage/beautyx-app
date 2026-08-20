-- news_posts: articoli/numeri passati della newsletter mostrati sulla landing /newsletter
-- Serve l'endpoint app/api/public/news/route.js (che legge pubblicato = true).
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  excerpt text,
  contenuto text,
  immagine_url text,
  categoria text,
  in_evidenza boolean not null default false,
  pubblicato boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_posts enable row level security;

drop policy if exists "public can read published news" on public.news_posts;
create policy "public can read published news"
  on public.news_posts
  for select
  to anon, authenticated
  using (pubblicato = true);

create index if not exists news_posts_pub_idx
  on public.news_posts (pubblicato, in_evidenza desc, published_at desc);
