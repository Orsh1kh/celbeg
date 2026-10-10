-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — ДУТУУ БҮХ MIGRATION НЭГ ДОР (003→014)
-- Supabase → SQL Editor → энэ файлыг бүхэлд нь paste → Run
-- Дахин ажиллуулсан ч аюулгүй (idempotent).
-- ═══════════════════════════════════════════════════════════


-- >>>>>>>>>>>>>>>>>>>> 003_reviews.sql >>>>>>>>>>>>>>>>>>>>

-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Reviews & ratings (v3)
-- ───────────────────────────────────────────────────────────
-- Юу нэмсэн:
--   • reviews хүснэгт (reviewer → target_user)
--   • Дундаж rating (profile_ratings view)
--   • add_review, delete_review RPC
--   • Хэрэглэгч бүр нэг зарт нэг л review үлдээнэ
--   • RLS: нэвтэрсэн хэрэглэгч л review бичнэ, өөрийгөө үнэлэхгүй
--
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 1) reviews TABLE
-- ═══════════════════════════════════════════════════════════
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  reviewer_id     uuid not null references public.profiles(id) on delete cascade,
  target_user_id  uuid not null references public.profiles(id) on delete cascade,
  listing_id      uuid references public.listings(id) on delete set null,
  rating          integer not null check (rating between 1 and 5),
  comment         text default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  check (reviewer_id <> target_user_id),
  unique (reviewer_id, target_user_id, listing_id)
);

create index if not exists reviews_target_idx    on public.reviews (target_user_id, created_at desc);
create index if not exists reviews_reviewer_idx  on public.reviews (reviewer_id);
create index if not exists reviews_listing_idx   on public.reviews (listing_id);

-- ═══════════════════════════════════════════════════════════
-- 2) updated_at trigger
-- ═══════════════════════════════════════════════════════════
drop trigger if exists trg_reviews_updated on public.reviews;
create trigger trg_reviews_updated
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- 3) RLS
-- ═══════════════════════════════════════════════════════════
alter table public.reviews enable row level security;

drop policy if exists reviews_select_all       on public.reviews;
drop policy if exists reviews_insert_auth      on public.reviews;
drop policy if exists reviews_update_own       on public.reviews;
drop policy if exists reviews_delete_own       on public.reviews;
drop policy if exists reviews_delete_admin     on public.reviews;

-- Бүгд review харна
create policy reviews_select_all on public.reviews
  for select using (true);

-- Нэвтэрсэн хэрэглэгч л review нэмнэ, өөрийгөө үнэлж болохгүй
create policy reviews_insert_auth on public.reviews
  for insert with check (
    auth.uid() = reviewer_id
    and reviewer_id <> target_user_id
  );

-- Зөвхөн эзэн засна
create policy reviews_update_own on public.reviews
  for update using (auth.uid() = reviewer_id);

-- Эзэн эсвэл админ устгана
create policy reviews_delete_own on public.reviews
  for delete using (auth.uid() = reviewer_id);

create policy reviews_delete_admin on public.reviews
  for delete using (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- 4) VIEW: profile_ratings — дундаж rating + тоо
-- ═══════════════════════════════════════════════════════════
create or replace view public.profile_ratings
  with (security_invoker = true)
as
  select
    p.id as user_id,
    coalesce(round(avg(r.rating)::numeric, 1), 0) as rating_avg,
    count(r.id) as rating_count
  from public.profiles p
  left join public.reviews r on r.target_user_id = p.id
  group by p.id;

grant select on public.profile_ratings to anon, authenticated;

-- ═══════════════════════════════════════════════════════════
-- 5) RPC: add_review
-- ═══════════════════════════════════════════════════════════
create or replace function public.add_review(
  target_user uuid,
  rating_val  integer,
  comment_val text default '',
  listing_ref uuid default null
) returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Нэвтрэх шаардлагатай';
  end if;
  if auth.uid() = target_user then
    raise exception 'Өөрийгөө үнэлж болохгүй';
  end if;
  if rating_val < 1 or rating_val > 5 then
    raise exception 'Rating 1-5 хооронд байх ёстой';
  end if;

  -- Ижил (reviewer, target, listing)-той бол update
  insert into public.reviews (reviewer_id, target_user_id, listing_id, rating, comment)
       values (auth.uid(), target_user, listing_ref, rating_val, coalesce(comment_val, ''))
  on conflict (reviewer_id, target_user_id, listing_id)
    do update set rating = excluded.rating,
                  comment = excluded.comment,
                  updated_at = now()
  returning id into new_id;

  return json_build_object('id', new_id);
end $$;

-- ═══════════════════════════════════════════════════════════
-- 6) RPC: get_shop_reviews — reviewer нэртэй хамт
-- ═══════════════════════════════════════════════════════════
create or replace function public.get_shop_reviews(shop_id uuid, lim integer default 50)
returns table (
  id            uuid,
  reviewer_id   uuid,
  reviewer_name text,
  rating        integer,
  comment       text,
  listing_id    uuid,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.reviewer_id, coalesce(nullif(p.name, ''), 'Хэрэглэгч') as reviewer_name,
         r.rating, r.comment, r.listing_id, r.created_at
    from public.reviews r
    left join public.profiles p on p.id = r.reviewer_id
   where r.target_user_id = shop_id
   order by r.created_at desc
   limit lim;
$$;


-- >>>>>>>>>>>>>>>>>>>> 004_shops_view.sql >>>>>>>>>>>>>>>>>>>>

-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Shops browse view (v4)
-- ───────────────────────────────────────────────────────────
-- shops_with_stats: profile + rating + listings count нэгтгэсэн
-- Client-с single SELECT-ээр browse хуудсанд хэрэглэнэ.
-- ═══════════════════════════════════════════════════════════

create or replace view public.shops_with_stats
  with (security_invoker = true)
as
  select
    p.id,
    coalesce(nullif(p.shop_name, ''), p.name) as shop_name,
    p.name,
    p.phone,
    p.is_verified,
    p.created_at,
    coalesce(pr.rating_avg, 0)   as rating_avg,
    coalesce(pr.rating_count, 0) as rating_count,
    coalesce(lc.active_count, 0) as active_listings,
    coalesce(lc.total_count, 0)  as total_listings,
    lc.last_location             as location
  from public.profiles p
  left join public.profile_ratings pr on pr.user_id = p.id
  left join lateral (
    select
      count(*) filter (
        where is_active = true
          and (expires_at is null or expires_at > now())
      )                                                as active_count,
      count(*)                                         as total_count,
      (select l2.location
         from public.listings l2
        where l2.user_id = p.id
          and coalesce(l2.location, '') <> ''
        order by l2.created_at desc
        limit 1)                                       as last_location
    from public.listings
    where user_id = p.id
  ) lc on true
  where p.user_type = 'shop';

grant select on public.shops_with_stats to anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>> 005_subcategories_condition.sql >>>>>>>>>>>>>>>>>>>>

-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Sub-categories + condition (v5)
-- ───────────────────────────────────────────────────────────
-- Юу нэмсэн:
--   • categories.parent_id (self-reference) — дэд ангилал
--   • ~60 seed sub-category (Хөдөлгүүр → Радиатор гэх мэт)
--   • listings.subcategory (text) — сонгосон sub-category нэр
--   • listings.condition (enum) — Шинэ / Ашиглагдсан / Засварласан / Гэмтэлтэй
--
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 1) categories.parent_id
-- ═══════════════════════════════════════════════════════════
alter table public.categories
  add column if not exists parent_id text references public.categories(id) on delete cascade;

create index if not exists categories_parent_idx on public.categories (parent_id);

-- ═══════════════════════════════════════════════════════════
-- 2) listings.subcategory, condition
-- ═══════════════════════════════════════════════════════════
alter table public.listings
  add column if not exists subcategory text,
  add column if not exists condition   text
    check (condition in ('new', 'used', 'refurbished', 'damaged'))
    default 'used';

create index if not exists listings_subcategory_idx on public.listings (category, subcategory);
create index if not exists listings_condition_idx   on public.listings (condition);

-- ═══════════════════════════════════════════════════════════
-- 3) Seed sub-categories
-- ═══════════════════════════════════════════════════════════
-- Ангилал бүрд ~7-9 sub-category. Order-т эрэмблэнэ.
insert into public.categories (id, name, icon, "order", parent_id) values
  -- ── Хөдөлгүүр (cat-1) ──
  ('sub-1-1', 'Радиатор',        '🔥', 1, 'cat-1'),
  ('sub-1-2', 'Мастил насос',    '⚙️', 2, 'cat-1'),
  ('sub-1-3', 'Свеча',           '⚡', 3, 'cat-1'),
  ('sub-1-4', 'Шүүр (filter)',   '🧽', 4, 'cat-1'),
  ('sub-1-5', 'Ремень',          '➰', 5, 'cat-1'),
  ('sub-1-6', 'Термостат',       '🌡️', 6, 'cat-1'),
  ('sub-1-7', 'Компрессор',      '💨', 7, 'cat-1'),
  ('sub-1-8', 'Бусад хөдөлгүүр', '🔩', 99,'cat-1'),

  -- ── Тоормос (cat-2) ──
  ('sub-2-1', 'Тоормосны дэвсгэр','🔴', 1, 'cat-2'),
  ('sub-2-2', 'Тоормосны диск',   '⚪', 2, 'cat-2'),
  ('sub-2-3', 'Тоормосны барабан','🥁', 3, 'cat-2'),
  ('sub-2-4', 'Тоормосны шингэн', '💧', 4, 'cat-2'),
  ('sub-2-5', 'Тоормосны тросс',  '🔗', 5, 'cat-2'),
  ('sub-2-6', 'Тоормосны насос',  '⚙️', 6, 'cat-2'),
  ('sub-2-7', 'Бусад тоормос',    '🔩', 99,'cat-2'),

  -- ── Тулгуур (cat-3) ──
  ('sub-3-1', 'Амортизатор', '📏', 1, 'cat-3'),
  ('sub-3-2', 'Пружин',      '🌀', 2, 'cat-3'),
  ('sub-3-3', 'Рычаг',       '📐', 3, 'cat-3'),
  ('sub-3-4', 'Шаровой',     '⚫', 4, 'cat-3'),
  ('sub-3-5', 'Стойка',      '🔧', 5, 'cat-3'),
  ('sub-3-6', 'Бусад тулгуур','🔩', 99,'cat-3'),

  -- ── Цахилгаан (cat-4) ──
  ('sub-4-1', 'Аккумулятор', '🔋', 1, 'cat-4'),
  ('sub-4-2', 'Генератор',   '⚡', 2, 'cat-4'),
  ('sub-4-3', 'Стартер',     '🔑', 3, 'cat-4'),
  ('sub-4-4', 'Утас, реле',  '🔌', 4, 'cat-4'),
  ('sub-4-5', 'Мэдрэгч',     '📡', 5, 'cat-4'),
  ('sub-4-6', 'ECU/компьютер','💻',6, 'cat-4'),
  ('sub-4-7', 'Бусад цахилгаан','🔩',99,'cat-4'),

  -- ── Гадна (cat-5) ──
  ('sub-5-1', 'Бампер',        '🚙', 1, 'cat-5'),
  ('sub-5-2', 'Капот',         '🔲', 2, 'cat-5'),
  ('sub-5-3', 'Хаалга',        '🚪', 3, 'cat-5'),
  ('sub-5-4', 'Толь',          '🪞', 4, 'cat-5'),
  ('sub-5-5', 'Гэрэл',         '💡', 5, 'cat-5'),
  ('sub-5-6', 'Хаалганы бариул','🖐️',6, 'cat-5'),
  ('sub-5-7', 'Крыло/фендер',  '🛡️', 7, 'cat-5'),
  ('sub-5-8', 'Бусад гадна',   '🔩', 99,'cat-5'),

  -- ── Дугуй & Диск (cat-6) ──
  ('sub-6-1', 'Дугуй',       '🛞', 1, 'cat-6'),
  ('sub-6-2', 'Диск',        '⚙️', 2, 'cat-6'),
  ('sub-6-3', 'Дугуйн тат',  '🔩', 3, 'cat-6'),
  ('sub-6-4', 'Гинжин дугуй','⛓️', 4, 'cat-6'),
  ('sub-6-5', 'Бусад дугуй', '🔩', 99,'cat-6'),

  -- ── Дотор (cat-7) ──
  ('sub-7-1', 'Суудал',      '💺', 1, 'cat-7'),
  ('sub-7-2', 'Хивс/ковер',  '🟫', 2, 'cat-7'),
  ('sub-7-3', 'Панель',      '📊', 3, 'cat-7'),
  ('sub-7-4', 'Жолооны хүрд','🎡', 4, 'cat-7'),
  ('sub-7-5', 'Air bag',     '🎈', 5, 'cat-7'),
  ('sub-7-6', 'Толь (салон)','🪞', 6, 'cat-7'),
  ('sub-7-7', 'Бусад салон', '🔩', 99,'cat-7'),

  -- ── Агаарын систем (cat-8) ──
  ('sub-8-1', 'Компрессор (агаар)','💨', 1, 'cat-8'),
  ('sub-8-2', 'Радиатор (агаар)',  '🌬️', 2, 'cat-8'),
  ('sub-8-3', 'Шүүр (агаар)',      '🧽', 3, 'cat-8'),
  ('sub-8-4', 'Хийн шугам',        '〰️', 4, 'cat-8'),
  ('sub-8-5', 'Термостат (агаар)', '🌡️', 5, 'cat-8'),
  ('sub-8-6', 'Бусад агаар',       '🔩', 99,'cat-8')
on conflict (id) do nothing;


-- >>>>>>>>>>>>>>>>>>>> 006_rename_dotor_to_salon.sql >>>>>>>>>>>>>>>>>>>>

-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — "Дотор" → "Салон" нэр солих (v6)
-- ───────────────────────────────────────────────────────────
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

-- Үндсэн ангилал
update public.categories set name = 'Салон' where id = 'cat-7';

-- Дэд ангилал 2 нэр (Толь дотор, Бусад дотор)
update public.categories set name = 'Толь (салон)'  where id = 'sub-7-6';
update public.categories set name = 'Бусад салон'   where id = 'sub-7-7';

-- Одоо байгаа зарын category талбарыг синхрончилно
update public.listings set category = 'Салон' where category = 'Дотор';


-- >>>>>>>>>>>>>>>>>>>> 009_view_security.sql >>>>>>>>>>>>>>>>>>>>

-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — View security (v9)
-- ───────────────────────────────────────────────────────────
-- Supabase-ийн Security Advisor "Security Definer View" гэсэн
-- анхааруулгыг арилгах. Бүх view-г SECURITY INVOKER горимд
-- шилжүүлнэ — дуудсан хэрэглэгчийн эрхээр ажиллана.
--
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

create or replace view public.available_listings
  with (security_invoker = true)
as
  select * from public.listings
   where is_active = true
     and (expires_at is null or expires_at > now());

grant select on public.available_listings to anon, authenticated;

create or replace view public.profile_ratings
  with (security_invoker = true)
as
  select
    p.id as user_id,
    coalesce(round(avg(r.rating)::numeric, 1), 0) as rating_avg,
    count(r.id) as rating_count
  from public.profiles p
  left join public.reviews r on r.target_user_id = p.id
  group by p.id;

grant select on public.profile_ratings to anon, authenticated;

create or replace view public.shops_with_stats
  with (security_invoker = true)
as
  select
    p.id,
    coalesce(nullif(p.shop_name, ''), p.name) as shop_name,
    p.name,
    p.phone,
    p.is_verified,
    p.created_at,
    coalesce(pr.rating_avg, 0)   as rating_avg,
    coalesce(pr.rating_count, 0) as rating_count,
    coalesce(lc.active_count, 0) as active_listings,
    coalesce(lc.total_count, 0)  as total_listings,
    lc.last_location             as location
  from public.profiles p
  left join public.profile_ratings pr on pr.user_id = p.id
  left join lateral (
    select
      count(*) filter (
        where is_active = true
          and (expires_at is null or expires_at > now())
      )                                                as active_count,
      count(*)                                         as total_count,
      (select l2.location
         from public.listings l2
        where l2.user_id = p.id
          and coalesce(l2.location, '') <> ''
        order by l2.created_at desc
        limit 1)                                       as last_location
    from public.listings
    where user_id = p.id
  ) lc on true
  where p.user_type = 'shop';

grant select on public.shops_with_stats to anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>> 011_security_hardening.sql >>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>> 012_category_counts.sql >>>>>>>>>>>>>>>>>>>>

-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Ангилал бүрийн идэвхтэй зарын тоо (v12)
-- Хайлтын хуудасны дээд талын chip-үүдэд "Тоормос (24)" гэж харуулна.
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

create or replace function public.category_counts(lt text default 'part')
returns table (category text, cnt bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select l.category, count(*) as cnt
    from public.listings l
   where l.is_active = true
     and (l.expires_at is null or l.expires_at > now())
     and coalesce(l.listing_type, 'part') = lt
     and l.category is not null
   group by l.category;
$$;

grant execute on function public.category_counts(text) to anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>> 013_reports.sql >>>>>>>>>>>>>>>>>>>>

-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Зар мэдээлэх (report) систем (v13)
-- ───────────────────────────────────────────────────────────
--   • Нэвтэрсэн хэрэглэгч бусдын зарыг нэг удаа мэдээлнэ
--   • 3 нээлттэй мэдээлэл ирвэл зар автоматаар нуугдана
--   • Зөвхөн админ мэдээллүүдийг харж, шийдвэрлэнэ
-- Ажиллуулах: Supabase → SQL Editor → paste → Run (дахин ажиллуулж болно)
-- ═══════════════════════════════════════════════════════════

create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (reason in ('scam','wrong_info','spam','sold','prohibited','other')),
  comment     text check (comment is null or char_length(comment) <= 500),
  status      text not null default 'open' check (status in ('open','resolved','dismissed')),
  created_at  timestamptz default now(),
  unique (listing_id, reporter_id)
);

create index if not exists reports_status_idx  on public.reports (status, created_at desc);
create index if not exists reports_listing_idx on public.reports (listing_id);

alter table public.reports enable row level security;

drop policy if exists reports_insert_own   on public.reports;
drop policy if exists reports_select       on public.reports;
drop policy if exists reports_update_admin on public.reports;
drop policy if exists reports_delete_admin on public.reports;

-- Өөрийн нэрээр, өөрийн биш зарыг л мэдээлнэ
create policy reports_insert_own on public.reports
  for insert with check (
    auth.uid() = reporter_id
    and not exists (select 1 from public.listings l where l.id = listing_id and l.user_id = auth.uid())
  );

-- Мэдээлэгч өөрийнхөө мэдээллийг, админ бүгдийг харна
create policy reports_select on public.reports
  for select using (auth.uid() = reporter_id or public.is_admin());

create policy reports_update_admin on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

create policy reports_delete_admin on public.reports
  for delete using (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- 3 нээлттэй мэдээлэл → зарыг автоматаар нууна
-- ═══════════════════════════════════════════════════════════
create or replace function public.auto_hide_reported()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  select count(*) into n
    from public.reports
   where listing_id = new.listing_id and status = 'open';
  if n >= 3 then
    update public.listings set is_active = false where id = new.listing_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_auto_hide_reported on public.reports;
create trigger trg_auto_hide_reported
  after insert on public.reports
  for each row execute function public.auto_hide_reported();


-- >>>>>>>>>>>>>>>>>>>> 014_profile_privacy.sql >>>>>>>>>>>>>>>>>>>>

-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Профайлын email-ийг нийтээс нуух (v14)
-- ───────────────────────────────────────────────────────────
-- Өмнө нь profiles хүснэгтийг хэн ч (нэвтрээгүй ч) бүх баганаар нь
-- уншиж чаддаг байсан → бүх хэрэглэгчийн email ил байсан.
--   • email баганын SELECT эрхийг нийтээс хасна (бусад багана хэвээр)
--   • my_profile()        — хэрэглэгч өөрийн бүтэн профайлыг авна
--   • admin_list_shops()  — админ дэлгүүрүүдийг email-тэй нь харна
-- Ажиллуулах: Supabase → SQL Editor → paste → Run (дахин ажиллуулж болно)
-- ═══════════════════════════════════════════════════════════

revoke select on public.profiles from anon, authenticated;
grant select (id, name, phone, user_type, shop_name, is_admin, is_verified, created_at)
  on public.profiles to anon, authenticated;

create or replace function public.my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

grant execute on function public.my_profile() to authenticated;

create or replace function public.admin_list_shops()
returns table (id uuid, name text, phone text, email text, shop_name text, is_verified boolean, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  return query
    select p.id, p.name, p.phone, p.email, p.shop_name, p.is_verified, p.created_at
      from public.profiles p
     where p.user_type = 'shop'
     order by p.created_at desc;
end $$;

grant execute on function public.admin_list_shops() to authenticated;
