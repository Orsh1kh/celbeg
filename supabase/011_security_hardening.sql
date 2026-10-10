-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Security hardening (v11)
-- ───────────────────────────────────────────────────────────
-- Хаах цоорхойнууд:
--   1. Хэрэглэгч өөрийгөө is_admin / is_verified болгох
--   2. Хэрэглэгч зараа үнэгүй is_vip болгох
--   3. Хэт урт гарчиг/тайлбар, хэт өндөр үнэ (spam)
--   4. Storage-д том файл, зургаас өөр файл upload хийх
--   5. Favorites-ийг 010 ажиллуулаагүй бол үүсгэнэ
--
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 1) Admin email жагсаалт — зөвхөн DB дотор (API-аас уншигдахгүй)
-- ═══════════════════════════════════════════════════════════
create table if not exists public.admin_emails (
  email text primary key
);
alter table public.admin_emails enable row level security;
-- Policy үүсгэхгүй → anon/authenticated хэн ч уншиж бичиж чадахгүй

insert into public.admin_emails (email) values ('orshih31@gmail.com')
on conflict do nothing;

-- ═══════════════════════════════════════════════════════════
-- 2) profiles: is_admin / is_verified-г хэрэглэгч өөрөө солихгүй
-- ═══════════════════════════════════════════════════════════
create or replace function public.protect_profile_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  -- is_admin нь зөвхөн admin_emails хүснэгтээс тодорхойлогдоно
  new.is_admin := exists (
    select 1 from public.admin_emails a
     where lower(a.email) = lower(coalesce(new.email, ''))
  );

  select coalesce(p.is_admin, false) into caller_is_admin
    from public.profiles p where p.id = auth.uid();

  if tg_op = 'INSERT' then
    -- Шинэ хэрэглэгч verified болж төрөхгүй
    if not coalesce(caller_is_admin, false) then
      new.is_verified := false;
    end if;
  else
    -- Админ биш бол verified-г өөрчлөхгүй
    if not coalesce(caller_is_admin, false) then
      new.is_verified := old.is_verified;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists trg_protect_profile_flags on public.profiles;
create trigger trg_protect_profile_flags
  before insert or update on public.profiles
  for each row execute function public.protect_profile_flags();

-- Одоо байгаа бүх профайлын is_admin-г засна
update public.profiles p
   set is_admin = exists (select 1 from public.admin_emails a where lower(a.email) = lower(coalesce(p.email,'')));

-- ═══════════════════════════════════════════════════════════
-- 3) listings: is_vip, user_id-г хэрэглэгч өөрөө солихгүй
-- ═══════════════════════════════════════════════════════════
create or replace function public.protect_listing_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_vip     := false;
    new.view_count := 0;
  else
    new.is_vip  := old.is_vip;
    new.user_id := old.user_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_listing_flags on public.listings;
create trigger trg_protect_listing_flags
  before insert or update on public.listings
  for each row execute function public.protect_listing_flags();

-- ═══════════════════════════════════════════════════════════
-- 4) Spam хамгаалалт: урт, үнийн хязгаар
-- ═══════════════════════════════════════════════════════════
alter table public.listings drop constraint if exists listings_title_len;
alter table public.listings add constraint listings_title_len
  check (char_length(title) between 2 and 150);

alter table public.listings drop constraint if exists listings_desc_len;
alter table public.listings add constraint listings_desc_len
  check (description is null or char_length(description) <= 4000);

alter table public.listings drop constraint if exists listings_price_max;
alter table public.listings add constraint listings_price_max
  check (price <= 10000000000);

alter table public.listings drop constraint if exists listings_images_max;
alter table public.listings add constraint listings_images_max
  check (images is null or coalesce(array_length(images, 1), 0) <= 10);

-- Review comment урт
alter table if exists public.reviews drop constraint if exists reviews_comment_len;
alter table if exists public.reviews add constraint reviews_comment_len
  check (comment is null or char_length(comment) <= 1000);

-- ═══════════════════════════════════════════════════════════
-- 5) Storage: зөвхөн зураг, 8MB хүртэл
-- ═══════════════════════════════════════════════════════════
update storage.buckets
   set file_size_limit    = 8388608,
       allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']
 where id = 'listing-images';

-- ═══════════════════════════════════════════════════════════
-- 6) Favorites (010-г ажиллуулаагүй байсан ч үүснэ)
-- ═══════════════════════════════════════════════════════════
create table if not exists public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, listing_id)
);
create index if not exists favorites_user_idx on public.favorites (user_id, created_at desc);
alter table public.favorites enable row level security;

drop policy if exists favorites_select_own on public.favorites;
drop policy if exists favorites_insert_own on public.favorites;
drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_select_own on public.favorites for select using (auth.uid() = user_id);
create policy favorites_insert_own on public.favorites for insert with check (auth.uid() = user_id);
create policy favorites_delete_own on public.favorites for delete using (auth.uid() = user_id);
