-- ═══════════════════════════════════════════════════════════
-- CELBEG.MN — "Дотор" → "Салон" нэр солих (v6)
-- ───────────────────────────────────────────────────────────
-- Ажиллуулах: Supabase → SQL Editor → paste → Run
-- ═══════════════════════════════════════════════════════════

-- Үндсэн ангилал
update public.categories set name = 'Салон' where id = 'cat-7';

-- Дэд ангилал 2 нэр (Толь дотор, Бусад дотор)
update public.categories set name = 'Толь (салон)'  where id = 'sub-7-6';
update public.categories set name = 'Бусад салон'   where id = 'sub-7-7';

-- Одоо байгаа зарын category талбарыг синхрончилно
update public.listings set category = 'Салон' where category = 'Дотор';
