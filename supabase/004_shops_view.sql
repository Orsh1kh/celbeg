-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Shops browse view (v4)
-- ───────────────────────────────────────────────────────────
-- shops_with_stats: profile + rating + listings count нэгтгэсэн
-- Client-с single SELECT-ээр browse хуудсанд хэрэглэнэ.
-- ═══════════════════════════════════════════════════════════

create or replace view public.shops_with_stats as
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
