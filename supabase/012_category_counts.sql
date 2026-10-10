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
