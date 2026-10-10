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
