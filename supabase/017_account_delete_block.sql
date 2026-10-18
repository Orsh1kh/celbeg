-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Бүртгэл устгах, хэрэглэгч хаах (v17)
-- ───────────────────────────────────────────────────────────
-- App Store / Google Play шаардлага:
--   • Апп дотроос бүртгэлээ өөрөө устгах (Apple 5.1.1(v), Google Play)
--   • Зохисгүй хэрэглэгчийг хаах (Apple 1.2 — хэрэглэгчийн контенттой апп)
-- Ажиллуулах: Supabase → SQL Editor → paste → Run (дахин ажиллуулж болно)
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 1) Хэрэглэгч хаах: хаасан хүний зар танд харагдахгүй
-- ═══════════════════════════════════════════════════════════
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

drop policy if exists user_blocks_select_own on public.user_blocks;
drop policy if exists user_blocks_insert_own on public.user_blocks;
drop policy if exists user_blocks_delete_own on public.user_blocks;

-- Хэн хэнийг хаасныг зөвхөн хаасан хүн өөрөө харна
create policy user_blocks_select_own on public.user_blocks
  for select using (auth.uid() = blocker_id);
create policy user_blocks_insert_own on public.user_blocks
  for insert with check (auth.uid() = blocker_id);
create policy user_blocks_delete_own on public.user_blocks
  for delete using (auth.uid() = blocker_id);

-- ═══════════════════════════════════════════════════════════
-- 2) Бүртгэл устгах: auth хэрэглэгчийг устгахад profiles → зар,
--    үнэлгээ, хадгалсан, мэдээлэл, хаалт бүгд cascade-аар устна.
--    Зургийг клиент Storage-аас өмнө нь устгана.
-- ═══════════════════════════════════════════════════════════
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Нэвтрээгүй байна';
  end if;
  delete from auth.users where id = uid;
end $$;

revoke execute on function public.delete_my_account() from public, anon;
grant  execute on function public.delete_my_account() to authenticated;
