-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — Email auth (v8)
-- ───────────────────────────────────────────────────────────
-- Утасны OTP-с email OTP руу шилжинэ:
--   • profiles.email nullable text unique
--   • profiles.phone nullable (өмнө нь not null байсан)
--   • email эсвэл phone аль нэг нь заавал байх constraint
--
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- Дараа нь Dashboard → Authentication → Providers → Email
-- идэвхтэй эсэхийг шалгана (default идэвхтэй байх ёстой).
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- 1) profiles.email нэмэх (nullable, unique)
-- ═══════════════════════════════════════════════════════════
alter table public.profiles
  add column if not exists email text;

create unique index if not exists profiles_email_uniq
  on public.profiles (email) where email is not null;

-- ═══════════════════════════════════════════════════════════
-- 2) phone-г nullable болгох (email-ээр нэвтэрсэн үед хоосон
--    байхыг зөвшөөрнө)
-- ═══════════════════════════════════════════════════════════
alter table public.profiles alter column phone drop not null;

-- Хуучин unique constraint-г nullable-т нийцтэй болгоно
drop index if exists profiles_phone_key;

create unique index if not exists profiles_phone_uniq
  on public.profiles (phone) where phone is not null;

-- ═══════════════════════════════════════════════════════════
-- 3) Email эсвэл phone аль нэг нь заавал байх check
-- ═══════════════════════════════════════════════════════════
alter table public.profiles
  drop constraint if exists profiles_contact_required;

alter table public.profiles
  add constraint profiles_contact_required
  check (email is not null or phone is not null);
