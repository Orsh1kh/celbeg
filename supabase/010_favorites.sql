-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Favorites / Хадгалсан зар (v10)
-- ───────────────────────────────────────────────────────────
-- Хэрэглэгч зүрх дарж тэмдэглэсэн зарууд.
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, listing_id)
);

create index if not exists favorites_user_idx    on public.favorites (user_id, created_at desc);
create index if not exists favorites_listing_idx on public.favorites (listing_id);

alter table public.favorites enable row level security;

drop policy if exists favorites_select_own on public.favorites;
drop policy if exists favorites_insert_own on public.favorites;
drop policy if exists favorites_delete_own on public.favorites;

create policy favorites_select_own on public.favorites
  for select using (auth.uid() = user_id);

create policy favorites_insert_own on public.favorites
  for insert with check (auth.uid() = user_id);

create policy favorites_delete_own on public.favorites
  for delete using (auth.uid() = user_id);
