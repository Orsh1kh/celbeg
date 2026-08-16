-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Vehicle listings (v7)
-- ───────────────────────────────────────────────────────────
-- Юу нэмсэн:
--   • listings.listing_type ('part' | 'vehicle')
--   • vehicle_details table (1:1)
--   • RLS: эзэн ба админ бичнэ, бүгд харна
--
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 1) listings.listing_type
-- ═══════════════════════════════════════════════════════════
alter table public.listings
  add column if not exists listing_type text default 'part'
    check (listing_type in ('part', 'vehicle'));

create index if not exists listings_type_idx on public.listings (listing_type);

-- Одоо байгаа зарууд бүгд 'part' үлдэнэ (default-с)

-- ═══════════════════════════════════════════════════════════
-- 2) vehicle_details
-- ═══════════════════════════════════════════════════════════
create table if not exists public.vehicle_details (
  listing_id            uuid primary key references public.listings(id) on delete cascade,
  make                  text,
  model                 text,
  year                  integer check (year is null or (year between 1950 and 2050)),
  mileage_km            integer check (mileage_km is null or mileage_km >= 0),
  engine_cc             numeric(3,1) check (engine_cc is null or engine_cc > 0),
  fuel_type             text check (fuel_type in ('petrol','diesel','hybrid','electric','gas','other')),
  transmission          text check (transmission in ('auto','manual','auto_manual','cvt','other')),
  drive                 text check (drive in ('fwd','rwd','awd','4wd','other')),
  steering              text default 'left' check (steering in ('left','right')),
  color                 text,
  color_interior        text,
  body_type             text,  -- Sedan, SUV, Hatchback, Pickup, Van, Truck, Bus, ...
  plate_region          text,  -- УБ, Дархан, ...
  customs_cleared       boolean default true,
  imported_year         integer check (imported_year is null or (imported_year between 1990 and 2050)),
  inspection_valid_until date,
  vin                   text,
  is_leasing            boolean default false,
  is_barter             boolean default false,
  created_at            timestamptz default now()
);

create index if not exists vd_make_idx      on public.vehicle_details (make);
create index if not exists vd_year_idx      on public.vehicle_details (year);
create index if not exists vd_fuel_idx      on public.vehicle_details (fuel_type);
create index if not exists vd_body_idx      on public.vehicle_details (body_type);

-- ═══════════════════════════════════════════════════════════
-- 3) RLS
-- ═══════════════════════════════════════════════════════════
alter table public.vehicle_details enable row level security;

drop policy if exists vd_select_all       on public.vehicle_details;
drop policy if exists vd_insert_owner     on public.vehicle_details;
drop policy if exists vd_update_owner     on public.vehicle_details;
drop policy if exists vd_delete_owner     on public.vehicle_details;
drop policy if exists vd_admin_all        on public.vehicle_details;

create policy vd_select_all on public.vehicle_details
  for select using (true);

create policy vd_insert_owner on public.vehicle_details
  for insert with check (
    exists (
      select 1 from public.listings l
       where l.id = listing_id and l.user_id = auth.uid()
    )
  );

create policy vd_update_owner on public.vehicle_details
  for update using (
    exists (
      select 1 from public.listings l
       where l.id = listing_id and l.user_id = auth.uid()
    )
  );

create policy vd_delete_owner on public.vehicle_details
  for delete using (
    exists (
      select 1 from public.listings l
       where l.id = listing_id and l.user_id = auth.uid()
    )
  );

create policy vd_admin_all on public.vehicle_details
  for all using (public.is_admin()) with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- 4) available_listings view-г шинэчилнэ (listing_type-тай хамт)
-- ═══════════════════════════════════════════════════════════
create or replace view public.available_listings as
  select * from public.listings
   where is_active = true
     and (expires_at is null or expires_at > now());

grant select on public.available_listings to anon, authenticated;
