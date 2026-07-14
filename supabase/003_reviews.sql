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
create or replace view public.profile_ratings as
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
