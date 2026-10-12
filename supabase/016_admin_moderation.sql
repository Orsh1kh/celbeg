-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Админы зар хяналт (v16)
-- ───────────────────────────────────────────────────────────
--   • listings.admin_hidden — админ нуусан зарыг эзэн өөрөө нээж чадахгүй
--   • Админ бүх зарыг (нуусан, хугацаа дууссан) харна
--   • Админ зар устгахад зургийг нь Storage-аас устгах эрх
-- Шаардлага: 015 ажилласан байх.
-- Ажиллуулах: Supabase → SQL Editor → paste → Run (дахин ажиллуулж болно)
-- ═══════════════════════════════════════════════════════════

alter table public.listings
  add column if not exists admin_hidden boolean not null default false;

-- Мэдээллээр нуугдаад админ «нуух» шийдвэр гаргасан зарыг тэмдэглэнэ
update public.listings l
   set admin_hidden = true
 where l.is_active = false
   and exists (select 1 from public.reports r where r.listing_id = l.id and r.status = 'resolved');

drop policy if exists listings_select_admin on public.listings;
create policy listings_select_admin on public.listings
  for select using (public.is_admin());

drop policy if exists storage_delete_admin_listing_images on storage.objects;
create policy storage_delete_admin_listing_images on storage.objects
  for delete using (bucket_id = 'listing-images' and public.is_admin());

-- ═══════════════════════════════════════════════════════════
-- protect_listing_flags v3 (= 015 + admin_hidden)
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
    new.is_vip       := false;
    new.view_count   := 0;
    new.sold_at      := null;
    new.admin_hidden := false;
    new.created_at   := now();
    -- Хугацааг клиентээс авахгүй: хэрэглэгчийн төрлөөр тооцно
    select user_type into utype from public.profiles where id = new.user_id;
    new.expires_at := now() + case when utype = 'shop' then interval '30 days' else interval '7 days' end;
    return new;
  end if;

  -- UPDATE: эзэн зөвхөн зарын агуулгаа засна
  new.is_vip       := old.is_vip;
  new.user_id      := old.user_id;
  new.created_at   := old.created_at;
  new.admin_hidden := old.admin_hidden;
  if coalesce(current_setting('celbeg.trusted_extend', true), '') <> 'on' then
    new.expires_at := old.expires_at;
  end if;

  -- Нийтэд дахин харагдах болж байвал шалгана
  was_live := old.is_active and (old.expires_at is null or old.expires_at > now());
  now_live := new.is_active and (new.expires_at is null or new.expires_at > now());
  if now_live and not was_live then
    if old.admin_hidden then
      raise exception 'Энэ зарыг админ нуусан тул нээх боломжгүй. Асуух зүйл байвал info@celbeg.mn хаягаар хандана уу.';
    end if;
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
