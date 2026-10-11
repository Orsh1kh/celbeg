-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Зар засах, «Зарагдсан» тэмдэглэх (v15)
-- ───────────────────────────────────────────────────────────
--   • listings.sold_at — зарагдсан огноо (зарагдсан зар нийтэд харагдахгүй)
--   • Эзэн зараа засахдаа дараах талбарыг өөрчилж чадахгүй:
--       is_vip, user_id, created_at (дээш «bump» хийхгүй),
--       expires_at (зөвхөн extend_listing() сунгана)
--   • Нийтэд дахин харагдах болох үед (идэвхжүүлэх, сунгах):
--       – 3+ мэдээллээр нуугдсан зарыг эзэн өөрөө нээж чадахгүй
--       – идэвхтэй зарын хязгаарыг шалгана
--   • Шинэ зарын expires_at-г клиентээс авахгүй
-- Шаардлага: 002, 011, 013 ажилласан байх.
-- Ажиллуулах: Supabase → SQL Editor → paste → Run (дахин ажиллуулж болно)
-- ═══════════════════════════════════════════════════════════

alter table public.listings
  add column if not exists sold_at timestamptz;

-- ═══════════════════════════════════════════════════════════
-- 1) Хэрэглэгчийн идэвхтэй зарын дээд хязгаар
--    (enforce_listing_limits-тэй ижил дүрэм)
-- ═══════════════════════════════════════════════════════════
create or replace function public.listing_max_active(uid uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
           when p.is_admin            then 999999
           when p.user_type = 'shop'  then case when p.is_verified then 500 else 50 end
           else 5
         end
    from public.profiles p
   where p.id = uid;
$$;

-- ═══════════════════════════════════════════════════════════
-- 2) protect_listing_flags v2
-- ═══════════════════════════════════════════════════════════
create or replace function public.protect_listing_flags()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  utype    text;
  was_live boolean;
  now_live boolean;
begin
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_vip     := false;
    new.view_count := 0;
    new.sold_at    := null;
    new.created_at := now();
    -- Хугацааг клиентээс авахгүй: хэрэглэгчийн төрлөөр тооцно
    select user_type into utype from public.profiles where id = new.user_id;
    new.expires_at := now() + case when utype = 'shop' then interval '30 days' else interval '7 days' end;
    return new;
  end if;

  -- UPDATE: эзэн зөвхөн зарын агуулгаа засна
  new.is_vip     := old.is_vip;
  new.user_id    := old.user_id;
  new.created_at := old.created_at;
  if coalesce(current_setting('celbeg.trusted_extend', true), '') <> 'on' then
    new.expires_at := old.expires_at;
  end if;

  -- Нийтэд дахин харагдах болж байвал шалгана
  was_live := old.is_active and (old.expires_at is null or old.expires_at > now());
  now_live := new.is_active and (new.expires_at is null or new.expires_at > now());
  if now_live and not was_live then
    if (select count(*) from public.reports r
         where r.listing_id = old.id and r.status = 'open') >= 3 then
      raise exception 'Энэ зар хэрэглэгчдийн мэдээллээр түр нуугдсан. Админ шалгасны дараа идэвхжинэ.';
    end if;
    if (select count(*) from public.listings l
         where l.user_id = old.user_id and l.id <> old.id and l.is_active
           and (l.expires_at is null or l.expires_at > now()))
       >= public.listing_max_active(old.user_id) then
      raise exception 'Идэвхтэй зарын хязгаарт хүрсэн байна. Өөр зараа нууж эсвэл устгаад дахин оролдоно уу.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_protect_listing_flags on public.listings;
create trigger trg_protect_listing_flags
  before insert or update on public.listings
  for each row execute function public.protect_listing_flags();

-- ═══════════════════════════════════════════════════════════
-- 3) extend_listing v2 — expires_at-г зөвхөн энэ функц өөрчилнө
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

  perform set_config('celbeg.trusted_extend', 'on', true);
  update public.listings
     set expires_at = new_expiry,
         is_active  = true,
         sold_at    = null
   where id = listing_id;
  perform set_config('celbeg.trusted_extend', 'off', true);

  return new_expiry;
end $$;
