-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Marketplace policies (v2)
-- ───────────────────────────────────────────────────────────
-- Юу нэмсэн:
--   • Зарын хугацаа (expires_at) — buyer 7 хоног, shop 30 хоног
--   • Sunгах RPC (extend_listing)
--   • Буцаан авах бодлого (exchange_policy)
--   • Дэлгүүрийн verified badge (profiles.is_verified)
--   • Rate limit (enforce_listing_limits trigger)
--
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 1) PROFILES: is_verified badge
-- ═══════════════════════════════════════════════════════════
alter table public.profiles
  add column if not exists is_verified boolean default false;

-- ═══════════════════════════════════════════════════════════
-- 2) LISTINGS: expires_at, exchange_policy
-- ═══════════════════════════════════════════════════════════
alter table public.listings
  add column if not exists expires_at timestamptz,
  add column if not exists exchange_policy text
    check (exchange_policy in ('return_ok', 'defect_only', 'no_return'))
    default 'no_return';

-- Байгаа зарын expires_at-г create_at + user_type-ийн дагуу тохируулна
update public.listings l
   set expires_at = l.created_at + case
     when p.user_type = 'shop' then interval '30 days'
     else interval '7 days'
   end
  from public.profiles p
 where p.id = l.user_id
   and l.expires_at is null;

create index if not exists listings_expires_idx
  on public.listings (expires_at) where is_active = true;

-- ═══════════════════════════════════════════════════════════
-- 3) TRIGGER: expires_at-г INSERT дээр автоматаар тохируулах
-- ═══════════════════════════════════════════════════════════
create or replace function public.set_listing_expiry()
returns trigger language plpgsql as $$
declare
  utype text;
begin
  if new.expires_at is null then
    select user_type into utype from public.profiles where id = new.user_id;
    if utype = 'shop' then
      new.expires_at := now() + interval '30 days';
    else
      new.expires_at := now() + interval '7 days';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_listings_set_expiry on public.listings;
create trigger trg_listings_set_expiry
  before insert on public.listings
  for each row execute function public.set_listing_expiry();

-- ═══════════════════════════════════════════════════════════
-- 4) RPC: extend_listing — зарыг 7/30 хоногоор сунгана
-- ═══════════════════════════════════════════════════════════
create or replace function public.extend_listing(listing_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  utype text;
  new_expiry timestamptz;
  owner uuid;
begin
  select user_id into owner from public.listings where id = listing_id;
  if owner is null then
    raise exception 'Listing not found';
  end if;
  if owner <> auth.uid() and not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select user_type into utype from public.profiles where id = owner;
  new_expiry := greatest(now(), (select expires_at from public.listings where id = listing_id))
                + case when utype = 'shop' then interval '30 days' else interval '7 days' end;

  update public.listings
     set expires_at = new_expiry,
         is_active  = true
   where id = listing_id;

  return new_expiry;
end $$;

-- ═══════════════════════════════════════════════════════════
-- 5) RATE LIMIT: enforce_listing_limits
--    buyer: max 5 active, 3/day
--    shop:  max 50 active, 20/day
--    admin/verified shop: hard limit x10
-- ═══════════════════════════════════════════════════════════
create or replace function public.enforce_listing_limits()
returns trigger language plpgsql as $$
declare
  p record;
  active_count int;
  daily_count int;
  max_active int;
  max_daily int;
begin
  select user_type, is_admin, is_verified
    into p from public.profiles where id = new.user_id;

  if p is null then
    raise exception 'Profile not found';
  end if;

  -- Хязгаар тодорхойлох
  if p.is_admin then
    max_active := 999999;
    max_daily  := 999999;
  elsif p.user_type = 'shop' then
    max_active := case when p.is_verified then 500 else 50 end;
    max_daily  := case when p.is_verified then 100 else 20 end;
  else
    max_active := 5;
    max_daily  := 3;
  end if;

  -- Идэвхтэй зарын тоо (өнөөдрийн шинэ зарыг оруулаад)
  select count(*) into active_count
    from public.listings
   where user_id = new.user_id
     and is_active = true
     and (expires_at is null or expires_at > now());

  if active_count >= max_active then
    raise exception 'Идэвхтэй зарын хязгаар (%): % зар аль хэдийн байна. Хуучин зараа устгаад дахин оролдоно уу.',
      max_active, active_count;
  end if;

  -- Сүүлийн 24 цагт үүсгэсэн зарын тоо
  select count(*) into daily_count
    from public.listings
   where user_id = new.user_id
     and created_at > now() - interval '24 hours';

  if daily_count >= max_daily then
    raise exception 'Өдөрт нэмэх хязгаар (%): 24 цагт % зар нийтэлсэн байна.',
      max_daily, daily_count;
  end if;

  return new;
end $$;

drop trigger if exists trg_enforce_limits on public.listings;
create trigger trg_enforce_limits
  before insert on public.listings
  for each row execute function public.enforce_listing_limits();

-- ═══════════════════════════════════════════════════════════
-- 6) VIEW: available_listings (хугацаа дуусаагүй зар)
--    Client талд филтэрлэхээс хамгаалж view үүсгэнэ
-- ═══════════════════════════════════════════════════════════
create or replace view public.available_listings as
  select * from public.listings
   where is_active = true
     and (expires_at is null or expires_at > now());

grant select on public.available_listings to anon, authenticated;

-- ═══════════════════════════════════════════════════════════
-- 7) FUNCTION: my_listing_quota — remaining slots for a user
-- ═══════════════════════════════════════════════════════════
create or replace function public.my_listing_quota()
returns json language plpgsql stable security definer
set search_path = public as $$
declare
  p record;
  active_count int;
  daily_count int;
  max_active int;
  max_daily int;
begin
  if auth.uid() is null then
    return json_build_object('max_active', 0, 'active', 0, 'max_daily', 0, 'daily', 0, 'remaining', 0);
  end if;

  select user_type, is_admin, is_verified
    into p from public.profiles where id = auth.uid();

  if p.is_admin then
    max_active := 999999; max_daily := 999999;
  elsif p.user_type = 'shop' then
    max_active := case when p.is_verified then 500 else 50 end;
    max_daily  := case when p.is_verified then 100 else 20 end;
  else
    max_active := 5; max_daily := 3;
  end if;

  select count(*) into active_count from public.listings
   where user_id = auth.uid()
     and is_active = true
     and (expires_at is null or expires_at > now());

  select count(*) into daily_count from public.listings
   where user_id = auth.uid()
     and created_at > now() - interval '24 hours';

  return json_build_object(
    'max_active', max_active,
    'active',     active_count,
    'max_daily',  max_daily,
    'daily',      daily_count,
    'remaining',  greatest(0, max_active - active_count),
    'daily_remaining', greatest(0, max_daily - daily_count)
  );
end $$;
