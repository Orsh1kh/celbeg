-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Supabase schema
-- Дараах SQL-г Supabase Dashboard → SQL Editor дээр бүхэлд нь
-- нэг удаа ажиллуулна. Дахин ажиллуулж болно (idempotent).
-- ═══════════════════════════════════════════════════════════

-- Extensions ------------------------------------------------
create extension if not exists "pgcrypto";

-- ═══════════════════════════════════════════════════════════
-- TABLE: profiles
-- Supabase auth.users-ийн 1:1 өргөтгөл
-- ═══════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text unique not null,
  name        text default '',
  user_type   text default 'buyer' check (user_type in ('buyer', 'shop')),
  shop_name   text default '',
  is_admin    boolean default false,
  created_at  timestamptz default now()
);

create index if not exists profiles_phone_idx on public.profiles (phone);

-- ═══════════════════════════════════════════════════════════
-- TABLE: categories
-- ═══════════════════════════════════════════════════════════
create table if not exists public.categories (
  id         text primary key,
  name       text not null,
  icon       text default '📦',
  "order"    integer default 0,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════
-- TABLE: car_marks
-- ═══════════════════════════════════════════════════════════
create table if not exists public.car_marks (
  id         text primary key,
  name       text not null unique,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════
-- TABLE: listings
-- ═══════════════════════════════════════════════════════════
create table if not exists public.listings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text default '',
  price        integer not null check (price >= 0),
  category     text,
  car_make     text,
  car_model    text default '',
  year_from    integer,
  year_to      integer,
  part_type    text check (part_type in ('original', 'substitute')),
  phone        text,
  shop_name    text default '',
  location     text default '',
  images       text[] default '{}',
  view_count   integer default 0,
  is_vip       boolean default false,
  is_active    boolean default true,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists listings_active_created_idx on public.listings (is_active, created_at desc);
create index if not exists listings_category_idx      on public.listings (category);
create index if not exists listings_make_idx          on public.listings (car_make);
create index if not exists listings_vip_idx           on public.listings (is_vip) where is_vip = true;
create index if not exists listings_user_idx          on public.listings (user_id);

-- ═══════════════════════════════════════════════════════════
-- FUNCTION: increment_view
-- ═══════════════════════════════════════════════════════════
create or replace function public.increment_view(listing_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.listings
     set view_count = view_count + 1
   where id = listing_id;
$$;

-- ═══════════════════════════════════════════════════════════
-- FUNCTION: updated_at trigger
-- ═══════════════════════════════════════════════════════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_listings_updated on public.listings;
create trigger trg_listings_updated
  before update on public.listings
  for each row execute function public.set_updated_at();

-- ═══════════════════════════════════════════════════════════
-- FUNCTION: is_admin() helper
-- ═══════════════════════════════════════════════════════════
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════
alter table public.profiles   enable row level security;
alter table public.listings   enable row level security;
alter table public.categories enable row level security;
alter table public.car_marks  enable row level security;

-- profiles ---------------------------------------------------
drop policy if exists profiles_select_all       on public.profiles;
drop policy if exists profiles_insert_self      on public.profiles;
drop policy if exists profiles_update_self      on public.profiles;
drop policy if exists profiles_update_admin     on public.profiles;

create policy profiles_select_all on public.profiles
  for select using (true);

create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id);

create policy profiles_update_admin on public.profiles
  for update using (public.is_admin());

-- listings ---------------------------------------------------
drop policy if exists listings_select_public on public.listings;
drop policy if exists listings_select_owner  on public.listings;
drop policy if exists listings_insert_owner  on public.listings;
drop policy if exists listings_update_owner  on public.listings;
drop policy if exists listings_update_admin  on public.listings;
drop policy if exists listings_delete_owner  on public.listings;
drop policy if exists listings_delete_admin  on public.listings;

-- Идэвхтэй зарыг бүгд хардаг
create policy listings_select_public on public.listings
  for select using (is_active = true);

-- Өөрийн зарыг эзэн үзэж чадна (идэвхгүй ч бай)
create policy listings_select_owner on public.listings
  for select using (auth.uid() = user_id);

create policy listings_insert_owner on public.listings
  for insert with check (auth.uid() = user_id);

create policy listings_update_owner on public.listings
  for update using (auth.uid() = user_id);

create policy listings_update_admin on public.listings
  for update using (public.is_admin());

create policy listings_delete_owner on public.listings
  for delete using (auth.uid() = user_id);

create policy listings_delete_admin on public.listings
  for delete using (public.is_admin());

-- categories -------------------------------------------------
drop policy if exists categories_select_all   on public.categories;
drop policy if exists categories_write_admin  on public.categories;

create policy categories_select_all on public.categories
  for select using (true);

create policy categories_write_admin on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- car_marks --------------------------------------------------
drop policy if exists car_marks_select_all  on public.car_marks;
drop policy if exists car_marks_write_admin on public.car_marks;

create policy car_marks_select_all on public.car_marks
  for select using (true);

create policy car_marks_write_admin on public.car_marks
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- STORAGE: listing-images bucket policies
-- Bucket-ыг гар аргаар Dashboard → Storage дээр үүсгэсний
-- дараа доорх policy-г ажиллуулна (public read).
-- ═══════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
  values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

drop policy if exists storage_read_listing_images   on storage.objects;
drop policy if exists storage_insert_listing_images on storage.objects;
drop policy if exists storage_delete_listing_images on storage.objects;

create policy storage_read_listing_images on storage.objects
  for select using (bucket_id = 'listing-images');

create policy storage_insert_listing_images on storage.objects
  for insert with check (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_delete_listing_images on storage.objects
  for delete using (
    bucket_id = 'listing-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ═══════════════════════════════════════════════════════════
-- SEED: categories
-- ═══════════════════════════════════════════════════════════
insert into public.categories (id, name, icon, "order") values
  ('cat-1', 'Хөдөлгүүр',       '⚙️', 1),
  ('cat-2', 'Тоормос',           '🔴', 2),
  ('cat-3', 'Тулгуур',           '🔧', 3),
  ('cat-4', 'Цахилгаан',         '⚡', 4),
  ('cat-5', 'Гадна',             '🚗', 5),
  ('cat-6', 'Дугуй & Диск',     '🛞', 6),
  ('cat-7', 'Дотор',             '💺', 7),
  ('cat-8', 'Агаарын систем',   '❄️', 8)
on conflict (id) do nothing;

-- ═══════════════════════════════════════════════════════════
-- SEED: car_marks
-- ═══════════════════════════════════════════════════════════
insert into public.car_marks (id, name) values
  ('mark-0','Acura'),('mark-1','Audi'),('mark-2','Baic'),('mark-3','BAW'),
  ('mark-4','Bentley'),('mark-5','Bestune'),('mark-6','BMW'),('mark-7','BYD'),
  ('mark-8','Cadillac'),('mark-9','Changan'),('mark-10','Chery'),('mark-11','Chevrolet'),
  ('mark-12','Daewoo'),('mark-13','Daihatsu'),('mark-14','Dodge'),('mark-15','Dongfeng'),
  ('mark-16','Fiat'),('mark-17','Ford'),('mark-18','Foton'),('mark-19','GAC'),
  ('mark-20','Geely'),('mark-21','GMC'),('mark-22','GWM Tank'),('mark-23','Haval'),
  ('mark-24','Honda'),('mark-25','Huawei'),('mark-26','Hummer'),('mark-27','Hyundai'),
  ('mark-28','Infiniti'),('mark-29','Isuzu'),('mark-30','Jaguar'),('mark-31','Jeep'),
  ('mark-32','Jetour'),('mark-33','Kaiyi'),('mark-34','Kia'),('mark-35','Lada'),
  ('mark-36','Land Rover'),('mark-37','Lexus'),('mark-38','Li Auto'),('mark-39','Lincoln'),
  ('mark-40','Lynk & Co'),('mark-41','Mazda'),('mark-42','Mercedes-Benz'),('mark-43','MG'),
  ('mark-44','MINI'),('mark-45','Mitsubishi'),('mark-46','Nissan'),('mark-47','Opel'),
  ('mark-48','Porsche'),('mark-49','Renault'),('mark-50','Samsung'),('mark-51','SsangYong'),
  ('mark-52','Subaru'),('mark-53','Suzuki'),('mark-54','Tesla'),('mark-55','Toyota'),
  ('mark-56','UAZ'),('mark-57','Volkswagen'),('mark-58','Volvo'),('mark-59','Wuling'),
  ('mark-60','Бусад')
on conflict (id) do nothing;
