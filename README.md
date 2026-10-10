# CELBEG.MN

Монголын авто сэлбэгийн онлайн зах зээл. Static HTML/CSS/JS + Supabase.

## Production дээр гаргах алхмууд

### 1. Supabase project үүсгэх

1. https://supabase.com/dashboard → **New project**
2. Region: **Northeast Asia (Seoul)** (Монголоос хамгийн ойр)
3. Database password-ыг найдвартай газар хадгал

### 2. Schema ажиллуулах

Supabase Dashboard → **SQL Editor** дээр дараах файлуудыг **дарааллаар** ажиллуулна
(бүгд дахин ажиллуулахад аюулгүй):

1. `supabase/schema.sql` — үндсэн хүснэгтүүд, RLS
2. `supabase/002_marketplace_policies.sql` — хугацаа, rate limit
3. `supabase/007_vehicles.sql` — машины зар
4. `supabase/008_email_auth.sql` — email нэвтрэлт
5. `supabase/RUN_PENDING_003_to_014.sql` — үнэлгээ, дэлгүүр, дэд ангилал,
   хадгалах, хамгаалалт, ангиллын тоо, зар мэдээлэх, email нуух (003–014 нэг дор)

### 3. Нэвтрэлт (Email + нууц үг)

1. Supabase Dashboard → **Authentication → Providers → Email** → Enable
2. **Confirm email** — OFF (бүртгүүлмэгц шууд нэвтэрнэ)
3. **Authentication → URL Configuration** → Site URL: `https://celbeg.mn`

Админ эрх нь DB доторх `admin_emails` хүснэгтээр тодорхойлогдоно
(`011_security_hardening.sql`). Шинэ админ нэмэх:

```sql
insert into public.admin_emails (email) values ('new-admin@example.com');
```

### 4. Storage bucket

`schema.sql` дотор `listing-images` bucket-ыг public-ээр үүсгэдэг. Дараах зүйлийг шалгана:
- Dashboard → **Storage** → `listing-images` харагдаж байгаа эсэх
- **Public bucket** болсон эсэх (баруун талын Settings)

### 5. API credentials-ыг код руу оруулах

`js/supabase-client.js`-г нээж:

```js
const SUPABASE_URL      = 'https://XXXXXXXX.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_...';
```

- **URL & publishable key** — Dashboard → Settings → API Keys

### 6. Netlify руу deploy хийх

1. https://app.netlify.com/ → **Add new site → Import from Git**
2. Repository сонгож import
3. `netlify.toml` автоматаар уншигдаж, `publish = "."` болно
4. Deploy амжилттай болмогц:
   - Site settings → **Domain management** → `celbeg.mn` custom domain нэмнэ
   - DNS-ийн A record эсвэл CNAME-ыг Netlify-н өгсөн утга руу заана
   - HTTPS автоматаар үүснэ

### 7. Эхний туршилт

1. Site нээгээд email + нууц үгээр бүртгүүлнэ
2. Console-д `DEMO горим` warning гарахгүй байх ёстой
3. Зар нийтэлж, зураг оруулж, admin panel-с ангилал нэмэх
4. Өөр browser эсвэл incognito-с нэвтрэн зар харагдаж байгаа эсэхийг шалга

## Development (local)

```bash
# Ямар нэг static server хангалттай
python -m http.server 8000
# эсвэл
npx serve
```

`SUPABASE_URL`-г placeholder-оор үлдээвэл автоматаар **DEMO горим**-д ажиллана — DB хэрэггүй.

## Дараагийн алхмууд (P1)

- Зар засах (edit) функц
- VIP төлбөр — QPay/SocialPay
- Мессеж/чат

## Файлын бүтэц

```
celbeg-main/
├── index.html              — SPA-ийн үндсэн файл
├── css/style.css
├── img/
├── js/
│   ├── supabase-client.js  — Supabase config + demo data
│   ├── auth.js             — Email + нууц үгээр нэвтрэлт
│   ├── data-manager.js     — Ангилал, марк
│   ├── listings.js         — Зарын CRUD
│   ├── upload.js           — Зургийн upload
│   ├── admin.js            — Админ панел
│   └── main.js             — UI, navigation
├── supabase/
│   ├── schema.sql          — Үндсэн schema
│   ├── 0NN_*.sql           — Дараалсан migration-ууд
│   └── RUN_PENDING_003_to_014.sql — 003–014-г нэг дор
├── sw.js, manifest.json    — PWA
├── netlify.toml
├── robots.txt
└── sitemap.xml
```
