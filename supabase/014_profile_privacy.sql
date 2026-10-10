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
